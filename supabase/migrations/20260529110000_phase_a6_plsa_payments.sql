-- Phase A6 — PLSA/payments schema
-- Consolidated baseline (ADR-001), curated from supabase/reference/lovable_public_schema.sql.
-- Layers on A3+A5. Tables (7): payment_processors, payment_schedules,
--   company_processor_configs (per-tenant processor creds; api_key_encrypted column —
--   encryption enforced in the forth adapter edge functions, Q-A4), plsa_sync_log,
--   reconciliation_findings, nsf_retry_policies, transaction_retry_attempts.
-- Re-adds the two A5-deferred transaction FKs now that their targets exist.
-- Verified: applies on A3+A5; schema-diff vs reference clean for these tables.
-- Forward-only. Rollback SQL inline at bottom. (Edge functions: plsa-routing + adapters
--   land in the A6 edge-function increment.)

-- ===== Enums =====
CREATE TYPE public.payment_frequency_enum AS ENUM ('monthly', 'semi_monthly', 'bi_weekly');

CREATE TYPE public.schedule_status_enum AS ENUM ('active', 'paused', 'completed', 'cancelled');


-- ===== Tables =====

--
--






--
-- Name: company_processor_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_processor_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    processor_id uuid NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    api_key_encrypted text,
    config jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: nsf_retry_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nsf_retry_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text DEFAULT 'Default NSF Policy'::text NOT NULL,
    max_attempts integer DEFAULT 2 NOT NULL,
    delay_pattern jsonb DEFAULT '[{"day_offset": 5}, {"day_offset": 10}]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nsf_retry_policies_max_attempts_check CHECK (((max_attempts >= 0) AND (max_attempts <= 10)))
);


--
-- Name: payment_processors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_processors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    processor_type text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_service_id uuid NOT NULL,
    frequency public.payment_frequency_enum DEFAULT 'monthly'::public.payment_frequency_enum NOT NULL,
    draft_amount numeric NOT NULL,
    processor_fee_amount numeric DEFAULT 10 NOT NULL,
    first_draft_date date NOT NULL,
    total_drafts integer NOT NULL,
    drafts_generated integer DEFAULT 0 NOT NULL,
    last_generated_date date,
    status public.schedule_status_enum DEFAULT 'active'::public.schedule_status_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plsa_sync_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plsa_sync_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    action text NOT NULL,
    request_payload jsonb,
    response_payload jsonb,
    success boolean NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    provider_id text DEFAULT 'forth'::text NOT NULL,
    CONSTRAINT forth_sync_log_action_check CHECK ((action = ANY (ARRAY['create'::text, 'update'::text, 'poll'::text, 'cancel'::text, 'pause'::text, 'resume'::text, 'sync'::text]))),
    CONSTRAINT forth_sync_log_entity_type_check CHECK ((entity_type = ANY (ARRAY['transaction'::text, 'client'::text, 'draft'::text])))
);


--
-- Name: reconciliation_findings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reconciliation_findings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    detector text NOT NULL,
    severity text DEFAULT 'warning'::text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    summary text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transaction_retry_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transaction_retry_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_transaction_id uuid NOT NULL,
    retry_transaction_id uuid,
    policy_id uuid,
    attempt_number integer NOT NULL,
    scheduled_for date NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    fired_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: company_processor_configs company_processor_configs_company_id_processor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_processor_configs
    ADD CONSTRAINT company_processor_configs_company_id_processor_id_key UNIQUE (company_id, processor_id);


--
-- Name: company_processor_configs company_processor_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_processor_configs
    ADD CONSTRAINT company_processor_configs_pkey PRIMARY KEY (id);


--
-- Name: plsa_sync_log forth_sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plsa_sync_log
    ADD CONSTRAINT forth_sync_log_pkey PRIMARY KEY (id);


--
-- Name: nsf_retry_policies nsf_retry_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nsf_retry_policies
    ADD CONSTRAINT nsf_retry_policies_pkey PRIMARY KEY (id);


--
-- Name: payment_processors payment_processors_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_processors
    ADD CONSTRAINT payment_processors_name_key UNIQUE (name);


--
-- Name: payment_processors payment_processors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_processors
    ADD CONSTRAINT payment_processors_pkey PRIMARY KEY (id);


--
-- Name: payment_schedules payment_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_schedules
    ADD CONSTRAINT payment_schedules_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_findings reconciliation_findings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_findings
    ADD CONSTRAINT reconciliation_findings_pkey PRIMARY KEY (id);


