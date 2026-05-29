-- Docker Compose LOCAL-ONLY bootstrap: emulate the Supabase-managed surface so the full
-- Cornerstone migration chain + seed apply on a stock Postgres image (no Supabase services).
-- Modeled on scripts/schema-harness/bootstrap.sql, extended with the auth columns and
-- auth.identities table that supabase/seed.sql needs to create login-ready users.
--
-- This is NOT a migration and NOT how production runs. It exists only so the Docker Compose
-- DB-only path (docs/dev-setup.md "Path B") can stand up the schema without the Supabase CLI.
-- The authoritative local stack is `supabase start` (Path A); CI verifies on the real stack.

-- Roles --------------------------------------------------------------------
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE supabase_admin NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT anon, authenticated, service_role TO postgres;

-- Extensions (pgcrypto ships with the stock postgres image) -----------------
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- auth ---------------------------------------------------------------------
-- Superset of the harness stub: includes the columns supabase/seed.sql writes
-- (encrypted_password, email_confirmed_at) plus the identities table GoTrue would own.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  instance_id uuid,
  aud text,
  role text,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS auth.identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_data jsonb NOT NULL,
  provider text NOT NULL,
  last_sign_in_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT identities_provider_id_provider_key UNIQUE (provider_id, provider)
);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'authenticated')
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

-- vault --------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS vault;
CREATE TABLE IF NOT EXISTS vault.secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text UNIQUE, secret text NOT NULL, description text DEFAULT ''
);
CREATE OR REPLACE VIEW vault.decrypted_secrets AS
  SELECT id, name, secret AS decrypted_secret, description FROM vault.secrets;
CREATE OR REPLACE FUNCTION vault.create_secret(_secret text, _name text DEFAULT NULL, _description text DEFAULT '')
RETURNS uuid LANGUAGE sql AS $$
  INSERT INTO vault.secrets (name, secret, description) VALUES (_name, _secret, _description)
  ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret RETURNING id
$$;
CREATE OR REPLACE FUNCTION vault.update_secret(_id uuid, _secret text DEFAULT NULL, _name text DEFAULT NULL, _description text DEFAULT NULL)
RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;

-- pg_cron stub -------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS cron;
CREATE OR REPLACE FUNCTION cron.schedule(text, text, text) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
CREATE OR REPLACE FUNCTION cron.unschedule(text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
CREATE OR REPLACE FUNCTION cron.unschedule(bigint) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;

-- pg_net stub --------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS net;
CREATE OR REPLACE FUNCTION net.http_post(url text, body jsonb DEFAULT '{}'::jsonb, params jsonb DEFAULT '{}'::jsonb, headers jsonb DEFAULT '{}'::jsonb, timeout_milliseconds int DEFAULT 5000)
RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;

-- pgmq stub ----------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS pgmq;
CREATE OR REPLACE FUNCTION pgmq.create(queue_name text) RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;
CREATE OR REPLACE FUNCTION pgmq.send(queue_name text, msg jsonb, delay int DEFAULT 0) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
CREATE OR REPLACE FUNCTION pgmq.read(queue_name text, vt int, qty int) RETURNS TABLE(msg_id bigint, read_ct int, enqueued_at timestamptz, vt timestamptz, message jsonb) LANGUAGE sql AS $$ SELECT NULL::bigint, NULL::int, NULL::timestamptz, NULL::timestamptz, NULL::jsonb WHERE false $$;
CREATE OR REPLACE FUNCTION pgmq.delete(queue_name text, msg_id bigint) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;

-- storage stub -------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY, name text, public boolean DEFAULT false, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text REFERENCES storage.buckets(id),
  name text, owner uuid, created_at timestamptz DEFAULT now(), metadata jsonb
);
CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT string_to_array(name, '/')
$$;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

-- realtime stub ------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE TABLE IF NOT EXISTS realtime.messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, topic text, extension text, inserted_at timestamptz DEFAULT now()
);
GRANT USAGE ON SCHEMA realtime TO anon, authenticated, service_role;
DO $$ BEGIN CREATE PUBLICATION supabase_realtime; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
