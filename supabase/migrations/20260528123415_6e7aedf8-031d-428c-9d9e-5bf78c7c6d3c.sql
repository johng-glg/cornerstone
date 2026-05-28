
CREATE OR REPLACE FUNCTION public.can_access_storage_object(_bucket text, _first_folder text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _entity_id uuid;
  _company_id uuid;
BEGIN
  IF _first_folder IS NULL OR _first_folder = '' THEN RETURN false; END IF;
  BEGIN
    _entity_id := _first_folder::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  -- Per-entity resolution
  IF _bucket = 'lead-documents' THEN
    SELECT company_id INTO _company_id FROM public.leads WHERE id = _entity_id;
  ELSIF _bucket = 'client-documents' THEN
    SELECT company_id INTO _company_id FROM public.clients WHERE id = _entity_id;
  ELSIF _bucket = 'litigation-documents' THEN
    SELECT cs.owning_company_id INTO _company_id
    FROM public.litigation_matters m
    JOIN public.client_services cs ON cs.id = m.client_service_id
    WHERE m.id = _entity_id;
  END IF;

  IF _company_id IS NOT NULL AND public.can_access_company(auth.uid(), _company_id) THEN
    RETURN true;
  END IF;

  -- Fallback: treat first folder as a company id directly (used by wizards/scratch uploads)
  IF EXISTS (SELECT 1 FROM public.companies WHERE id = _entity_id) THEN
    RETURN public.can_access_company(auth.uid(), _entity_id);
  END IF;

  RETURN false;
END;
$$;
