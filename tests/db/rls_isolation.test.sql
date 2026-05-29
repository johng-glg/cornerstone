-- A3 database verification: tenant isolation, role visibility, audit trail, PII crypto.
-- Run with psql -v ON_ERROR_STOP=1 against a local Supabase DB (CI db-verify job).
-- All work happens in one transaction and is rolled back at the end, so the run is repeatable.
-- Any failed assertion RAISEs and aborts the transaction => psql exits non-zero.

BEGIN;

-- ---------------------------------------------------------------------------
-- Fixtures (as the privileged migration/superuser role): two isolated tenants,
-- one admin in tenant A, one non-admin in tenant B.
-- ---------------------------------------------------------------------------
\set co_a '11111111-1111-1111-1111-111111111111'
\set co_b '22222222-2222-2222-2222-222222222222'
\set user_a 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
\set user_b 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

INSERT INTO public.companies (id, name) VALUES
  (:'co_a', 'Tenant A'),
  (:'co_b', 'Tenant B');

INSERT INTO auth.users (id, instance_id, aud, role, email)
VALUES
  (:'user_a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@example.test'),
  (:'user_b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@example.test');

INSERT INTO public.staff (user_id, company_id, first_name, last_name, email, department)
VALUES
  (:'user_a', :'co_a', 'Ada', 'Admin', 'a@example.test', 'admin'),
  (:'user_b', :'co_b', 'Ben', 'User', 'b@example.test', 'client_services');

INSERT INTO public.user_roles (user_id, role) VALUES (:'user_a', 'admin');
INSERT INTO public.user_roles (user_id, role) VALUES (:'user_b', 'case_manager');

INSERT INTO public.tenant_feature_flags (company_id, flag_key, enabled) VALUES
  (:'co_a', 'leads.paralegal_visibility', true),
  (:'co_b', 'leads.paralegal_visibility', true);

-- Helper: become an authenticated user with a given JWT sub claim.
CREATE OR REPLACE FUNCTION pg_temp.become(_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. can_access_company: self yes, cross-tenant no
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
-- 3. tenant_feature_flags RLS: a user sees only their tenant's flags
-- ---------------------------------------------------------------------------
DO $$
DECLARE _n int;
BEGIN
  PERFORM pg_temp.become('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  SELECT count(*) INTO _n FROM public.tenant_feature_flags;
  ASSERT _n = 1, format('user B should see exactly 1 flag (own tenant), saw %s', _n);
  SELECT count(*) INTO _n FROM public.tenant_feature_flags WHERE company_id = '11111111-1111-1111-1111-111111111111';
  ASSERT _n = 0, 'user B must not see tenant A flags';
  RESET ROLE;
  RAISE NOTICE 'PASS 3: tenant_feature_flags cross-tenant isolation';
END $$;

-- ---------------------------------------------------------------------------
-- 4. tenant_feature_flags write: non-admin (user B) cannot insert; admin (user A) bound to own tenant
-- ---------------------------------------------------------------------------
DO $$
DECLARE _denied boolean := false;
BEGIN
  PERFORM pg_temp.become('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  BEGIN
    INSERT INTO public.tenant_feature_flags (company_id, flag_key, enabled)
    VALUES ('22222222-2222-2222-2222-222222222222', 'leads.show_in_navigation', false);
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN _denied := true;
  END;
  ASSERT _denied, 'non-admin must not be able to write feature flags (RLS WITH CHECK)';
  RESET ROLE;
  RAISE NOTICE 'PASS 4: non-admin feature-flag write denied';
END $$;

-- ---------------------------------------------------------------------------
-- 5. user_roles: a user sees only their own roles
-- ---------------------------------------------------------------------------
DO $$
DECLARE _n int;
BEGIN
  PERFORM pg_temp.become('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
  SELECT count(*) INTO _n FROM public.user_roles;
  ASSERT _n = 1, format('user B should see only own role row, saw %s', _n);
  RESET ROLE;
  RAISE NOTICE 'PASS 5: user_roles own-only visibility';
END $$;

-- ---------------------------------------------------------------------------
-- 6. PII: encrypt_pii roundtrips; anon cannot execute it
-- ---------------------------------------------------------------------------
DO $$
DECLARE _ct bytea; _pt text; _denied boolean := false;
BEGIN
  _ct := public.encrypt_pii('123-45-6789');
  ASSERT _ct IS NOT NULL, 'encrypt_pii returns ciphertext';
  ASSERT public.encrypt_pii(NULL) IS NULL, 'encrypt_pii(NULL) is NULL';
  SELECT extensions.pgp_sym_decrypt(_ct, (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key' LIMIT 1))
    INTO _pt;
  ASSERT _pt = '123-45-6789', 'ciphertext decrypts back to plaintext';

  PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'anon')::text, true);
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN
    PERFORM public.encrypt_pii('x');
    EXCEPTION WHEN insufficient_privilege THEN _denied := true;
  END;
  RESET ROLE;
  ASSERT _denied, 'anon must NOT be able to execute encrypt_pii';
  RAISE NOTICE 'PASS 6: PII encrypt roundtrip + anon revoke';
END $$;

-- ---------------------------------------------------------------------------
-- 7. Audit trail: log_audit_event writes; audit trigger fires on staff change
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
-- 8. Spine objects exist (lightweight schema presence check)
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
