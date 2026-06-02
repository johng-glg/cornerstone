-- Lead-assignment engine (migration 20260602150000): round-robin auto-assign. Rolls back.
\set ON_ERROR_STOP on
BEGIN;

INSERT INTO public.companies (id, name) VALUES ('aaaaaaaa-0000-4000-8000-0000000000f4', 'LA Test Co');
INSERT INTO auth.users (id) VALUES
  ('11111111-0000-4000-8000-0000000000a1'), ('11111111-0000-4000-8000-0000000000a2');
INSERT INTO public.staff (user_id, company_id, first_name, last_name, email, department) VALUES
  ('11111111-0000-4000-8000-0000000000a1','aaaaaaaa-0000-4000-8000-0000000000f4','Rep','One','rep1@la.test','sales'),
  ('11111111-0000-4000-8000-0000000000a2','aaaaaaaa-0000-4000-8000-0000000000f4','Rep','Two','rep2@la.test','sales');

INSERT INTO public.lead_assignment_rules (id, company_id, name, method, is_active, is_default, priority)
VALUES ('eeeeeeee-0000-4000-8000-0000000000f4','aaaaaaaa-0000-4000-8000-0000000000f4','LA round robin','round_robin',true,true,0);

INSERT INTO public.lead_assignment_pool (rule_id, staff_id)
SELECT 'eeeeeeee-0000-4000-8000-0000000000f4', id FROM public.staff
WHERE company_id = 'aaaaaaaa-0000-4000-8000-0000000000f4';

-- Two leads -> should auto-assign to the two different reps (round robin).
INSERT INTO public.leads (id, lead_number, company_id, first_name, last_name) VALUES
  ('dddddddd-0000-4000-8000-0000000000c1','LA-1','aaaaaaaa-0000-4000-8000-0000000000f4','Lead','A'),
  ('dddddddd-0000-4000-8000-0000000000c2','LA-2','aaaaaaaa-0000-4000-8000-0000000000f4','Lead','B');

DO $$
DECLARE _a uuid; _b uuid; _n int; _cnt int;
BEGIN
  SELECT assigned_to INTO _a FROM public.leads WHERE id='dddddddd-0000-4000-8000-0000000000c1';
  SELECT assigned_to INTO _b FROM public.leads WHERE id='dddddddd-0000-4000-8000-0000000000c2';
  ASSERT _a IS NOT NULL, 'lead A was not assigned';
  ASSERT _b IS NOT NULL, 'lead B was not assigned';
  ASSERT _a <> _b, 'round-robin should assign the two leads to different reps';

  SELECT count(*) INTO _n FROM public.lead_assignment_log
    WHERE lead_id IN ('dddddddd-0000-4000-8000-0000000000c1','dddddddd-0000-4000-8000-0000000000c2')
      AND action = 'auto_assigned';
  ASSERT _n = 2, format('expected 2 auto_assigned log rows, got %s', _n);

  SELECT coalesce(sum(assignment_count),0) INTO _cnt FROM public.lead_assignment_pool
    WHERE rule_id = 'eeeeeeee-0000-4000-8000-0000000000f4';
  ASSERT _cnt = 2, format('expected pool assignment_count sum = 2, got %s', _cnt);

  RAISE NOTICE 'lead_assignment.test.sql: all assertions passed';
END $$;
ROLLBACK;
