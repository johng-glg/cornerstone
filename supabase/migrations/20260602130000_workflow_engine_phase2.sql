-- Workflow engine phase 2: extend the engine to liabilities, settlements, and litigation_matters.
--
-- Phase 1 only attached triggers to entities with a DIRECT company column (leads, client_services,
-- tasks). These three resolve their company through a join, so this adds a resolver and re-points
-- the generic trigger at it, then attaches the triggers.
--
-- Paste-resistant: no dotted "id" tokens, ASCII only (some editors corrupt those on paste).

-- Resolve the owning company for a row of the given entity type. Fail-safe: NULL on any error
-- (which makes the trigger a no-op for that write rather than breaking it).
CREATE OR REPLACE FUNCTION public.wf_company_for(_entity public.workflow_entity_type, _row jsonb)
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _c uuid;
BEGIN
  IF _row IS NULL THEN RETURN NULL; END IF;
  BEGIN
    CASE _entity
      WHEN 'leads'              THEN _c := (_row ->> 'company_id')::uuid;
      WHEN 'client_services'    THEN _c := (_row ->> 'owning_company_id')::uuid;
      WHEN 'tasks'              THEN _c := (_row ->> 'company_id')::uuid;
      WHEN 'liabilities'        THEN
        SELECT owning_company_id INTO _c FROM public.client_services
        WHERE id = (_row ->> 'client_service_id')::uuid;
      WHEN 'litigation_matters' THEN
        SELECT owning_company_id INTO _c FROM public.client_services
        WHERE id = (_row ->> 'client_service_id')::uuid;
      WHEN 'settlements'        THEN
        SELECT owning_company_id INTO _c FROM public.client_services
        WHERE id = (SELECT client_service_id FROM public.liabilities
                    WHERE id = (_row ->> 'liability_id')::uuid);
      ELSE _c := NULL;
    END CASE;
  EXCEPTION WHEN OTHERS THEN _c := NULL;
  END;
  RETURN _c;
END;
$$;

-- Re-point the generic trigger at the resolver. Arg [0] = workflow_entity_type label.
CREATE OR REPLACE FUNCTION public.wf_trigger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _entity public.workflow_entity_type := TG_ARGV[0]::public.workflow_entity_type;
  _company uuid;
  _nid uuid;
  _new jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END;
  _old jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END;
BEGIN
  IF public.wf_is_active() THEN RETURN COALESCE(NEW, OLD); END IF;
  _company := public.wf_company_for(_entity, coalesce(_new, _old));
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

-- Re-attach phase-1 entities with the single-arg signature, and add the phase-2 entities.
DROP TRIGGER IF EXISTS wf_block ON public.leads;
CREATE TRIGGER wf_block BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.wf_trigger('leads');
DROP TRIGGER IF EXISTS wf_act ON public.leads;
CREATE TRIGGER wf_act AFTER INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.wf_trigger('leads');

DROP TRIGGER IF EXISTS wf_block ON public.client_services;
CREATE TRIGGER wf_block BEFORE UPDATE ON public.client_services
  FOR EACH ROW EXECUTE FUNCTION public.wf_trigger('client_services');
DROP TRIGGER IF EXISTS wf_act ON public.client_services;
CREATE TRIGGER wf_act AFTER INSERT OR UPDATE ON public.client_services
  FOR EACH ROW EXECUTE FUNCTION public.wf_trigger('client_services');

DROP TRIGGER IF EXISTS wf_block ON public.tasks;
CREATE TRIGGER wf_block BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.wf_trigger('tasks');
DROP TRIGGER IF EXISTS wf_act ON public.tasks;
CREATE TRIGGER wf_act AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.wf_trigger('tasks');

DROP TRIGGER IF EXISTS wf_block ON public.liabilities;
CREATE TRIGGER wf_block BEFORE UPDATE ON public.liabilities
  FOR EACH ROW EXECUTE FUNCTION public.wf_trigger('liabilities');
DROP TRIGGER IF EXISTS wf_act ON public.liabilities;
CREATE TRIGGER wf_act AFTER INSERT OR UPDATE ON public.liabilities
  FOR EACH ROW EXECUTE FUNCTION public.wf_trigger('liabilities');

DROP TRIGGER IF EXISTS wf_block ON public.litigation_matters;
CREATE TRIGGER wf_block BEFORE UPDATE ON public.litigation_matters
  FOR EACH ROW EXECUTE FUNCTION public.wf_trigger('litigation_matters');
DROP TRIGGER IF EXISTS wf_act ON public.litigation_matters;
CREATE TRIGGER wf_act AFTER INSERT OR UPDATE ON public.litigation_matters
  FOR EACH ROW EXECUTE FUNCTION public.wf_trigger('litigation_matters');

DROP TRIGGER IF EXISTS wf_block ON public.settlements;
CREATE TRIGGER wf_block BEFORE UPDATE ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.wf_trigger('settlements');
DROP TRIGGER IF EXISTS wf_act ON public.settlements;
CREATE TRIGGER wf_act AFTER INSERT OR UPDATE ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.wf_trigger('settlements');

-- Rollback:
-- DROP TRIGGER IF EXISTS wf_block ON public.liabilities; DROP TRIGGER IF EXISTS wf_act ON public.liabilities;
-- DROP TRIGGER IF EXISTS wf_block ON public.litigation_matters; DROP TRIGGER IF EXISTS wf_act ON public.litigation_matters;
-- DROP TRIGGER IF EXISTS wf_block ON public.settlements; DROP TRIGGER IF EXISTS wf_act ON public.settlements;
-- DROP FUNCTION IF EXISTS public.wf_company_for;
-- (and re-apply 20260602120000 to restore the 2-arg triggers)
