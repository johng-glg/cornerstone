-- Phase A7 — Integrations hub + Dialpad schema (ADR-001 baseline, from reference).
-- Tables: integration_providers, company_integrations, integration_event_log,
--   dialpad_calls, entity_communications (polymorphic). Adds staff Dialpad columns.
-- Seeds the provider registry (docuseal, forth_pay, forth_crm, dialpad).
-- Edge functions (docuseal-*/dialpad-*) land in the A7 edge increments. Forward-only.

-- ===== Enum (for staff Dialpad column) =====
CREATE TYPE public.screen_pop_preference_enum AS ENUM ('toast', 'auto_navigate', 'off');


-- ===== Tables =====

--
--






--
-- Name: company_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    provider_key text NOT NULL,
    is_enabled boolean DEFAULT false NOT NULL,
    credentials_vault_ref text,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_connected_at timestamp with time zone,
    last_connection_error text,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dialpad_calls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dialpad_calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    dialpad_call_id text NOT NULL,
    related_entity_type text,
    related_entity_id uuid,
    initiated_by uuid,
    target_phone text NOT NULL,
    direction text,
    state text,
    duration_seconds integer,
    recording_url text,
    voicemail_url text,
    voicemail_transcript text,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    raw jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.dialpad_calls REPLICA IDENTITY FULL;


--
-- Name: entity_communications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_communications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    channel text NOT NULL,
    direction text,
    subject text,
    body text,
    duration_seconds integer,
    recording_url text,
    related_record_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT entity_communications_channel_check CHECK ((channel = ANY (ARRAY['phone'::text, 'email'::text, 'sms'::text, 'mail'::text, 'in_person'::text, 'note'::text]))),
    CONSTRAINT entity_communications_direction_check CHECK (((direction IS NULL) OR (direction = ANY (ARRAY['outbound'::text, 'inbound'::text, 'n/a'::text])))),
    CONSTRAINT entity_communications_entity_type_check CHECK ((entity_type = ANY (ARRAY['litigation_matter'::text, 'creditor'::text, 'creditor_contact'::text])))
);


--
-- Name: integration_event_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_event_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    provider_key text NOT NULL,
    event_type text NOT NULL,
    direction text,
    entity_type text,
    entity_id uuid,
    payload jsonb,
    success boolean,
    error_message text,
    latency_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: integration_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_key text NOT NULL,
    display_name text NOT NULL,
    category text NOT NULL,
    description text,
    docs_url text,
    icon_key text,
    is_active boolean DEFAULT true NOT NULL,
    default_event_subscriptions text[] DEFAULT '{}'::text[] NOT NULL,
    auth_method text DEFAULT 'api_key'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: company_integrations company_integrations_company_id_provider_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_integrations
    ADD CONSTRAINT company_integrations_company_id_provider_key_key UNIQUE (company_id, provider_key);


--
-- Name: company_integrations company_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_integrations
    ADD CONSTRAINT company_integrations_pkey PRIMARY KEY (id);


--
-- Name: dialpad_calls dialpad_calls_dialpad_call_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dialpad_calls
    ADD CONSTRAINT dialpad_calls_dialpad_call_id_key UNIQUE (dialpad_call_id);


--
-- Name: dialpad_calls dialpad_calls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dialpad_calls
    ADD CONSTRAINT dialpad_calls_pkey PRIMARY KEY (id);


--
-- Name: entity_communications entity_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_communications
    ADD CONSTRAINT entity_communications_pkey PRIMARY KEY (id);


--
-- Name: integration_event_log integration_event_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_event_log
    ADD CONSTRAINT integration_event_log_pkey PRIMARY KEY (id);


--
-- Name: integration_providers integration_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_providers
    ADD CONSTRAINT integration_providers_pkey PRIMARY KEY (id);


--
-- Name: integration_providers integration_providers_provider_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_providers
    ADD CONSTRAINT integration_providers_provider_key_key UNIQUE (provider_key);


--
-- Name: idx_company_integrations_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_integrations_company ON public.company_integrations USING btree (company_id);


