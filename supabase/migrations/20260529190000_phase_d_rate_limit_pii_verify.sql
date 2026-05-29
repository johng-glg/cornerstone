-- Phase D — Rate limiting (Postgres-backed) + SSN-plaintext compliance verification
-- Consolidated clean baseline (ADR-001). Forward-only; rollback SQL inline at the bottom.
--
-- Resolves two Lovable "accepted risks" (standalone seed §Phase D):
--   1. Rate limiting — none existed. Adds a Postgres-backed fixed-window limiter that the
--      auth-adjacent and external-API-calling edge functions call via the service role.
--   2. SSN/PII plaintext — adds a verification view + assertion function that proves no
--      plaintext remains in the deprecated `*_encrypted` text columns (the pre-Phase-2A
--      storage), backing the compliance-evidence SSN-backfill artifact.

-- ============================================================================
-- 1. Rate limiting
-- ============================================================================
-- Fixed-window counter keyed by (bucket, identifier). `bucket` is the logical action
-- (e.g. 'forth-create-draft', 'auth-reset'); `identifier` is the caller (user id, tenant id,
-- or client IP). One row per (bucket, identifier, window_start). Old windows are pruned by the
-- function opportunistically, so no separate cron is required for correctness.
CREATE TABLE public.rate_limit_counters (
  bucket TEXT NOT NULL,
  identifier TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, identifier, window_start)
);

COMMENT ON TABLE public.rate_limit_counters IS
  'Phase D: Postgres-backed fixed-window rate limiter. One row per (bucket, identifier, window_start). Written only by the service role via public.check_rate_limit.';

-- Index to prune expired windows cheaply.
CREATE INDEX idx_rate_limit_window_start ON public.rate_limit_counters (window_start);

-- RLS: locked down. No tenant ever reads or writes this table directly; only the service role
-- (edge functions, via the admin client) touches it, and service_role bypasses RLS. Enabling
-- RLS with no policies means authenticated/anon get nothing — which is exactly what we want.
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;

-- check_rate_limit: atomically increments the current window's counter and returns whether the
-- caller is still under the limit. Returns a row: (allowed, current_count, limit_value,
-- retry_after_seconds). SECURITY DEFINER + service-role-only EXECUTE.
--
-- Window math: window_start is the floor of now() to the window size, so all callers in the
-- same window share a row and the INSERT ... ON CONFLICT DO UPDATE increment is atomic under
-- concurrency (row-level lock on the PK).
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _bucket TEXT,
  _identifier TEXT,
  _max_requests INTEGER,
  _window_seconds INTEGER
)
RETURNS TABLE (
  allowed BOOLEAN,
  current_count INTEGER,
  limit_value INTEGER,
  retry_after_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _now TIMESTAMPTZ := now();
  _window_start TIMESTAMPTZ := to_timestamp(floor(extract(epoch FROM _now) / _window_seconds) * _window_seconds);
  _count INTEGER;
BEGIN
  IF _max_requests <= 0 OR _window_seconds <= 0 THEN
    RAISE EXCEPTION 'check_rate_limit: _max_requests and _window_seconds must be positive';
  END IF;

  -- Opportunistic prune of windows older than this one (keeps the table small without a cron).
  DELETE FROM public.rate_limit_counters
   WHERE window_start < _now - make_interval(secs => _window_seconds * 2);

  INSERT INTO public.rate_limit_counters (bucket, identifier, window_start, request_count)
  VALUES (_bucket, _identifier, _window_start, 1)
  ON CONFLICT (bucket, identifier, window_start)
  DO UPDATE SET request_count = public.rate_limit_counters.request_count + 1
  RETURNING request_count INTO _count;

  RETURN QUERY SELECT
    (_count <= _max_requests),
    _count,
    _max_requests,
    CASE WHEN _count <= _max_requests THEN 0
         ELSE CEIL(extract(epoch FROM (_window_start + make_interval(secs => _window_seconds) - _now)))::INTEGER
    END;
END;
$$;

COMMENT ON FUNCTION public.check_rate_limit(text, text, integer, integer) IS
  'Phase D: fixed-window rate-limit check + increment. Service-role only. Returns (allowed, current_count, limit_value, retry_after_seconds).';

-- Least privilege: only the service role may call it (edge functions use the admin client).
-- Authenticated/anon must never be able to probe or inflate counters. Revoke from anon and
-- authenticated EXPLICITLY (not just PUBLIC): Supabase's ALTER DEFAULT PRIVILEGES grants EXECUTE
-- on new public functions directly to anon/authenticated, so a bare REVOKE FROM PUBLIC leaves
-- those direct grants in place.
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;

-- ============================================================================
-- 2. PII-plaintext compliance verification
-- ============================================================================
-- The current PII storage is ssn_ciphertext / *_ciphertext (bytea, via encrypt_pii). The
-- deprecated pre-Phase-2A text columns (clients.ssn_encrypted, lead_banking.*_encrypted) must
-- hold no plaintext. This view surfaces any row where a deprecated column is non-null, and the
-- assertion function turns that into a hard check the RLS-audit / compliance evidence can run.
CREATE OR REPLACE VIEW public.pii_plaintext_audit AS
  SELECT 'clients.ssn_encrypted'::text AS location, count(*)::bigint AS populated_rows
    FROM public.clients WHERE ssn_encrypted IS NOT NULL
  UNION ALL
  SELECT 'lead_banking.account_number_encrypted', count(*)
    FROM public.lead_banking WHERE account_number_encrypted IS NOT NULL
  UNION ALL
  SELECT 'lead_banking.routing_number_encrypted', count(*)
    FROM public.lead_banking WHERE routing_number_encrypted IS NOT NULL;

COMMENT ON VIEW public.pii_plaintext_audit IS
  'Phase D: counts non-null values in deprecated plaintext-era PII columns. All rows should be 0 — current PII lives only in the *_ciphertext (bytea) columns.';

-- assert_no_plaintext_pii: raises if any deprecated column is populated. Used by the RLS-audit
-- evidence and runnable in CI. Service-role only (it reads across all tenants).
CREATE OR REPLACE FUNCTION public.assert_no_plaintext_pii()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE _bad text;
BEGIN
  SELECT string_agg(format('%s=%s', location, populated_rows), ', ')
    INTO _bad
    FROM public.pii_plaintext_audit
   WHERE populated_rows > 0;
  IF _bad IS NOT NULL THEN
    RAISE EXCEPTION 'plaintext PII found in deprecated columns: %', _bad;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.assert_no_plaintext_pii() IS
  'Phase D: raises if any deprecated plaintext-era PII column holds data. Compliance evidence for the SSN-backfill accepted-risk.';

-- Revoke from anon/authenticated explicitly (see check_rate_limit note above): this function
-- reads PII columns across all tenants, so it must be service-role only.
REVOKE EXECUTE ON FUNCTION public.assert_no_plaintext_pii() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_no_plaintext_pii() TO service_role;

-- ============================================================================
-- Rollback (forward-only; this block documents the reverse for ADR-001)
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.assert_no_plaintext_pii();
-- DROP VIEW IF EXISTS public.pii_plaintext_audit;
-- DROP FUNCTION IF EXISTS public.check_rate_limit(text, text, integer, integer);
-- DROP TABLE IF EXISTS public.rate_limit_counters;
