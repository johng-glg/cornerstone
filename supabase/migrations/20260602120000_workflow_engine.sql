-- Workflow rule execution engine.
--
-- Triggers on the workflow entity tables (leads, client_services, tasks) evaluate active
-- workflow_rules and run their actions, recording each run in workflow_executions.
--
-- SAFETY: the action path is wrapped so a rule/action error can NEVER abort the triggering
-- write (recorded as 'failed' instead). The only intentional abort is a matched blocking
-- block_transition rule; even there, evaluation errors fail open. A transaction-local guard
-- (cornerstone.wf_active) stops the engine re-entering itself.
--
-- NOTE: deliberately uses loop variables / a subquery instead of record-field accessors so the
-- text contains no dotted id token (some editors' AI autocomplete corrupts those on paste) and is
-- ASCII-only. Behaviour is identical to the tested original.

CREATE OR REPLACE FUNCTION public.wf_is_active() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('cornerstone.wf_active', true), '') = '1';
$$;

CREATE OR REPLACE FUNCTION public.wf_cond_matches(_row jsonb, _cond jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  _field text := _cond ->> 'field';
  _op    text := coalesce(_cond ->> 'operator', 'eq');
  _val   text := coalesce(_cond ->> 'value', '');
  _actual text;
  _an numeric;
  _vn numeric;
  _isnum boolean := false;
BEGIN
  IF _field IS NULL OR _field = '' THEN RETURN true; END IF;
  _actual := _row ->> _field;
  IF _actual IS NULL THEN RETURN _op = 'neq'; END IF;
  BEGIN
    _an := _actual::numeric; _vn := _val::numeric; _isnum := true;
  EXCEPTION WHEN OTHERS THEN _isnum := false; END;
  RETURN CASE _op
    WHEN 'eq'       THEN _actual = _val
    WHEN 'neq'      THEN _actual <> _val
    WHEN 'gt'       THEN _isnum AND _an >  _vn
    WHEN 'gte'      THEN _isnum AND _an >= _vn
    WHEN 'lt'       THEN _isnum AND _an <  _vn
    WHEN 'lte'      THEN _isnum AND _an <= _vn
    WHEN 'contains' THEN position(lower(_val) in lower(_actual)) > 0
    WHEN 'in'       THEN _actual = ANY (string_to_array(_val, ','))
    ELSE false
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.wf_all_conditions_match(_row jsonb, _conditions jsonb) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(coalesce(_conditions, '[]'::jsonb)) c
    WHERE NOT public.wf_cond_matches(_row, c)
  );
$$;

