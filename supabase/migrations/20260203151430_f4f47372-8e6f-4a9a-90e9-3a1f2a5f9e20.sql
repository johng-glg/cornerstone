-- Create workflow_groups table
CREATE TABLE public.workflow_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  entity_type workflow_entity_type NOT NULL,
  filter_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  color TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.staff(id) ON DELETE SET NULL
);

-- Add group_id to workflow_rules
ALTER TABLE public.workflow_rules
ADD COLUMN group_id UUID REFERENCES public.workflow_groups(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.workflow_groups ENABLE ROW LEVEL SECURITY;

-- RLS policies for workflow_groups
CREATE POLICY "Users can view workflow groups in their company"
ON public.workflow_groups
FOR SELECT
USING (can_access_company(auth.uid(), company_id));

CREATE POLICY "Users can create workflow groups in their company"
ON public.workflow_groups
FOR INSERT
WITH CHECK (can_access_company(auth.uid(), company_id));

CREATE POLICY "Users can update workflow groups in their company"
ON public.workflow_groups
FOR UPDATE
USING (can_access_company(auth.uid(), company_id));

CREATE POLICY "Users can delete workflow groups in their company"
ON public.workflow_groups
FOR DELETE
USING (can_access_company(auth.uid(), company_id));

-- Trigger for updated_at
CREATE TRIGGER update_workflow_groups_updated_at
BEFORE UPDATE ON public.workflow_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_workflow_groups_company_id ON public.workflow_groups(company_id);
CREATE INDEX idx_workflow_groups_entity_type ON public.workflow_groups(entity_type);
CREATE INDEX idx_workflow_rules_group_id ON public.workflow_rules(group_id);