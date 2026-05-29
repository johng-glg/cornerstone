-- Phase E — Multi-Tenant SaaS Readiness
-- Consolidated clean baseline (ADR-001). Forward-only; rollback SQL inline at the bottom.
--
-- Delivers the tenant-lifecycle backend: a platform-admin role distinct from per-tenant admins,
-- self-service-style provisioning, subdomain routing, a feature-flag catalog (so flags are
-- product-managed not engineer-only), per-tenant usage metrics, and GDPR/CCPA export + deletion.

-- ============================================================================
-- 1. Platform admin (cross-tenant) — distinct from per-tenant `admin` app_role
-- ============================================================================
-- Tenant provisioning and deletion are cross-tenant operations. A per-tenant `admin` must NOT be
-- able to create or delete tenants, so we gate those on a separate platform_admins table rather
-- than the tenant-scoped app_role enum. Membership is managed out-of-band (service role / SQL),
-- never self-service.
CREATE TABLE public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_admins IS
  'Phase E: cross-tenant super-admins (provision/delete tenants). Distinct from the per-tenant admin app_role. Managed via the service role only.';

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (bypasses RLS) reads/writes this table. The helper below is
-- SECURITY DEFINER so RLS-bound callers can still test membership without seeing the table.

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id);
$$;

COMMENT ON FUNCTION public.is_platform_admin(uuid) IS
  'Phase E: true if the user is a cross-tenant platform admin. SECURITY DEFINER so RLS callers can test membership.';

REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated, service_role;

-- ============================================================================
-- 2. Subdomain routing
-- ============================================================================
-- Per-tenant subdomain (e.g. "northstar" → northstar.app.example). Nullable so existing tenants
-- are unaffected; unique (case-insensitive) and format-constrained when set.
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS subdomain TEXT;

