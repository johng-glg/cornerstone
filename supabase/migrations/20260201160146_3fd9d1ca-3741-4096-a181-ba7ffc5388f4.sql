-- Create new enums for enrollment wizard
CREATE TYPE public.employment_status AS ENUM ('employed', 'unemployed', 'self_employed', 'retired', 'disabled');
CREATE TYPE public.hardship_reason AS ENUM ('job_loss', 'medical_emergency', 'divorce', 'reduced_income', 'business_failure', 'other');
CREATE TYPE public.bank_account_type AS ENUM ('checking', 'savings');
CREATE TYPE public.plan_type AS ENUM ('glg_standard', 'glg_adjustable', 'glg_exception');

-- Add new statuses to lead_status enum
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'intake';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'credit_review';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'plan_selection';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'qc_pending';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'docs_pending';

-- Add new columns to leads table for enrollment wizard
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS in_bankruptcy boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_federal_accounts boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS secured_credit_resolved boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS has_security_clearance boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS employment_status public.employment_status,
ADD COLUMN IF NOT EXISTS employer_name text,
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS monthly_income numeric,
ADD COLUMN IF NOT EXISTS hardship_reason public.hardship_reason,
ADD COLUMN IF NOT EXISTS hardship_notes text,
ADD COLUMN IF NOT EXISTS ssn_last4_encrypted text,
ADD COLUMN IF NOT EXISTS credit_auth_given boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS credit_auth_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS wizard_step integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS wizard_data jsonb DEFAULT '{}'::jsonb;

-- Add new columns to client_services table
ALTER TABLE public.client_services
ADD COLUMN IF NOT EXISTS plan_type public.plan_type DEFAULT 'glg_standard',
ADD COLUMN IF NOT EXISTS estimated_settlement_percentage numeric DEFAULT 55,
ADD COLUMN IF NOT EXISTS first_draft_date date,
ADD COLUMN IF NOT EXISTS requires_management_approval boolean DEFAULT false;

-- Create lead_debts table for storing debts during wizard
CREATE TABLE IF NOT EXISTS public.lead_debts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  creditor_id uuid REFERENCES public.creditors(id),
  creditor_name text NOT NULL,
  account_type public.liability_type NOT NULL DEFAULT 'credit_card',
  original_balance numeric,
  current_balance numeric NOT NULL,
  account_number_last4 text,
  is_enrolled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create lead_banking table for storing banking info during wizard
CREATE TABLE IF NOT EXISTS public.lead_banking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  routing_number_encrypted text,
  account_number_encrypted text,
  account_type public.bank_account_type NOT NULL DEFAULT 'checking',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create lead_disclosures table for tracking acknowledged disclosures
CREATE TABLE IF NOT EXISTS public.lead_disclosures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  disclosure_type text NOT NULL,
  acknowledged_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(lead_id, disclosure_type)
);

-- Enable RLS on new tables
ALTER TABLE public.lead_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_banking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_disclosures ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_debts
CREATE POLICY "Staff can access lead debts"
ON public.lead_debts
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.leads l
  WHERE l.id = lead_debts.lead_id
  AND can_access_company(auth.uid(), l.company_id)
));

-- RLS policies for lead_banking
CREATE POLICY "Staff can access lead banking"
ON public.lead_banking
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.leads l
  WHERE l.id = lead_banking.lead_id
  AND can_access_company(auth.uid(), l.company_id)
));

-- RLS policies for lead_disclosures
CREATE POLICY "Staff can access lead disclosures"
ON public.lead_disclosures
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.leads l
  WHERE l.id = lead_disclosures.lead_id
  AND can_access_company(auth.uid(), l.company_id)
));