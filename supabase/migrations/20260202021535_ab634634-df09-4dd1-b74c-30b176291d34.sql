-- Create report_templates table for saving report configurations
CREATE TABLE public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  created_by UUID REFERENCES public.staff(id),
  name TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_preset BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- Policy for company access (user templates)
CREATE POLICY "Staff can access company report templates"
ON public.report_templates FOR ALL
USING (
  company_id IS NULL AND is_preset = true
  OR can_access_company(auth.uid(), company_id)
);

-- Create trigger for updated_at
CREATE TRIGGER update_report_templates_updated_at
BEFORE UPDATE ON public.report_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed preset report configurations
INSERT INTO public.report_templates (company_id, name, description, module, config, is_preset, is_public)
VALUES
  (NULL, 'Lead Conversion Report', 'Track lead pipeline and conversion rates by source and status', 'leads', 
   '{"columns":["lead_number","first_name","last_name","source","status","estimated_debt_amount","created_at","converted_at","assigned_to"],"filters":[],"sortBy":"created_at","sortOrder":"desc","chartType":"bar","groupBy":"status"}'::jsonb, 
   true, true),
  (NULL, 'Enrollment Report', 'Track debt settlement enrollments and program details', 'services', 
   '{"columns":["service_number","primary_client_id","enrolled_date","status","total_enrolled_debt","monthly_payment","term_months","plan_type"],"filters":[],"sortBy":"enrolled_date","sortOrder":"desc","chartType":"line","groupBy":"status"}'::jsonb, 
   true, true),
  (NULL, 'Settlement Report', 'Track settlement offers, acceptances, and completion rates', 'settlements', 
   '{"columns":["liability_id","offer_amount","offer_percentage","status","offered_date","accepted_date","completed_date","payment_type"],"filters":[],"sortBy":"offered_date","sortOrder":"desc","chartType":"bar","groupBy":"status"}'::jsonb, 
   true, true),
  (NULL, 'Revenue Report', 'Track fee collection and revenue from settlements', 'transactions', 
   '{"columns":["client_service_id","amount","transaction_type","status","scheduled_date","processed_at"],"filters":[{"field":"transaction_type","operator":"eq","value":"contingency_fee"}],"sortBy":"scheduled_date","sortOrder":"desc","chartType":"bar","groupBy":"status"}'::jsonb, 
   true, true),
  (NULL, 'Caseload Report', 'Track staff assignments and workload distribution', 'services', 
   '{"columns":["service_number","primary_client_id","status","total_enrolled_debt","created_at"],"filters":[{"field":"status","operator":"in","value":["active","pending"]}],"sortBy":"created_at","sortOrder":"desc","chartType":"bar","groupBy":"status"}'::jsonb, 
   true, true);