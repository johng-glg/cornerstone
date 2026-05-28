
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
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC', r.sch, r.fn, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated', r.sch, r.fn, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role', r.sch, r.fn, r.args);
  END LOOP;
END $$;

-- Tighten notes / note_mentions inserts to authenticated staff only
DROP POLICY IF EXISTS "Authenticated users can create notes" ON public.notes;
CREATE POLICY "Staff can create notes"
ON public.notes FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.staff s WHERE s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Authenticated users can create note mentions" ON public.note_mentions;
CREATE POLICY "Staff can create note mentions"
ON public.note_mentions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.staff s WHERE s.user_id = auth.uid())
);
