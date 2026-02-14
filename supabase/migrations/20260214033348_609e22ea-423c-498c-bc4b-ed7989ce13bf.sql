
-- Add 'eligibility' to the department_new enum
ALTER TYPE public.department_new ADD VALUE IF NOT EXISTS 'eligibility';
