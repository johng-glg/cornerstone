
-- Add eligibility_review to the lead_status enum
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'eligibility_review';

-- Create eligibility_reviews table
CREATE TABLE public.eligibility_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_by UUID REFERENCES public.staff(id),
  reviewed_by UUID REFERENCES public.staff(id),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  decline_reason TEXT,
  flags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Update timestamp trigger
CREATE TRIGGER update_eligibility_reviews_updated_at
  BEFORE UPDATE ON public.eligibility_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.eligibility_reviews ENABLE ROW LEVEL SECURITY;

-- RLS: staff can read reviews for leads in their company
CREATE POLICY "Staff can view eligibility reviews for their company leads"
  ON public.eligibility_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      JOIN public.staff s ON s.company_id = l.company_id
      WHERE l.id = eligibility_reviews.lead_id
        AND s.user_id = auth.uid()
    )
  );

-- RLS: staff can insert reviews for leads in their company
CREATE POLICY "Staff can create eligibility reviews"
  ON public.eligibility_reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      JOIN public.staff s ON s.company_id = l.company_id
      WHERE l.id = eligibility_reviews.lead_id
        AND s.user_id = auth.uid()
    )
  );

-- RLS: staff can update reviews for leads in their company
CREATE POLICY "Staff can update eligibility reviews"
  ON public.eligibility_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      JOIN public.staff s ON s.company_id = l.company_id
      WHERE l.id = eligibility_reviews.lead_id
        AND s.user_id = auth.uid()
    )
  );

-- Update the lead status transition trigger to handle eligibility_review
CREATE OR REPLACE FUNCTION public.track_lead_status_transition()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'new' THEN NEW.new_at = COALESCE(NEW.new_at, now());
      WHEN 'contacted' THEN NEW.contacted_at = COALESCE(NEW.contacted_at, now());
      WHEN 'qualified' THEN NEW.qualified_at = COALESCE(NEW.qualified_at, now());
      WHEN 'eligibility_review' THEN NULL;
      WHEN 'converted' THEN NEW.converted_at = COALESCE(NEW.converted_at, now());
      WHEN 'lost' THEN NEW.lost_at = COALESCE(NEW.lost_at, now());
      ELSE NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$function$;

-- Enable realtime for eligibility_reviews
ALTER PUBLICATION supabase_realtime ADD TABLE public.eligibility_reviews;
