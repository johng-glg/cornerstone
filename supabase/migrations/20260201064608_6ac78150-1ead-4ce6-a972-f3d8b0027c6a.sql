-- =====================================================
-- MAJOR REFACTOR: Engagements → Client Services, Contacts → Clients
-- =====================================================

-- Step 1: Rename contacts table to clients
ALTER TABLE public.contacts RENAME TO clients;

-- Step 2: Rename engagements table to client_services
ALTER TABLE public.engagements RENAME TO client_services;

-- Step 3: Rename engagement_contacts to client_service_clients (junction table)
ALTER TABLE public.engagement_contacts RENAME TO client_service_clients;

-- Step 4: Rename engagement_services to client_service_types (services offered under a client service)
ALTER TABLE public.engagement_services RENAME TO client_service_types;

-- Step 5: Update foreign key column names in client_service_clients
ALTER TABLE public.client_service_clients RENAME COLUMN engagement_id TO client_service_id;
ALTER TABLE public.client_service_clients RENAME COLUMN contact_id TO client_id;

-- Step 6: Update foreign key column names in client_service_types
ALTER TABLE public.client_service_types RENAME COLUMN engagement_id TO client_service_id;

-- Step 7: Update foreign key column names in client_services
ALTER TABLE public.client_services RENAME COLUMN primary_contact_id TO primary_client_id;

-- Step 8: Update engagement_number to service_number
ALTER TABLE public.client_services RENAME COLUMN engagement_number TO service_number;

-- Step 9: Update liabilities table foreign key
ALTER TABLE public.liabilities RENAME COLUMN engagement_id TO client_service_id;

-- Step 10: Update transactions table foreign key
ALTER TABLE public.transactions RENAME COLUMN engagement_id TO client_service_id;

-- Step 11: Update leads table foreign key
ALTER TABLE public.leads RENAME COLUMN converted_engagement_id TO converted_service_id;

-- Step 12: Rename generate_engagement_number function
DROP FUNCTION IF EXISTS public.generate_engagement_number() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_service_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.service_number := 'SVC-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(nextval('engagement_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;

-- Recreate trigger for service number generation
CREATE TRIGGER generate_service_number_trigger
  BEFORE INSERT ON public.client_services
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_service_number();

-- Step 13: Add Debt Settlement program fields to client_services
ALTER TABLE public.client_services 
  ADD COLUMN program_type text DEFAULT 'debt_settlement',
  ADD COLUMN term_months integer,
  ADD COLUMN monthly_payment numeric,
  ADD COLUMN payment_frequency text DEFAULT 'monthly',
  ADD COLUMN first_payment_date date,
  ADD COLUMN escrow_balance numeric DEFAULT 0,
  ADD COLUMN total_enrolled_debt numeric DEFAULT 0,
  ADD COLUMN settlement_fee_percentage numeric DEFAULT 25,
  ADD COLUMN monthly_service_fee numeric DEFAULT 0,
  ADD COLUMN program_start_date date,
  ADD COLUMN estimated_completion_date date;

-- Step 14: Update RLS policies for renamed tables

-- Drop old policies on clients (formerly contacts)
DROP POLICY IF EXISTS "Staff can manage company contacts" ON public.clients;
DROP POLICY IF EXISTS "Staff can view company contacts" ON public.clients;

-- Create new policies on clients
CREATE POLICY "Staff can manage company clients"
ON public.clients FOR ALL
USING (can_access_company(auth.uid(), company_id));

CREATE POLICY "Staff can view company clients"
ON public.clients FOR SELECT
USING (can_access_company(auth.uid(), company_id));

-- Drop old policies on client_services (formerly engagements)
DROP POLICY IF EXISTS "Staff can manage company engagements" ON public.client_services;
DROP POLICY IF EXISTS "Staff can view company engagements" ON public.client_services;

-- Create new policies on client_services
CREATE POLICY "Staff can manage company client_services"
ON public.client_services FOR ALL
USING (can_access_company(auth.uid(), owning_company_id));

CREATE POLICY "Staff can view company client_services"
ON public.client_services FOR SELECT
USING (can_access_company(auth.uid(), owning_company_id));

-- Drop old policies on client_service_clients (formerly engagement_contacts)
DROP POLICY IF EXISTS "Staff can access engagement contacts" ON public.client_service_clients;

-- Create new policy on client_service_clients
CREATE POLICY "Staff can access client_service_clients"
ON public.client_service_clients FOR ALL
USING (EXISTS (
  SELECT 1 FROM client_services cs
  WHERE cs.id = client_service_clients.client_service_id
  AND can_access_company(auth.uid(), cs.owning_company_id)
));

-- Drop old policies on client_service_types (formerly engagement_services)
DROP POLICY IF EXISTS "Staff can access engagement services" ON public.client_service_types;

-- Create new policy on client_service_types
CREATE POLICY "Staff can access client_service_types"
ON public.client_service_types FOR ALL
USING (EXISTS (
  SELECT 1 FROM client_services cs
  WHERE cs.id = client_service_types.client_service_id
  AND can_access_company(auth.uid(), cs.owning_company_id)
));

-- Update RLS policies on liabilities (column renamed)
DROP POLICY IF EXISTS "Staff can access liabilities" ON public.liabilities;

CREATE POLICY "Staff can access liabilities"
ON public.liabilities FOR ALL
USING (EXISTS (
  SELECT 1 FROM client_services cs
  WHERE cs.id = liabilities.client_service_id
  AND can_access_company(auth.uid(), cs.owning_company_id)
));

-- Update RLS policies on transactions (column renamed)
DROP POLICY IF EXISTS "Staff can access transactions" ON public.transactions;

CREATE POLICY "Staff can access transactions"
ON public.transactions FOR ALL
USING (EXISTS (
  SELECT 1 FROM client_services cs
  WHERE cs.id = transactions.client_service_id
  AND can_access_company(auth.uid(), cs.owning_company_id)
));

-- Update policies on contact_addresses (now client_addresses conceptually but table stays)
DROP POLICY IF EXISTS "Staff can access contact addresses" ON public.contact_addresses;
ALTER TABLE public.contact_addresses RENAME COLUMN contact_id TO client_id;

CREATE POLICY "Staff can access client addresses"
ON public.contact_addresses FOR ALL
USING (EXISTS (
  SELECT 1 FROM clients c
  WHERE c.id = contact_addresses.client_id
  AND can_access_company(auth.uid(), c.company_id)
));

-- Update policies on contact_phones (now client_phones conceptually but table stays)
DROP POLICY IF EXISTS "Staff can access contact phones" ON public.contact_phones;
ALTER TABLE public.contact_phones RENAME COLUMN contact_id TO client_id;

CREATE POLICY "Staff can access client phones"
ON public.contact_phones FOR ALL
USING (EXISTS (
  SELECT 1 FROM clients c
  WHERE c.id = contact_phones.client_id
  AND can_access_company(auth.uid(), c.company_id)
));

-- Rename contact_addresses and contact_phones tables
ALTER TABLE public.contact_addresses RENAME TO client_addresses;
ALTER TABLE public.contact_phones RENAME TO client_phones;

-- Update RLS on lead_activities (uses clients now via lead -> client journey)
-- No changes needed, it still references leads

-- Update engagement_status enum to service_status
ALTER TYPE public.engagement_status RENAME TO service_status;

-- Update contact_relationship enum to client_relationship
ALTER TYPE public.contact_relationship RENAME TO client_relationship;