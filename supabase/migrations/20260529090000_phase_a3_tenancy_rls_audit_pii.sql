-- Phase A3 — Tenancy + RLS + Audit + PII spine
-- Consolidated clean baseline (ADR-001). Transcribed from the final-state definitions in
-- lovable-source (foundation migration + Phase 1B/1C/2A/2B). Table-independent foundation only:
-- the decrypt_* helpers, can_view_leads, and audit-trigger attachments to clients/leads/etc.
-- depend on A5 tables and land there.
--
-- Forward-only. Rollback SQL inline at the bottom of this file.

-- ============================================================================
-- Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- ============================================================================
-- Enums (tenancy/access)
-- ============================================================================
CREATE TYPE public.company_type AS ENUM ('law_firm', 'affiliate', 'financing_company');

CREATE TYPE public.data_visibility AS ENUM ('own_only', 'parent_and_own', 'full_hierarchy');

CREATE TYPE public.department AS ENUM (
  'admin', 'sales_intake', 'client_services', 'attorney',
  'case_manager', 'negotiations', 'payment_processing', 'correspondence'
);

CREATE TYPE public.app_role AS ENUM (
  'admin', 'attorney', 'paralegal', 'negotiator', 'case_manager',
  'sales_rep', 'client_services_rep', 'payment_processor', 'correspondent', 'viewer'
);

-- ============================================================================
-- Shared trigger helper: maintain updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Tables
-- ============================================================================
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_type public.company_type NOT NULL DEFAULT 'law_firm',
  parent_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  data_visibility public.data_visibility NOT NULL DEFAULT 'own_only',
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department public.department NOT NULL,
  job_title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_staff_user_id ON public.staff (user_id);
CREATE INDEX idx_staff_company_id ON public.staff (company_id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user_id ON public.user_roles (user_id);

CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  module TEXT NOT NULL,
  can_read BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_update BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, module)
);

CREATE TABLE public.role_special_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, permission)
);

CREATE TABLE public.tenant_feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  flag_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, flag_key)
);
CREATE INDEX idx_tenant_feature_flags_company ON public.tenant_feature_flags (company_id);
CREATE INDEX idx_tenant_feature_flags_key ON public.tenant_feature_flags (flag_key);

CREATE TABLE public.system_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID,
  actor_role TEXT,
  company_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  request_payload JSONB,
  response_payload JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_system_audit_log_actor_time ON public.system_audit_log (actor_user_id, created_at DESC);
CREATE INDEX idx_system_audit_log_entity ON public.system_audit_log (entity_type, entity_id);
CREATE INDEX idx_system_audit_log_company_time ON public.system_audit_log (company_id, created_at DESC);
CREATE INDEX idx_system_audit_log_action_time ON public.system_audit_log (action, created_at DESC);

-- ============================================================================
-- Access-control helper functions (SECURITY DEFINER, search_path pinned)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.staff WHERE user_id = _user_id LIMIT 1
$$;