--
-- Name: idx_dialpad_calls_company_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dialpad_calls_company_created ON public.dialpad_calls USING btree (company_id, created_at DESC);


--
-- Name: idx_dialpad_calls_initiator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dialpad_calls_initiator ON public.dialpad_calls USING btree (initiated_by, created_at DESC);


--
-- Name: idx_dialpad_calls_related; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dialpad_calls_related ON public.dialpad_calls USING btree (related_entity_type, related_entity_id);


--
-- Name: idx_entity_communications_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_communications_company ON public.entity_communications USING btree (company_id, created_at DESC);


--
-- Name: idx_entity_communications_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_communications_entity ON public.entity_communications USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: idx_entity_communications_related; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_communications_related ON public.entity_communications USING btree (related_record_id) WHERE (related_record_id IS NOT NULL);


--
-- Name: idx_integration_event_log_company_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_event_log_company_created ON public.integration_event_log USING btree (company_id, created_at DESC);


--
-- Name: idx_integration_event_log_provider_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_event_log_provider_created ON public.integration_event_log USING btree (provider_key, created_at DESC);


--
-- Name: company_integrations trg_company_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_company_integrations_updated_at BEFORE UPDATE ON public.company_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: entity_communications trg_entity_communications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_entity_communications_updated_at BEFORE UPDATE ON public.entity_communications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: integration_providers trg_integration_providers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_integration_providers_updated_at BEFORE UPDATE ON public.integration_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: company_integrations company_integrations_provider_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_integrations
    ADD CONSTRAINT company_integrations_provider_key_fkey FOREIGN KEY (provider_key) REFERENCES public.integration_providers(provider_key) ON UPDATE CASCADE;


--
-- Name: dialpad_calls dialpad_calls_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dialpad_calls
    ADD CONSTRAINT dialpad_calls_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.staff(id);


--
-- Name: entity_communications entity_communications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_communications
    ADD CONSTRAINT entity_communications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: entity_communications Admins can delete entity comms in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete entity comms in their company" ON public.entity_communications FOR DELETE TO authenticated USING ((public.can_access_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: company_integrations Admins delete company integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete company integrations" ON public.company_integrations FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_company(auth.uid(), company_id)));


--
-- Name: company_integrations Admins insert company integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert company integrations" ON public.company_integrations FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_company(auth.uid(), company_id)));


--
-- Name: integration_providers Admins manage providers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage providers" ON public.integration_providers TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: integration_event_log Admins read integration events within company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read integration events within company" ON public.integration_event_log FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND ((company_id IS NULL) OR public.can_access_company(auth.uid(), company_id))));


--
-- Name: company_integrations Admins update company integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update company integrations" ON public.company_integrations FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_company(auth.uid(), company_id))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_company(auth.uid(), company_id)));


--
-- Name: integration_providers Providers are readable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Providers are readable by authenticated" ON public.integration_providers FOR SELECT TO authenticated USING (true);


--
-- Name: company_integrations Read company integrations within company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read company integrations within company" ON public.company_integrations FOR SELECT TO authenticated USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: entity_communications Staff can insert entity comms in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert entity comms in their company" ON public.entity_communications FOR INSERT TO authenticated WITH CHECK (public.can_access_company(auth.uid(), company_id));


--
-- Name: entity_communications Staff can update entity comms in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update entity comms in their company" ON public.entity_communications FOR UPDATE TO authenticated USING (public.can_access_company(auth.uid(), company_id)) WITH CHECK (public.can_access_company(auth.uid(), company_id));


--
-- Name: entity_communications Staff can view entity comms in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view entity comms in their company" ON public.entity_communications FOR SELECT TO authenticated USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: dialpad_calls Staff read dialpad calls within company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff read dialpad calls within company" ON public.dialpad_calls FOR SELECT TO authenticated USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: company_integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: dialpad_calls; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dialpad_calls ENABLE ROW LEVEL SECURITY;

--
-- Name: entity_communications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.entity_communications ENABLE ROW LEVEL SECURITY;

