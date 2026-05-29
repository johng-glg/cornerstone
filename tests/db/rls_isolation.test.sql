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

-- Core-CRM fixtures (A5): one client + one lead per tenant, and a pure-paralegal user in B.
INSERT INTO public.clients (company_id, first_name, last_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Cara', 'ClientA'),
  ('22222222-2222-2222-2222-222222222222', 'Cody', 'ClientB');
INSERT INTO public.leads (company_id, first_name, last_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Lena', 'LeadA'),
  ('22222222-2222-2222-2222-222222222222', 'Leo', 'LeadB');

INSERT INTO auth.users (id, instance_id, aud, role, email)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'p@example.test');
INSERT INTO public.staff (user_id, company_id, first_name, last_name, email, department)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Pat', 'Para', 'p@example.test', 'attorney');
INSERT INTO public.user_roles (user_id, role) VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'paralegal');

-- A6 fixtures: a processor + a per-tenant processor config in each company (admin-only, company-scoped).
INSERT INTO public.payment_processors (id, name, processor_type)
  VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Mock Processor', 'mock');
INSERT INTO public.company_processor_configs (company_id, processor_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd');

-- A8 fixtures: a client_service + liability + litigation_matter per tenant, and one global law firm.
INSERT INTO public.client_services (id, service_number, owning_company_id) VALUES
  ('55555555-5555-5555-5555-555555555555', 'CS-A-001', '11111111-1111-1111-1111-111111111111'),
  ('66666666-6666-6666-6666-666666666666', 'CS-B-001', '22222222-2222-2222-2222-222222222222');
INSERT INTO public.liabilities (id, client_service_id) VALUES
  ('57575757-5757-5757-5757-575757575757', '55555555-5555-5555-5555-555555555555'),
  ('68686868-6868-6868-6868-686868686868', '66666666-6666-6666-6666-666666666666');
INSERT INTO public.litigation_matters (id, liability_id, client_service_id) VALUES
  ('5a5a5a5a-5a5a-5a5a-5a5a-5a5a5a5a5a5a', '57575757-5757-5757-5757-575757575757', '55555555-5555-5555-5555-555555555555'),
  ('6b6b6b6b-6b6b-6b6b-6b6b-6b6b6b6b6b6b', '68686868-6868-6868-6868-686868686868', '66666666-6666-6666-6666-666666666666');
INSERT INTO public.law_firms (id, name) VALUES ('7c7c7c7c-7c7c-7c7c-7c7c-7c7c7c7c7c7c', 'Global Firm LLP');

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

-- ---------------------------------------------------------------------------
-- 9. Core CRM: clients + leads cross-tenant isolation (as case_manager user B)
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE _c int; _l int;
BEGIN
  SELECT count(*) INTO _c FROM public.clients;
  ASSERT _c = 1, format('user B should see only their tenant client, saw %s', _c);
  ASSERT (SELECT count(*) FROM public.clients WHERE company_id = '11111111-1111-1111-1111-111111111111') = 0,
    'user B must not see tenant A clients';
  -- case_manager is non-paralegal, so can_view_leads is unrestricted within company scope
  SELECT count(*) INTO _l FROM public.leads;
  ASSERT _l = 1, format('case_manager B should see only their tenant lead, saw %s', _l);
  RAISE NOTICE 'PASS 9: clients + leads cross-tenant isolation';
END $$;
RESET ROLE;

-- ---------------------------------------------------------------------------
-- 10. can_view_leads: a pure paralegal is gated by leads.paralegal_visibility
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  -- Flag is ON (fixture) → paralegal sees their tenant's lead.
  ASSERT (SELECT count(*) FROM public.leads) = 1, 'paralegal should see leads while flag is ON';
  RAISE NOTICE 'PASS 10a: paralegal sees leads with flag ON';
END $$;
RESET ROLE;

UPDATE public.tenant_feature_flags SET enabled = false
WHERE company_id = '22222222-2222-2222-2222-222222222222' AND flag_key = 'leads.paralegal_visibility';

SELECT set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  -- Flag OFF → pure paralegal is gated to zero leads (RLS via can_view_leads).
  ASSERT (SELECT count(*) FROM public.leads) = 0, 'paralegal must see no leads while flag is OFF';
  RAISE NOTICE 'PASS 10b: paralegal gated to zero leads with flag OFF';
END $$;
RESET ROLE;

-- ---------------------------------------------------------------------------
-- 11. A5 core-CRM tables exist + decrypt helpers landed
-- ---------------------------------------------------------------------------
DO $$
DECLARE _missing text;
BEGIN
  SELECT string_agg(t, ', ') INTO _missing FROM unnest(ARRAY[
    'clients','client_services','services','leads','lead_banking','liabilities',
    'liability_actions','creditors','creditor_contacts','creditor_responses','settlements','transactions'
  ]) t WHERE to_regclass('public.' || t) IS NULL;
  ASSERT _missing IS NULL, format('missing A5 tables: %s', _missing);
  ASSERT to_regprocedure('public.decrypt_client_ssn(uuid)') IS NOT NULL, 'decrypt_client_ssn present';
  ASSERT to_regprocedure('public.decrypt_lead_banking(uuid)') IS NOT NULL, 'decrypt_lead_banking present';
  ASSERT to_regprocedure('public.can_view_leads(uuid, uuid)') IS NOT NULL, 'can_view_leads present';
  RAISE NOTICE 'PASS 11: A5 tables + decrypt/can_view_leads present';
END $$;

-- ---------------------------------------------------------------------------
-- 12. A6: company_processor_configs is admin-only AND company-scoped
-- ---------------------------------------------------------------------------
-- Admin user A: sees only their own tenant's config (1), not tenant B's.
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.company_processor_configs) = 1,
    'admin A should see only their tenant processor config';
  ASSERT (SELECT count(*) FROM public.company_processor_configs
          WHERE company_id = '22222222-2222-2222-2222-222222222222') = 0,
    'admin A must not see tenant B processor config';
  RAISE NOTICE 'PASS 12a: company_processor_configs admin company-scoped';
