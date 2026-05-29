-- A3 database verification: tenant isolation, role visibility, audit trail, PII crypto.
-- Run with psql -v ON_ERROR_STOP=1 against a local Supabase DB (CI db-verify job).
-- All work happens in one transaction and is rolled back at the end, so the run is repeatable.
-- Any failed assertion RAISEs and aborts the transaction => psql exits non-zero.
--
-- Note on role switching: role/GUC changes are done at the TOP (transaction) level, never inside
-- a function or DO block — Postgres reverts function-local SET LOCAL when the function returns,
-- which would silently run RLS checks as the superuser.

BEGIN;

-- ---------------------------------------------------------------------------
-- Fixtures (as the privileged migration/superuser role): two isolated tenants,
-- one admin in tenant A, one non-admin (case_manager) in tenant B.
-- ---------------------------------------------------------------------------
INSERT INTO public.companies (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Tenant A'),
  ('22222222-2222-2222-2222-222222222222', 'Tenant B');

INSERT INTO auth.users (id, instance_id, aud, role, email)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test');

INSERT INTO public.staff (user_id, company_id, first_name, last_name, email, department)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ada', 'Admin', 'a@example.test', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Ben', 'User', 'b@example.test', 'client_services');

INSERT INTO public.user_roles (user_id, role) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin');
INSERT INTO public.user_roles (user_id, role) VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'case_manager');

INSERT INTO public.tenant_feature_flags (company_id, flag_key, enabled) VALUES
  ('11111111-1111-1111-1111-111111111111', 'leads.paralegal_visibility', true),
  ('22222222-2222-2222-2222-222222222222', 'leads.paralegal_visibility', true);

-- ---------------------------------------------------------------------------
-- 1. can_access_company: self yes, cross-tenant no  (definer fn, explicit args)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ASSERT public.can_access_company('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
    'user A should access tenant A';
  ASSERT NOT public.can_access_company('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222'),
    'user A must NOT access tenant B';
  ASSERT NOT public.can_access_company('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111'),
    'user B must NOT access tenant A';
  RAISE NOTICE 'PASS 1: can_access_company isolation';
END $$;

-- ---------------------------------------------------------------------------
-- 2. has_role
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ASSERT public.has_role('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin'), 'user A is admin';
  ASSERT NOT public.has_role('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin'), 'user B is not admin';
  RAISE NOTICE 'PASS 2: has_role';
END $$;

-- ---------------------------------------------------------------------------
-- Become user B (non-admin) — top-level role + JWT claim so RLS actually applies.
-- Set BOTH the legacy `request.jwt.claim.sub` GUC and the `request.jwt.claims` JSON so
-- auth.uid() resolves regardless of which implementation the Supabase image ships.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

-- 3 + 5. tenant_feature_flags + user_roles: user B sees only their own tenant/rows
DO $$
DECLARE _n int;
BEGIN
  SELECT count(*) INTO _n FROM public.tenant_feature_flags;
  ASSERT _n = 1, format('user B should see exactly 1 flag (own tenant), saw %s', _n);
  SELECT count(*) INTO _n FROM public.tenant_feature_flags WHERE company_id = '11111111-1111-1111-1111-111111111111';
  ASSERT _n = 0, 'user B must not see tenant A flags';
  SELECT count(*) INTO _n FROM public.user_roles;
  ASSERT _n = 1, format('user B should see only own role row, saw %s', _n);
  RAISE NOTICE 'PASS 3+5: feature-flag + user_roles cross-tenant/own-only isolation';
END $$;

-- 4. tenant_feature_flags write: non-admin user B cannot insert (RLS WITH CHECK)
DO $$
DECLARE _denied boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.tenant_feature_flags (company_id, flag_key, enabled)
    VALUES ('22222222-2222-2222-2222-222222222222', 'leads.show_in_navigation', false);
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN _denied := true;
  END;
  ASSERT _denied, 'non-admin must not be able to write feature flags';
  RAISE NOTICE 'PASS 4: non-admin feature-flag write denied';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 6. PII: encrypt_pii roundtrips; anon cannot execute it
-- ---------------------------------------------------------------------------
DO $$
DECLARE _ct bytea; _pt text; _denied boolean := false;
BEGIN
  _ct := public.encrypt_pii('123-45-6789');
  ASSERT _ct IS NOT NULL, 'encrypt_pii returns ciphertext';
  ASSERT public.encrypt_pii(NULL) IS NULL, 'encrypt_pii(NULL) is NULL';
  SELECT extensions.pgp_sym_decrypt(
           _ct,
           (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key' LIMIT 1)
         ) INTO _pt;
  ASSERT _pt = '123-45-6789', 'ciphertext decrypts back to plaintext';
  RAISE NOTICE 'PASS 6a: PII encrypt roundtrip';
END $$;

-- anon must be unable to execute the sensitive functions. Assert the EXECUTE privilege
-- directly via the catalog rather than invoking encrypt_pii as anon — invoking the
-- vault-reading function under the anon role crashes the Supabase backend, and the ACL
-- check is the precise assertion of the security property anyway.
DO $$
BEGIN
  ASSERT NOT has_function_privilege('anon', 'public.encrypt_pii(text)', 'EXECUTE'),
    'anon must NOT have EXECUTE on encrypt_pii';
  ASSERT has_function_privilege('authenticated', 'public.encrypt_pii(text)', 'EXECUTE'),
    'authenticated should have EXECUTE on encrypt_pii';
  ASSERT NOT has_function_privilege('anon', 'public.is_feature_enabled(uuid, text)', 'EXECUTE'),
    'anon must NOT have EXECUTE on is_feature_enabled';
  RAISE NOTICE 'PASS 6b: encrypt_pii / is_feature_enabled EXECUTE revoked for anon';
END $$;

-- ---------------------------------------------------------------------------
-- 7. Audit trail: trigger fires on staff change
-- ---------------------------------------------------------------------------
DO $$
DECLARE _before int; _after int;
BEGIN
  SELECT count(*) INTO _before FROM public.system_audit_log;
  UPDATE public.staff SET job_title = 'Partner' WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  SELECT count(*) INTO _after FROM public.system_audit_log WHERE action = 'staff.update';
  ASSERT _after >= 1, 'audit trigger should log staff.update';
  ASSERT (SELECT count(*) FROM public.system_audit_log) > _before, 'audit log grew';
  RAISE NOTICE 'PASS 7: audit trigger writes to system_audit_log';
END $$;

-- ---------------------------------------------------------------------------
-- 8. Spine objects exist
-- ---------------------------------------------------------------------------
DO $$
DECLARE _missing text;
BEGIN
  SELECT string_agg(t, ', ') INTO _missing FROM unnest(ARRAY[
    'companies','staff','user_roles','role_permissions','role_special_permissions',
    'tenant_feature_flags','system_audit_log'
  ]) t WHERE to_regclass('public.' || t) IS NULL;
  ASSERT _missing IS NULL, format('missing spine tables: %s', _missing);
  RAISE NOTICE 'PASS 8: spine tables present';
END $$;

ROLLBACK;