--
-- Name: transaction_retry_attempts transaction_retry_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_retry_attempts
    ADD CONSTRAINT transaction_retry_attempts_pkey PRIMARY KEY (id);


--
-- Name: payment_schedules unique_active_schedule_per_service; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_schedules
    ADD CONSTRAINT unique_active_schedule_per_service UNIQUE (client_service_id);


--
-- Name: idx_forth_sync_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forth_sync_log_created ON public.plsa_sync_log USING btree (created_at DESC);


--
-- Name: idx_forth_sync_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forth_sync_log_entity ON public.plsa_sync_log USING btree (entity_type, entity_id);


--
-- Name: idx_payment_schedules_client_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_schedules_client_service ON public.payment_schedules USING btree (client_service_id);


--
-- Name: idx_payment_schedules_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_schedules_status ON public.payment_schedules USING btree (status);


--
-- Name: idx_plsa_sync_log_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plsa_sync_log_provider ON public.plsa_sync_log USING btree (provider_id, created_at DESC);


--
-- Name: idx_recon_company_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_company_status ON public.reconciliation_findings USING btree (company_id, status);


--
-- Name: idx_recon_detector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_detector ON public.reconciliation_findings USING btree (detector);


--
-- Name: idx_tx_retry_original; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tx_retry_original ON public.transaction_retry_attempts USING btree (original_transaction_id);


--
-- Name: idx_tx_retry_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tx_retry_status ON public.transaction_retry_attempts USING btree (status, scheduled_for);


--
-- Name: uq_nsf_retry_policies_active_per_company; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_nsf_retry_policies_active_per_company ON public.nsf_retry_policies USING btree (company_id) WHERE (is_active = true);


--
-- Name: uq_recon_open_per_entity_detector; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_recon_open_per_entity_detector ON public.reconciliation_findings USING btree (detector, entity_type, entity_id) WHERE ((status = 'open'::text) AND (entity_id IS NOT NULL));


--
-- Name: nsf_retry_policies update_nsf_retry_policies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_nsf_retry_policies_updated_at BEFORE UPDATE ON public.nsf_retry_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_schedules update_payment_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payment_schedules_updated_at BEFORE UPDATE ON public.payment_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: company_processor_configs company_processor_configs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_processor_configs
    ADD CONSTRAINT company_processor_configs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_processor_configs company_processor_configs_processor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_processor_configs
    ADD CONSTRAINT company_processor_configs_processor_id_fkey FOREIGN KEY (processor_id) REFERENCES public.payment_processors(id) ON DELETE CASCADE;


--
-- Name: nsf_retry_policies nsf_retry_policies_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nsf_retry_policies
    ADD CONSTRAINT nsf_retry_policies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: payment_schedules payment_schedules_client_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_schedules
    ADD CONSTRAINT payment_schedules_client_service_id_fkey FOREIGN KEY (client_service_id) REFERENCES public.client_services(id) ON DELETE CASCADE;


