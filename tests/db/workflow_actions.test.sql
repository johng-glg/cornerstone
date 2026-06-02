-- Workflow actions (migration 20260602140000): update_field + auto_graduate. Rolls back.
\set ON_ERROR_STOP on
BEGIN;

INSERT INTO public.companies (id, name) VALUES ('aaaaaaaa-0000-4000-8000-0000000000f3', 'WF Act Co');
INSERT INTO public.leads (id, lead_number, company_id, first_name, last_name, status)
VALUES ('bbbbbbbb-0000-4000-8000-0000000000f3', 'L-ACT-1', 'aaaaaaaa-0000-4000-8000-0000000000f3', 'Act', 'Tester', 'new');
INSERT INTO public.client_services (id, service_number, owning_company_id, status)
VALUES ('cccccccc-0000-4000-8000-0000000000f3', 'SVC-ACT-1', 'aaaaaaaa-0000-4000-8000-0000000000f3', 'prospect');

-- update_field: when a lead reaches 'contacted', set lead_score = 50
INSERT INTO public.workflow_rules (company_id, name, entity_type, trigger_type, trigger_config, conditions, actions, is_active, is_blocking, priority)
VALUES ('aaaaaaaa-0000-4000-8000-0000000000f3', 'ACT set score', 'leads', 'status_changed',
  '{"to_status":["contacted"]}', '[]',
  '[{"type":"update_field","config":{"field":"lead_score","value":"50"}}]', true, false, 10);

-- auto_graduate: when an engagement reaches 'active', graduate it
INSERT INTO public.workflow_rules (company_id, name, entity_type, trigger_type, trigger_config, conditions, actions, is_active, is_blocking, priority)
VALUES ('aaaaaaaa-0000-4000-8000-0000000000f3', 'ACT graduate', 'client_services', 'status_changed',
  '{"to_status":["active"]}', '[]',
  '[{"type":"auto_graduate","config":{}}]', true, false, 10);

DO $$
DECLARE _score int; _svc text;
BEGIN
  UPDATE public.leads SET status = 'contacted' WHERE id = 'bbbbbbbb-0000-4000-8000-0000000000f3';
  SELECT lead_score INTO _score FROM public.leads WHERE id = 'bbbbbbbb-0000-4000-8000-0000000000f3';
  ASSERT _score = 50, format('update_field expected lead_score=50, got %s', _score);

  UPDATE public.client_services SET status = 'active' WHERE id = 'cccccccc-0000-4000-8000-0000000000f3';
  SELECT status INTO _svc FROM public.client_services WHERE id = 'cccccccc-0000-4000-8000-0000000000f3';
  ASSERT _svc = 'graduated', format('auto_graduate expected status=graduated, got %s', _svc);

  RAISE NOTICE 'workflow_actions.test.sql: all assertions passed';
END $$;
ROLLBACK;
