-- Add stage transition date tracking columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS new_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS lost_at TIMESTAMP WITH TIME ZONE;

-- Update existing leads to have new_at set to created_at
UPDATE public.leads SET new_at = created_at WHERE new_at IS NULL;

-- Create a trigger function to track status transitions
CREATE OR REPLACE FUNCTION public.track_lead_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'new' THEN NEW.new_at = COALESCE(NEW.new_at, now());
      WHEN 'contacted' THEN NEW.contacted_at = COALESCE(NEW.contacted_at, now());
      WHEN 'qualified' THEN NEW.qualified_at = COALESCE(NEW.qualified_at, now());
      WHEN 'converted' THEN NEW.converted_at = COALESCE(NEW.converted_at, now());
      WHEN 'lost' THEN NEW.lost_at = COALESCE(NEW.lost_at, now());
      ELSE NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS lead_status_transition_trigger ON public.leads;
CREATE TRIGGER lead_status_transition_trigger
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.track_lead_status_transition();