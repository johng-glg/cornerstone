-- Phase A5 — Core CRM domain
-- Consolidated baseline (ADR-001), curated from the authoritative reference
-- (supabase/reference/lovable_public_schema.sql). Layers on the A3 spine.
--
-- Tables (20): clients (+addresses/phones/communications/documents), client_services
--   (+client_service_clients/client_service_types/service_status_history), services,
--   leads (+lead_activities/lead_banking), liabilities (+liability_actions), creditors
--   (+creditor_contacts/creditor_responses), settlements, transactions.
-- Also lands the ADR-001-deferred items now that their tables exist:
--   decrypt_client_ssn, decrypt_lead_banking, can_view_leads (+ leads RLS via it),
--   and audit-trigger attachments (included in the table DDL).
--
-- Deferred to owning phases (documented divergence; columns kept, constraints added later):
--   FK leads.scoring_profile_id -> lead_scoring_profiles (A9 lead engine)
--   FK transactions.processor_id -> payment_processors (A6 payments)
--   FK transactions.schedule_id  -> payment_schedules (A6 payments)
--   Triggers trg_auto_assign_lead / trg_calculate_lead_score on leads (A9 lead engine)
--
-- Verified: applies on the A3 spine; schema-diff vs reference shows only the above deferrals.
-- Forward-only. Rollback SQL inline at bottom.

-- ===== Sequences (standalone; consumed by generate_lead_number / generate_service_number) =====
CREATE SEQUENCE IF NOT EXISTS public.lead_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.engagement_number_seq;

-- ===== Enums =====
CREATE TYPE public.address_type AS ENUM ('home', 'work', 'mailing', 'other');

CREATE TYPE public.bank_account_type AS ENUM ('checking', 'savings');

CREATE TYPE public.client_relationship AS ENUM ('primary_client', 'co_client', 'spouse', 'authorized_contact', 'other');

CREATE TYPE public.client_status_enum AS ENUM ('active', 'inactive');

CREATE TYPE public.communication_direction AS ENUM ('inbound', 'outbound');

CREATE TYPE public.communication_type AS ENUM ('call', 'email', 'sms', 'meeting', 'note');

CREATE TYPE public.contact_status_enum AS ENUM ('reachable', 'hard_to_reach', 'unreachable', 'no_contact_allowed');

CREATE TYPE public.creditor_response_channel AS ENUM ('email', 'phone', 'letter', 'fax', 'portal', 'other');

CREATE TYPE public.creditor_response_direction AS ENUM ('inbound', 'outbound');

CREATE TYPE public.creditor_response_sentiment AS ENUM ('positive', 'neutral', 'negative');

CREATE TYPE public.creditor_type AS ENUM ('original_creditor', 'collection_agency', 'law_firm', 'debt_buyer');

CREATE TYPE public.employment_status AS ENUM ('employed', 'unemployed', 'self_employed', 'retired', 'disabled');

CREATE TYPE public.fee_collection_method AS ENUM ('split', 'lump_sum');

CREATE TYPE public.hardship_reason AS ENUM ('job_loss', 'medical_emergency', 'divorce', 'reduced_income', 'business_failure', 'other');

CREATE TYPE public.lead_interest AS ENUM ('debt_resolution', 'litigation', 'both');

CREATE TYPE public.lead_source AS ENUM ('web_form', 'referral', 'phone', 'advertisement', 'walk_in', 'other');

CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost', 'intake', 'credit_review', 'plan_selection', 'qc_pending', 'docs_pending', 'eligibility_review');

CREATE TYPE public.liability_status AS ENUM ('enrolled', 'in_negotiation', 'settled', 'in_litigation', 'dismissed', 'cancelled');

CREATE TYPE public.liability_type AS ENUM ('credit_card', 'medical', 'auto_loan', 'personal_loan', 'student_loan', 'mortgage', 'other');

CREATE TYPE public.payment_status_enum AS ENUM ('current', 'paused', 'nsf', 'past_due', 'suspended');

CREATE TYPE public.payment_type AS ENUM ('lump_sum', 'payment_plan');

CREATE TYPE public.phone_type AS ENUM ('mobile', 'home', 'work', 'fax', 'other');

CREATE TYPE public.plan_type AS ENUM ('glg_standard', 'glg_adjustable', 'glg_exception');

CREATE TYPE public.retention_type_enum AS ENUM ('client_requested_cancel', 'company_initiated_cancel', 'at_risk', 'churn_risk', 'complaint');

CREATE TYPE public.service_status AS ENUM ('prospect', 'active', 'suspended', 'closed', 'pending', 'graduated', 'dropped', 'cancelled');

CREATE TYPE public.service_type AS ENUM ('debt_resolution', 'consumer_defense');

CREATE TYPE public.settlement_status AS ENUM ('offered', 'accepted', 'rejected', 'completed', 'defaulted', 'cancelled');


-- ===== Functions =====
CREATE OR REPLACE FUNCTION public.generate_lead_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.lead_number := 'LEAD-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(nextval('lead_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_service_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.service_number := 'SVC-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(nextval('engagement_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calc_creditor_response_time()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.track_lead_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'new' THEN NEW.new_at = COALESCE(NEW.new_at, now());
      WHEN 'contacted' THEN NEW.contacted_at = COALESCE(NEW.contacted_at, now());
      WHEN 'qualified' THEN NEW.qualified_at = COALESCE(NEW.qualified_at, now());
      WHEN 'eligibility_review' THEN NULL;
      WHEN 'converted' THEN NEW.converted_at = COALESCE(NEW.converted_at, now());
      WHEN 'lost' THEN NEW.lost_at = COALESCE(NEW.lost_at, now());
      ELSE NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_client_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_client_id UUID;
