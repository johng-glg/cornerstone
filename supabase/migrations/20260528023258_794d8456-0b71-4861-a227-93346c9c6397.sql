
-- Phase 1B: Central audit trail log
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

GRANT SELECT ON public.system_audit_log TO authenticated;
GRANT ALL ON public.system_audit_log TO service_role;

ALTER TABLE public.system_audit_log ENABLE ROW LEVEL SECURITY;

-- Staff can read events scoped to a company they can access; admins can read all.
CREATE POLICY "Staff read audit events in accessible companies"
ON public.system_audit_log
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    company_id IS NOT NULL
    AND public.can_access_company(auth.uid(), company_id)
  )
);

-- No UPDATE / DELETE policies => append-only for everyone except service_role (which bypasses RLS).

CREATE INDEX idx_system_audit_log_actor_time
  ON public.system_audit_log (actor_user_id, created_at DESC);

CREATE INDEX idx_system_audit_log_entity
  ON public.system_audit_log (entity_type, entity_id);

CREATE INDEX idx_system_audit_log_company_time
  ON public.system_audit_log (company_id, created_at DESC);

CREATE INDEX idx_system_audit_log_action_time
  ON public.system_audit_log (action, created_at DESC);

-- Helper: single entry point for writing audit events.
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
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id UUID;
  _actor UUID := auth.uid();
  _actor_role TEXT;
  _company UUID := _company_id;
BEGIN
  -- Best-effort actor role lookup (first matching role).
  IF _actor IS NOT NULL THEN
    SELECT role::text INTO _actor_role
    FROM public.user_roles
    WHERE user_id = _actor
    LIMIT 1;
  END IF;

  -- If caller didn't pass a company, fall back to actor's primary company.
  IF _company IS NULL AND _actor IS NOT NULL THEN
    _company := public.get_user_company_id(_actor);
  END IF;

  INSERT INTO public.system_audit_log (
    actor_user_id, actor_role, company_id, action,
    entity_type, entity_id, request_payload, response_payload,
    ip_address, user_agent
  ) VALUES (
    _actor, _actor_role, _company, _action,
    _entity_type, _entity_id, _request_payload, _response_payload,
    _ip_address, _user_agent
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_audit_event(
  TEXT, TEXT, UUID, UUID, JSONB, JSONB, INET, TEXT
) TO authenticated, service_role;
