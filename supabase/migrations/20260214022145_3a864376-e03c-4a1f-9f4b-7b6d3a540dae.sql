
-- Feature 1: Lead Documents table
CREATE TABLE public.lead_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  notes TEXT,
  uploaded_by UUID REFERENCES public.staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view lead documents in their company"
  ON public.lead_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN staff s ON s.company_id = l.company_id
      WHERE l.id = lead_documents.lead_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert lead documents in their company"
  ON public.lead_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN staff s ON s.company_id = l.company_id
      WHERE l.id = lead_documents.lead_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can delete lead documents in their company"
  ON public.lead_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN staff s ON s.company_id = l.company_id
      WHERE l.id = lead_documents.lead_id
        AND s.user_id = auth.uid()
    )
  );

-- Lead documents storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('lead-documents', 'lead-documents', true);

CREATE POLICY "Authenticated users can upload lead documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lead-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view lead documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lead-documents');

CREATE POLICY "Authenticated users can delete lead documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'lead-documents' AND auth.role() = 'authenticated');

-- Feature 2: Servicing Creditor on liabilities
ALTER TABLE public.liabilities ADD COLUMN servicing_creditor_id UUID REFERENCES public.creditors(id);

-- Feature 3: Lead Budgets table
CREATE TABLE public.lead_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view lead budgets in their company"
  ON public.lead_budgets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN staff s ON s.company_id = l.company_id
      WHERE l.id = lead_budgets.lead_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can insert lead budgets in their company"
  ON public.lead_budgets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN staff s ON s.company_id = l.company_id
      WHERE l.id = lead_budgets.lead_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can update lead budgets in their company"
  ON public.lead_budgets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN staff s ON s.company_id = l.company_id
      WHERE l.id = lead_budgets.lead_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can delete lead budgets in their company"
  ON public.lead_budgets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      JOIN staff s ON s.company_id = l.company_id
      WHERE l.id = lead_budgets.lead_id
        AND s.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_lead_budgets_updated_at
  BEFORE UPDATE ON public.lead_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