BEGIN
  target_client_id := COALESCE(NEW.primary_client_id, OLD.primary_client_id);
  
  IF target_client_id IS NOT NULL THEN
    UPDATE clients c
    SET status = CASE 
      WHEN EXISTS (
        SELECT 1 FROM client_services cs 
        WHERE cs.primary_client_id = c.id 
        AND cs.status = 'active'
      ) THEN 'active'::client_status_enum
      ELSE 'inactive'::client_status_enum
    END
    WHERE c.id = target_client_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_leads(_user_id uuid, _company_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _has_any_non_paralegal boolean;
  _is_paralegal boolean;
BEGIN
  IF NOT public.can_access_company(_user_id, _company_id) THEN
    RETURN false;
  END IF;

  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role <> 'paralegal'::app_role
    ),
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'paralegal'::app_role
    )
  INTO _has_any_non_paralegal, _is_paralegal;

  -- If the user holds any role other than paralegal, the paralegal gate
  -- does not apply.
  IF _has_any_non_paralegal THEN
    RETURN true;
  END IF;

  -- Pure paralegal: only if the company has explicitly opted in.
  IF _is_paralegal THEN
    RETURN public.is_feature_enabled(_company_id, 'leads.paralegal_visibility');
  END IF;

  -- No roles assigned: fall back to company access (legacy behavior).
  RETURN true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.decrypt_client_ssn(_client_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _key text; _ct bytea; _co uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  SELECT company_id, ssn_ciphertext INTO _co, _ct FROM public.clients WHERE id = _client_id;
  IF _co IS NULL THEN RAISE EXCEPTION 'client not found'; END IF;
  IF NOT public.can_access_company(auth.uid(), _co) THEN
    RAISE EXCEPTION 'forbidden: cross-company access';
  END IF;
  PERFORM public.log_audit_event('pii.reveal.client_ssn','clients',_client_id,_co,
    jsonb_build_object('client_id', _client_id), NULL, NULL, NULL);
  IF _ct IS NULL THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key';
  RETURN extensions.pgp_sym_decrypt(_ct, _key);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.decrypt_lead_banking(_lead_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _key text; _acct bytea; _rout bytea; _co uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  SELECT l.company_id, lb.account_number_ciphertext, lb.routing_number_ciphertext
    INTO _co, _acct, _rout
  FROM public.lead_banking lb
  JOIN public.leads l ON l.id = lb.lead_id
  WHERE lb.lead_id = _lead_id LIMIT 1;
  IF _co IS NULL THEN RAISE EXCEPTION 'lead banking not found'; END IF;
  IF NOT public.can_access_company(auth.uid(), _co) THEN
    RAISE EXCEPTION 'forbidden: cross-company access';
  END IF;
  PERFORM public.log_audit_event('pii.reveal.lead_banking','lead_banking',_lead_id,_co,
    jsonb_build_object('lead_id', _lead_id), NULL, NULL, NULL);
  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key';
  RETURN jsonb_build_object(
    'account_number', CASE WHEN _acct IS NULL THEN NULL ELSE extensions.pgp_sym_decrypt(_acct, _key) END,
    'routing_number', CASE WHEN _rout IS NULL THEN NULL ELSE extensions.pgp_sym_decrypt(_rout, _key) END);
END;
$function$
;


-- ===== Tables =====

--
--






--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_number text NOT NULL,
    company_id uuid NOT NULL,
    originating_company_id uuid,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    source public.lead_source DEFAULT 'web_form'::public.lead_source NOT NULL,
    status public.lead_status DEFAULT 'new'::public.lead_status NOT NULL,
    interest_type public.lead_interest DEFAULT 'debt_resolution'::public.lead_interest NOT NULL,
    estimated_debt_amount numeric(12,2),
    number_of_debts integer,
    has_active_lawsuit boolean DEFAULT false,
    disqualification_reason text,
    notes text,
    assigned_to uuid,
    converted_service_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    state text,
    date_of_birth date,
    in_bankruptcy boolean DEFAULT false,
    has_federal_accounts boolean DEFAULT false,
    secured_credit_resolved boolean DEFAULT true,
    has_security_clearance boolean DEFAULT false,
    employment_status public.employment_status,
    employer_name text,
    job_title text,
    monthly_income numeric,
    hardship_reason public.hardship_reason,
    hardship_notes text,
    ssn_last4_encrypted text,
    credit_auth_given boolean DEFAULT false,
    credit_auth_date timestamp with time zone,
    wizard_step integer DEFAULT 1,
    wizard_data jsonb DEFAULT '{}'::jsonb,
    new_at timestamp with time zone DEFAULT now(),
    contacted_at timestamp with time zone,
    qualified_at timestamp with time zone,
    converted_at timestamp with time zone,
    lost_at timestamp with time zone,
    service_date date,
    response_deadline date,
    opposing_party text,
    court_name text,
    case_number text,
    lead_score integer DEFAULT 0,
    score_breakdown jsonb,
    scoring_profile_id uuid,
    score_calculated_at timestamp with time zone,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_term text,
    utm_content text,
    landing_page text,
    referrer_url text
);


--
-- Name: client_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    address_type public.address_type DEFAULT 'home'::public.address_type NOT NULL,
    address_line1 text NOT NULL,
    address_line2 text,
    city text NOT NULL,
    state text NOT NULL,
    zip_code text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: client_communications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_communications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    communication_type public.communication_type DEFAULT 'call'::public.communication_type NOT NULL,
    direction public.communication_direction DEFAULT 'outbound'::public.communication_direction NOT NULL,
    subject text,
    notes text,
    outcome text,
    contact_phone text,
    contact_email text,
    duration_minutes integer,
    staff_id uuid,
    communication_date timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: client_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    document_type text DEFAULT 'other'::text NOT NULL,
    title text NOT NULL,
    file_url text NOT NULL,
    notes text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: client_phones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_phones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    phone_number text NOT NULL,
    phone_type public.phone_type DEFAULT 'mobile'::public.phone_type NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: client_service_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_service_clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_service_id uuid NOT NULL,
    client_id uuid NOT NULL,
    relationship public.client_relationship DEFAULT 'primary_client'::public.client_relationship NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: client_service_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_service_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_service_id uuid NOT NULL,
    service_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    end_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: client_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_number text NOT NULL,
    originating_company_id uuid,
    owning_company_id uuid NOT NULL,
    primary_client_id uuid,
    status public.service_status DEFAULT 'prospect'::public.service_status NOT NULL,
    enrolled_date date,
    closed_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    program_type text DEFAULT 'debt_settlement'::text,
    term_months integer,
    monthly_payment numeric,
    payment_frequency text DEFAULT 'monthly'::text,
    first_payment_date date,
    escrow_balance numeric DEFAULT 0,
    total_enrolled_debt numeric DEFAULT 0,
    settlement_fee_percentage numeric DEFAULT 25,
    monthly_service_fee numeric DEFAULT 0,
    program_start_date date,
    estimated_completion_date date,
    plan_type public.plan_type DEFAULT 'glg_standard'::public.plan_type,
    estimated_settlement_percentage numeric DEFAULT 55,
    first_draft_date date,
    requires_management_approval boolean DEFAULT false,
    payment_status public.payment_status_enum,
    retention_flag boolean DEFAULT false,
    retention_type public.retention_type_enum,
    retention_date timestamp with time zone,
    retention_reason text,
    retention_assigned_to uuid,
    contact_status public.contact_status_enum DEFAULT 'reachable'::public.contact_status_enum,
    last_successful_contact_date timestamp with time zone,
    contact_attempts_count integer DEFAULT 0,
    last_contact_attempt_date timestamp with time zone,
    primary_status_changed_at timestamp with time zone,
    payment_status_changed_at timestamp with time zone,
    contact_status_changed_at timestamp with time zone,
    escrow_balance_synced numeric,
    escrow_balance_synced_at timestamp with time zone,
    plsa_provider_id text DEFAULT 'forth'::text NOT NULL,
    early_exit_eligible boolean DEFAULT false NOT NULL,
    early_exit_status text DEFAULT 'none'::text NOT NULL,
    loan_provider_id text
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    first_name text NOT NULL,
    middle_name text,
    last_name text NOT NULL,
    email text,
    date_of_birth date,
    ssn_encrypted text,
    preferred_contact_method public.phone_type DEFAULT 'mobile'::public.phone_type,
    tcpa_consent boolean DEFAULT false,
    tcpa_consent_date timestamp with time zone,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status public.client_status_enum DEFAULT 'inactive'::public.client_status_enum,
    forth_crm_id text,
    ssn_last4 text,
    ssn_ciphertext bytea,
    forth_status text
);


