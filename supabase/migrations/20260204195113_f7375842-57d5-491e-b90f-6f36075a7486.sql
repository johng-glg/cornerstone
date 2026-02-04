-- Add hourly_rate to staff table for billing calculations
ALTER TABLE public.staff
ADD COLUMN hourly_rate numeric(10,2) DEFAULT 350.00;

-- Add comment for clarity
COMMENT ON COLUMN public.staff.hourly_rate IS 'Default hourly billing rate for this staff member';