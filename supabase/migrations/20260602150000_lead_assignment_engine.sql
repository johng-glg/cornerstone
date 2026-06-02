-- Lead-assignment engine: auto-route a new lead to a staff member using the assignment rules.
--
-- On lead INSERT (when unassigned), find the highest-priority active rule matching the lead's
-- company / source / interest / debt range, then pick a member from that rule's pool by the rule's
-- method, set leads.assigned_to, bump the pool member, and log to lead_assignment_log (+ the
-- unified activity feed).
--
-- Method handling (single ORDER BY):
--   skillset_match -> members whose skills contain the lead interest first, then round-robin
--   backlog_based  -> fewest active (non-closed) leads first
--   weighted       -> lowest assignment_count / weight (load-balanced by weight)
--   round_robin / fallback -> oldest last_assigned_at, then lowest count
--
-- Fail-safe: any error is swallowed so a lead insert can never be blocked. Paste-resistant
-- (no dotted "id" token, ASCII). Uses the cornerstone.wf_active guard so the assigned_to write
-- doesn't re-fire the workflow engine.

CREATE OR REPLACE FUNCTION public.la_assign_lead(_lead_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _company uuid; _src public.lead_source; _int public.lead_interest;
  _debt numeric; _assigned uuid;
  _rule_id uuid; _method public.assignment_method;
  _staff uuid; _poolid uuid;
BEGIN
  SELECT company_id, source, interest_type, estimated_debt_amount, assigned_to
    INTO _company, _src, _int, _debt, _assigned
    FROM public.leads WHERE id = _lead_id;
  IF _assigned IS NOT NULL OR _company IS NULL THEN RETURN; END IF;

  -- Best matching rule: specific rules before defaults, then by priority. NULL filters = any.
  SELECT id, method INTO _rule_id, _method
    FROM public.lead_assignment_rules
    WHERE company_id = _company AND is_active
      AND (source IS NULL OR source = _src)
      AND (interest_type IS NULL OR interest_type = _int)
      AND (min_debt_amount IS NULL OR (_debt IS NOT NULL AND _debt >= min_debt_amount))
      AND (max_debt_amount IS NULL OR (_debt IS NOT NULL AND _debt <= max_debt_amount))
    ORDER BY is_default ASC, priority ASC, created_at ASC
    LIMIT 1;
  IF _rule_id IS NULL THEN RETURN; END IF;

  -- Pick an available pool member under their max, ordered per the rule's method.
  SELECT id, staff_id INTO _poolid, _staff
    FROM public.lead_assignment_pool p
    WHERE rule_id = _rule_id AND is_available
      AND (max_active_leads IS NULL OR assignment_count < max_active_leads)
    ORDER BY
      CASE WHEN _method = 'skillset_match' AND p.skills ? _int::text THEN 0 ELSE 1 END ASC,
      CASE WHEN _method = 'backlog_based'
           THEN (SELECT count(*) FROM public.leads l
                 WHERE l.assigned_to = p.staff_id AND l.status NOT IN ('converted', 'lost'))
           END ASC NULLS LAST,
      CASE WHEN _method = 'weighted'
           THEN (p.assignment_count::numeric / GREATEST(p.weight, 1))
           END ASC NULLS LAST,
      p.last_assigned_at ASC NULLS FIRST,
      p.assignment_count ASC
    LIMIT 1;
  IF _staff IS NULL THEN RETURN; END IF;

  PERFORM set_config('cornerstone.wf_active', '1', true);
  UPDATE public.leads SET assigned_to = _staff WHERE id = _lead_id;
  UPDATE public.lead_assignment_pool
    SET last_assigned_at = now(), assignment_count = assignment_count + 1
    WHERE id = _poolid;
  INSERT INTO public.lead_assignment_log (lead_id, action, to_staff_id, rule_id, method, reason)
    VALUES (_lead_id, 'auto_assigned', _staff, _rule_id, _method, 'Auto-assigned on creation');
  INSERT INTO public.activity_log (company_id, entity_type, entity_id, category, description, metadata)
    VALUES (_company, 'lead', _lead_id, 'assignment', 'Lead auto-assigned',
            jsonb_build_object('rule_id', _rule_id, 'method', _method, 'staff_id', _staff));
  PERFORM set_config('cornerstone.wf_active', '0', true);
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('cornerstone.wf_active', '0', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.la_trigger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.wf_is_active() THEN RETURN NEW; END IF;
  PERFORM public.la_assign_lead((to_jsonb(NEW) ->> 'id')::uuid);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS la_assign ON public.leads;
CREATE TRIGGER la_assign AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.la_trigger();

-- Rollback:
-- DROP TRIGGER IF EXISTS la_assign ON public.leads;
-- DROP FUNCTION IF EXISTS public.la_trigger;
-- DROP FUNCTION IF EXISTS public.la_assign_lead;