--
-- Name: COLUMN clients.ssn_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.clients.ssn_encrypted IS 'DEPRECATED Phase 2A. Use ssn_last4 (plain) and ssn_ciphertext (bytea via public.encrypt_pii). Do not write to this column for new rows.';


--
-- Name: creditor_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.creditor_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creditor_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    title text,
    email text,
    phone text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: creditor_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.creditor_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    creditor_id uuid NOT NULL,
    liability_id uuid,
    client_service_id uuid,
    outbound_reference_id uuid,
    direction public.creditor_response_direction DEFAULT 'inbound'::public.creditor_response_direction NOT NULL,
    channel public.creditor_response_channel DEFAULT 'email'::public.creditor_response_channel NOT NULL,
    sentiment public.creditor_response_sentiment,
    subject text,
    body text,
    summary text,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    response_time_hours numeric(10,2),
    attachments jsonb DEFAULT '[]'::jsonb NOT NULL,
    logged_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: creditors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.creditors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    creditor_type public.creditor_type DEFAULT 'original_creditor'::public.creditor_type NOT NULL,
    phone text,
    fax text,
    email text,
    address_line1 text,
    address_line2 text,
    city text,
    state text,
    zip_code text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lead_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    staff_id uuid,
    activity_type text NOT NULL,
    outcome text,
    notes text,
    next_action text,
    next_action_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lead_banking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_banking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    bank_name text NOT NULL,
    routing_number_encrypted text,
    account_number_encrypted text,
    account_type public.bank_account_type DEFAULT 'checking'::public.bank_account_type NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    account_number_ciphertext bytea,
    routing_number_ciphertext bytea,
    account_number_last4 text,
    routing_number_last4 text
);


--
-- Name: COLUMN lead_banking.routing_number_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lead_banking.routing_number_encrypted IS 'DEPRECATED Phase 2A. Use routing_number_ciphertext (bytea via public.encrypt_pii) + routing_number_last4.';


--
-- Name: COLUMN lead_banking.account_number_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.lead_banking.account_number_encrypted IS 'DEPRECATED Phase 2A. Use account_number_ciphertext (bytea via public.encrypt_pii) + account_number_last4.';


--
-- Name: liabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.liabilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_service_id uuid NOT NULL,
    current_creditor_id uuid,
    original_creditor_id uuid,
    account_number text,
    liability_type public.liability_type DEFAULT 'credit_card'::public.liability_type NOT NULL,
    original_balance numeric(12,2),
    current_balance numeric(12,2),
    enrolled_balance numeric(12,2),
    status public.liability_status DEFAULT 'enrolled'::public.liability_status NOT NULL,
    priority integer DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    debt_buyer_id uuid,
    debt_buyer_other text,
    law_firm_id uuid,
    law_firm_other text,
    servicing_creditor_id uuid,
    summons_received_at timestamp with time zone,
    summons_notes text,
    referred_to_law_firm_at timestamp with time zone,
    referred_to_law_firm_company_id uuid
);


