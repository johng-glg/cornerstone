-- Workflow execution engine — behavioural test (migration 20260602120000).
-- Runs in CI db-verify against the real Supabase Postgres. Everything happens inside one
-- transaction that is ROLLED BACK at the end, so it leaves no residue. ON_ERROR_STOP makes any
-- failed ASSERT (or unexpected error) fail the job.

\set ON_ERROR_STOP on
BEGIN;

-- Fixtures: a throwaway company + lead (UUIDs disjoint from the seed).
INSERT INTO public.companies (id, name) VALUES ('aaaaaaaa-0000-4000-8000-0000000000f1', 'WF Engine Test Co');
INSERT INTO public.leads (id, lead_number, company_id, first_name, last_name, status)
VALUES ('bbbbbbbb-0000-4000-8000-0000000000f1', 'L-WFENG-1', 'aaaaaaaa-0000-4000-8000-0000000000f1', 'WF', 'Tester', 'new');

-- Rule A: lead moves TO 'qualified' -> create a high-priority task.
INSERT INTO public.workflow_rules (company_id, name, entity_type, trigger_type, trigger_config, conditions, actions, is_active, is_blocking, priority)
VALUES ('aaaaaaaa-0000-4000-8000-0000000000f1', 'WFENG qualify', 'leads', 'status_changed',
  '{"from_status":[],"to_status":["qualified"]}', '[]',
  '[{"type":"create_task","config":{"title":"WFENG call lead","priority":"high"}}]', true, false, 10);

-- Rule B: a condition that must NOT match (lead_score > 999) -> task that must never appear.
INSERT INTO public.workflow_rules (company_id, name, entity_type, trigger_type, trigger_config, conditions, actions, is_active, is_blocking, priority)
VALUES ('aaaaaaaa-0000-4000-8000-0000000000f1', 'WFENG gated', 'leads', 'status_changed',
  '{"to_status":["contacted"]}', '[{"field":"lead_score","operator":"gt","value":"999"}]',
  '[{"type":"create_task","config":{"title":"WFENG should-not-appear"}}]', true, false, 20);

-- Rule C (blocking): cannot go new -> lost without review.
INSERT INTO public.workflow_rules (company_id, name, entity_type, trigger_type, trigger_config, conditions, actions, is_active, is_blocking, priority)
VALUES ('aaaaaaaa-0000-4000-8000-0000000000f1', 'WFENG no instant loss', 'leads', 'status_changed',
  '{"from_status":["new"],"to_status":["lost"]}', '[]',
  '[{"type":"block_transition","config":{"reason":"Review required"}}]', true, true, 5);

DO $$
DECLARE _co uuid := 'aaaaaaaa-0000-4000-8000-0000000000f1';
        _lead uuid := 'bbbbbbbb-0000-4000-8000-0000000000f1';
        _n int;
BEGIN
  -- ACT 1: new -> qualified fires create_task.
  UPDATE public.leads SET status = 'qualified' WHERE id = _lead;
  SELECT count(*) INTO _n FROM public.tasks WHERE title = 'WFENG call lead' AND company_id = _co;
  ASSERT _n = 1, format('expected 1 task from the qualify rule, got %s', _n);

  SELECT count(*) INTO _n FROM public.workflow_executions we
    JOIN public.workflow_rules wr ON wr.id = we.rule_id
    WHERE wr.name = 'WFENG qualify' AND we.status = 'success';
  ASSERT _n = 1, format('expected 1 success execution, got %s', _n);

  -- ACT 2: condition gating — the lead_score>999 rule must not fire.
  UPDATE public.leads SET status = 'contacted' WHERE id = _lead;
  SELECT count(*) INTO _n FROM public.tasks WHERE title = 'WFENG should-not-appear';
  ASSERT _n = 0, format('gated rule should not have created a task, got %s', _n);

  -- ACT 3: blocking rule must raise on new -> lost.
  UPDATE public.leads SET status = 'new' WHERE id = _lead;
  BEGIN
    UPDATE public.leads SET status = 'lost' WHERE id = _lead;
    ASSERT false, 'blocking rule did not raise on new -> lost';
  EXCEPTION
    WHEN check_violation THEN NULL;  -- expected
  END;

  RAISE NOTICE 'workflow_engine.test.sql: all assertions passed';
END $$;

ROLLBACK;