END $$;
RESET ROLE;

-- Non-admin user B: admin-only table → zero rows.
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.company_processor_configs) = 0,
    'non-admin must not read processor configs (admin-only)';
  ASSERT to_regclass('public.payment_processors') IS NOT NULL
     AND to_regclass('public.plsa_sync_log') IS NOT NULL, 'A6 tables present';
  RAISE NOTICE 'PASS 12b: processor configs admin-only + A6 tables present';
END $$;
RESET ROLE;

-- ---------------------------------------------------------------------------
-- 13. Per-tenant processor credential encryption (decrypt_processor_credentials)
-- ---------------------------------------------------------------------------
-- Store an encrypted api_key + non-secret client_id on tenant A's config (as superuser).
UPDATE public.company_processor_configs
SET api_key_encrypted = public.encrypt_pii('sk-forth-secret-123'),
    config = '{"client_id":"cid-A"}'::jsonb
WHERE company_id = '11111111-1111-1111-1111-111111111111';

DO $$
DECLARE _creds jsonb;
BEGIN
  _creds := public.decrypt_processor_credentials('11111111-1111-1111-1111-111111111111');
  ASSERT _creds ->> 'client_id' = 'cid-A', 'client_id should round-trip from config';
  ASSERT _creds ->> 'api_key' = 'sk-forth-secret-123', 'api_key should decrypt to plaintext';
  -- Service-role only: anon/authenticated must NOT hold EXECUTE.
  ASSERT NOT has_function_privilege('anon', 'public.decrypt_processor_credentials(uuid)', 'EXECUTE'),
    'anon must not execute decrypt_processor_credentials';
  ASSERT NOT has_function_privilege('authenticated', 'public.decrypt_processor_credentials(uuid)', 'EXECUTE'),
    'authenticated must not execute decrypt_processor_credentials';
  ASSERT has_function_privilege('service_role', 'public.decrypt_processor_credentials(uuid)', 'EXECUTE'),
    'service_role should execute decrypt_processor_credentials';
  RAISE NOTICE 'PASS 13: processor credential encrypt/decrypt + service-role-only';
END $$;

-- ---------------------------------------------------------------------------
-- 14. A7 integrations hub: company_integrations + dialpad_calls cross-tenant isolation,
--     and company_integrations is admin-only to mutate.
-- ---------------------------------------------------------------------------
INSERT INTO public.company_integrations (company_id, provider_key) VALUES
  ('11111111-1111-1111-1111-111111111111', 'docuseal'),
  ('22222222-2222-2222-2222-222222222222', 'docuseal');
INSERT INTO public.dialpad_calls (company_id, dialpad_call_id, target_phone) VALUES
  ('11111111-1111-1111-1111-111111111111', 'call-a', '+15551110000'),
  ('22222222-2222-2222-2222-222222222222', 'call-b', '+15552220000');

SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE _denied boolean := false;
BEGIN
  ASSERT (SELECT count(*) FROM public.company_integrations) = 1, 'user B sees only their tenant integration';
  ASSERT (SELECT count(*) FROM public.dialpad_calls) = 1, 'user B sees only their tenant calls';
  ASSERT (SELECT count(*) FROM public.dialpad_calls WHERE company_id = '11111111-1111-1111-1111-111111111111') = 0,
    'user B must not see tenant A calls';
  -- non-admin cannot mutate company_integrations (admin-only)
  BEGIN
    INSERT INTO public.company_integrations (company_id, provider_key)
    VALUES ('22222222-2222-2222-2222-222222222222', 'dialpad');
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN _denied := true;
  END;
  ASSERT _denied, 'non-admin must not insert company_integrations';
  RAISE NOTICE 'PASS 14: integrations-hub cross-tenant isolation + admin-only mutate';