--
-- Name: liability_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.liability_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    liability_id uuid NOT NULL,
    staff_id uuid,
    action_type text NOT NULL,
    description text NOT NULL,
    amount numeric(12,2),
    document_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: service_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_service_id uuid NOT NULL,
    status_dimension text NOT NULL,
    old_value text,
    new_value text,
    reason text,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    service_type public.service_type NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    liability_id uuid NOT NULL,
    offer_amount numeric(12,2) NOT NULL,
    offer_percentage numeric(5,2),
    payment_type public.payment_type DEFAULT 'lump_sum'::public.payment_type NOT NULL,
    number_of_payments integer DEFAULT 1,
    status public.settlement_status DEFAULT 'offered'::public.settlement_status NOT NULL,
    offered_date date DEFAULT CURRENT_DATE NOT NULL,
    accepted_date date,
    completed_date date,
    attorney_approved boolean DEFAULT false,
    attorney_approved_by uuid,
    attorney_approved_date timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    first_payment_date date,
    payment_schedule jsonb DEFAULT '[]'::jsonb,
    fee_collection_method public.fee_collection_method DEFAULT 'split'::public.fee_collection_method,
    fee_start_offset_months integer DEFAULT 0,
    external_payment_id text,
    payment_send_status text,
    payment_sent_at timestamp with time zone,
    payment_method text
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_service_id uuid NOT NULL,
    processor_id uuid,
    amount numeric(12,2) NOT NULL,
    transaction_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    external_id text,
    processed_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_date date,
    settlement_id uuid,
    liability_id uuid,
    parent_transaction_id uuid,
    description text,
    sequence_number integer,
    schedule_id uuid,
    last_sync_at timestamp with time zone,
    sync_error text,
    last_polled_at timestamp with time zone,
    plsa_provider_id text DEFAULT 'forth'::text NOT NULL
);


--
-- Name: client_communications client_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_communications
    ADD CONSTRAINT client_communications_pkey PRIMARY KEY (id);


--
-- Name: client_documents client_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_documents
    ADD CONSTRAINT client_documents_pkey PRIMARY KEY (id);


--
-- Name: clients clients_forth_crm_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_forth_crm_id_key UNIQUE (forth_crm_id);


--
-- Name: client_addresses contact_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_addresses
    ADD CONSTRAINT contact_addresses_pkey PRIMARY KEY (id);


--
-- Name: client_phones contact_phones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_phones
    ADD CONSTRAINT contact_phones_pkey PRIMARY KEY (id);


--
-- Name: clients contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: creditor_contacts creditor_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creditor_contacts
    ADD CONSTRAINT creditor_contacts_pkey PRIMARY KEY (id);


--
-- Name: creditor_responses creditor_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creditor_responses
    ADD CONSTRAINT creditor_responses_pkey PRIMARY KEY (id);


--
-- Name: creditors creditors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creditors
    ADD CONSTRAINT creditors_pkey PRIMARY KEY (id);


--
-- Name: client_service_clients engagement_contacts_engagement_id_contact_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_service_clients
    ADD CONSTRAINT engagement_contacts_engagement_id_contact_id_key UNIQUE (client_service_id, client_id);


--
-- Name: client_service_clients engagement_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_service_clients
    ADD CONSTRAINT engagement_contacts_pkey PRIMARY KEY (id);


--
-- Name: client_service_types engagement_services_engagement_id_service_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_service_types
    ADD CONSTRAINT engagement_services_engagement_id_service_id_key UNIQUE (client_service_id, service_id);


--
-- Name: client_service_types engagement_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_service_types
    ADD CONSTRAINT engagement_services_pkey PRIMARY KEY (id);


--
-- Name: client_services engagements_engagement_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_services
    ADD CONSTRAINT engagements_engagement_number_key UNIQUE (service_number);


--
-- Name: client_services engagements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_services
    ADD CONSTRAINT engagements_pkey PRIMARY KEY (id);


--
-- Name: lead_activities lead_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_pkey PRIMARY KEY (id);


--
-- Name: lead_banking lead_banking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_banking
    ADD CONSTRAINT lead_banking_pkey PRIMARY KEY (id);


--
-- Name: leads leads_lead_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_lead_number_key UNIQUE (lead_number);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: liabilities liabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liabilities
    ADD CONSTRAINT liabilities_pkey PRIMARY KEY (id);


--
-- Name: liability_actions liability_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liability_actions
    ADD CONSTRAINT liability_actions_pkey PRIMARY KEY (id);


--
-- Name: service_status_history service_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_status_history
    ADD CONSTRAINT service_status_history_pkey PRIMARY KEY (id);


--
-- Name: services services_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_name_key UNIQUE (name);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: settlements settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: idx_client_communications_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_communications_client_id ON public.client_communications USING btree (client_id);


--
-- Name: idx_client_communications_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_communications_date ON public.client_communications USING btree (communication_date DESC);


--
-- Name: idx_client_documents_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_documents_client_id ON public.client_documents USING btree (client_id);


--
-- Name: idx_client_services_contact_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_services_contact_status ON public.client_services USING btree (contact_status);


--
-- Name: idx_client_services_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_services_payment_status ON public.client_services USING btree (payment_status);


--
-- Name: idx_client_services_retention_flag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_services_retention_flag ON public.client_services USING btree (retention_flag);


--
-- Name: idx_clients_forth_crm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_forth_crm_id ON public.clients USING btree (forth_crm_id);


--
-- Name: idx_clients_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_status ON public.clients USING btree (status);


--
-- Name: idx_creditor_responses_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_creditor_responses_company ON public.creditor_responses USING btree (company_id, received_at DESC);


--
-- Name: idx_creditor_responses_creditor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_creditor_responses_creditor ON public.creditor_responses USING btree (creditor_id, received_at DESC);


--
-- Name: idx_creditor_responses_liability; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_creditor_responses_liability ON public.creditor_responses USING btree (liability_id) WHERE (liability_id IS NOT NULL);


