-- Create law_firms table
CREATE TABLE public.law_firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  fax text,
  email text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip_code text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create law_firm_contacts table
CREATE TABLE public.law_firm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  title text,
  email text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns to litigation_matters
ALTER TABLE public.litigation_matters
  ADD COLUMN opposing_law_firm_id uuid REFERENCES public.law_firms(id),
  ADD COLUMN opposing_counsel_id uuid REFERENCES public.law_firm_contacts(id);

-- Create indexes
CREATE INDEX law_firms_name_idx ON public.law_firms(name);
CREATE INDEX law_firm_contacts_law_firm_id_idx ON public.law_firm_contacts(law_firm_id);
CREATE INDEX litigation_matters_opposing_law_firm_id_idx ON public.litigation_matters(opposing_law_firm_id);

-- Enable RLS
ALTER TABLE public.law_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.law_firm_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for law_firms
CREATE POLICY "All staff can view law firms"
  ON public.law_firms FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage law firms"
  ON public.law_firms FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for law_firm_contacts
CREATE POLICY "All staff can view law firm contacts"
  ON public.law_firm_contacts FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage law firm contacts"
  ON public.law_firm_contacts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at triggers
CREATE TRIGGER update_law_firms_updated_at
  BEFORE UPDATE ON public.law_firms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_law_firm_contacts_updated_at
  BEFORE UPDATE ON public.law_firm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();