-- Create enums for signature statuses
CREATE TYPE signature_request_status AS ENUM (
  'draft', 'queued', 'sent', 'viewed', 'partially_signed', 
  'completed', 'declined', 'expired', 'canceled', 'error'
);

CREATE TYPE signer_status AS ENUM (
  'pending', 'sent', 'viewed', 'signed', 'declined'
);

-- Create docuseal_templates table (maps CRM to DocuSeal templates)
CREATE TABLE public.docuseal_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  docuseal_template_id integer NOT NULL,
  description text,
  signer_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create signature_requests table
CREATE TABLE public.signature_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('lead', 'client')),
  entity_id uuid NOT NULL,
  template_id uuid REFERENCES public.templates(id) ON DELETE SET NULL,
  docuseal_template_id integer,
  docuseal_submission_id integer,
  title text NOT NULL,
  status signature_request_status NOT NULL DEFAULT 'draft',
  signing_mode text NOT NULL DEFAULT 'parallel' CHECK (signing_mode IN ('parallel', 'sequential')),
  delivery_method text NOT NULL DEFAULT 'email_only' CHECK (delivery_method IN ('email_sms', 'email_only', 'sms_only')),
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'es')),
  expires_at timestamptz,
  completed_at timestamptz,
  executed_pdf_url text,
  certificate_url text,
  evidence_json jsonb,
  short_token text NOT NULL UNIQUE,
  created_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create signature_signers table
CREATE TABLE public.signature_signers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.signature_requests(id) ON DELETE CASCADE,
  signer_role text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  docuseal_submitter_id integer,
  signing_url text,
  short_token text UNIQUE,
  status signer_status NOT NULL DEFAULT 'pending',
  signed_at timestamptz,
  ip_address text,
  user_agent text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create signature_events table (append-only audit log)
CREATE TABLE public.signature_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.signature_requests(id) ON DELETE CASCADE,
  signer_id uuid REFERENCES public.signature_signers(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_signature_requests_company ON public.signature_requests(company_id);
CREATE INDEX idx_signature_requests_entity ON public.signature_requests(entity_type, entity_id);
CREATE INDEX idx_signature_requests_status ON public.signature_requests(status);
CREATE INDEX idx_signature_requests_short_token ON public.signature_requests(short_token);
CREATE INDEX idx_signature_signers_request ON public.signature_signers(request_id);
CREATE INDEX idx_signature_signers_short_token ON public.signature_signers(short_token);
CREATE INDEX idx_signature_events_request ON public.signature_events(request_id);
CREATE INDEX idx_docuseal_templates_company ON public.docuseal_templates(company_id);

-- Enable RLS on all tables
ALTER TABLE public.docuseal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for docuseal_templates
CREATE POLICY "Staff can view company docuseal templates"
  ON public.docuseal_templates FOR SELECT
  USING (can_access_company(auth.uid(), company_id));

CREATE POLICY "Admins can manage company docuseal templates"
  ON public.docuseal_templates FOR ALL
  USING (can_access_company(auth.uid(), company_id) AND has_role(auth.uid(), 'admin'));

-- RLS Policies for signature_requests
CREATE POLICY "Staff can view company signature requests"
  ON public.signature_requests FOR SELECT
  USING (can_access_company(auth.uid(), company_id));

CREATE POLICY "Staff can manage company signature requests"
  ON public.signature_requests FOR ALL
  USING (can_access_company(auth.uid(), company_id));

-- RLS Policies for signature_signers
CREATE POLICY "Staff can view signers for accessible requests"
  ON public.signature_signers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.signature_requests sr
    WHERE sr.id = signature_signers.request_id
    AND can_access_company(auth.uid(), sr.company_id)
  ));

CREATE POLICY "Staff can manage signers for accessible requests"
  ON public.signature_signers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.signature_requests sr
    WHERE sr.id = signature_signers.request_id
    AND can_access_company(auth.uid(), sr.company_id)
  ));

-- RLS Policies for signature_events (append-only - select and insert only)
CREATE POLICY "Staff can view events for accessible requests"
  ON public.signature_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.signature_requests sr
    WHERE sr.id = signature_events.request_id
    AND can_access_company(auth.uid(), sr.company_id)
  ));

CREATE POLICY "Staff can insert events for accessible requests"
  ON public.signature_events FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.signature_requests sr
    WHERE sr.id = signature_events.request_id
    AND can_access_company(auth.uid(), sr.company_id)
  ));

-- Create trigger for updated_at on signature_requests
CREATE TRIGGER update_signature_requests_updated_at
  BEFORE UPDATE ON public.signature_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on docuseal_templates
CREATE TRIGGER update_docuseal_templates_updated_at
  BEFORE UPDATE ON public.docuseal_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for signed documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('signed-documents', 'signed-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for signed documents bucket
CREATE POLICY "Staff can view signed documents for their company"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'signed-documents' 
    AND EXISTS (
      SELECT 1 FROM public.signature_requests sr
      JOIN public.staff s ON can_access_company(auth.uid(), sr.company_id)
      WHERE sr.executed_pdf_url LIKE '%' || name OR sr.certificate_url LIKE '%' || name
    )
  );

CREATE POLICY "Service role can upload signed documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'signed-documents');