--
-- Name: idx_creditor_responses_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_creditor_responses_service ON public.creditor_responses USING btree (client_service_id) WHERE (client_service_id IS NOT NULL);


--
-- Name: idx_creditors_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_creditors_name ON public.creditors USING btree (name);


--
-- Name: idx_lead_activities_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_activities_lead ON public.lead_activities USING btree (lead_id);


--
-- Name: idx_leads_assigned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_assigned ON public.leads USING btree (assigned_to);


--
-- Name: idx_leads_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_score ON public.leads USING btree (lead_score DESC);


--
-- Name: idx_leads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_status ON public.leads USING btree (status, company_id);


--
-- Name: idx_leads_utm_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_utm_campaign ON public.leads USING btree (utm_campaign) WHERE (utm_campaign IS NOT NULL);


--
-- Name: idx_leads_utm_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_utm_source ON public.leads USING btree (utm_source) WHERE (utm_source IS NOT NULL);


--
-- Name: idx_liabilities_engagement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_liabilities_engagement ON public.liabilities USING btree (client_service_id);


--
-- Name: idx_liabilities_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_liabilities_status ON public.liabilities USING btree (status);


--
-- Name: idx_liabilities_summons_received_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_liabilities_summons_received_at ON public.liabilities USING btree (summons_received_at) WHERE (summons_received_at IS NOT NULL);


--
-- Name: idx_liability_actions_liability; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_liability_actions_liability ON public.liability_actions USING btree (liability_id);


--
-- Name: idx_service_status_history_client_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_status_history_client_service ON public.service_status_history USING btree (client_service_id);


--
-- Name: idx_settlements_external_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlements_external_payment_id ON public.settlements USING btree (external_payment_id) WHERE (external_payment_id IS NOT NULL);


--
-- Name: idx_settlements_liability; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlements_liability ON public.settlements USING btree (liability_id);


--
-- Name: idx_settlements_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlements_status ON public.settlements USING btree (status);


--
-- Name: idx_transactions_client_service_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_client_service_scheduled ON public.transactions USING btree (client_service_id, scheduled_date);


--
-- Name: idx_transactions_engagement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_engagement ON public.transactions USING btree (client_service_id);


--
-- Name: idx_transactions_liability_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_liability_id ON public.transactions USING btree (liability_id);


--
-- Name: idx_transactions_pending_last_polled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_pending_last_polled ON public.transactions USING btree (last_polled_at NULLS FIRST) WHERE ((status = 'pending'::text) AND (external_id IS NOT NULL));


--
-- Name: idx_transactions_schedule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_schedule_id ON public.transactions USING btree (schedule_id);


--
-- Name: idx_transactions_scheduled_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_scheduled_date ON public.transactions USING btree (scheduled_date);


--
-- Name: idx_transactions_settlement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_settlement_id ON public.transactions USING btree (settlement_id);


--
-- Name: leads generate_lead_number_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generate_lead_number_trigger BEFORE INSERT ON public.leads FOR EACH ROW WHEN ((new.lead_number IS NULL)) EXECUTE FUNCTION public.generate_lead_number();


--
-- Name: client_services generate_service_number_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generate_service_number_trigger BEFORE INSERT ON public.client_services FOR EACH ROW EXECUTE FUNCTION public.generate_service_number();


--
-- Name: leads lead_status_transition_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lead_status_transition_trigger BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.track_lead_status_transition();


--
-- Name: client_services trg_audit_client_services; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_client_services AFTER INSERT OR DELETE OR UPDATE ON public.client_services FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: clients trg_audit_clients; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_clients AFTER INSERT OR DELETE OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: lead_banking trg_audit_lead_banking; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_lead_banking AFTER INSERT OR DELETE OR UPDATE ON public.lead_banking FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: leads trg_audit_leads; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_leads AFTER INSERT OR DELETE OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: settlements trg_audit_settlements; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_settlements AFTER INSERT OR DELETE OR UPDATE ON public.settlements FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: transactions trg_audit_transactions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_transactions AFTER INSERT OR DELETE OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: leads trg_auto_assign_lead; Type: TRIGGER; Schema: public; Owner: -
--

--
-- Name: leads trg_calculate_lead_score; Type: TRIGGER; Schema: public; Owner: -
--

--
-- Name: creditor_responses trg_creditor_responses_calc_time; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_creditor_responses_calc_time BEFORE INSERT OR UPDATE ON public.creditor_responses FOR EACH ROW EXECUTE FUNCTION public.calc_creditor_response_time();


--
-- Name: creditor_responses trg_creditor_responses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_creditor_responses_updated_at BEFORE UPDATE ON public.creditor_responses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: client_services trigger_update_client_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_client_status AFTER INSERT OR DELETE OR UPDATE OF status, primary_client_id ON public.client_services FOR EACH ROW EXECUTE FUNCTION public.update_client_status();


--
-- Name: clients update_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: creditor_contacts update_creditor_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_creditor_contacts_updated_at BEFORE UPDATE ON public.creditor_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: creditors update_creditors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_creditors_updated_at BEFORE UPDATE ON public.creditors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: client_services update_engagements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_engagements_updated_at BEFORE UPDATE ON public.client_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leads update_leads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: liabilities update_liabilities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_liabilities_updated_at BEFORE UPDATE ON public.liabilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: settlements update_settlements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_settlements_updated_at BEFORE UPDATE ON public.settlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transactions update_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: client_communications client_communications_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_communications
    ADD CONSTRAINT client_communications_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_communications client_communications_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_communications
    ADD CONSTRAINT client_communications_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: client_documents client_documents_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_documents
    ADD CONSTRAINT client_documents_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_documents client_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_documents
    ADD CONSTRAINT client_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: client_services client_services_retention_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_services
    ADD CONSTRAINT client_services_retention_assigned_to_fkey FOREIGN KEY (retention_assigned_to) REFERENCES public.staff(id);