-- Final form: bidirectional parent/child access (lovable-source line 5243).
CREATE OR REPLACE FUNCTION public.can_access_company(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = _user_id
    AND (
      s.company_id = _company_id
      OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = _company_id AND c.parent_company_id = s.company_id)
      OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = s.company_id AND c.parent_company_id = _company_id)
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.is_feature_enabled(_company_id UUID, _flag_key TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  _enabled BOOLEAN;
  _default BOOLEAN;
BEGIN
  SELECT enabled INTO _enabled FROM public.tenant_feature_flags
  WHERE company_id = _company_id AND flag_key = _flag_key;
  IF FOUND THEN
    RETURN _enabled;
  END IF;
  _default := CASE _flag_key
    WHEN 'leads.paralegal_visibility' THEN false
    WHEN 'leads.show_in_navigation' THEN true
    ELSE false
  END;
  RETURN COALESCE(_default, false);
END;
$fn$;

-- ============================================================================
-- Central audit trail
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action TEXT,
  _entity_type TEXT DEFAULT NULL,
  _entity_id UUID DEFAULT NULL,
  _company_id UUID DEFAULT NULL,
  _request_payload JSONB DEFAULT NULL,
  _response_payload JSONB DEFAULT NULL,
  _ip_address INET DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _id UUID;
  _actor UUID := auth.uid();
  _actor_role TEXT;
  _company UUID := _company_id;
BEGIN
  IF _actor IS NOT NULL THEN
    SELECT role::text INTO _actor_role FROM public.user_roles WHERE user_id = _actor LIMIT 1;
  END IF;
  IF _company IS NULL AND _actor IS NOT NULL THEN
    _company := public.get_user_company_id(_actor);
  END IF;
  INSERT INTO public.system_audit_log (
    actor_user_id, actor_role, company_id, action,
    entity_type, entity_id, request_payload, response_payload, ip_address, user_agent
  ) VALUES (
    _actor, _actor_role, _company, _action,
    _entity_type, _entity_id, _request_payload, _response_payload, _ip_address, _user_agent
  ) RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row jsonb;
  _old jsonb;
  _new jsonb;
  _entity_id uuid;
  _company_id uuid;
  _payload jsonb;
  _action text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _row := to_jsonb(OLD); _old := _row; _new := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    _row := to_jsonb(NEW); _old := NULL; _new := _row;
  ELSE
    _row := to_jsonb(NEW); _old := to_jsonb(OLD); _new := _row;
  END IF;

  BEGIN _entity_id := (_row ->> 'id')::uuid;
  EXCEPTION WHEN OTHERS THEN _entity_id := NULL; END;

  BEGIN _company_id := COALESCE(
    (_row ->> 'company_id')::uuid,
    (_row ->> 'owning_company_id')::uuid,
    (_row ->> 'originating_company_id')::uuid);
  EXCEPTION WHEN OTHERS THEN _company_id := NULL; END;

  _action := TG_TABLE_NAME || '.' || lower(TG_OP);
  _payload := jsonb_build_object('op', TG_OP, 'table', TG_TABLE_NAME, 'old', _old, 'new', _new);
  PERFORM public.log_audit_event(_action, TG_TABLE_NAME, _entity_id, _company_id, _payload, NULL, NULL, NULL);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- ============================================================================
-- PII encryption (generic helper; vault-backed). Decrypt helpers land in A5 with
-- their dependent tables (clients/lead_banking).
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key') THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'pii_encryption_key',
      'Cornerstone — symmetric key for pgp_sym_encrypt on SSN + banking ciphertext columns'
    );
  END IF;
END
$$;

