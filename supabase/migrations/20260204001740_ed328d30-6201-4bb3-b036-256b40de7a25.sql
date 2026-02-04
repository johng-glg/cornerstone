-- Create new consolidated department enum
CREATE TYPE department_new AS ENUM (
  'administration',
  'legal',
  'negotiations',
  'sales',
  'client_services',
  'operations'
);

-- Create job_titles reference table for autocomplete suggestions
CREATE TABLE public.job_titles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role app_role NOT NULL,
  title TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on job_titles
ALTER TABLE public.job_titles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read job titles
CREATE POLICY "Authenticated users can view job titles"
ON public.job_titles
FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage job titles
CREATE POLICY "Admins can manage job titles"
ON public.job_titles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert default job titles by role
INSERT INTO public.job_titles (role, title, display_order) VALUES
-- Attorney titles
('attorney', 'Associate Attorney', 1),
('attorney', 'Staff Attorney', 2),
('attorney', 'Senior Associate', 3),
('attorney', 'Junior Partner', 4),
('attorney', 'Managing Partner', 5),
-- Case Manager titles
('case_manager', 'Case Manager', 1),
('case_manager', 'Senior Case Manager', 2),
('case_manager', 'Case Manager Team Lead', 3),
-- Paralegal titles
('paralegal', 'Paralegal', 1),
('paralegal', 'Senior Paralegal', 2),
('paralegal', 'Paralegal Supervisor', 3),
-- Negotiator titles
('negotiator', 'Negotiator', 1),
('negotiator', 'Priority Negotiator', 2),
('negotiator', 'Bulk Negotiator', 3),
('negotiator', 'Senior Negotiator', 4),
('negotiator', 'Negotiations Team Lead', 5),
-- Sales Rep titles
('sales_rep', 'Sales Representative', 1),
('sales_rep', 'Senior Sales Rep', 2),
('sales_rep', 'Sales Team Lead', 3),
-- Client Services titles
('client_services_rep', 'Client Services Rep', 1),
('client_services_rep', 'Senior CSR', 2),
('client_services_rep', 'Retention Specialist', 3),
('client_services_rep', 'Client Services Team Lead', 4),
-- Payment Processor titles
('payment_processor', 'Payment Processor', 1),
('payment_processor', 'Senior Payment Processor', 2),
('payment_processor', 'Payment Processing Lead', 3),
-- Correspondent titles
('correspondent', 'Correspondent', 1),
('correspondent', 'Senior Correspondent', 2),
('correspondent', 'Correspondence Lead', 3),
-- Admin titles
('admin', 'System Administrator', 1),
('admin', 'Operations Manager', 2),
('admin', 'Director of Operations', 3);

-- Add column for new department type to staff table
ALTER TABLE public.staff ADD COLUMN department_new department_new;

-- Migrate existing department values to new consolidated departments
UPDATE public.staff SET department_new = 
  CASE department::text
    WHEN 'admin' THEN 'administration'::department_new
    WHEN 'attorney' THEN 'legal'::department_new
    WHEN 'case_manager' THEN 'legal'::department_new
    WHEN 'sales_intake' THEN 'sales'::department_new
    WHEN 'client_services' THEN 'client_services'::department_new
    WHEN 'negotiations' THEN 'negotiations'::department_new
    WHEN 'payment_processing' THEN 'operations'::department_new
    WHEN 'correspondence' THEN 'operations'::department_new
    ELSE 'administration'::department_new
  END;

-- Make department_new NOT NULL after migration
ALTER TABLE public.staff ALTER COLUMN department_new SET NOT NULL;

-- Drop the old department column
ALTER TABLE public.staff DROP COLUMN department;

-- Rename department_new to department
ALTER TABLE public.staff RENAME COLUMN department_new TO department;

-- Drop old enum type (no longer needed)
DROP TYPE department;