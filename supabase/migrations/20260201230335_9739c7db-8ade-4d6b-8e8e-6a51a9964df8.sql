-- Create client_documents table for storing client-level documents
CREATE TABLE public.client_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  file_url text NOT NULL,
  notes text,
  uploaded_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster lookups by client
CREATE INDEX idx_client_documents_client_id ON public.client_documents(client_id);

-- Enable Row Level Security
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Staff can access documents for clients in their company hierarchy
CREATE POLICY "Staff can access client documents"
ON public.client_documents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = client_documents.client_id
    AND can_access_company(auth.uid(), c.company_id)
  )
);

-- Create storage bucket for client documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for client-documents bucket
CREATE POLICY "Authenticated users can upload client documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'client-documents'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can view client documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'client-documents'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete client documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'client-documents'
  AND auth.role() = 'authenticated'
);