-- Divergence (sync log): qualify pgp_sym_encrypt with extensions schema + pin search_path
-- (Lovable's final form called it unqualified under search_path=public, which is fragile).
CREATE OR REPLACE FUNCTION public.encrypt_pii(_plaintext TEXT)
RETURNS BYTEA LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, vault AS $$
DECLARE
  _key TEXT;
BEGIN
  IF _plaintext IS NULL OR length(_plaintext) = 0 THEN
    RETURN NULL;
  END IF;
  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key' LIMIT 1;
  IF _key IS NULL THEN
    RAISE EXCEPTION 'PII encryption key not configured in vault';
  END IF;
  RETURN extensions.pgp_sym_encrypt(_plaintext, _key);
END;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_special_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_audit_log ENABLE ROW LEVEL SECURITY;

-- Companies
CREATE POLICY "Staff can view accessible companies" ON public.companies
  FOR SELECT TO authenticated USING (public.can_access_company(auth.uid(), id));

-- Staff
CREATE POLICY "Staff can view accessible staff" ON public.staff
  FOR SELECT TO authenticated USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Staff can update own profile" ON public.staff
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- User roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Role permissions (readable by all authenticated; admin-managed)
CREATE POLICY "Authenticated users can read role_permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert role_permissions" ON public.role_permissions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update role_permissions" ON public.role_permissions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete role_permissions" ON public.role_permissions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read role_special_permissions" ON public.role_special_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage role_special_permissions" ON public.role_special_permissions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Tenant feature flags (staff read; admin write within company scope)
CREATE POLICY "Staff can view company feature flags" ON public.tenant_feature_flags
  FOR SELECT TO authenticated USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Admins can insert feature flags" ON public.tenant_feature_flags
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update feature flags" ON public.tenant_feature_flags
  FOR UPDATE TO authenticated
  USING (public.can_access_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete feature flags" ON public.tenant_feature_flags
  FOR DELETE TO authenticated
  USING (public.can_access_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'));

-- System audit log (append-only; staff read within accessible company, admins read all).
-- No UPDATE/DELETE policies => append-only for everyone except service_role (bypasses RLS).
CREATE POLICY "Staff read audit events in accessible companies" ON public.system_audit_log
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (company_id IS NOT NULL AND public.can_access_company(auth.uid(), company_id))
  );

-- ============================================================================
-- updated_at + audit triggers
-- ============================================================================
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_role_permissions_updated_at BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tenant_feature_flags_updated_at BEFORE UPDATE ON public.tenant_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit triggers on the spine tables that are in Lovable's audited set and exist now.
-- (clients/client_services/leads/settlements/transactions/eligibility_reviews/
--  litigation_matters/billing_entries/lead_banking attach in A5+ with their tables.)
CREATE TRIGGER trg_audit_staff AFTER INSERT OR UPDATE OR DELETE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER trg_audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- ============================================================================
-- Grants
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.companies, public.staff, public.user_roles, public.role_permissions,
  public.role_special_permissions, public.tenant_feature_flags TO authenticated;
GRANT SELECT ON public.system_audit_log TO authenticated;
GRANT ALL ON
  public.companies, public.staff, public.user_roles, public.role_permissions,
  public.role_special_permissions, public.tenant_feature_flags, public.system_audit_log TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_feature_enabled(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.encrypt_pii(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_trigger_fn() FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_company_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_company(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_feature_enabled(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.encrypt_pii(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, uuid, jsonb, jsonb, inet, text) TO authenticated, service_role;

-- ============================================================================
-- ROLLBACK (manual; forward-only policy — apply in reverse if ever needed)
-- ============================================================================
-- DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
-- DROP TRIGGER IF EXISTS trg_audit_staff ON public.staff;
-- DROP TRIGGER IF EXISTS trg_tenant_feature_flags_updated_at ON public.tenant_feature_flags;
-- DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON public.role_permissions;
-- DROP TRIGGER IF EXISTS update_staff_updated_at ON public.staff;
-- DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
-- DROP FUNCTION IF EXISTS public.encrypt_pii(text);
-- DROP FUNCTION IF EXISTS public.audit_trigger_fn();
-- DROP FUNCTION IF EXISTS public.log_audit_event(text, text, uuid, uuid, jsonb, jsonb, inet, text);
-- DROP FUNCTION IF EXISTS public.is_feature_enabled(uuid, text);
-- DROP FUNCTION IF EXISTS public.can_access_company(uuid, uuid);
-- DROP FUNCTION IF EXISTS public.get_user_company_id(uuid);
-- DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
-- DROP TABLE IF EXISTS public.system_audit_log;
-- DROP TABLE IF EXISTS public.tenant_feature_flags;
-- DROP TABLE IF EXISTS public.role_special_permissions;
-- DROP TABLE IF EXISTS public.role_permissions;
-- DROP TABLE IF EXISTS public.user_roles;
-- DROP TABLE IF EXISTS public.staff;
-- DROP TABLE IF EXISTS public.companies;
-- DROP FUNCTION IF EXISTS public.update_updated_at_column();
-- DROP TYPE IF EXISTS public.app_role;
-- DROP TYPE IF EXISTS public.department;
-- DROP TYPE IF EXISTS public.data_visibility;
-- DROP TYPE IF EXISTS public.company_type;
-- (vault secret 'pii_encryption_key' intentionally retained; deleting it makes ciphertext unrecoverable.)