--
-- Name: client_addresses contact_addresses_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_addresses
    ADD CONSTRAINT contact_addresses_contact_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_phones contact_phones_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_phones
    ADD CONSTRAINT contact_phones_contact_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: clients contacts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT contacts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: creditor_contacts creditor_contacts_creditor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creditor_contacts
    ADD CONSTRAINT creditor_contacts_creditor_id_fkey FOREIGN KEY (creditor_id) REFERENCES public.creditors(id);


--
-- Name: creditor_responses creditor_responses_client_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creditor_responses
    ADD CONSTRAINT creditor_responses_client_service_id_fkey FOREIGN KEY (client_service_id) REFERENCES public.client_services(id) ON DELETE SET NULL;


--
-- Name: creditor_responses creditor_responses_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creditor_responses
    ADD CONSTRAINT creditor_responses_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: creditor_responses creditor_responses_creditor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creditor_responses
    ADD CONSTRAINT creditor_responses_creditor_id_fkey FOREIGN KEY (creditor_id) REFERENCES public.creditors(id) ON DELETE CASCADE;


--
-- Name: creditor_responses creditor_responses_liability_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creditor_responses
    ADD CONSTRAINT creditor_responses_liability_id_fkey FOREIGN KEY (liability_id) REFERENCES public.liabilities(id) ON DELETE SET NULL;