CREATE OR REPLACE FUNCTION public.wf_transition_matches(_cfg jsonb, _old jsonb, _new jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE AS $$
DECLARE _from jsonb := _cfg -> 'from_status'; _to jsonb := _cfg -> 'to_status';
BEGIN
  IF _from IS NOT NULL AND jsonb_typeof(_from) = 'array' AND jsonb_array_length(_from) > 0
     AND NOT (_from ? coalesce(_old ->> 'status', '')) THEN RETURN false; END IF;
  IF _to IS NOT NULL AND jsonb_typeof(_to) = 'array' AND jsonb_array_length(_to) > 0
     AND NOT (_to ? coalesce(_new ->> 'status', '')) THEN RETURN false; END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.wf_enforce_blocks(
  _company uuid, _entity public.workflow_entity_type, _old jsonb, _new jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _rname text; _rtc jsonb; _rconds jsonb; _ractions jsonb; _reason text;
BEGIN
  FOR _rname, _rtc, _rconds, _ractions IN
    SELECT name, trigger_config, conditions, actions FROM public.workflow_rules
    WHERE company_id = _company AND entity_type = _entity AND is_active AND is_blocking
      AND trigger_type = 'status_changed'
    ORDER BY priority
  LOOP
    BEGIN
      CONTINUE WHEN NOT public.wf_transition_matches(_rtc, _old, _new);
      CONTINUE WHEN NOT public.wf_all_conditions_match(_new, _rconds);
      IF EXISTS (SELECT 1 FROM jsonb_array_elements(_ractions) a WHERE a ->> 'type' = 'block_transition') THEN
        _reason := coalesce(
          (SELECT a -> 'config' ->> 'reason' FROM jsonb_array_elements(_ractions) a
           WHERE a ->> 'type' = 'block_transition' AND a -> 'config' ->> 'reason' IS NOT NULL LIMIT 1),
          _rname);
        RAISE EXCEPTION 'Workflow "%": %', _rname, _reason USING ERRCODE = 'check_violation';
      END IF;
    EXCEPTION
      WHEN check_violation THEN RAISE;
      WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.wf_run_actions(
  _company uuid, _entity public.workflow_entity_type, _entity_id uuid,
  _trigger public.workflow_trigger_type, _old jsonb, _new jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _rid uuid; _rname text; _rtc jsonb; _rconds jsonb; _ractions jsonb;
  a jsonb; _started timestamptz; _results jsonb; _res text;
  _ent public.entity_type; _title text; _prio public.task_priority;
BEGIN
  IF public.wf_is_active() THEN RETURN; END IF;
  PERFORM set_config('cornerstone.wf_active', '1', true);

  _ent := CASE _entity
    WHEN 'leads' THEN 'lead' WHEN 'client_services' THEN 'engagement'
    WHEN 'liabilities' THEN 'liability' WHEN 'litigation_matters' THEN 'litigation_matter'
    ELSE NULL END::public.entity_type;

  FOR _rid, _rname, _rtc, _rconds, _ractions IN
    SELECT id, name, trigger_config, conditions, actions FROM public.workflow_rules
    WHERE company_id = _company AND entity_type = _entity AND is_active AND NOT is_blocking
      AND trigger_type = _trigger
    ORDER BY priority
  LOOP
    BEGIN
      _started := clock_timestamp();
      IF _trigger = 'status_changed' AND NOT public.wf_transition_matches(_rtc, _old, _new) THEN
        CONTINUE;
      END IF;
      CONTINUE WHEN NOT public.wf_all_conditions_match(_new, _rconds);

      _results := '[]'::jsonb;
      FOR a IN SELECT * FROM jsonb_array_elements(_ractions) LOOP
        CASE a ->> 'type'
          WHEN 'create_task' THEN
            _title := coalesce(nullif(a -> 'config' ->> 'title', ''), _rname || ' - automated task');
            BEGIN _prio := coalesce(nullif(a -> 'config' ->> 'priority', ''), 'medium')::public.task_priority;
            EXCEPTION WHEN OTHERS THEN _prio := 'medium'; END;
            INSERT INTO public.tasks (company_id, title, task_type, priority, status, entity_type, entity_id)
            VALUES (_company, _title, 'general', _prio, 'pending', _ent, _entity_id);
            _res := 'task_created';
          WHEN 'send_notification' THEN
            PERFORM public.create_notification(
              st.user_id, 'system_alert', _rname, a -> 'config' ->> 'message', NULL, _entity::text, _entity_id)
            FROM public.assignments asg
            JOIN LATERAL (SELECT user_id FROM public.staff WHERE id = asg.staff_id) st ON true
            WHERE asg.entity_id = _entity_id AND asg.is_active AND asg.entity_type = _ent;
            _res := 'notified_assignees';
          ELSE
            _res := 'skipped';
        END CASE;
        _results := _results || jsonb_build_array(jsonb_build_object('type', a ->> 'type', 'result', _res));
      END LOOP;

      INSERT INTO public.workflow_executions
        (rule_id, entity_type, entity_id, status, trigger_data, condition_results, actions_executed, executed_at, duration_ms)
      VALUES (_rid, _entity, _entity_id, 'success', _new, _rconds, _results, now(),
              (extract(milliseconds from clock_timestamp() - _started))::int);
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        INSERT INTO public.workflow_executions (rule_id, entity_type, entity_id, status, trigger_data, error_message)
        VALUES (_rid, _entity, _entity_id, 'failed', _new, SQLERRM);
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END;
  END LOOP;

  PERFORM set_config('cornerstone.wf_active', '0', true);
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('cornerstone.wf_active', '0', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.wf_trigger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _entity public.workflow_entity_type := TG_ARGV[0]::public.workflow_entity_type;
  _ccol text := TG_ARGV[1];
  _company uuid;
  _nid uuid;
  _new jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END;
  _old jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END;
BEGIN
  IF public.wf_is_active() THEN RETURN COALESCE(NEW, OLD); END IF;
  _company := (coalesce(_new, _old) ->> _ccol)::uuid;
  IF _company IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  _nid := (_new ->> 'id')::uuid;

  IF TG_WHEN = 'BEFORE' THEN
    IF TG_OP = 'UPDATE' AND (_old ->> 'status') IS DISTINCT FROM (_new ->> 'status') THEN
      PERFORM public.wf_enforce_blocks(_company, _entity, _old, _new);
    END IF;
    RETURN NEW;
  ELSE
    IF TG_OP = 'INSERT' THEN
      PERFORM public.wf_run_actions(_company, _entity, _nid, 'record_created', NULL, _new);
    ELSIF (_old ->> 'status') IS DISTINCT FROM (_new ->> 'status') THEN
      PERFORM public.wf_run_actions(_company, _entity, _nid, 'status_changed', _old, _new);
    ELSE
      PERFORM public.wf_run_actions(_company, _entity, _nid, 'field_updated', _old, _new);
    END IF;
    RETURN NULL;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS wf_block ON public.leads;
CREATE TRIGGER wf_block BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.wf_trigger('leads', 'company_id');
DROP TRIGGER IF EXISTS wf_act ON public.leads;
CREATE TRIGGER wf_act AFTER INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.wf_trigger('leads', 'company_id');

DROP TRIGGER IF EXISTS wf_block ON public.client_services;
CREATE TRIGGER wf_block BEFORE UPDATE ON public.client_services
  FOR EACH ROW EXECUTE FUNCTION public.wf_trigger('client_services', 'owning_company_id');
DROP TRIGGER IF EXISTS wf_act ON public.client_services;
CREATE TRIGGER wf_act AFTER INSERT OR UPDATE ON public.client_services
  FOR EACH ROW EXECUTE FUNCTION public.wf_trigger('client_services', 'owning_company_id');

DROP TRIGGER IF EXISTS wf_block ON public.tasks;
CREATE TRIGGER wf_block BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.wf_trigger('tasks', 'company_id');
DROP TRIGGER IF EXISTS wf_act ON public.tasks;
CREATE TRIGGER wf_act AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.wf_trigger('tasks', 'company_id');

-- Rollback:
-- DROP TRIGGER IF EXISTS wf_block ON public.leads; DROP TRIGGER IF EXISTS wf_act ON public.leads;
-- DROP TRIGGER IF EXISTS wf_block ON public.client_services; DROP TRIGGER IF EXISTS wf_act ON public.client_services;
-- DROP TRIGGER IF EXISTS wf_block ON public.tasks; DROP TRIGGER IF EXISTS wf_act ON public.tasks;
-- DROP FUNCTION IF EXISTS public.wf_trigger; DROP FUNCTION IF EXISTS public.wf_run_actions;
-- DROP FUNCTION IF EXISTS public.wf_enforce_blocks; DROP FUNCTION IF EXISTS public.wf_transition_matches;
-- DROP FUNCTION IF EXISTS public.wf_all_conditions_match; DROP FUNCTION IF EXISTS public.wf_cond_matches;
-- DROP FUNCTION IF EXISTS public.wf_is_active;
