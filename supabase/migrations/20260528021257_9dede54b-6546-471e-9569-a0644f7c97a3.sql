CREATE TABLE public.template_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  used_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  channel text,
  success boolean NOT NULL DEFAULT true,
  error_message text
);

CREATE INDEX idx_template_usage_template ON public.template_usage(template_id, used_at DESC);
CREATE INDEX idx_template_usage_entity ON public.template_usage(entity_type, entity_id);

GRANT SELECT, INSERT ON public.template_usage TO authenticated;
GRANT ALL ON public.template_usage TO service_role;

ALTER TABLE public.template_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view template usage for their company"
ON public.template_usage FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.templates t
  WHERE t.id = template_usage.template_id
    AND can_access_company(auth.uid(), t.company_id)
));

CREATE POLICY "Users log template usage for their company"
ON public.template_usage FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.templates t
  WHERE t.id = template_usage.template_id
    AND can_access_company(auth.uid(), t.company_id)
));