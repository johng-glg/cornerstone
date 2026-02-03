-- Add last_login_at column to staff table
ALTER TABLE public.staff 
ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN public.staff.last_login_at IS 'Timestamp of when the staff member last logged in';