-- Remove 'both' from lead_interest enum
-- First update any existing 'both' leads to 'debt_resolution' 
UPDATE public.leads SET interest_type = 'debt_resolution' WHERE interest_type = 'both';

-- Add litigation-specific fields to leads table for conversion process
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS service_date date,
ADD COLUMN IF NOT EXISTS response_deadline date,
ADD COLUMN IF NOT EXISTS opposing_party text,
ADD COLUMN IF NOT EXISTS court_name text,
ADD COLUMN IF NOT EXISTS case_number text;