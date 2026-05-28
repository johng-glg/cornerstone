
DROP FUNCTION IF EXISTS public.decrypt_lead_banking(uuid);
DROP FUNCTION IF EXISTS public.decrypt_client_ssn(uuid);

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _row jsonb;
  _old jsonb;
  _new jsonb;
  _entity_id uuid;
  _company_id uuid;
  _payload jsonb;
  _action text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _row := to_jsonb(OLD); _old := _row; _new := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    _row := to_jsonb(NEW); _old := NULL; _new := _row;
  ELSE
    _row := to_jsonb(NEW); _old := to_jsonb(OLD); _new := _row;
  END IF;

  BEGIN _entity_id := (_row ->> 'id')::uuid;
  EXCEPTION WHEN OTHERS THEN _entity_id := NULL; END;

  BEGIN _company_id := COALESCE(
      (_row ->> 'company_id')::uuid,
      (_row ->> 'owning_company_id')::uuid,
      (_row ->> 'originating_company_id')::uuid);
  EXCEPTION WHEN OTHERS THEN _company_id := NULL; END;

  _action := TG_TABLE_NAME || '.' || lower(TG_OP);
  _payload := jsonb_build_object('op', TG_OP, 'table', TG_TABLE_NAME, 'old', _old, 'new', _new);

  PERFORM public.log_audit_event(_action, TG_TABLE_NAME, _entity_id, _company_id, _payload, NULL, NULL, NULL);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.audit_trigger_fn() FROM anon;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY['clients','client_services','leads','settlements','transactions','staff','user_roles','eligibility_reviews','litigation_matters','billing_entries','lead_banking'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn()', t, t);
  END LOOP;
END $$;

CREATE FUNCTION public.decrypt_client_ssn(_client_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _key text; _ct bytea; _co uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  SELECT company_id, ssn_ciphertext INTO _co, _ct FROM public.clients WHERE id = _client_id;
  IF _co IS NULL THEN RAISE EXCEPTION 'client not found'; END IF;
  IF NOT public.can_access_company(auth.uid(), _co) THEN
    RAISE EXCEPTION 'forbidden: cross-company access';
  END IF;
  PERFORM public.log_audit_event('pii.reveal.client_ssn','clients',_client_id,_co,
    jsonb_build_object('client_id', _client_id), NULL, NULL, NULL);
  IF _ct IS NULL THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key';
  RETURN pgp_sym_decrypt(_ct, _key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrypt_client_ssn(uuid) FROM anon;

CREATE FUNCTION public.decrypt_lead_banking(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _key text; _acct bytea; _rout bytea; _co uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  SELECT l.company_id, lb.account_number_ciphertext, lb.routing_number_ciphertext
    INTO _co, _acct, _rout
  FROM public.lead_banking lb
  JOIN public.leads l ON l.id = lb.lead_id
  WHERE lb.lead_id = _lead_id LIMIT 1;
  IF _co IS NULL THEN RAISE EXCEPTION 'lead banking not found'; END IF;
  IF NOT public.can_access_company(auth.uid(), _co) THEN
    RAISE EXCEPTION 'forbidden: cross-company access';
  END IF;
  PERFORM public.log_audit_event('pii.reveal.lead_banking','lead_banking',_lead_id,_co,
    jsonb_build_object('lead_id', _lead_id), NULL, NULL, NULL);
  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key';
  RETURN jsonb_build_object(
    'account_number', CASE WHEN _acct IS NULL THEN NULL ELSE pgp_sym_decrypt(_acct, _key) END,
    'routing_number', CASE WHEN _rout IS NULL THEN NULL ELSE pgp_sym_decrypt(_rout, _key) END);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrypt_lead_banking(uuid) FROM anon;
