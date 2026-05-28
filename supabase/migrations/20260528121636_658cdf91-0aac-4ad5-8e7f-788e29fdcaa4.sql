
-- Helper: resolve owning company for a polymorphic entity reference
CREATE OR REPLACE FUNCTION public.resolve_entity_company_id(_entity_type text, _entity_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _co uuid;
BEGIN
  IF _entity_type IS NULL OR _entity_id IS NULL THEN
    RETURN NULL;
  END IF;
  CASE _entity_type
    WHEN 'client' THEN
      SELECT company_id INTO _co FROM public.clients WHERE id = _entity_id;
    WHEN 'lead' THEN
      SELECT company_id INTO _co FROM public.leads WHERE id = _entity_id;
    WHEN 'client_service' THEN
      SELECT owning_company_id INTO _co FROM public.client_services WHERE id = _entity_id;
    WHEN 'litigation_matter' THEN
      SELECT cs.owning_company_id INTO _co
      FROM public.litigation_matters m
      JOIN public.client_services cs ON cs.id = m.client_service_id
      WHERE m.id = _entity_id;
    WHEN 'liability' THEN
      SELECT cs.owning_company_id INTO _co
      FROM public.liabilities l
      JOIN public.client_services cs ON cs.id = l.client_service_id
      WHERE l.id = _entity_id;
    WHEN 'transaction' THEN
      SELECT cs.owning_company_id INTO _co
      FROM public.transactions t
      JOIN public.client_services cs ON cs.id = t.client_service_id
      WHERE t.id = _entity_id;
    WHEN 'task' THEN
      SELECT company_id INTO _co FROM public.tasks WHERE id = _entity_id;
    ELSE
      _co := NULL;
  END CASE;
  RETURN _co;
END
$$;
REVOKE EXECUTE ON FUNCTION public.resolve_entity_company_id(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_entity_company_id(text, uuid) TO authenticated, service_role;

-- notes
DROP POLICY IF EXISTS "Authenticated users can read notes" ON public.notes;
CREATE POLICY "Staff can read notes for their company"
ON public.notes
FOR SELECT
TO authenticated
USING (
  public.can_access_company(
    auth.uid(),
    public.resolve_entity_company_id(entity_type, entity_id)
  )
);

-- note_mentions
DROP POLICY IF EXISTS "Authenticated users can read note mentions" ON public.note_mentions;
CREATE POLICY "Staff can read note mentions for their company"
ON public.note_mentions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.notes n
    WHERE n.id = note_mentions.note_id
      AND public.can_access_company(
        auth.uid(),
        public.resolve_entity_company_id(n.entity_type, n.entity_id)
      )
  )
);

-- appearance_requests
DROP POLICY IF EXISTS "Authenticated users can view appearance requests" ON public.appearance_requests;
CREATE POLICY "Staff can view appearance requests for their company"
ON public.appearance_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.litigation_matters m
    JOIN public.client_services cs ON cs.id = m.client_service_id
    WHERE m.id = appearance_requests.matter_id
      AND public.can_access_company(auth.uid(), cs.owning_company_id)
  )
);

-- filing_fees
DROP POLICY IF EXISTS "Authenticated users can view filing fees" ON public.filing_fees;
CREATE POLICY "Staff can view filing fees for their company"
ON public.filing_fees
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.litigation_matters m
    JOIN public.client_services cs ON cs.id = m.client_service_id
    WHERE m.id = filing_fees.matter_id
      AND public.can_access_company(auth.uid(), cs.owning_company_id)
  )
);

-- plsa_sync_log → admins only
DROP POLICY IF EXISTS "Staff can view sync logs" ON public.plsa_sync_log;
CREATE POLICY "Admins can view sync logs"
ON public.plsa_sync_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- feature_requests → submitter or admin
DROP POLICY IF EXISTS "Authenticated users can view feature requests" ON public.feature_requests;
CREATE POLICY "Submitters and admins can view feature requests"
ON public.feature_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = submitted_by
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- creditor_contacts → active staff only (still global reference data)
DROP POLICY IF EXISTS "Authenticated users can view creditor contacts" ON public.creditor_contacts;
CREATE POLICY "Active staff can view creditor contacts"
ON public.creditor_contacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = auth.uid() AND s.is_active = true
  )
);

-- role_permissions → only rows for roles the caller holds (admins see all)
DROP POLICY IF EXISTS "Authenticated users can read role_permissions" ON public.role_permissions;
CREATE POLICY "Users can read permissions for their own roles"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- role_special_permissions → same
DROP POLICY IF EXISTS "Authenticated users can read role_special_permissions" ON public.role_special_permissions;
CREATE POLICY "Users can read special permissions for their own roles"
ON public.role_special_permissions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
