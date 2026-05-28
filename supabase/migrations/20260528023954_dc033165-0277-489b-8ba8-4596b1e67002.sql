
ALTER FUNCTION public.check_trigger_match(jsonb, jsonb) SET search_path = public;

DROP POLICY IF EXISTS "Authenticated users can insert appearance requests" ON public.appearance_requests;
DROP POLICY IF EXISTS "Authenticated users can update appearance requests" ON public.appearance_requests;
DROP POLICY IF EXISTS "Authenticated users can delete appearance requests" ON public.appearance_requests;

CREATE POLICY "Staff can insert appearance requests for their company"
ON public.appearance_requests FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.litigation_matters m
  JOIN public.client_services cs ON cs.id = m.client_service_id
  WHERE m.id = appearance_requests.matter_id
    AND public.can_access_company(auth.uid(), cs.owning_company_id)
));

CREATE POLICY "Staff can update appearance requests for their company"
ON public.appearance_requests FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.litigation_matters m
  JOIN public.client_services cs ON cs.id = m.client_service_id
  WHERE m.id = appearance_requests.matter_id
    AND public.can_access_company(auth.uid(), cs.owning_company_id)
));

CREATE POLICY "Admins can delete appearance requests"
ON public.appearance_requests FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can insert filing fees" ON public.filing_fees;
DROP POLICY IF EXISTS "Authenticated users can update filing fees" ON public.filing_fees;
DROP POLICY IF EXISTS "Authenticated users can delete filing fees" ON public.filing_fees;

CREATE POLICY "Staff can insert filing fees for their company"
ON public.filing_fees FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.litigation_matters m
  JOIN public.client_services cs ON cs.id = m.client_service_id
  WHERE m.id = filing_fees.matter_id
    AND public.can_access_company(auth.uid(), cs.owning_company_id)
));

CREATE POLICY "Staff can update filing fees for their company"
ON public.filing_fees FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.litigation_matters m
  JOIN public.client_services cs ON cs.id = m.client_service_id
  WHERE m.id = filing_fees.matter_id
    AND public.can_access_company(auth.uid(), cs.owning_company_id)
));

CREATE POLICY "Admins can delete filing fees"
ON public.filing_fees FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can insert creditor contacts" ON public.creditor_contacts;
DROP POLICY IF EXISTS "Authenticated users can update creditor contacts" ON public.creditor_contacts;
DROP POLICY IF EXISTS "Authenticated users can delete creditor contacts" ON public.creditor_contacts;

CREATE POLICY "Admins can insert creditor contacts"
ON public.creditor_contacts FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update creditor contacts"
ON public.creditor_contacts FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete creditor contacts"
ON public.creditor_contacts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS sch, p.proname AS fn,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname IN (
        'assign_lead','calculate_lead_score','can_access_company',
        'create_notification','evaluate_workflow_conditions',
        'generate_deadline_reminders','get_user_company_id','has_role',
        'log_audit_event','notify_matter_assignment','notify_note_mention',
        'notify_task_assignment','process_assignment_queue',
        'trigger_auto_assign_lead','trigger_calculate_lead_score',
        'update_client_status','validate_status_transition'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon', r.sch, r.fn, r.args);
  END LOOP;
END $$;
