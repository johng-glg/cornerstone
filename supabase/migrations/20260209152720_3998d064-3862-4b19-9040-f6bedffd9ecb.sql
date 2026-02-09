
-- Create enum for feature request category
CREATE TYPE public.feature_request_category AS ENUM (
  'workflow_gap',
  'missing_field',
  'ui_improvement',
  'new_feature',
  'integration',
  'reporting',
  'other'
);

-- Create enum for feature request priority
CREATE TYPE public.feature_request_priority AS ENUM (
  'critical',
  'high',
  'medium',
  'low'
);

-- Create enum for feature request status
CREATE TYPE public.feature_request_status AS ENUM (
  'submitted',
  'under_review',
  'planned',
  'in_progress',
  'completed',
  'declined'
);

-- Create enum for request type (existing flow vs future)
CREATE TYPE public.feature_request_type AS ENUM (
  'existing_workflow',
  'future_improvement'
);

-- Create the feature_requests table
CREATE TABLE public.feature_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category public.feature_request_category NOT NULL DEFAULT 'other',
  request_type public.feature_request_type NOT NULL DEFAULT 'future_improvement',
  priority public.feature_request_priority NOT NULL DEFAULT 'medium',
  status public.feature_request_status NOT NULL DEFAULT 'submitted',
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_name TEXT,
  department TEXT,
  affected_module TEXT,
  admin_notes TEXT,
  votes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view feature requests
CREATE POLICY "Authenticated users can view feature requests"
  ON public.feature_requests FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can create feature requests
CREATE POLICY "Authenticated users can create feature requests"
  ON public.feature_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

-- Users can update their own requests, admins can update any
CREATE POLICY "Users can update own requests or admins any"
  ON public.feature_requests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = submitted_by 
    OR public.has_role(auth.uid(), 'admin')
  );

-- Only admins can delete
CREATE POLICY "Admins can delete feature requests"
  ON public.feature_requests FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_feature_requests_updated_at
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
