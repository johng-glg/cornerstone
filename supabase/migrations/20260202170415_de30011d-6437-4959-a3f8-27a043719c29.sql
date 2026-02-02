-- Create template_type enum
CREATE TYPE template_type AS ENUM ('email', 'sms', 'document');

-- Create template_language enum
CREATE TYPE template_language AS ENUM ('en', 'es');

-- Create template_categories table
CREATE TABLE public.template_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_type template_type,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create templates table
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.template_categories(id) ON DELETE SET NULL,
  template_type template_type NOT NULL,
  subject TEXT,
  content TEXT NOT NULL DEFAULT '',
  content_html TEXT,
  merge_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  conditional_clauses JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  language template_language NOT NULL DEFAULT 'en',
  created_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_version INTEGER NOT NULL DEFAULT 1
);

-- Create template_versions table
CREATE TABLE public.template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT,
  subject TEXT,
  created_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_notes TEXT,
  UNIQUE(template_id, version_number)
);

-- Create template_usages table
CREATE TABLE public.template_usages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  used_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT
);

-- Create indexes
CREATE INDEX idx_templates_company ON public.templates(company_id);
CREATE INDEX idx_templates_category ON public.templates(category_id);
CREATE INDEX idx_templates_type ON public.templates(template_type);
CREATE INDEX idx_templates_active ON public.templates(is_active);
CREATE INDEX idx_template_categories_company ON public.template_categories(company_id);
CREATE INDEX idx_template_versions_template ON public.template_versions(template_id);
CREATE INDEX idx_template_usages_template ON public.template_usages(template_id);
CREATE INDEX idx_template_usages_entity ON public.template_usages(entity_type, entity_id);

-- Add updated_at triggers
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_template_categories_updated_at
  BEFORE UPDATE ON public.template_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_usages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for template_categories
CREATE POLICY "Users can view their company's template categories"
  ON public.template_categories FOR SELECT
  USING (can_access_company(auth.uid(), company_id));

CREATE POLICY "Users can create template categories in their company"
  ON public.template_categories FOR INSERT
  WITH CHECK (can_access_company(auth.uid(), company_id));

CREATE POLICY "Users can update their company's template categories"
  ON public.template_categories FOR UPDATE
  USING (can_access_company(auth.uid(), company_id));

CREATE POLICY "Users can delete their company's template categories"
  ON public.template_categories FOR DELETE
  USING (can_access_company(auth.uid(), company_id));

-- RLS Policies for templates
CREATE POLICY "Users can view their company's templates"
  ON public.templates FOR SELECT
  USING (can_access_company(auth.uid(), company_id));

CREATE POLICY "Users can create templates in their company"
  ON public.templates FOR INSERT
  WITH CHECK (can_access_company(auth.uid(), company_id));

CREATE POLICY "Users can update their company's templates"
  ON public.templates FOR UPDATE
  USING (can_access_company(auth.uid(), company_id) AND is_system = false);

CREATE POLICY "Users can delete their company's non-system templates"
  ON public.templates FOR DELETE
  USING (can_access_company(auth.uid(), company_id) AND is_system = false);

-- RLS Policies for template_versions
CREATE POLICY "Users can view template versions for their company's templates"
  ON public.template_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.templates t 
    WHERE t.id = template_id 
    AND can_access_company(auth.uid(), t.company_id)
  ));

CREATE POLICY "Users can create template versions for their company's templates"
  ON public.template_versions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.templates t 
    WHERE t.id = template_id 
    AND can_access_company(auth.uid(), t.company_id)
  ));

-- RLS Policies for template_usages
CREATE POLICY "Users can view template usages for their company's templates"
  ON public.template_usages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.templates t 
    WHERE t.id = template_id 
    AND can_access_company(auth.uid(), t.company_id)
  ));

CREATE POLICY "Users can log template usages for their company's templates"
  ON public.template_usages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.templates t 
    WHERE t.id = template_id 
    AND can_access_company(auth.uid(), t.company_id)
  ));