--
-- Name: reconciliation_findings reconciliation_findings_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_findings
    ADD CONSTRAINT reconciliation_findings_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: reconciliation_findings reconciliation_findings_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reconciliation_findings
    ADD CONSTRAINT reconciliation_findings_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: transaction_retry_attempts transaction_retry_attempts_original_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_retry_attempts
    ADD CONSTRAINT transaction_retry_attempts_original_transaction_id_fkey FOREIGN KEY (original_transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: transaction_retry_attempts transaction_retry_attempts_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_retry_attempts
    ADD CONSTRAINT transaction_retry_attempts_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.nsf_retry_policies(id) ON DELETE SET NULL;


--
-- Name: transaction_retry_attempts transaction_retry_attempts_retry_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_retry_attempts
    ADD CONSTRAINT transaction_retry_attempts_retry_transaction_id_fkey FOREIGN KEY (retry_transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;


--
-- Name: company_processor_configs Admins can delete company processor configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete company processor configs" ON public.company_processor_configs FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_company(auth.uid(), company_id)));


--
-- Name: company_processor_configs Admins can insert company processor configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert company processor configs" ON public.company_processor_configs FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_company(auth.uid(), company_id)));


--
-- Name: company_processor_configs Admins can read company processor configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read company processor configs" ON public.company_processor_configs FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_company(auth.uid(), company_id)));


--
-- Name: company_processor_configs Admins can update company processor configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update company processor configs" ON public.company_processor_configs FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_company(auth.uid(), company_id))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_company(auth.uid(), company_id)));


--
-- Name: plsa_sync_log Admins can view sync logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view sync logs" ON public.plsa_sync_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payment_processors All staff can view payment processors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All staff can view payment processors" ON public.payment_processors FOR SELECT TO authenticated USING (true);


--
-- Name: payment_schedules Staff can manage payment schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage payment schedules" ON public.payment_schedules USING ((EXISTS ( SELECT 1
   FROM public.client_services cs
  WHERE ((cs.id = payment_schedules.client_service_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: payment_schedules Staff can view payment schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view payment schedules" ON public.payment_schedules FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.client_services cs
  WHERE ((cs.id = payment_schedules.client_service_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: nsf_retry_policies Staff manage NSF policies in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff manage NSF policies in their company" ON public.nsf_retry_policies TO authenticated USING (public.can_access_company(auth.uid(), company_id)) WITH CHECK (public.can_access_company(auth.uid(), company_id));


--
-- Name: reconciliation_findings Staff update recon findings in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff update recon findings in their company" ON public.reconciliation_findings FOR UPDATE TO authenticated USING (((company_id IS NULL) OR public.can_access_company(auth.uid(), company_id)));


--
-- Name: reconciliation_findings Staff view recon findings in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff view recon findings in their company" ON public.reconciliation_findings FOR SELECT TO authenticated USING (((company_id IS NULL) OR public.can_access_company(auth.uid(), company_id)));


--
-- Name: transaction_retry_attempts Staff view retry attempts in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff view retry attempts in their company" ON public.transaction_retry_attempts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.transactions t
     JOIN public.client_services cs ON ((cs.id = t.client_service_id)))
  WHERE ((t.id = transaction_retry_attempts.original_transaction_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: plsa_sync_log System can insert sync logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert sync logs" ON public.plsa_sync_log FOR INSERT WITH CHECK (true);


--
-- Name: company_processor_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_processor_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: nsf_retry_policies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nsf_retry_policies ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_processors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_processors ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: plsa_sync_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plsa_sync_log ENABLE ROW LEVEL SECURITY;

--
-- Name: reconciliation_findings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reconciliation_findings ENABLE ROW LEVEL SECURITY;

--
-- Name: transaction_retry_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transaction_retry_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: TABLE nsf_retry_policies; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.nsf_retry_policies TO authenticated;
GRANT ALL ON TABLE public.nsf_retry_policies TO service_role;


--
-- Name: TABLE reconciliation_findings; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.reconciliation_findings TO authenticated;
GRANT ALL ON TABLE public.reconciliation_findings TO service_role;


--
-- Name: TABLE transaction_retry_attempts; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.transaction_retry_attempts TO authenticated;
GRANT ALL ON TABLE public.transaction_retry_attempts TO service_role;


--
--



-- ===== Re-add deferred A5 FKs (targets land in A6) =====
ALTER TABLE ONLY public.transactions
  ADD CONSTRAINT transactions_processor_id_fkey FOREIGN KEY (processor_id) REFERENCES public.payment_processors(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.transactions
  ADD CONSTRAINT transactions_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.payment_schedules(id) ON DELETE SET NULL;

-- ===== Grants =====
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_processors, public.payment_schedules, public.company_processor_configs, public.plsa_sync_log, public.nsf_retry_policies TO authenticated;
-- reconciliation_findings + transaction_retry_attempts are append-mostly (match reference: no DELETE)
GRANT SELECT, INSERT, UPDATE ON public.reconciliation_findings, public.transaction_retry_attempts TO authenticated;
GRANT ALL ON public.payment_processors,public.payment_schedules,public.company_processor_configs,public.plsa_sync_log,public.reconciliation_findings,public.nsf_retry_policies,public.transaction_retry_attempts TO service_role;

-- ============================================================================
-- ROLLBACK (manual; forward-only policy)
-- ============================================================================
-- ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_schedule_id_fkey;
-- ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_processor_id_fkey;
-- DROP TABLE IF EXISTS public.payment_processors CASCADE;
-- DROP TABLE IF EXISTS public.payment_schedules CASCADE;
-- DROP TABLE IF EXISTS public.company_processor_configs CASCADE;
-- DROP TABLE IF EXISTS public.plsa_sync_log CASCADE;
-- DROP TABLE IF EXISTS public.reconciliation_findings CASCADE;
-- DROP TABLE IF EXISTS public.nsf_retry_policies CASCADE;
-- DROP TABLE IF EXISTS public.transaction_retry_attempts CASCADE;
-- DROP TYPE IF EXISTS public.schedule_status_enum;
-- DROP TYPE IF EXISTS public.payment_frequency_enum;
