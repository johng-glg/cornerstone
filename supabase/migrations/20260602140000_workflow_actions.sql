-- Workflow engine: implement the remaining actions (update_field, trigger_webhook, auto_graduate).
--
-- Phase 1/2 ran create_task + send_notification and recorded the rest as 'skipped'. This replaces
-- wf_run_actions to handle:
--   * update_field      — set a column on the triggering row (value coerced via a quoted literal,
--                          so enums/numerics/dates work). Recursion-safe via the wf_active guard.
--   * trigger_webhook   — POST the event to a URL via pg_net (Supabase). No-ops as 'failed' where
--                          pg_net isn't available (fail-safe).
--   * auto_graduate     — set an engagement (client_services) to 'graduated'.
--
-- Paste-resistant: no dotted "id" token, ASCII only. Same fail-safety as before — a failing action
-- records the rule as 'failed' and never aborts the triggering write.

CREATE OR REPLACE FUNCTION public.wf_run_actions(
  _company uuid, _entity public.workflow_entity_type, _entity_id uuid,
  _trigger public.workflow_trigger_type, _old jsonb, _new jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _rid uuid; _rname text; _rtc jsonb; _rconds jsonb; _ractions jsonb;
  a jsonb; _started timestamptz; _results jsonb; _res text;
  _ent public.entity_type; _title text; _prio public.task_priority;
  _fld text; _fval text; _url text;
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

          WHEN 'update_field' THEN
            _fld := a -> 'config' ->> 'field';
            _fval := a -> 'config' ->> 'value';
            IF _fld IS NULL OR _fld = '' THEN
              _res := 'skipped:no_field';
            ELSE
              -- %L quotes the value as an unknown-typed literal so it coerces to the column type
              -- (enum/numeric/date/text) in assignment context. Guard above prevents re-entry.
              EXECUTE format('UPDATE public.%I SET %I = %L WHERE id = %L',
                             _entity::text, _fld, _fval, _entity_id);
              _res := 'field_updated';
            END IF;

          WHEN 'trigger_webhook' THEN
            _url := a -> 'config' ->> 'url';
            IF _url IS NULL OR _url = '' THEN
              _res := 'skipped:no_url';
            ELSE
              PERFORM net.http_post(
                url := _url,
                body := jsonb_build_object(
                  'entity_type', _entity::text, 'entity_id', _entity_id,
                  'event', _trigger::text, 'rule', _rname, 'data', _new));
              _res := 'webhook_sent';
            END IF;

          WHEN 'auto_graduate' THEN
            IF _entity = 'client_services' THEN
              EXECUTE format('UPDATE public.client_services SET status = %L WHERE id = %L',
                             'graduated', _entity_id);
              _res := 'graduated';
            ELSE
              _res := 'skipped:not_engagement';
            END IF;

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