END $$;
RESET ROLE;

-- ---------------------------------------------------------------------------
-- 15. A8 litigation: matters are company-scoped via client_services (cross-tenant isolation),
--     law_firms are globally visible to all staff, and filing-fee writes are matter-scoped.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE _denied boolean := false;
BEGIN
  ASSERT (SELECT count(*) FROM public.litigation_matters) = 1, 'user B sees only their tenant litigation matter';
  ASSERT (SELECT count(*) FROM public.litigation_matters
          WHERE client_service_id = '55555555-5555-5555-5555-555555555555') = 0,
    'user B must not see tenant A litigation matter';
  ASSERT (SELECT count(*) FROM public.law_firms WHERE name = 'Global Firm LLP') = 1,
    'law firms are globally visible to all staff';
  -- filing fee against own-tenant matter is allowed
  INSERT INTO public.filing_fees (matter_id, amount, description)
    VALUES ('6b6b6b6b-6b6b-6b6b-6b6b-6b6b6b6b6b6b', 100.00, 'court filing');
  -- filing fee against a cross-tenant matter is denied by RLS
  BEGIN
    INSERT INTO public.filing_fees (matter_id, amount, description)
      VALUES ('5a5a5a5a-5a5a-5a5a-5a5a-5a5a5a5a5a5a', 100.00, 'cross-tenant');
    EXCEPTION WHEN insufficient_privilege OR check_violation THEN _denied := true;
  END;
  ASSERT _denied, 'filing fee against cross-tenant matter must be denied';
  RAISE NOTICE 'PASS 15: litigation cross-tenant isolation + global law firms + filing-fee RLS';
END $$;
RESET ROLE;

-- ---------------------------------------------------------------------------
-- 16. A9 lead + workflow engine: lead_assignment_rules / workflow_rules / lead_scoring_profiles
--     are company-scoped, assignments are staff(company)-scoped, and a lead INSERT fires the
--     re-added scoring/assignment triggers without error.
-- ---------------------------------------------------------------------------
INSERT INTO public.lead_scoring_profiles (id, company_id, name) VALUES
  ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'Profile A'),
  ('a9a9a9a9-a9a9-a9a9-a9a9-a9a9a9a9a9a9', '22222222-2222-2222-2222-222222222222', 'Profile B');
INSERT INTO public.lead_assignment_rules (company_id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Rule A'),
  ('22222222-2222-2222-2222-222222222222', 'Rule B');
INSERT INTO public.workflow_rules (company_id, name, entity_type, trigger_type) VALUES
  ('11111111-1111-1111-1111-111111111111', 'WF A', 'leads', 'record_created'),
  ('22222222-2222-2222-2222-222222222222', 'WF B', 'leads', 'record_created');
-- distinct entity_id per row (idx_assignments_single_role is unique on entity_type/id/role).
INSERT INTO public.assignments (staff_id, entity_type, entity_id, assignment_type)
  SELECT s.id, 'litigation_matter', '5a5a5a5a-5a5a-5a5a-5a5a-5a5a5a5a5a5a', 'litigation_attorney'
  FROM public.staff s WHERE s.user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
INSERT INTO public.assignments (staff_id, entity_type, entity_id, assignment_type)
  SELECT s.id, 'litigation_matter', '6b6b6b6b-6b6b-6b6b-6b6b-6b6b6b6b6b6b', 'litigation_attorney'
  FROM public.staff s WHERE s.user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- A lead INSERT must fire trg_auto_assign_lead + trg_calculate_lead_score without error.
INSERT INTO public.leads (company_id, first_name, last_name, scoring_profile_id)
  VALUES ('22222222-2222-2222-2222-222222222222', 'Trig', 'Lead', 'a9a9a9a9-a9a9-a9a9-a9a9-a9a9a9a9a9a9');

SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.lead_assignment_rules) = 1, 'user B sees only their tenant assignment rule';
  ASSERT (SELECT count(*) FROM public.lead_assignment_rules WHERE name = 'Rule A') = 0,
    'user B must not see tenant A assignment rule';
  ASSERT (SELECT count(*) FROM public.workflow_rules) = 1, 'user B sees only their tenant workflow rule';
  ASSERT (SELECT count(*) FROM public.lead_scoring_profiles) = 1, 'user B sees only their tenant scoring profile';
  ASSERT (SELECT count(*) FROM public.assignments) = 1, 'user B sees only assignments for staff in their company';
  RAISE NOTICE 'PASS 16: lead/workflow engine cross-tenant isolation + lead trigger wiring';
