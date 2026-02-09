
-- Create creditor_contacts table
CREATE TABLE public.creditor_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creditor_id UUID NOT NULL REFERENCES public.creditors(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Timestamps trigger
CREATE TRIGGER update_creditor_contacts_updated_at
  BEFORE UPDATE ON public.creditor_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.creditor_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view creditor contacts"
  ON public.creditor_contacts FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert creditor contacts"
  ON public.creditor_contacts FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update creditor contacts"
  ON public.creditor_contacts FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete creditor contacts"
  ON public.creditor_contacts FOR DELETE
  TO authenticated USING (true);

-- Add new FK columns to litigation_matters
ALTER TABLE public.litigation_matters
  ADD COLUMN opposing_creditor_id UUID REFERENCES public.creditors(id),
  ADD COLUMN opposing_contact_id UUID REFERENCES public.creditor_contacts(id);

-- Migrate data: map law_firm_contacts -> creditor_contacts
-- First, for each law_firm that has a matching creditor (by name), create creditor_contacts
INSERT INTO public.creditor_contacts (creditor_id, first_name, last_name, title, email, phone, notes, is_active)
SELECT c.id, lfc.first_name, lfc.last_name, lfc.title, lfc.email, lfc.phone, lfc.notes, lfc.is_active
FROM public.law_firm_contacts lfc
JOIN public.law_firms lf ON lf.id = lfc.law_firm_id
JOIN public.creditors c ON c.name = lf.name AND c.creditor_type = 'law_firm';

-- Migrate litigation_matters opposing_law_firm_id -> opposing_creditor_id
UPDATE public.litigation_matters lm
SET opposing_creditor_id = c.id
FROM public.law_firms lf
JOIN public.creditors c ON c.name = lf.name AND c.creditor_type = 'law_firm'
WHERE lm.opposing_law_firm_id = lf.id;

-- Migrate litigation_matters opposing_counsel_id -> opposing_contact_id
UPDATE public.litigation_matters lm
SET opposing_contact_id = cc.id
FROM public.law_firm_contacts lfc
JOIN public.law_firms lf ON lf.id = lfc.law_firm_id
JOIN public.creditors c ON c.name = lf.name AND c.creditor_type = 'law_firm'
JOIN public.creditor_contacts cc ON cc.creditor_id = c.id AND cc.first_name = lfc.first_name AND cc.last_name = lfc.last_name
WHERE lm.opposing_counsel_id = lfc.id;
