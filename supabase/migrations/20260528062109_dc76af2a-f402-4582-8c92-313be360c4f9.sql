
CREATE TYPE public.creditor_response_channel AS ENUM ('email', 'phone', 'letter', 'fax', 'portal', 'other');
CREATE TYPE public.creditor_response_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE public.creditor_response_sentiment AS ENUM ('positive', 'neutral', 'negative');

CREATE TABLE public.creditor_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  creditor_id UUID NOT NULL REFERENCES public.creditors(id) ON DELETE CASCADE,
  liability_id UUID REFERENCES public.liabilities(id) ON DELETE SET NULL,
  client_service_id UUID REFERENCES public.client_services(id) ON DELETE SET NULL,
  outbound_reference_id UUID REFERENCES public.creditor_responses(id) ON DELETE SET NULL,
  direction public.creditor_response_direction NOT NULL DEFAULT 'inbound',
  channel public.creditor_response_channel NOT NULL DEFAULT 'email',
  sentiment public.creditor_response_sentiment,
  subject TEXT,
  body TEXT,
  summary TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  response_time_hours NUMERIC(10,2),
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  logged_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_creditor_responses_creditor ON public.creditor_responses(creditor_id, received_at DESC);
CREATE INDEX idx_creditor_responses_liability ON public.creditor_responses(liability_id) WHERE liability_id IS NOT NULL;
CREATE INDEX idx_creditor_responses_service ON public.creditor_responses(client_service_id) WHERE client_service_id IS NOT NULL;
CREATE INDEX idx_creditor_responses_company ON public.creditor_responses(company_id, received_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creditor_responses TO authenticated;
GRANT ALL ON public.creditor_responses TO service_role;

ALTER TABLE public.creditor_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company creditor responses"
  ON public.creditor_responses FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Users insert company creditor responses"
  ON public.creditor_responses FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Users update company creditor responses"
  ON public.creditor_responses FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Users delete company creditor responses"
  ON public.creditor_responses FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE TRIGGER trg_creditor_responses_updated_at
  BEFORE UPDATE ON public.creditor_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.calc_creditor_response_time()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _outbound_at TIMESTAMPTZ;
BEGIN
  IF NEW.direction = 'inbound' AND NEW.outbound_reference_id IS NOT NULL AND NEW.response_time_hours IS NULL THEN
    SELECT received_at INTO _outbound_at FROM public.creditor_responses WHERE id = NEW.outbound_reference_id;
    IF _outbound_at IS NOT NULL THEN
      NEW.response_time_hours := EXTRACT(EPOCH FROM (NEW.received_at - _outbound_at)) / 3600.0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_creditor_responses_calc_time
  BEFORE INSERT OR UPDATE ON public.creditor_responses
  FOR EACH ROW EXECUTE FUNCTION public.calc_creditor_response_time();

-- Phase 6B
ALTER TYPE public.workflow_action_type ADD VALUE IF NOT EXISTS 'auto_graduate';

CREATE TABLE public.graduation_automation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  require_all_liabilities_resolved BOOLEAN NOT NULL DEFAULT true,
  fire_contact_close BOOLEAN NOT NULL DEFAULT true,
  notification_template_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.graduation_automation_config TO authenticated;
GRANT ALL ON public.graduation_automation_config TO service_role;
ALTER TABLE public.graduation_automation_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company graduation config"
  ON public.graduation_automation_config FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Admins manage company graduation config"
  ON public.graduation_automation_config FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_graduation_config_updated_at
  BEFORE UPDATE ON public.graduation_automation_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.graduation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_service_id UUID NOT NULL REFERENCES public.client_services(id) ON DELETE CASCADE,
  triggered_by_liability_id UUID REFERENCES public.liabilities(id) ON DELETE SET NULL,
  previous_status TEXT,
  contact_close_status TEXT,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_graduation_events_company ON public.graduation_events(company_id, created_at DESC);
CREATE INDEX idx_graduation_events_service ON public.graduation_events(client_service_id);

GRANT SELECT ON public.graduation_events TO authenticated;
GRANT ALL ON public.graduation_events TO service_role;
ALTER TABLE public.graduation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company graduation events"
  ON public.graduation_events FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));