END $$;
RESET ROLE;

-- ---------------------------------------------------------------------------
-- 17. A10 email/templates/signatures/notifications/notes: templates + signature_requests are
--     company-scoped, notifications are user-scoped, and notes resolve company via
--     resolve_entity_company_id(entity_type, entity_id).
-- ---------------------------------------------------------------------------
INSERT INTO public.templates (company_id, name, template_type) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Welcome A', 'email'),
  ('22222222-2222-2222-2222-222222222222', 'Welcome B', 'email');
INSERT INTO public.signature_requests (company_id, entity_type, entity_id, title, short_token)
  SELECT '11111111-1111-1111-1111-111111111111', 'client',
         (SELECT id FROM public.clients WHERE company_id = '11111111-1111-1111-1111-111111111111' LIMIT 1),
         'Retainer A', 'tok-a';
INSERT INTO public.signature_requests (company_id, entity_type, entity_id, title, short_token)
  SELECT '22222222-2222-2222-2222-222222222222', 'client',
         (SELECT id FROM public.clients WHERE company_id = '22222222-2222-2222-2222-222222222222' LIMIT 1),
         'Retainer B', 'tok-b';
INSERT INTO public.notifications (user_id, type, title) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'system_alert', 'For A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'system_alert', 'For B');
-- notes attached to each tenant's client; company resolved via resolve_entity_company_id('client', ...)
INSERT INTO public.notes (entity_type, entity_id, content, created_by)
  SELECT 'client', c.id, 'Note A', (SELECT id FROM public.staff WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  FROM public.clients c WHERE c.company_id = '11111111-1111-1111-1111-111111111111' LIMIT 1;
INSERT INTO public.notes (entity_type, entity_id, content, created_by)
  SELECT 'client', c.id, 'Note B', (SELECT id FROM public.staff WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
  FROM public.clients c WHERE c.company_id = '22222222-2222-2222-2222-222222222222' LIMIT 1;

SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.templates) = 1, 'user B sees only their tenant template';
  ASSERT (SELECT count(*) FROM public.templates WHERE name = 'Welcome A') = 0, 'user B must not see tenant A template';
  ASSERT (SELECT count(*) FROM public.signature_requests) = 1, 'user B sees only their tenant signature request';
  -- notifications are user-scoped; user B may also have a trigger-created matter_assigned notice
  -- (from the group-16 assignment), so assert visibility is confined to user B, not an exact count.
  ASSERT NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id <> 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    'user B must see only their own notifications';
  ASSERT (SELECT count(*) FROM public.notifications WHERE title = 'For B') = 1, 'user B sees their own notification';
  ASSERT (SELECT count(*) FROM public.notifications WHERE title = 'For A') = 0, 'user B must not see user A notifications';
  ASSERT (SELECT count(*) FROM public.notes) = 1, 'user B sees only notes resolving to their company';
  ASSERT (SELECT count(*) FROM public.notes WHERE content = 'Note A') = 0, 'user B must not see tenant A notes';
  RAISE NOTICE 'PASS 17: email/templates/signatures/notifications/notes isolation + entity resolver';
END $$;
RESET ROLE;

-- ---------------------------------------------------------------------------
-- 18. A11 billing/tasks/eligibility: tasks + billing_entries are company-scoped, task_templates
--     are globally readable by authenticated staff. Completes the 94-table surface.
-- ---------------------------------------------------------------------------
INSERT INTO public.tasks (company_id, title) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Task A'),
  ('22222222-2222-2222-2222-222222222222', 'Task B');
INSERT INTO public.billing_entries (company_id, staff_id, entry_type, description, expense_amount, total_amount)
  SELECT '11111111-1111-1111-1111-111111111111',
         (SELECT id FROM public.staff WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
         'expense', 'Filing fee A', 100.00, 100.00;
INSERT INTO public.billing_entries (company_id, staff_id, entry_type, description, expense_amount, total_amount)
  SELECT '22222222-2222-2222-2222-222222222222',
         (SELECT id FROM public.staff WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
         'expense', 'Filing fee B', 100.00, 100.00;
INSERT INTO public.task_templates (name, default_title) VALUES ('Onboarding', 'Welcome the client');

SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.tasks) = 1, 'user B sees only their tenant tasks';
  ASSERT (SELECT count(*) FROM public.tasks WHERE title = 'Task A') = 0, 'user B must not see tenant A tasks';
  ASSERT (SELECT count(*) FROM public.billing_entries) = 1, 'user B sees only their tenant billing entries';
  ASSERT (SELECT count(*) FROM public.task_templates) = 1, 'task templates are globally readable by authenticated staff';
  RAISE NOTICE 'PASS 18: billing/tasks cross-tenant isolation + global task templates';
END $$;
RESET ROLE;

ROLLBACK;
