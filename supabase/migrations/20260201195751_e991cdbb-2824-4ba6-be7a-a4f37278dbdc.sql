-- Add 'litigation_matter' to entity_type enum for assignments and tasks
ALTER TYPE entity_type ADD VALUE IF NOT EXISTS 'litigation_matter';

-- Create litigation_activities table
CREATE TABLE public.litigation_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matter_id UUID NOT NULL REFERENCES public.litigation_matters(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  outcome TEXT,
  activity_date TIMESTAMP WITH TIME ZONE,
  staff_id UUID REFERENCES public.staff(id),
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create litigation_hearings table
CREATE TABLE public.litigation_hearings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matter_id UUID NOT NULL REFERENCES public.litigation_matters(id) ON DELETE CASCADE,
  hearing_type TEXT NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  judge_name TEXT,
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create litigation_documents table
CREATE TABLE public.litigation_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matter_id UUID NOT NULL REFERENCES public.litigation_matters(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT,
  filed_date DATE,
  deadline_date DATE,
  notes TEXT,
  uploaded_by UUID REFERENCES public.staff(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.litigation_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.litigation_hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.litigation_documents ENABLE ROW LEVEL SECURITY;

-- RLS for litigation_activities (inherit access from litigation_matters -> client_services)
CREATE POLICY "Staff can access litigation activities"
ON public.litigation_activities
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.litigation_matters lm
    JOIN public.client_services cs ON cs.id = lm.client_service_id
    WHERE lm.id = litigation_activities.matter_id
    AND can_access_company(auth.uid(), cs.owning_company_id)
  )
);

-- RLS for litigation_hearings
CREATE POLICY "Staff can access litigation hearings"
ON public.litigation_hearings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.litigation_matters lm
    JOIN public.client_services cs ON cs.id = lm.client_service_id
    WHERE lm.id = litigation_hearings.matter_id
    AND can_access_company(auth.uid(), cs.owning_company_id)
  )
);

-- RLS for litigation_documents
CREATE POLICY "Staff can access litigation documents"
ON public.litigation_documents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.litigation_matters lm
    JOIN public.client_services cs ON cs.id = lm.client_service_id
    WHERE lm.id = litigation_documents.matter_id
    AND can_access_company(auth.uid(), cs.owning_company_id)
  )
);

-- Add update trigger for litigation_hearings
CREATE TRIGGER update_litigation_hearings_updated_at
BEFORE UPDATE ON public.litigation_hearings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_litigation_activities_matter_id ON public.litigation_activities(matter_id);
CREATE INDEX idx_litigation_hearings_matter_id ON public.litigation_hearings(matter_id);
CREATE INDEX idx_litigation_documents_matter_id ON public.litigation_documents(matter_id);
CREATE INDEX idx_litigation_hearings_scheduled_date ON public.litigation_hearings(scheduled_date);
CREATE INDEX idx_litigation_documents_deadline_date ON public.litigation_documents(deadline_date);