-- Add end_date column to litigation_hearings for event duration
ALTER TABLE public.litigation_hearings 
ADD COLUMN end_date timestamptz;