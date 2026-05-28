-- Phase 11A: integration_providers registry
CREATE TABLE public.integration_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  docs_url TEXT,
  icon_key TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  default_event_subscriptions TEXT[] NOT NULL DEFAULT '{}',
  auth_method TEXT NOT NULL DEFAULT 'api_key',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.integration_providers TO authenticated;
GRANT ALL ON public.integration_providers TO service_role;

ALTER TABLE public.integration_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers are readable by authenticated"
  ON public.integration_providers FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage providers"
  ON public.integration_providers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_integration_providers_updated_at
  BEFORE UPDATE ON public.integration_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 11B: company_integrations per-tenant config
CREATE TABLE public.company_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  provider_key TEXT NOT NULL REFERENCES public.integration_providers(provider_key) ON UPDATE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  credentials_vault_ref TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_connected_at TIMESTAMPTZ,
  last_connection_error TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, provider_key)
);

CREATE INDEX idx_company_integrations_company ON public.company_integrations(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_integrations TO authenticated;
GRANT ALL ON public.company_integrations TO service_role;

ALTER TABLE public.company_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read company integrations within company"
  ON public.company_integrations FOR SELECT
  TO authenticated
  USING (public.can_access_company(auth.uid(), company_id));

CREATE POLICY "Admins insert company integrations"
  ON public.company_integrations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND public.can_access_company(auth.uid(), company_id)
  );

CREATE POLICY "Admins update company integrations"
  ON public.company_integrations FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND public.can_access_company(auth.uid(), company_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND public.can_access_company(auth.uid(), company_id)
  );

CREATE POLICY "Admins delete company integrations"
  ON public.company_integrations FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND public.can_access_company(auth.uid(), company_id)
  );

CREATE TRIGGER trg_company_integrations_updated_at
  BEFORE UPDATE ON public.company_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 11C: integration_event_log
CREATE TABLE public.integration_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  provider_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  direction TEXT,
  entity_type TEXT,
  entity_id UUID,
  payload JSONB,
  success BOOLEAN,
  error_message TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_event_log_company_created
  ON public.integration_event_log (company_id, created_at DESC);
CREATE INDEX idx_integration_event_log_provider_created
  ON public.integration_event_log (provider_key, created_at DESC);

GRANT SELECT ON public.integration_event_log TO authenticated;
GRANT ALL ON public.integration_event_log TO service_role;

ALTER TABLE public.integration_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read integration events within company"
  ON public.integration_event_log FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND (company_id IS NULL OR public.can_access_company(auth.uid(), company_id))
  );

-- Seed existing providers
INSERT INTO public.integration_providers
  (provider_key, display_name, category, description, docs_url, icon_key, auth_method, default_event_subscriptions)
VALUES
  ('docuseal',  'DocuSeal',  'esignature',        'Document e-signature requests and completed-document retrieval.', 'https://www.docuseal.com/docs', 'file-signature', 'api_key',        ARRAY['signature.completed','signature.declined']),
  ('forth_pay', 'Forth Pay', 'payment_processor', 'Forth Pay payment processing and transaction polling.',          'https://forthcrm.com/docs',     'banknote',       'oauth2',         ARRAY['payment.cleared','payment.nsf']),
  ('forth_crm', 'Forth CRM', 'crm',               'Forth CRM contact sync and enrollment registration.',            'https://forthcrm.com/docs',     'users',          'oauth2',         ARRAY['contact.updated']);