-- DNS-label rules: lowercase alphanumeric + hyphen, 1–63 chars, no leading/trailing hyphen.
ALTER TABLE public.companies
  ADD CONSTRAINT companies_subdomain_format
  CHECK (subdomain IS NULL OR subdomain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$');

-- Case-insensitive uniqueness across tenants.
CREATE UNIQUE INDEX companies_subdomain_unique ON public.companies (lower(subdomain))
  WHERE subdomain IS NOT NULL;

COMMENT ON COLUMN public.companies.subdomain IS
  'Phase E: per-tenant subdomain for routing (DNS label; unique, case-insensitive). NULL = shared host.';

-- Resolve a tenant by subdomain (used by the routing layer). SECURITY DEFINER + read-only so the
-- edge/router can map host → company without a tenant context yet.
CREATE OR REPLACE FUNCTION public.resolve_tenant_by_subdomain(_subdomain TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.companies
   WHERE subdomain IS NOT NULL AND lower(subdomain) = lower(_subdomain) AND is_active
   LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_tenant_by_subdomain(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_tenant_by_subdomain(text) TO anon, authenticated, service_role;

-- ============================================================================
-- 3. Feature-flag catalog (flags become product-managed, not engineer-only)
-- ============================================================================
-- tenant_feature_flags (A3) stores per-tenant on/off, but there was no registry of which flags
-- exist / what they mean. The catalog makes the admin UI comprehensive: it can list every flag,
-- its description, and its default, instead of requiring an engineer to know the key strings.
CREATE TABLE public.feature_flag_catalog (
  flag_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  default_enabled BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.feature_flag_catalog IS
  'Phase E: registry of every tenant feature flag (key, label, description, default). Drives the per-tenant flag admin UI.';

ALTER TABLE public.feature_flag_catalog ENABLE ROW LEVEL SECURITY;
-- Catalog is global, non-secret reference data: any authenticated staff may read it; only
-- platform admins may change it (new flags ship via migration, but the policy keeps it tight).
CREATE POLICY "Authenticated can read flag catalog" ON public.feature_flag_catalog
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Platform admins manage flag catalog" ON public.feature_flag_catalog
  FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- Seed the catalog with the flags already in use.
INSERT INTO public.feature_flag_catalog (flag_key, label, description, default_enabled, category) VALUES
  ('leads.paralegal_visibility', 'Paralegal lead visibility',
   'Allow paralegals to see leads for their tenant.', true, 'leads'),
  ('leads.show_in_navigation', 'Show Leads in navigation',
   'Show the Leads section in the main navigation.', true, 'leads')
ON CONFLICT (flag_key) DO NOTHING;

-- Effective flag value = per-tenant override if present, else the catalog default. Replaces the
-- "unknown flag returns false" gap so a tenant with no row still gets the intended default.
CREATE OR REPLACE FUNCTION public.effective_feature_flag(_company_id UUID, _flag_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE _enabled BOOLEAN;
BEGIN
  SELECT enabled INTO _enabled FROM public.tenant_feature_flags
   WHERE company_id = _company_id AND flag_key = _flag_key;
  IF FOUND THEN
    RETURN _enabled;
  END IF;
  SELECT default_enabled INTO _enabled FROM public.feature_flag_catalog WHERE flag_key = _flag_key;
  RETURN COALESCE(_enabled, false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.effective_feature_flag(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_feature_flag(uuid, text) TO authenticated, service_role;

-- ============================================================================
-- 4. Per-tenant usage metrics
-- ============================================================================
-- A per-tenant rollup the admin dashboard + a metrics endpoint can read: users, calls,
-- signatures, transactions. Current totals plus current-calendar-month counts. Defined as a view
-- so it is always live; RLS on the underlying tables means a tenant admin only sees their own row,
-- while a platform admin/service role sees all.
CREATE OR REPLACE VIEW public.tenant_usage_metrics
WITH (security_invoker = true) AS
  SELECT
    c.id AS company_id,
    c.name AS company_name,
    c.subdomain,
    c.is_active,
    (SELECT count(*) FROM public.staff s WHERE s.company_id = c.id) AS staff_total,
    (SELECT count(*) FROM public.staff s WHERE s.company_id = c.id AND s.is_active) AS staff_active,
    (SELECT count(*) FROM public.dialpad_calls d WHERE d.company_id = c.id) AS calls_total,
    (SELECT count(*) FROM public.dialpad_calls d
       WHERE d.company_id = c.id AND d.created_at >= date_trunc('month', now())) AS calls_this_month,
    (SELECT count(*) FROM public.signature_requests sr WHERE sr.company_id = c.id) AS signatures_total,
    (SELECT count(*) FROM public.signature_requests sr
       WHERE sr.company_id = c.id AND sr.created_at >= date_trunc('month', now())) AS signatures_this_month,
    -- transactions are tenant-scoped via client_service_id → client_services.owning_company_id
    (SELECT count(*) FROM public.transactions t
       JOIN public.client_services cs ON cs.id = t.client_service_id
      WHERE cs.owning_company_id = c.id) AS transactions_total,
    (SELECT count(*) FROM public.transactions t
       JOIN public.client_services cs ON cs.id = t.client_service_id
      WHERE cs.owning_company_id = c.id AND t.created_at >= date_trunc('month', now())) AS transactions_this_month,
    (SELECT count(*) FROM public.clients cl WHERE cl.company_id = c.id) AS clients_total
  FROM public.companies c;

COMMENT ON VIEW public.tenant_usage_metrics IS
  'Phase E: per-tenant usage rollup (users/calls/signatures/transactions, total + this month). security_invoker so RLS on base tables scopes each caller.';

GRANT SELECT ON public.tenant_usage_metrics TO authenticated, service_role;

-- ============================================================================
-- 5. Tenant provisioning
-- ============================================================================
-- Creates a tenant + its first admin staff member atomically. Platform-admin gated. The admin's
-- auth.users row is created separately (edge function, via the Auth API); this RPC takes the
-- already-created auth user id and wires up company + staff + admin role.
CREATE OR REPLACE FUNCTION public.provision_tenant(
  _name TEXT,
  _company_type public.company_type,
  _subdomain TEXT,
  _admin_user_id UUID,
  _admin_first_name TEXT,
  _admin_last_name TEXT,
  _admin_email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE _company_id UUID;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'provision_tenant: caller is not a platform admin';
  END IF;
  IF _name IS NULL OR length(trim(_name)) = 0 THEN
    RAISE EXCEPTION 'provision_tenant: name is required';
  END IF;

  INSERT INTO public.companies (name, company_type, subdomain)
  VALUES (_name, _company_type, _subdomain)
  RETURNING id INTO _company_id;

  INSERT INTO public.staff (user_id, company_id, first_name, last_name, email, department, job_title)
  VALUES (_admin_user_id, _company_id, _admin_first_name, _admin_last_name, _admin_email,
          'administration', 'Administrator');

  INSERT INTO public.user_roles (user_id, role) VALUES (_admin_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  PERFORM public.log_audit_event('tenant.provisioned', 'companies', _company_id, _company_id,
    jsonb_build_object('name', _name, 'subdomain', _subdomain, 'admin_user_id', _admin_user_id),
    NULL, NULL, NULL);

  RETURN _company_id;
END;
$$;

COMMENT ON FUNCTION public.provision_tenant(text, public.company_type, text, uuid, text, text, text) IS
  'Phase E: atomically create a tenant + its first admin. Platform-admin gated; audit-logged.';

REVOKE EXECUTE ON FUNCTION public.provision_tenant(text, public.company_type, text, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_tenant(text, public.company_type, text, uuid, text, text, text) TO service_role;

-- ============================================================================
-- 6. Tenant data export + deletion (GDPR / CCPA / consumer request)
-- ============================================================================
-- Export: a JSON snapshot of a tenant's core records. Platform-admin or the tenant's own admin
-- may export their tenant. SECURITY DEFINER so it can read across the tenant's tables in one pass.
CREATE OR REPLACE FUNCTION public.export_tenant_data(_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE _out JSONB;
BEGIN
  IF NOT (public.is_platform_admin()
          OR (public.can_access_company(auth.uid(), _company_id) AND public.has_role(auth.uid(), 'admin'))) THEN
    RAISE EXCEPTION 'export_tenant_data: not authorized for this tenant';
  END IF;

  SELECT jsonb_build_object(
    'exported_at', now(),
    'company', (SELECT to_jsonb(c) FROM public.companies c WHERE c.id = _company_id),
    'staff', (SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) FROM public.staff s WHERE s.company_id = _company_id),
    'clients', (SELECT coalesce(jsonb_agg(to_jsonb(cl)), '[]'::jsonb) FROM public.clients cl WHERE cl.company_id = _company_id),
    'leads', (SELECT coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) FROM public.leads l WHERE l.company_id = _company_id),
    'client_services', (SELECT coalesce(jsonb_agg(to_jsonb(cs)), '[]'::jsonb) FROM public.client_services cs WHERE cs.owning_company_id = _company_id),
    'transactions', (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
       FROM public.transactions t JOIN public.client_services cs ON cs.id = t.client_service_id
      WHERE cs.owning_company_id = _company_id),
    'feature_flags', (SELECT coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb) FROM public.tenant_feature_flags f WHERE f.company_id = _company_id)
  ) INTO _out;

  PERFORM public.log_audit_event('tenant.exported', 'companies', _company_id, _company_id,
    NULL, NULL, NULL, NULL);
  RETURN _out;
END;
$$;

COMMENT ON FUNCTION public.export_tenant_data(uuid) IS
  'Phase E: JSON export of a tenant''s core records (GDPR/CCPA). Platform-admin or the tenant''s own admin; audit-logged. SSN/bank fields remain ciphertext — decrypt separately if required.';

REVOKE EXECUTE ON FUNCTION public.export_tenant_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_tenant_data(uuid) TO authenticated, service_role;

-- Deletion: hard-deletes a tenant. Most child rows cascade from companies (ON DELETE CASCADE);
-- this deletes the company and lets cascades clear the rest. Platform-admin only — irreversible.
-- A guard requires the tenant to be deactivated first (is_active = false), so deletion can't be a
-- single accidental call. Audit-logged BEFORE the delete (the log row's company_id survives).
CREATE OR REPLACE FUNCTION public.delete_tenant_data(_company_id UUID, _confirm_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE _name TEXT; _active BOOLEAN;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'delete_tenant_data: caller is not a platform admin';
  END IF;
  SELECT name, is_active INTO _name, _active FROM public.companies WHERE id = _company_id;
  IF _name IS NULL THEN
    RAISE EXCEPTION 'delete_tenant_data: company % not found', _company_id;
  END IF;
  IF _confirm_name IS DISTINCT FROM _name THEN
    RAISE EXCEPTION 'delete_tenant_data: confirmation name does not match';
  END IF;
  IF _active THEN
    RAISE EXCEPTION 'delete_tenant_data: deactivate the tenant (is_active=false) before deletion';
  END IF;

  PERFORM public.log_audit_event('tenant.deleted', 'companies', _company_id, _company_id,
    jsonb_build_object('name', _name), NULL, NULL, NULL);

  DELETE FROM public.companies WHERE id = _company_id;  -- cascades clear child rows
END;
$$;

COMMENT ON FUNCTION public.delete_tenant_data(uuid, text) IS
  'Phase E: hard-delete a tenant (cascades clear child rows). Platform-admin only; requires the tenant deactivated + a name confirmation; audit-logged. Irreversible.';

REVOKE EXECUTE ON FUNCTION public.delete_tenant_data(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_tenant_data(uuid, text) TO service_role;

-- ============================================================================
-- Rollback (forward-only; this block documents the reverse for ADR-001)
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.delete_tenant_data(uuid, text);
-- DROP FUNCTION IF EXISTS public.export_tenant_data(uuid);
-- DROP FUNCTION IF EXISTS public.provision_tenant(text, public.company_type, text, uuid, text, text, text);
-- DROP VIEW IF EXISTS public.tenant_usage_metrics;
-- DROP FUNCTION IF EXISTS public.effective_feature_flag(uuid, text);
-- DROP TABLE IF EXISTS public.feature_flag_catalog;
-- DROP FUNCTION IF EXISTS public.resolve_tenant_by_subdomain(text);
-- DROP INDEX IF EXISTS public.companies_subdomain_unique;
-- ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_subdomain_format;
-- ALTER TABLE public.companies DROP COLUMN IF EXISTS subdomain;
-- DROP FUNCTION IF EXISTS public.is_platform_admin(uuid);
-- DROP TABLE IF EXISTS public.platform_admins;
