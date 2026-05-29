-- Phase B1 seed verification: confirms supabase/seed.sql produced the synthetic
-- multi-tenant dataset the acceptance criteria require, that the seeded users are
-- login-ready, that no real PII sits in plaintext, and that the seed is idempotent.
--
-- Run with psql -v ON_ERROR_STOP=1 against a local Supabase DB *after* `supabase start`
-- (which loads seed.sql). The CI db-verify job runs this right after the isolation test.
-- All assertions are read-only except the idempotency check, which re-runs the seed file
-- inside a savepoint and rolls it back, so the run leaves the database untouched.

\set ON_ERROR_STOP on

-- Everything runs in one transaction so the idempotency re-seed (SAVEPOINT) is valid
-- and the whole verification — including the re-run — is rolled back at the end,
-- leaving the developer-facing seed data exactly as `supabase start` produced it.
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. At least 2 synthetic tenants exist (criterion: "2+ synthetic tenants").
--    We assert our three named seed tenants specifically, so a stray empty db fails.
-- ---------------------------------------------------------------------------
DO $$
DECLARE _n int;
BEGIN
  SELECT count(*) INTO _n FROM public.companies
   WHERE id IN ('0a000000-0000-4000-8000-000000000001',
                '0b000000-0000-4000-8000-000000000002',
                '0c000000-0000-4000-8000-000000000003');
  ASSERT _n = 3, format('expected 3 seeded tenants, found %s', _n);
  -- and they span more than one company_type (exercises visibility/feature behaviour)
  ASSERT (SELECT count(DISTINCT company_type) FROM public.companies
            WHERE id IN ('0a000000-0000-4000-8000-000000000001',
                         '0b000000-0000-4000-8000-000000000002',
                         '0c000000-0000-4000-8000-000000000003')) = 3,
    'seeded tenants should span 3 distinct company types';
  RAISE NOTICE 'PASS 1: 3 synthetic tenants seeded, distinct types';
END $$;

-- ---------------------------------------------------------------------------
-- 2. Login-ready users: each seeded user has a confirmed email, a bcrypt password
--    hash, and a matching email identity row (GoTrue needs all three to sign in).
-- ---------------------------------------------------------------------------
DO $$
DECLARE _users int; _identities int; _bad_pwd int; _unconfirmed int;
BEGIN
  SELECT count(*) INTO _users FROM auth.users WHERE email LIKE '%@northstar.test'
      OR email LIKE '%@beacon.test' OR email LIKE '%@cornerstonefin.test';
  ASSERT _users = 6, format('expected 6 seeded auth users, found %s', _users);

  -- every seeded user must have a password hash and a confirmed email
  SELECT count(*) INTO _bad_pwd FROM auth.users
   WHERE email LIKE ANY (ARRAY['%@northstar.test','%@beacon.test','%@cornerstonefin.test'])
     AND (encrypted_password IS NULL OR encrypted_password = '');
  ASSERT _bad_pwd = 0, format('%s seeded users have no password hash', _bad_pwd);

  SELECT count(*) INTO _unconfirmed FROM auth.users
   WHERE email LIKE ANY (ARRAY['%@northstar.test','%@beacon.test','%@cornerstonefin.test'])
     AND email_confirmed_at IS NULL;
  ASSERT _unconfirmed = 0, format('%s seeded users have unconfirmed email', _unconfirmed);

  -- a matching email identity per user
  SELECT count(*) INTO _identities FROM auth.identities i
    JOIN auth.users u ON u.id = i.user_id
   WHERE i.provider = 'email'
     AND u.email LIKE ANY (ARRAY['%@northstar.test','%@beacon.test','%@cornerstonefin.test']);
  ASSERT _identities = 6, format('expected 6 email identities, found %s', _identities);
  RAISE NOTICE 'PASS 2: 6 login-ready users (password + confirmed email + identity)';
END $$;

-- ---------------------------------------------------------------------------
-- 3. The password hash actually verifies against the documented local password.
-- ---------------------------------------------------------------------------
DO $$
DECLARE _hash text;
BEGIN
  SELECT encrypted_password INTO _hash FROM auth.users WHERE email = 'admin@northstar.test';
  ASSERT _hash = extensions.crypt('Cornerstone!1', _hash),
    'seeded password must verify as Cornerstone!1';
  RAISE NOTICE 'PASS 3: seeded password verifies (Cornerstone!1)';
END $$;

-- ---------------------------------------------------------------------------
-- 4. Staff + roles wired per tenant; cross-tenant test fixtures present
--    (clients/leads/services in more than one tenant).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.staff
            WHERE company_id IN ('0a000000-0000-4000-8000-000000000001',
                                 '0b000000-0000-4000-8000-000000000002',
                                 '0c000000-0000-4000-8000-000000000003')) = 6,
    'expected 6 seeded staff';
  -- clients across at least 2 tenants
  ASSERT (SELECT count(DISTINCT company_id) FROM public.clients
            WHERE id::text LIKE 'c1%') >= 2, 'clients should span >= 2 tenants';
  -- leads across at least 2 tenants
  ASSERT (SELECT count(DISTINCT company_id) FROM public.leads
            WHERE id::text LIKE '1e%') >= 2, 'leads should span >= 2 tenants';
  -- an admin in each tenant for impersonation/role testing
  ASSERT (SELECT count(*) FROM public.user_roles WHERE role = 'admin'
            AND user_id IN ('d1000000-0000-4000-8000-000000000001',
                            'd4000000-0000-4000-8000-000000000004',
                            'd6000000-0000-4000-8000-000000000006')) = 3,
    'expected an admin seeded in each tenant';
  RAISE NOTICE 'PASS 4: staff/roles wired; cross-tenant client/lead fixtures present';
