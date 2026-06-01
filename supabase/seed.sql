-- ============================================================================
-- Cornerstone local seed — Phase B1
-- ============================================================================
-- Synthetic, PII-free multi-tenant data for local development. Loaded automatically
-- by `supabase start` / `supabase db reset` (see [db.seed] in supabase/config.toml).
--
-- Design contract:
--   * IDEMPOTENT. Every statement is ON CONFLICT-guarded or existence-checked, so
--     re-running the seed (or running it on top of an already-seeded db) is a no-op.
--   * NO REAL PII. Names, emails, phones, and SSNs are obviously fake. SSNs are stored
--     only through encrypt_pii(), never in plaintext columns.
--   * CI-SAFE. The db-verify CI job runs `supabase start` (which loads THIS file) and
--     then tests/db/rls_isolation.test.sql. That test creates its own fixtures in tenants
--     11111111-… / 22222222-… and asserts several UNSCOPED counts (e.g. task_templates).
--     To avoid colliding with it, this seed:
--       - uses a disjoint UUID space (synthetic tenants 0a/0b/0c…, users d1/d2/…);
--       - never inserts into globally-readable tables the test counts unscoped
--         (task_templates, payment_processors with a fixed id, law_firms by name, etc.).
--     The isolation test wraps its work in BEGIN/ROLLBACK, so its fixtures never persist;
--     this seed's rows are the only ones a developer sees after `db reset`.
--
-- Login credentials (local only): every seeded user has password `Cornerstone!1`.
-- ============================================================================

-- Tenants -------------------------------------------------------------------
-- 0a… = Northstar Legal (law_firm), 0b… = Beacon Debt Partners (affiliate),
-- 0c… = Cornerstone Financing (financing_company). Three types so feature/visibility
-- behaviour can be exercised locally.
INSERT INTO public.companies (id, name, company_type, data_visibility, city, state, is_active)
VALUES
  ('0a000000-0000-4000-8000-000000000001', 'Northstar Legal Group',  'law_firm',          'own_only',  'Austin',  'TX', true),
  ('0b000000-0000-4000-8000-000000000002', 'Beacon Debt Partners',   'affiliate',         'own_only',  'Denver',  'CO', true),
  ('0c000000-0000-4000-8000-000000000003', 'Cornerstone Financing',  'financing_company', 'own_only',  'Phoenix', 'AZ', true)
ON CONFLICT (id) DO NOTHING;

-- Auth users + identities ----------------------------------------------------
-- Login-ready: confirmed email, bcrypt password hash, and a matching email identity
-- (GoTrue requires the identity row for email/password sign-in). All idempotent.
-- Password for every user: Cornerstone!1
DO $$
DECLARE
  _pwd  text := extensions.crypt('Cornerstone!1', extensions.gen_salt('bf'));
  _now  timestamptz := now();
  _u    record;
BEGIN
  FOR _u IN
    SELECT * FROM (VALUES
      ('d1000000-0000-4000-8000-000000000001'::uuid, 'admin@northstar.test'),
      ('d2000000-0000-4000-8000-000000000002'::uuid, 'attorney@northstar.test'),
      ('d3000000-0000-4000-8000-000000000003'::uuid, 'paralegal@northstar.test'),
      ('d4000000-0000-4000-8000-000000000004'::uuid, 'admin@beacon.test'),
      ('d5000000-0000-4000-8000-000000000005'::uuid, 'casemanager@beacon.test'),
      ('d6000000-0000-4000-8000-000000000006'::uuid, 'admin@cornerstonefin.test')
    ) AS t(id, email)
  LOOP
    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      -- GoTrue scans these token columns as non-null text; NULL here causes
      -- "Database error querying schema" at login, so seed them as ''.
      confirmation_token, recovery_token, email_change,
      email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    )
    VALUES (
      _u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', _u.email,
      _pwd, _now,
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      _now, _now,
      '', '', '', '', '', '', '', ''
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), _u.id::text, _u.id,
      jsonb_build_object('sub', _u.id::text, 'email', _u.email, 'email_verified', true),
      'email', _now, _now, _now
    )
    ON CONFLICT (provider_id, provider) DO NOTHING;
  END LOOP;
END $$;

-- Staff (one row per user, scoped to a tenant) ------------------------------
INSERT INTO public.staff (user_id, company_id, first_name, last_name, email, department, job_title)
VALUES
  ('d1000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-000000000001', 'Nadia',  'Admin',    'admin@northstar.test',       'administration',  'Managing Partner'),
  ('d2000000-0000-4000-8000-000000000002', '0a000000-0000-4000-8000-000000000001', 'Theo',   'Counsel',  'attorney@northstar.test',    'legal',           'Associate Attorney'),
  ('d3000000-0000-4000-8000-000000000003', '0a000000-0000-4000-8000-000000000001', 'Priya',  'Para',     'paralegal@northstar.test',   'legal',           'Paralegal'),
  ('d4000000-0000-4000-8000-000000000004', '0b000000-0000-4000-8000-000000000002', 'Bianca', 'Admin',    'admin@beacon.test',          'administration',  'Operations Director'),
  ('d5000000-0000-4000-8000-000000000005', '0b000000-0000-4000-8000-000000000002', 'Marco',  'Case',     'casemanager@beacon.test',    'client_services', 'Case Manager'),
  ('d6000000-0000-4000-8000-000000000006', '0c000000-0000-4000-8000-000000000003', 'Fiona',  'Finance',  'admin@cornerstonefin.test',  'administration',  'Finance Lead')
ON CONFLICT (user_id) DO NOTHING;

