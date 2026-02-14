
-- Add eligibility_reviewer to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'eligibility_reviewer';
