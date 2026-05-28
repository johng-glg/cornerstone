-- Phase 9B + 9D + 10B + 10C + 10D structural backbone
-- Rollback:
--   DROP TABLE IF EXISTS public.outbound_webhook_log CASCADE;
--   DROP TABLE IF EXISTS public.domain_events CASCADE;
--   DROP TABLE IF EXISTS public.webhook_endpoints CASCADE;
--   ALTER TABLE public.liabilities
--     DROP COLUMN IF EXISTS summons_received_at,
--     DROP COLUMN IF EXISTS summons_notes,
--     DROP COLUMN IF EXISTS referred_to_law_firm_at,
--     DROP COLUMN IF EXISTS referred_to_law_firm_company_id;
--   DROP FUNCTION IF EXISTS public.get_company_terminology(uuid);
--   DROP TABLE IF EXISTS public.terminology_presets;

-- ============================================================
-- 9B. terminology_presets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.terminology_presets (
  preset_key TEXT PRIMARY KEY,
  label_map  JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.terminology_presets TO authenticated;
GRANT ALL    ON public.terminology_presets TO service_role;

ALTER TABLE public.terminology_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Terminology presets readable by authenticated"
  ON public.terminology_presets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Terminology presets managed by admin"
  ON public.terminology_presets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed presets (idempotent)
INSERT INTO public.terminology_presets (preset_key, label_map) VALUES
  ('law_firm', jsonb_build_object(
    'practice_area',      'Consumer Debt Defense',
    'engagement',         'Engagement',
    'engagements',        'Engagements',
    'new_engagement',     'New Engagement',
    'plsa',               'PLSA',
    'plsa_balance',       'PLSA Balance',
    'plsa_long',          'PLSA (Personal Litigation Savings Account)',
    'liability',          'Liability',
    'liabilities',        'Liabilities',
    'matter',             'Matter',
    'attorney_role',      'Attorney',
    'case_manager_role',  'Case Manager',
    'negotiator_role',    'Negotiator'
  )),
  ('debt_relief', jsonb_build_object(
    'practice_area',      'Debt Resolution',
    'engagement',         'Program',
    'engagements',        'Programs',
    'new_engagement',     'New Program',
    'plsa',               'Trust',
    'plsa_balance',       'Trust Balance',
    'plsa_long',          'Dedicated Trust Account',
    'liability',          'Debt',
    'liabilities',        'Debts',
    'matter',             'Account',
    'attorney_role',      'Counselor',
    'case_manager_role',  'Case Manager',
    'negotiator_role',    'Negotiator'
  )),
  ('debt_settlement', jsonb_build_object(
    'practice_area',      'Debt Settlement',
    'engagement',         'Program',
    'engagements',        'Programs',
    'new_engagement',     'New Program',
    'plsa',               'Dedicated Account',
    'plsa_balance',       'Account Balance',
    'plsa_long',          'Dedicated Account',
    'liability',          'Debt',
    'liabilities',        'Debts',
    'matter',             'Account',
    'attorney_role',      'Counselor',
    'case_manager_role',  'Case Manager',
    'negotiator_role',    'Negotiator'
  )),
  ('legal_plan', jsonb_build_object(
    'practice_area',      'Legal Plan',
    'engagement',         'Referral',
    'engagements',        'Referrals',
    'new_engagement',     'New Referral',
    'plsa',               'Trust',
    'plsa_balance',       'Trust Balance',
    'plsa_long',          'Trust Account',
    'liability',          'Debt',
    'liabilities',        'Debts',
    'matter',             'Matter',
    'attorney_role',      'Attorney',
    'case_manager_role',  'Plan Coordinator',
    'negotiator_role',    'Negotiator'
  )),
  ('hybrid', jsonb_build_object(
    'practice_area',      'Consumer Debt Defense',
    'engagement',         'Engagement',
    'engagements',        'Engagements',
    'new_engagement',     'New Engagement',
    'plsa',               'PLSA',
    'plsa_balance',       'PLSA Balance',
    'plsa_long',          'PLSA (Personal Litigation Savings Account)',
    'liability',          'Liability',
    'liabilities',        'Liabilities',
    'matter',             'Matter',
    'attorney_role',      'Attorney',
    'case_manager_role',  'Case Manager',
    'negotiator_role',    'Negotiator'
  )),
  ('other', jsonb_build_object(
    'practice_area',      'Services',
    'engagement',         'Engagement',
    'engagements',        'Engagements',
    'new_engagement',     'New Engagement',
    'plsa',               'Trust',
    'plsa_balance',       'Trust Balance',
    'plsa_long',          'Trust Account',
    'liability',          'Liability',
    'liabilities',        'Liabilities',
    'matter',             'Matter',
    'attorney_role',      'Attorney',
    'case_manager_role',  'Case Manager',
    'negotiator_role',    'Negotiator'
  ))
ON CONFLICT (preset_key) DO UPDATE SET label_map = EXCLUDED.label_map, updated_at = now();

-- Resolver function: company_type → preset, with per-tenant override via tenant_feature_flags
CREATE OR REPLACE FUNCTION public.get_company_terminology(_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _company_type TEXT;
  _preset_key   TEXT;
  _label_map    JSONB;
  _override     JSONB;
BEGIN
  SELECT company_type::text INTO _company_type
    FROM public.companies WHERE id = _company_id;
  IF _company_type IS NULL THEN
    _company_type := 'law_firm';
  END IF;

  -- Per-tenant override of preset key
  SELECT value->>'preset_key' INTO _preset_key
    FROM public.tenant_feature_flags
    WHERE company_id = _company_id AND flag_key = 'terminology.preset_key';
  IF _preset_key IS NULL THEN
    _preset_key := _company_type;
  END IF;

  SELECT label_map INTO _label_map
    FROM public.terminology_presets WHERE preset_key = _preset_key;
  IF _label_map IS NULL THEN
    SELECT label_map INTO _label_map
      FROM public.terminology_presets WHERE preset_key = 'law_firm';
  END IF;

  -- Per-tenant label overrides via terminology.overrides flag value
  SELECT value->'labels' INTO _override
    FROM public.tenant_feature_flags
    WHERE company_id = _company_id AND flag_key = 'terminology.overrides';
  IF _override IS NOT NULL AND jsonb_typeof(_override) = 'object' THEN
    _label_map := _label_map || _override;
  END IF;

  RETURN _label_map;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.get_company_terminology(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_company_terminology(uuid) TO authenticated, service_role;

-- ============================================================
-- 9D. Summons tracking columns on liabilities
-- ============================================================
ALTER TABLE public.liabilities
  ADD COLUMN IF NOT EXISTS summons_received_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS summons_notes               TEXT,
  ADD COLUMN IF NOT EXISTS referred_to_law_firm_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referred_to_law_firm_company_id UUID
    REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_liabilities_summons_received_at
  ON public.liabilities(summons_received_at)
  WHERE summons_received_at IS NOT NULL;

-- ============================================================
-- 10B. webhook_endpoints
-- ============================================================
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  target_url          TEXT NOT NULL,
  auth_method         TEXT NOT NULL DEFAULT 'none'
    CHECK (auth_method IN ('none', 'bearer', 'hmac_sha256', 'basic')),
  auth_secret_ref     TEXT,            -- Vault secret name; NULL for auth_method='none'
  auth_secret_last4   TEXT,            -- shown in UI to identify the secret
  event_subscriptions TEXT[] NOT NULL DEFAULT '{}',
  custom_headers      JSONB NOT NULL DEFAULT '{}'::jsonb,
  body_template       TEXT,            -- optional override; defaults to event payload
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_by          UUID,
  last_fired_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_endpoints TO authenticated;
GRANT ALL ON public.webhook_endpoints TO service_role;

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Webhook endpoints readable by company staff"
  ON public.webhook_endpoints FOR SELECT TO authenticated
  USING (public.can_access_company(auth.uid(), company_id));

CREATE POLICY "Webhook endpoints admin insert"
  ON public.webhook_endpoints FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_company(auth.uid(), company_id)
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Webhook endpoints admin update"
  ON public.webhook_endpoints FOR UPDATE TO authenticated
  USING (
    public.can_access_company(auth.uid(), company_id)
    AND public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    public.can_access_company(auth.uid(), company_id)
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Webhook endpoints admin delete"
  ON public.webhook_endpoints FOR DELETE TO authenticated
  USING (
    public.can_access_company(auth.uid(), company_id)
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER trg_webhook_endpoints_updated_at
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_company_active
  ON public.webhook_endpoints(company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_subscriptions
  ON public.webhook_endpoints USING GIN(event_subscriptions);

-- ============================================================
-- 10C. outbound_webhook_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outbound_webhook_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  endpoint_id         UUID REFERENCES public.webhook_endpoints(id) ON DELETE SET NULL,
  source_event        TEXT NOT NULL,
  source_entity_type  TEXT,
  source_entity_id    UUID,
  target_url          TEXT NOT NULL,
  method              TEXT NOT NULL DEFAULT 'POST',
  request_headers     JSONB,
  request_payload     JSONB,
  response_status     INT,
  response_body       TEXT,
  response_time_ms    INT,
  attempt_n           INT NOT NULL DEFAULT 1,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.outbound_webhook_log TO authenticated;
GRANT ALL    ON public.outbound_webhook_log TO service_role;

ALTER TABLE public.outbound_webhook_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Outbound webhook log readable by company staff"
  ON public.outbound_webhook_log FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR public.can_access_company(auth.uid(), company_id)
  );

-- Inserts only via service role (no INSERT policy for authenticated).

CREATE INDEX IF NOT EXISTS idx_outbound_log_endpoint_created
  ON public.outbound_webhook_log(endpoint_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outbound_log_source_entity
  ON public.outbound_webhook_log(source_entity_type, source_entity_id);

CREATE INDEX IF NOT EXISTS idx_outbound_log_company_created
  ON public.outbound_webhook_log(company_id, created_at DESC);

-- ============================================================
-- 10D. domain_events queue
-- ============================================================
CREATE TABLE IF NOT EXISTS public.domain_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event         TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     UUID,
  company_id    UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at  TIMESTAMPTZ,
  attempt_count INT NOT NULL DEFAULT 0,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.domain_events TO authenticated;
GRANT ALL    ON public.domain_events TO service_role;

ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Domain events readable by company staff"
  ON public.domain_events FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR public.can_access_company(auth.uid(), company_id)
  );

CREATE INDEX IF NOT EXISTS idx_domain_events_unprocessed
  ON public.domain_events(created_at)
  WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_domain_events_event_created
  ON public.domain_events(event, created_at DESC);

-- Helper SECDEF function so app code / triggers can emit events without RLS pain
CREATE OR REPLACE FUNCTION public.emit_domain_event(
  _event TEXT,
  _entity_type TEXT,
  _entity_id UUID,
  _company_id UUID,
  _payload JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE _id UUID;
BEGIN
  INSERT INTO public.domain_events (event, entity_type, entity_id, company_id, payload)
  VALUES (_event, _entity_type, _entity_id, _company_id, COALESCE(_payload, '{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.emit_domain_event(text,text,uuid,uuid,jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.emit_domain_event(text,text,uuid,uuid,jsonb) TO authenticated, service_role;