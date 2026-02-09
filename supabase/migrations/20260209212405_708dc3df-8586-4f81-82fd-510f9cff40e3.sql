
-- Create task_templates table
CREATE TABLE public.task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  department public.department_new,
  task_type public.task_type NOT NULL DEFAULT 'general',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  default_title TEXT NOT NULL,
  default_description TEXT,
  default_due_days INTEGER,
  company_id UUID REFERENCES public.companies(id),
  created_by UUID REFERENCES public.staff(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active templates
CREATE POLICY "Authenticated users can read task templates"
  ON public.task_templates FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage templates
CREATE POLICY "Admins can insert task templates"
  ON public.task_templates FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update task templates"
  ON public.task_templates FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete task templates"
  ON public.task_templates FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_task_templates_updated_at
  BEFORE UPDATE ON public.task_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
