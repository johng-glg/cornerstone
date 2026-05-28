
-- 1. Feature flag table
CREATE TABLE public.tenant_feature_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  flag_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, flag_key)
);

CREATE INDEX idx_tenant_feature_flags_company ON public.tenant_feature_flags(company_id);
CREATE INDEX idx_tenant_feature_flags_key ON public.tenant_feature_flags(flag_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_feature_flags TO authenticated;
GRANT ALL ON public.tenant_feature_flags TO service_role;

ALTER TABLE public.tenant_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view company feature flags"
ON public.tenant_feature_flags FOR SELECT TO authenticated
USING (public.can_access_company(auth.uid(), company_id));

CREATE POLICY "Admins can insert feature flags"
ON public.tenant_feature_flags FOR INSERT TO authenticated
WITH CHECK (
  public.can_access_company(auth.uid(), company_id)
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update feature flags"
ON public.tenant_feature_flags FOR UPDATE TO authenticated
USING (
  public.can_access_company(auth.uid(), company_id)
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete feature flags"
ON public.tenant_feature_flags FOR DELETE TO authenticated
USING (
  public.can_access_company(auth.uid(), company_id)
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE TRIGGER trg_tenant_feature_flags_updated_at
BEFORE UPDATE ON public.tenant_feature_flags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Lookup helper. Returns the explicit row's `enabled` if set; otherwise
--    the registry default for known flags; otherwise false.
CREATE OR REPLACE FUNCTION public.is_feature_enabled(_company_id uuid, _flag_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _enabled boolean;
  _default boolean;
BEGIN
  SELECT enabled INTO _enabled
  FROM public.tenant_feature_flags
  WHERE company_id = _company_id AND flag_key = _flag_key;

  IF FOUND THEN
    RETURN _enabled;
  END IF;

  -- Registry of built-in defaults (keep in sync with frontend FEATURE_FLAG_REGISTRY)
  _default := CASE _flag_key
    WHEN 'leads.paralegal_visibility' THEN false
    WHEN 'leads.show_in_navigation'  THEN true
    ELSE false
  END;

  RETURN COALESCE(_default, false);
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.is_feature_enabled(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_feature_enabled(uuid, text) TO authenticated, service_role;

-- 3. Lead visibility helper. Paralegals are gated by the flag; everyone else
--    keeps existing access.
CREATE OR REPLACE FUNCTION public.can_view_leads(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _has_any_non_paralegal boolean;
  _is_paralegal boolean;
BEGIN
  IF NOT public.can_access_company(_user_id, _company_id) THEN
    RETURN false;
  END IF;

  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role <> 'paralegal'::app_role
    ),
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'paralegal'::app_role
    )
  INTO _has_any_non_paralegal, _is_paralegal;

  -- If the user holds any role other than paralegal, the paralegal gate
  -- does not apply.
  IF _has_any_non_paralegal THEN
    RETURN true;
  END IF;

  -- Pure paralegal: only if the company has explicitly opted in.
  IF _is_paralegal THEN
    RETURN public.is_feature_enabled(_company_id, 'leads.paralegal_visibility');
  END IF;

  -- No roles assigned: fall back to company access (legacy behavior).
  RETURN true;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.can_view_leads(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_leads(uuid, uuid) TO authenticated, service_role;

-- 4. Wire into leads RLS
DROP POLICY IF EXISTS "Staff can view company leads" ON public.leads;
DROP POLICY IF EXISTS "Staff can manage company leads" ON public.leads;

CREATE POLICY "Staff can view company leads"
ON public.leads FOR SELECT TO authenticated
USING (public.can_view_leads(auth.uid(), company_id));

CREATE POLICY "Staff can manage company leads"
ON public.leads FOR ALL TO authenticated
USING (public.can_view_leads(auth.uid(), company_id))
WITH CHECK (public.can_view_leads(auth.uid(), company_id));

-- 5. Seed default-off paralegal visibility flag for every existing company
INSERT INTO public.tenant_feature_flags (company_id, flag_key, enabled, description)
SELECT c.id, 'leads.paralegal_visibility', false,
       'When ON, users whose only role is "paralegal" can see and manage the lead pipeline for this company.'
FROM public.companies c
ON CONFLICT (company_id, flag_key) DO NOTHING;
