
-- Filing fee status enum
CREATE TYPE public.filing_fee_status AS ENUM ('pending', 'submitted_to_client', 'approved', 'declined', 'paid');

-- Filing fees table
CREATE TABLE public.filing_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matter_id UUID NOT NULL REFERENCES public.litigation_matters(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  status public.filing_fee_status NOT NULL DEFAULT 'pending',
  requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
  approved_date DATE,
  paid_date DATE,
  notes TEXT,
  created_by UUID REFERENCES public.staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.filing_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view filing fees" ON public.filing_fees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert filing fees" ON public.filing_fees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update filing fees" ON public.filing_fees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete filing fees" ON public.filing_fees FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_filing_fees_updated_at BEFORE UPDATE ON public.filing_fees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Appearance request status enum
CREATE TYPE public.appearance_request_status AS ENUM ('pending', 'approved', 'assigned', 'completed', 'cancelled');

-- Appearance requests table
CREATE TABLE public.appearance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matter_id UUID NOT NULL REFERENCES public.litigation_matters(id) ON DELETE CASCADE,
  hearing_id UUID REFERENCES public.litigation_hearings(id) ON DELETE SET NULL,
  requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
  appearance_date DATE NOT NULL,
  court_name TEXT,
  description TEXT NOT NULL,
  status public.appearance_request_status NOT NULL DEFAULT 'pending',
  assigned_to UUID REFERENCES public.staff(id),
  requested_by UUID REFERENCES public.staff(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appearance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view appearance requests" ON public.appearance_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert appearance requests" ON public.appearance_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update appearance requests" ON public.appearance_requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete appearance requests" ON public.appearance_requests FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_appearance_requests_updated_at BEFORE UPDATE ON public.appearance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notification trigger for matter assignments
CREATE OR REPLACE FUNCTION public.notify_matter_assignment()
RETURNS TRIGGER AS $$
DECLARE
  _user_id UUID;
  _case_number TEXT;
BEGIN
  IF NEW.entity_type = 'litigation_matter' AND NEW.is_active = true THEN
    SELECT user_id INTO _user_id FROM staff WHERE id = NEW.staff_id;
    SELECT case_number INTO _case_number FROM litigation_matters WHERE id = NEW.entity_id;
    
    IF _user_id IS NOT NULL THEN
      PERFORM create_notification(
        _user_id,
        'matter_assigned',
        'You have been assigned to litigation matter ' || COALESCE(_case_number, 'N/A'),
        '/litigation?open=' || NEW.entity_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_notify_matter_assignment
  AFTER INSERT ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_matter_assignment();