-- Roles ----------------------------------------------------------------------
INSERT INTO public.user_roles (user_id, role)
VALUES
  ('d1000000-0000-4000-8000-000000000001', 'admin'),
  ('d2000000-0000-4000-8000-000000000002', 'attorney'),
  ('d3000000-0000-4000-8000-000000000003', 'paralegal'),
  ('d4000000-0000-4000-8000-000000000004', 'admin'),
  ('d5000000-0000-4000-8000-000000000005', 'case_manager'),
  ('d6000000-0000-4000-8000-000000000006', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Feature flags (per tenant) -------------------------------------------------
INSERT INTO public.tenant_feature_flags (company_id, flag_key, enabled)
VALUES
  ('0a000000-0000-4000-8000-000000000001', 'leads.paralegal_visibility', true),
  ('0b000000-0000-4000-8000-000000000002', 'leads.paralegal_visibility', false),
  ('0c000000-0000-4000-8000-000000000003', 'leads.paralegal_visibility', false)
ON CONFLICT (company_id, flag_key) DO NOTHING;

-- Clients (with synthetic, encrypted SSNs — never plaintext) -----------------
INSERT INTO public.clients (id, company_id, first_name, last_name, email, ssn_last4, ssn_ciphertext)
VALUES
  ('c1a00000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-000000000001', 'Quinn',  'Demo',   'quinn.demo@example.test',  '0001', public.encrypt_pii('900-00-0001')),
  ('c1a00000-0000-4000-8000-000000000002', '0a000000-0000-4000-8000-000000000001', 'Robin',  'Sample', 'robin.sample@example.test','0002', public.encrypt_pii('900-00-0002')),
  ('c1b00000-0000-4000-8000-000000000003', '0b000000-0000-4000-8000-000000000002', 'Sky',    'Tester', 'sky.tester@example.test',  '0003', public.encrypt_pii('900-00-0003'))
ON CONFLICT (id) DO NOTHING;

-- Leads (lead_number auto-generated by trigger when NULL) --------------------
INSERT INTO public.leads (id, company_id, first_name, last_name)
VALUES
  ('1ea00000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-000000000001', 'Avery',  'Prospect'),
  ('1ea00000-0000-4000-8000-000000000002', '0a000000-0000-4000-8000-000000000001', 'Blake',  'Inquiry'),
  ('1eb00000-0000-4000-8000-000000000003', '0b000000-0000-4000-8000-000000000002', 'Casey',  'Lead')
ON CONFLICT (id) DO NOTHING;

-- Client services + a liability (the engagement spine the UI hangs off) ------
INSERT INTO public.client_services (id, service_number, owning_company_id)
VALUES
  ('5e000000-0000-4000-8000-000000000001', 'CS-NS-0001', '0a000000-0000-4000-8000-000000000001'),
  ('5e000000-0000-4000-8000-000000000002', 'CS-BD-0001', '0b000000-0000-4000-8000-000000000002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.liabilities (id, client_service_id, liability_type)
VALUES
  ('11a00000-0000-4000-8000-000000000001', '5e000000-0000-4000-8000-000000000001', 'credit_card'),
  ('11b00000-0000-4000-8000-000000000002', '5e000000-0000-4000-8000-000000000002', 'credit_card')
ON CONFLICT (id) DO NOTHING;

-- PLSA processor config (per tenant) ----------------------------------------
-- One shared synthetic mock processor; per-tenant config carries an *encrypted* fake
-- api key, mirroring the production "creds never in plaintext" contract (Q-A4).
INSERT INTO public.payment_processors (id, name, processor_type)
VALUES ('da000000-0000-4000-8000-000000000001', 'Local Mock Processor', 'mock')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.company_processor_configs (company_id, processor_id, is_default, api_key_encrypted, config)
VALUES
  ('0a000000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-000000000001', true,
     public.encrypt_pii('sk-local-fake-northstar')::text, '{"client_id":"local-northstar"}'::jsonb),
  ('0b000000-0000-4000-8000-000000000002', 'da000000-0000-4000-8000-000000000001', true,
     public.encrypt_pii('sk-local-fake-beacon')::text,    '{"client_id":"local-beacon"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Integrations (per tenant, disabled by default) -----------------------------
INSERT INTO public.company_integrations (company_id, provider_key, is_enabled)
VALUES
  ('0a000000-0000-4000-8000-000000000001', 'docuseal', false),
  ('0a000000-0000-4000-8000-000000000001', 'dialpad',  false),
  ('0b000000-0000-4000-8000-000000000002', 'docuseal', false)
ON CONFLICT DO NOTHING;

-- Email templates (per tenant) ----------------------------------------------
-- Explicit ids: templates has no natural unique key, so a fixed id is what makes
-- re-running the seed a no-op rather than inserting duplicates.
INSERT INTO public.templates (id, company_id, name, template_type, content)
VALUES
  ('7e000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-000000000001', 'Welcome — Northstar', 'email', 'Hello {{first_name}}, welcome to Northstar Legal.'),
  ('7e000000-0000-4000-8000-000000000002', '0b000000-0000-4000-8000-000000000002', 'Welcome — Beacon',    'email', 'Hello {{first_name}}, welcome to Beacon Debt Partners.')
ON CONFLICT (id) DO NOTHING;

-- A welcome notification for each admin ------------------------------------
-- Explicit ids for the same idempotency reason (notifications has only a PK).
INSERT INTO public.notifications (id, user_id, type, title)
VALUES
  ('40000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'system_alert', 'Welcome to your local Cornerstone tenant'),
  ('40000000-0000-4000-8000-000000000002', 'd4000000-0000-4000-8000-000000000004', 'system_alert', 'Welcome to your local Cornerstone tenant'),
  ('40000000-0000-4000-8000-000000000003', 'd6000000-0000-4000-8000-000000000006', 'system_alert', 'Welcome to your local Cornerstone tenant')
ON CONFLICT (id) DO NOTHING;
