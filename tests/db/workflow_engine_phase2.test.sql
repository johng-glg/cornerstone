-- Workflow engine phase 2 — liabilities/settlements/matters whose company is resolved through a
-- join (migration 20260602130000). Runs in CI db-verify; whole thing rolls back.

\set ON_ERROR_STOP on
BEGIN;

INSERT INTO public.companies (id, name) VALUES ('aaaaaaaa-0000-4000-8000-0000000000f2', 'WF P2 Co');
INSERT INTO public.client_services (id, service_number, owning_company_id)
VALUES ('cccccccc-0000-4000-8000-0000000000f2', 'SVC-P2-1', 'aaaaaaaa-0000-4000-8000-0000000000f2');
INSERT INTO public.liabilities (id, client_service_id, status)
VALUES ('dddddddd-0000-4000-8000-0000000000f2', 'cccccccc-0000-4000-8000-0000000000f2', 'enrolled');

-- Rule: a liability moving to 'settled' creates a task. Company is NOT on the liability row —
-- the engine must resolve it via client_services.owning_company_id.
INSERT INTO public.workflow_rules (company_id, name, entity_type, trigger_type, trigger_config, conditions, actions, is_active, is_blocking, priority)
VALUES ('aaaaaaaa-0000-4000-8000-0000000000f2', 'WFP2 settled task', 'liabilities', 'status_changed',
  '{"to_status":["settled"]}', '[]',
  '[{"type":"create_task","config":{"title":"WFP2 closeout"}}]', true, false, 10);

DO $$
DECLARE _n int;
BEGIN
  UPDATE public.liabilities SET status = 'settled' WHERE id = 'dddddddd-0000-4000-8000-0000000000f2';

  SELECT count(*) INTO _n FROM public.tasks
    WHERE title = 'WFP2 closeout' AND company_id = 'aaaaaaaa-0000-4000-8000-0000000000f2';
  ASSERT _n = 1, format('expected 1 task with the resolved company, got %s', _n);

  SELECT count(*) INTO _n FROM public.workflow_executions we
    JOIN public.workflow_rules wr ON wr.id = we.rule_id
    WHERE wr.name = 'WFP2 settled task' AND we.status = 'success';
  ASSERT _n = 1, format('expected 1 success execution, got %s', _n);

  RAISE NOTICE 'workflow_engine_phase2.test.sql: all assertions passed';
END $$;

ROLLBACK;
