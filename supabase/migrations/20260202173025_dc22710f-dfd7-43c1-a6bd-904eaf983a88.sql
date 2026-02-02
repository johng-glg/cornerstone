-- Create payment frequency enum
CREATE TYPE payment_frequency_enum AS ENUM ('monthly', 'semi_monthly', 'bi_weekly');

-- Create schedule status enum
CREATE TYPE schedule_status_enum AS ENUM ('active', 'paused', 'completed', 'cancelled');

-- Create payment_schedules table
CREATE TABLE public.payment_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_service_id UUID NOT NULL REFERENCES public.client_services(id) ON DELETE CASCADE,
  frequency payment_frequency_enum NOT NULL DEFAULT 'monthly',
  draft_amount NUMERIC NOT NULL,
  processor_fee_amount NUMERIC NOT NULL DEFAULT 10,
  first_draft_date DATE NOT NULL,
  total_drafts INTEGER NOT NULL,
  drafts_generated INTEGER NOT NULL DEFAULT 0,
  last_generated_date DATE,
  status schedule_status_enum NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one active schedule per service
  CONSTRAINT unique_active_schedule_per_service UNIQUE (client_service_id) 
);

-- Create index for faster lookups
CREATE INDEX idx_payment_schedules_client_service ON public.payment_schedules(client_service_id);
CREATE INDEX idx_payment_schedules_status ON public.payment_schedules(status);

-- Enable RLS
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies - access via client_services company
CREATE POLICY "Staff can view payment schedules"
ON public.payment_schedules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_services cs
    WHERE cs.id = payment_schedules.client_service_id
    AND can_access_company(auth.uid(), cs.owning_company_id)
  )
);

CREATE POLICY "Staff can manage payment schedules"
ON public.payment_schedules
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM client_services cs
    WHERE cs.id = payment_schedules.client_service_id
    AND can_access_company(auth.uid(), cs.owning_company_id)
  )
);

-- Trigger to update updated_at
CREATE TRIGGER update_payment_schedules_updated_at
BEFORE UPDATE ON public.payment_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add schedule_id reference to transactions table for linking
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES public.payment_schedules(id) ON DELETE SET NULL;

-- Index for schedule lookups on transactions
CREATE INDEX IF NOT EXISTS idx_transactions_schedule_id ON public.transactions(schedule_id);