--
-- Name: creditor_responses creditor_responses_logged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creditor_responses
    ADD CONSTRAINT creditor_responses_logged_by_fkey FOREIGN KEY (logged_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: creditor_responses creditor_responses_outbound_reference_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creditor_responses
    ADD CONSTRAINT creditor_responses_outbound_reference_id_fkey FOREIGN KEY (outbound_reference_id) REFERENCES public.creditor_responses(id) ON DELETE SET NULL;


--
-- Name: client_service_clients engagement_contacts_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_service_clients
    ADD CONSTRAINT engagement_contacts_contact_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_service_clients engagement_contacts_engagement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_service_clients
    ADD CONSTRAINT engagement_contacts_engagement_id_fkey FOREIGN KEY (client_service_id) REFERENCES public.client_services(id) ON DELETE CASCADE;


--
-- Name: client_service_types engagement_services_engagement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_service_types
    ADD CONSTRAINT engagement_services_engagement_id_fkey FOREIGN KEY (client_service_id) REFERENCES public.client_services(id) ON DELETE CASCADE;


--
-- Name: client_service_types engagement_services_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_service_types
    ADD CONSTRAINT engagement_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: client_services engagements_originating_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_services
    ADD CONSTRAINT engagements_originating_company_id_fkey FOREIGN KEY (originating_company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: client_services engagements_owning_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_services
    ADD CONSTRAINT engagements_owning_company_id_fkey FOREIGN KEY (owning_company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: client_services engagements_primary_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_services
    ADD CONSTRAINT engagements_primary_contact_id_fkey FOREIGN KEY (primary_client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: lead_activities lead_activities_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_activities lead_activities_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: lead_banking lead_banking_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_banking
    ADD CONSTRAINT lead_banking_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: leads leads_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: leads leads_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: leads leads_converted_engagement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_converted_engagement_id_fkey FOREIGN KEY (converted_service_id) REFERENCES public.client_services(id) ON DELETE SET NULL;


--
-- Name: leads leads_originating_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_originating_company_id_fkey FOREIGN KEY (originating_company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: leads leads_scoring_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

--
-- Name: liabilities liabilities_current_creditor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liabilities
    ADD CONSTRAINT liabilities_current_creditor_id_fkey FOREIGN KEY (current_creditor_id) REFERENCES public.creditors(id) ON DELETE SET NULL;


--
-- Name: liabilities liabilities_debt_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liabilities
    ADD CONSTRAINT liabilities_debt_buyer_id_fkey FOREIGN KEY (debt_buyer_id) REFERENCES public.creditors(id);


--
-- Name: liabilities liabilities_engagement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liabilities
    ADD CONSTRAINT liabilities_engagement_id_fkey FOREIGN KEY (client_service_id) REFERENCES public.client_services(id) ON DELETE CASCADE;


--
-- Name: liabilities liabilities_law_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liabilities
    ADD CONSTRAINT liabilities_law_firm_id_fkey FOREIGN KEY (law_firm_id) REFERENCES public.creditors(id);


--
-- Name: liabilities liabilities_original_creditor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liabilities
    ADD CONSTRAINT liabilities_original_creditor_id_fkey FOREIGN KEY (original_creditor_id) REFERENCES public.creditors(id) ON DELETE SET NULL;


--
-- Name: liabilities liabilities_referred_to_law_firm_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liabilities
    ADD CONSTRAINT liabilities_referred_to_law_firm_company_id_fkey FOREIGN KEY (referred_to_law_firm_company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: liabilities liabilities_servicing_creditor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liabilities
    ADD CONSTRAINT liabilities_servicing_creditor_id_fkey FOREIGN KEY (servicing_creditor_id) REFERENCES public.creditors(id);


--
-- Name: liability_actions liability_actions_liability_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liability_actions
    ADD CONSTRAINT liability_actions_liability_id_fkey FOREIGN KEY (liability_id) REFERENCES public.liabilities(id) ON DELETE CASCADE;


--
-- Name: liability_actions liability_actions_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.liability_actions
    ADD CONSTRAINT liability_actions_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: service_status_history service_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_status_history
    ADD CONSTRAINT service_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.staff(id);


--
-- Name: service_status_history service_status_history_client_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_status_history
    ADD CONSTRAINT service_status_history_client_service_id_fkey FOREIGN KEY (client_service_id) REFERENCES public.client_services(id) ON DELETE CASCADE;


--
-- Name: settlements settlements_attorney_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_attorney_approved_by_fkey FOREIGN KEY (attorney_approved_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: settlements settlements_liability_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_liability_id_fkey FOREIGN KEY (liability_id) REFERENCES public.liabilities(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_engagement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_engagement_id_fkey FOREIGN KEY (client_service_id) REFERENCES public.client_services(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_liability_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_liability_id_fkey FOREIGN KEY (liability_id) REFERENCES public.liabilities(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_parent_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_parent_transaction_id_fkey FOREIGN KEY (parent_transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_processor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

--
-- Name: transactions transactions_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

--
-- Name: transactions transactions_settlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_settlement_id_fkey FOREIGN KEY (settlement_id) REFERENCES public.settlements(id) ON DELETE SET NULL;


--
-- Name: creditor_contacts Active staff can view creditor contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Active staff can view creditor contacts" ON public.creditor_contacts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.is_active = true)))));


--
-- Name: creditor_contacts Admins can delete creditor contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete creditor contacts" ON public.creditor_contacts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: creditor_contacts Admins can insert creditor contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert creditor contacts" ON public.creditor_contacts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: creditors Admins can manage creditors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage creditors" ON public.creditors TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: creditor_contacts Admins can update creditor contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update creditor contacts" ON public.creditor_contacts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: creditors All staff can view creditors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All staff can view creditors" ON public.creditors FOR SELECT TO authenticated USING (true);


--
-- Name: services Anyone can view services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view services" ON public.services FOR SELECT TO authenticated USING (true);


--
-- Name: client_addresses Staff can access client addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access client addresses" ON public.client_addresses USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = client_addresses.client_id) AND public.can_access_company(auth.uid(), c.company_id)))));


--
-- Name: client_communications Staff can access client communications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access client communications" ON public.client_communications USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = client_communications.client_id) AND public.can_access_company(auth.uid(), c.company_id)))));


--
-- Name: client_documents Staff can access client documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access client documents" ON public.client_documents USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = client_documents.client_id) AND public.can_access_company(auth.uid(), c.company_id)))));


--
-- Name: client_phones Staff can access client phones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access client phones" ON public.client_phones USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = client_phones.client_id) AND public.can_access_company(auth.uid(), c.company_id)))));


--
-- Name: client_service_clients Staff can access client_service_clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access client_service_clients" ON public.client_service_clients USING ((EXISTS ( SELECT 1
   FROM public.client_services cs
  WHERE ((cs.id = client_service_clients.client_service_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: client_service_types Staff can access client_service_types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access client_service_types" ON public.client_service_types USING ((EXISTS ( SELECT 1
   FROM public.client_services cs
  WHERE ((cs.id = client_service_types.client_service_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: lead_activities Staff can access lead activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access lead activities" ON public.lead_activities TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = lead_activities.lead_id) AND public.can_access_company(auth.uid(), l.company_id)))));


--
-- Name: lead_banking Staff can access lead banking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access lead banking" ON public.lead_banking USING ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = lead_banking.lead_id) AND public.can_access_company(auth.uid(), l.company_id)))));


--
-- Name: liabilities Staff can access liabilities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access liabilities" ON public.liabilities USING ((EXISTS ( SELECT 1
   FROM public.client_services cs
  WHERE ((cs.id = liabilities.client_service_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: liability_actions Staff can access liability actions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access liability actions" ON public.liability_actions TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.liabilities l
     JOIN public.client_services e ON ((e.id = l.client_service_id)))
  WHERE ((l.id = liability_actions.liability_id) AND public.can_access_company(auth.uid(), e.owning_company_id)))));


--
-- Name: service_status_history Staff can access service status history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access service status history" ON public.service_status_history USING ((EXISTS ( SELECT 1
   FROM public.client_services cs
  WHERE ((cs.id = service_status_history.client_service_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: settlements Staff can access settlements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access settlements" ON public.settlements TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.liabilities l
     JOIN public.client_services e ON ((e.id = l.client_service_id)))
  WHERE ((l.id = settlements.liability_id) AND public.can_access_company(auth.uid(), e.owning_company_id)))));


--
-- Name: transactions Staff can access transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access transactions" ON public.transactions USING ((EXISTS ( SELECT 1
   FROM public.client_services cs
  WHERE ((cs.id = transactions.client_service_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: client_services Staff can manage company client_services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage company client_services" ON public.client_services USING (public.can_access_company(auth.uid(), owning_company_id));


--
-- Name: clients Staff can manage company clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage company clients" ON public.clients USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: leads Staff can manage company leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage company leads" ON public.leads TO authenticated USING (public.can_view_leads(auth.uid(), company_id)) WITH CHECK (public.can_view_leads(auth.uid(), company_id));


--
-- Name: client_services Staff can view company client_services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view company client_services" ON public.client_services FOR SELECT USING (public.can_access_company(auth.uid(), owning_company_id));


--
-- Name: clients Staff can view company clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view company clients" ON public.clients FOR SELECT USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: leads Staff can view company leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view company leads" ON public.leads FOR SELECT TO authenticated USING (public.can_view_leads(auth.uid(), company_id));


--
-- Name: creditor_responses Users delete company creditor responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users delete company creditor responses" ON public.creditor_responses FOR DELETE TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: creditor_responses Users insert company creditor responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users insert company creditor responses" ON public.creditor_responses FOR INSERT TO authenticated WITH CHECK ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: creditor_responses Users update company creditor responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update company creditor responses" ON public.creditor_responses FOR UPDATE TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: creditor_responses Users view company creditor responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view company creditor responses" ON public.creditor_responses FOR SELECT TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: client_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: client_communications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_communications ENABLE ROW LEVEL SECURITY;

--
-- Name: client_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: client_phones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_phones ENABLE ROW LEVEL SECURITY;

--
-- Name: client_service_clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_service_clients ENABLE ROW LEVEL SECURITY;

--
-- Name: client_service_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_service_types ENABLE ROW LEVEL SECURITY;

--
-- Name: client_services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: creditor_contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.creditor_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: creditor_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.creditor_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: creditors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.creditors ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_banking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_banking ENABLE ROW LEVEL SECURITY;

--
-- Name: leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

--
-- Name: liabilities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;

--
-- Name: liability_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.liability_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: service_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.service_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

--
-- Name: settlements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: TABLE creditor_responses; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.creditor_responses TO authenticated;
GRANT ALL ON TABLE public.creditor_responses TO service_role;


--
--




-- ===== Grants (explicit; do not rely on Supabase default privileges — matches A3) =====
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients, public.client_addresses, public.client_phones, public.client_communications, public.client_documents, public.client_service_clients, public.client_service_types, public.client_services, public.services, public.service_status_history, public.leads, public.lead_activities, public.lead_banking, public.liabilities, public.liability_actions, public.creditors, public.creditor_contacts, public.creditor_responses, public.settlements, public.transactions TO authenticated;
GRANT ALL ON public.clients, public.client_addresses, public.client_phones, public.client_communications, public.client_documents, public.client_service_clients, public.client_service_types, public.client_services, public.services, public.service_status_history, public.leads, public.lead_activities, public.lead_banking, public.liabilities, public.liability_actions, public.creditors, public.creditor_contacts, public.creditor_responses, public.settlements, public.transactions TO service_role;
GRANT USAGE ON SEQUENCE public.lead_number_seq, public.engagement_number_seq TO authenticated, service_role;

-- ============================================================================
-- ROLLBACK (manual; forward-only policy)
-- ============================================================================
-- DROP TABLE IF EXISTS public.clients CASCADE;
-- DROP TABLE IF EXISTS public.client_addresses CASCADE;
-- DROP TABLE IF EXISTS public.client_phones CASCADE;
-- DROP TABLE IF EXISTS public.client_communications CASCADE;
-- DROP TABLE IF EXISTS public.client_documents CASCADE;
-- DROP TABLE IF EXISTS public.client_service_clients CASCADE;
-- DROP TABLE IF EXISTS public.client_service_types CASCADE;
-- DROP TABLE IF EXISTS public.client_services CASCADE;
-- DROP TABLE IF EXISTS public.services CASCADE;
-- DROP TABLE IF EXISTS public.service_status_history CASCADE;
-- DROP TABLE IF EXISTS public.leads CASCADE;
-- DROP TABLE IF EXISTS public.lead_activities CASCADE;
-- DROP TABLE IF EXISTS public.lead_banking CASCADE;
-- DROP TABLE IF EXISTS public.liabilities CASCADE;
-- DROP TABLE IF EXISTS public.liability_actions CASCADE;
-- DROP TABLE IF EXISTS public.creditors CASCADE;
-- DROP TABLE IF EXISTS public.creditor_contacts CASCADE;
-- DROP TABLE IF EXISTS public.creditor_responses CASCADE;
-- DROP TABLE IF EXISTS public.settlements CASCADE;
-- DROP TABLE IF EXISTS public.transactions CASCADE;
-- DROP FUNCTION IF EXISTS public.decrypt_lead_banking(uuid);
-- DROP FUNCTION IF EXISTS public.decrypt_client_ssn(uuid);
-- DROP FUNCTION IF EXISTS public.can_view_leads(uuid, uuid);
-- DROP FUNCTION IF EXISTS public.update_client_status() CASCADE;
-- DROP FUNCTION IF EXISTS public.track_lead_status_transition() CASCADE;
-- DROP FUNCTION IF EXISTS public.calc_creditor_response_time() CASCADE;
-- DROP FUNCTION IF EXISTS public.generate_service_number() CASCADE;
-- DROP FUNCTION IF EXISTS public.generate_lead_number() CASCADE;
-- DROP SEQUENCE IF EXISTS public.lead_number_seq;
-- DROP SEQUENCE IF EXISTS public.engagement_number_seq;
-- DROP TYPE IF EXISTS public.address_type;
-- DROP TYPE IF EXISTS public.bank_account_type;
-- DROP TYPE IF EXISTS public.client_relationship;
-- DROP TYPE IF EXISTS public.client_status_enum;
-- DROP TYPE IF EXISTS public.communication_direction;
-- DROP TYPE IF EXISTS public.communication_type;
-- DROP TYPE IF EXISTS public.contact_status_enum;
-- DROP TYPE IF EXISTS public.creditor_response_channel;
-- DROP TYPE IF EXISTS public.creditor_response_direction;
-- DROP TYPE IF EXISTS public.creditor_response_sentiment;
-- DROP TYPE IF EXISTS public.creditor_type;
-- DROP TYPE IF EXISTS public.employment_status;
-- DROP TYPE IF EXISTS public.fee_collection_method;
-- DROP TYPE IF EXISTS public.hardship_reason;
-- DROP TYPE IF EXISTS public.lead_interest;
-- DROP TYPE IF EXISTS public.lead_source;
-- DROP TYPE IF EXISTS public.lead_status;
-- DROP TYPE IF EXISTS public.liability_status;
-- DROP TYPE IF EXISTS public.liability_type;
-- DROP TYPE IF EXISTS public.payment_status_enum;
-- DROP TYPE IF EXISTS public.payment_type;
-- DROP TYPE IF EXISTS public.phone_type;
-- DROP TYPE IF EXISTS public.plan_type;
-- DROP TYPE IF EXISTS public.retention_type_enum;
-- DROP TYPE IF EXISTS public.service_status;
-- DROP TYPE IF EXISTS public.service_type;
-- DROP TYPE IF EXISTS public.settlement_status;
