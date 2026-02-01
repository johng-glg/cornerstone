-- Create litigation_status enum
CREATE TYPE litigation_status AS ENUM (
  'pending_response',
  'discovery',
  'negotiation',
  'trial_prep',
  'trial',
  'settled',
  'dismissed',
  'judgment'
);

-- Create litigation_matters table
CREATE TABLE public.litigation_matters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  liability_id UUID NOT NULL REFERENCES public.liabilities(id) ON DELETE CASCADE,
  client_service_id UUID NOT NULL REFERENCES public.client_services(id) ON DELETE CASCADE,
  case_number TEXT,
  court_name TEXT,
  county TEXT,
  state TEXT,
  opposing_party TEXT,
  opposing_counsel TEXT,
  status litigation_status NOT NULL DEFAULT 'pending_response',
  service_date DATE,
  response_deadline DATE,
  next_hearing_date TIMESTAMP WITH TIME ZONE,
  judgment_amount NUMERIC,
  settlement_amount NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.litigation_matters ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Staff can access litigation matters" 
ON public.litigation_matters 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM client_services cs
    WHERE cs.id = litigation_matters.client_service_id
    AND can_access_company(auth.uid(), cs.owning_company_id)
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_litigation_matters_updated_at
BEFORE UPDATE ON public.litigation_matters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_litigation_matters_liability ON public.litigation_matters(liability_id);
CREATE INDEX idx_litigation_matters_client_service ON public.litigation_matters(client_service_id);