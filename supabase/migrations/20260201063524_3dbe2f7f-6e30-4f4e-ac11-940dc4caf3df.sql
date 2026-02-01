-- Update any existing services with 'hybrid' type to 'debt_resolution'
UPDATE public.services SET service_type = 'debt_resolution' WHERE service_type = 'hybrid';

-- Remove 'hybrid' from the enum (requires recreating the enum)
ALTER TYPE public.service_type RENAME TO service_type_old;
CREATE TYPE public.service_type AS ENUM ('debt_resolution', 'consumer_defense');

-- Update the column to use the new enum
ALTER TABLE public.services 
  ALTER COLUMN service_type TYPE public.service_type 
  USING service_type::text::public.service_type;

-- Drop the old enum
DROP TYPE public.service_type_old;