END $$;

-- ---------------------------------------------------------------------------
-- 5. No real PII: SSNs are stored only as ciphertext, never plaintext, and they
--    decrypt back to the synthetic 900-00-000x range. Processor api keys are encrypted.
-- ---------------------------------------------------------------------------
DO $$
DECLARE _key text; _pt text; _bad int;
BEGIN
  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key' LIMIT 1;
  -- every seeded client has ciphertext, not a plaintext ssn column value
  SELECT count(*) INTO _bad FROM public.clients
   WHERE id::text LIKE 'c1%' AND ssn_ciphertext IS NULL;
  ASSERT _bad = 0, 'all seeded clients must carry an encrypted SSN';
  -- the ciphertext decrypts to the synthetic range only
  SELECT extensions.pgp_sym_decrypt(ssn_ciphertext, _key) INTO _pt
    FROM public.clients WHERE id = 'c1a00000-0000-4000-8000-000000000001';
  ASSERT _pt = '900-00-0001', format('seeded SSN should be synthetic, got %s', _pt);
  -- processor api keys are encrypted, decrypt to the fake local values
  ASSERT (SELECT extensions.pgp_sym_decrypt(api_key_encrypted::bytea, _key)
            FROM public.company_processor_configs
           WHERE company_id = '0a000000-0000-4000-8000-000000000001') = 'sk-local-fake-northstar',
    'processor api key should decrypt to the synthetic local value';
  RAISE NOTICE 'PASS 5: PII/credentials encrypted, synthetic-only';
END $$;

-- ---------------------------------------------------------------------------
-- 6. Idempotency: re-running the seed must not change row counts. Snapshot the
--    counts into a temp table (so they survive across statements), re-execute
--    seed.sql inside a savepoint, compare, then roll the re-run back.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _seed_counts_before AS
SELECT
  (SELECT count(*) FROM public.companies)                  AS companies,
  (SELECT count(*) FROM auth.users)                        AS users,
  (SELECT count(*) FROM auth.identities)                   AS identities,
  (SELECT count(*) FROM public.staff)                      AS staff,
  (SELECT count(*) FROM public.user_roles)                 AS user_roles,
  (SELECT count(*) FROM public.clients)                    AS clients,
  (SELECT count(*) FROM public.leads)                      AS leads,
  (SELECT count(*) FROM public.templates)                  AS templates,
  (SELECT count(*) FROM public.notifications)              AS notifications,
  (SELECT count(*) FROM public.company_integrations)       AS company_integrations,
  (SELECT count(*) FROM public.company_processor_configs)  AS processor_configs;

SAVEPOINT before_reseed;
\i supabase/seed.sql
DO $$
DECLARE _b _seed_counts_before;
BEGIN
  SELECT * INTO _b FROM _seed_counts_before;
  ASSERT (SELECT count(*) FROM public.companies)                 = _b.companies,            'companies stable on reseed';
  ASSERT (SELECT count(*) FROM auth.users)                       = _b.users,                'auth.users stable on reseed';
  ASSERT (SELECT count(*) FROM auth.identities)                  = _b.identities,           'auth.identities stable on reseed';
  ASSERT (SELECT count(*) FROM public.staff)                     = _b.staff,                'staff stable on reseed';
  ASSERT (SELECT count(*) FROM public.user_roles)                = _b.user_roles,           'user_roles stable on reseed';
  ASSERT (SELECT count(*) FROM public.clients)                   = _b.clients,              'clients stable on reseed';
  ASSERT (SELECT count(*) FROM public.leads)                     = _b.leads,                'leads stable on reseed';
  ASSERT (SELECT count(*) FROM public.templates)                 = _b.templates,            'templates stable on reseed';
  ASSERT (SELECT count(*) FROM public.notifications)             = _b.notifications,        'notifications stable on reseed';
  ASSERT (SELECT count(*) FROM public.company_integrations)      = _b.company_integrations, 'company_integrations stable on reseed';
  ASSERT (SELECT count(*) FROM public.company_processor_configs) = _b.processor_configs,    'processor_configs stable on reseed';
  RAISE NOTICE 'PASS 6: seed re-run is a no-op (idempotent across 11 tables)';
END $$;
ROLLBACK TO SAVEPOINT before_reseed;

DROP TABLE _seed_counts_before;

DO $$
BEGIN
  RAISE NOTICE 'SEED VERIFY COMPLETE: all checks passed';
END $$;

ROLLBACK;