--
-- Name: integration_event_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integration_event_log ENABLE ROW LEVEL SECURITY;

--
-- Name: integration_providers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integration_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: TABLE company_integrations; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.company_integrations TO authenticated;
GRANT ALL ON TABLE public.company_integrations TO service_role;


--
-- Name: TABLE dialpad_calls; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.dialpad_calls TO authenticated;
GRANT ALL ON TABLE public.dialpad_calls TO service_role;


--
-- Name: TABLE entity_communications; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.entity_communications TO authenticated;
GRANT ALL ON TABLE public.entity_communications TO service_role;


--
-- Name: TABLE integration_event_log; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.integration_event_log TO authenticated;
GRANT ALL ON TABLE public.integration_event_log TO service_role;


--
-- Name: TABLE integration_providers; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE public.integration_providers TO authenticated;
GRANT ALL ON TABLE public.integration_providers TO service_role;


--
--



-- ===== staff Dialpad columns (ALTER A3 table) =====
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS dialpad_user_id BIGINT,
  ADD COLUMN IF NOT EXISTS screen_pop_preference public.screen_pop_preference_enum DEFAULT 'toast';

-- ===== Grants (explicit) =====
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_providers, public.company_integrations, public.dialpad_calls, public.entity_communications TO authenticated;
GRANT SELECT ON public.integration_event_log TO authenticated;
GRANT ALL ON public.integration_providers, public.company_integrations, public.integration_event_log, public.dialpad_calls, public.entity_communications TO service_role;

-- ===== Provider registry seed =====
INSERT INTO public.integration_providers VALUES ('f12c1c48-8fb6-4be1-849f-48ffd564f32e', 'docuseal', 'DocuSeal', 'esignature', 'Document e-signature requests and completed-document retrieval.', 'https://www.docuseal.com/docs', 'file-signature', true, '{signature.completed,signature.declined}', 'api_key', '2026-05-29 03:54:44.878154+00', '2026-05-29 03:54:44.878154+00') ON CONFLICT DO NOTHING;
INSERT INTO public.integration_providers VALUES ('cd7cb351-1716-42f7-8fa1-9acdb04640fa', 'forth_pay', 'Forth Pay', 'payment_processor', 'Forth Pay payment processing and transaction polling.', 'https://forthcrm.com/docs', 'banknote', true, '{payment.cleared,payment.nsf}', 'oauth2', '2026-05-29 03:54:44.878154+00', '2026-05-29 03:54:44.878154+00') ON CONFLICT DO NOTHING;
INSERT INTO public.integration_providers VALUES ('b47abc5e-72d5-479e-8d7e-a01c2402c75f', 'forth_crm', 'Forth CRM', 'crm', 'Forth CRM contact sync and enrollment registration.', 'https://forthcrm.com/docs', 'users', true, '{contact.updated}', 'oauth2', '2026-05-29 03:54:44.878154+00', '2026-05-29 03:54:44.878154+00') ON CONFLICT DO NOTHING;
INSERT INTO public.integration_providers VALUES ('1a2dc9e4-3fc9-473c-9a70-44e9b875bd43', 'dialpad', 'Dialpad', 'telephony', 'Click-to-call, call state webhooks, recordings, and inbound screen pop.', 'https://developers.dialpad.com/reference', 'phone', true, '{state_changed,recording,voicemail}', 'api_key', '2026-05-29 03:54:44.906283+00', '2026-05-29 03:54:44.906283+00') ON CONFLICT DO NOTHING;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- ALTER TABLE public.staff DROP COLUMN IF EXISTS screen_pop_preference, DROP COLUMN IF EXISTS dialpad_user_id;
-- DROP TABLE IF EXISTS public.entity_communications CASCADE;
-- DROP TABLE IF EXISTS public.dialpad_calls CASCADE;
-- DROP TABLE IF EXISTS public.integration_event_log CASCADE;
-- DROP TABLE IF EXISTS public.company_integrations CASCADE;
-- DROP TABLE IF EXISTS public.integration_providers CASCADE;
-- DROP TYPE IF EXISTS public.screen_pop_preference_enum;
