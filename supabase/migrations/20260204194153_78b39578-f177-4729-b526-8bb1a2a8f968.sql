-- Create billing entry type enum
CREATE TYPE billing_entry_type AS ENUM ('time', 'expense');

-- Create billing entry status enum
CREATE TYPE billing_entry_status AS ENUM ('draft', 'approved', 'invoiced', 'paid');

-- Create billing_entries table
CREATE TABLE public.billing_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  staff_id UUID NOT NULL REFERENCES public.staff(id),
  client_id UUID REFERENCES public.clients(id),
  client_service_id UUID REFERENCES public.client_services(id),
  litigation_matter_id UUID REFERENCES public.litigation_matters(id),
  entry_type billing_entry_type NOT NULL,
  description TEXT NOT NULL,
  billing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Time entry fields
  duration_minutes INTEGER,
  hourly_rate NUMERIC(10,2),
  -- Expense entry fields
  expense_amount NUMERIC(10,2),
  -- Computed/stored amount
  total_amount NUMERIC(10,2) NOT NULL,
  is_billable BOOLEAN NOT NULL DEFAULT true,
  status billing_entry_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Ensure time entries have duration, expense entries have amount
  CONSTRAINT valid_time_entry CHECK (
    entry_type != 'time' OR (duration_minutes IS NOT NULL AND duration_minutes > 0)
  ),
  CONSTRAINT valid_expense_entry CHECK (
    entry_type != 'expense' OR (expense_amount IS NOT NULL AND expense_amount > 0)
  )
);

-- Create indexes for common queries
CREATE INDEX idx_billing_entries_staff_id ON public.billing_entries(staff_id);
CREATE INDEX idx_billing_entries_client_id ON public.billing_entries(client_id);
CREATE INDEX idx_billing_entries_matter_id ON public.billing_entries(litigation_matter_id);
CREATE INDEX idx_billing_entries_billing_date ON public.billing_entries(billing_date);
CREATE INDEX idx_billing_entries_status ON public.billing_entries(status);
CREATE INDEX idx_billing_entries_company_id ON public.billing_entries(company_id);

-- Enable RLS
ALTER TABLE public.billing_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view billing entries in their company"
ON public.billing_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = auth.uid()
    AND s.company_id = billing_entries.company_id
  )
);

CREATE POLICY "Users can insert billing entries in their company"
ON public.billing_entries FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = auth.uid()
    AND s.company_id = billing_entries.company_id
  )
);

CREATE POLICY "Users can update billing entries in their company"
ON public.billing_entries FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = auth.uid()
    AND s.company_id = billing_entries.company_id
  )
);

CREATE POLICY "Users can delete draft billing entries in their company"
ON public.billing_entries FOR DELETE
USING (
  status = 'draft' AND
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = auth.uid()
    AND s.company_id = billing_entries.company_id
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_billing_entries_updated_at
BEFORE UPDATE ON public.billing_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert Of Counsel job titles
INSERT INTO public.job_titles (role, title, display_order, is_active) VALUES
  ('of_counsel', 'Of Counsel', 1, true),
  ('of_counsel', 'Senior Of Counsel', 2, true),
  ('of_counsel', 'Contract Attorney', 3, true);

-- Enable realtime for billing_entries
ALTER PUBLICATION supabase_realtime ADD TABLE public.billing_entries;