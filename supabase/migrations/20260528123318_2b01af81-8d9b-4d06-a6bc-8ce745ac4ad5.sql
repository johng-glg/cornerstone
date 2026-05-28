
-- =========================================================================
-- Phase 7 security hardening: company-scoped storage + realtime auth
-- =========================================================================

-- 1. Make sensitive buckets private
UPDATE storage.buckets SET public = false
WHERE id IN ('lead-documents', 'client-documents', 'litigation-documents');

-- 2. Helper: resolve owning company from (bucket, first-folder) and check access
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

  IF _bucket = 'lead-documents' THEN
    SELECT company_id INTO _company_id FROM public.leads WHERE id = _entity_id;
  ELSIF _bucket = 'client-documents' THEN
    SELECT company_id INTO _company_id FROM public.clients WHERE id = _entity_id;
  ELSIF _bucket = 'litigation-documents' THEN
    SELECT cs.owning_company_id INTO _company_id
    FROM public.litigation_matters m
    JOIN public.client_services cs ON cs.id = m.client_service_id
    WHERE m.id = _entity_id;
  ELSE
    RETURN false;
  END IF;

  IF _company_id IS NULL THEN RETURN false; END IF;
  RETURN public.can_access_company(auth.uid(), _company_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_storage_object(text, text) TO authenticated, service_role;

-- 3. Drop legacy storage policies for the three buckets
DROP POLICY IF EXISTS "Anyone can view lead documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete lead documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload lead documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view lead documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update lead documents" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can view client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client documents" ON storage.objects;

DROP POLICY IF EXISTS "Staff can view litigation documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload litigation documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update litigation documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete litigation documents" ON storage.objects;

-- 4. Recreate as company-scoped policies (one per action per bucket)
-- lead-documents
CREATE POLICY "lead-documents company select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lead-documents' AND public.can_access_storage_object('lead-documents', (storage.foldername(name))[1]));
CREATE POLICY "lead-documents company insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lead-documents' AND public.can_access_storage_object('lead-documents', (storage.foldername(name))[1]));
CREATE POLICY "lead-documents company update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'lead-documents' AND public.can_access_storage_object('lead-documents', (storage.foldername(name))[1]));
CREATE POLICY "lead-documents company delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lead-documents' AND public.can_access_storage_object('lead-documents', (storage.foldername(name))[1]));

-- client-documents
CREATE POLICY "client-documents company select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'client-documents' AND public.can_access_storage_object('client-documents', (storage.foldername(name))[1]));
CREATE POLICY "client-documents company insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'client-documents' AND public.can_access_storage_object('client-documents', (storage.foldername(name))[1]));
CREATE POLICY "client-documents company update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'client-documents' AND public.can_access_storage_object('client-documents', (storage.foldername(name))[1]));
CREATE POLICY "client-documents company delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'client-documents' AND public.can_access_storage_object('client-documents', (storage.foldername(name))[1]));

-- litigation-documents
CREATE POLICY "litigation-documents company select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'litigation-documents' AND public.can_access_storage_object('litigation-documents', (storage.foldername(name))[1]));
CREATE POLICY "litigation-documents company insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'litigation-documents' AND public.can_access_storage_object('litigation-documents', (storage.foldername(name))[1]));
CREATE POLICY "litigation-documents company update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'litigation-documents' AND public.can_access_storage_object('litigation-documents', (storage.foldername(name))[1]));
CREATE POLICY "litigation-documents company delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'litigation-documents' AND public.can_access_storage_object('litigation-documents', (storage.foldername(name))[1]));

-- 5. Realtime: deny anonymous channel access (postgres_changes still respects table RLS)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send realtime messages" ON realtime.messages;

CREATE POLICY "Authenticated users can read realtime messages"
  ON realtime.messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can send realtime messages"
  ON realtime.messages FOR INSERT TO authenticated WITH CHECK (true);
