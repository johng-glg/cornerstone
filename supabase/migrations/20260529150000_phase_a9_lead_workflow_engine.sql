-- Phase A9 — Lead engine + workflow engine (ADR-001 baseline, curated verbatim from the
-- authoritative reference dump). Layers on the A3→A8 schema.
--
-- Lead engine (10 tables): lead_scoring_profiles, lead_assignment_rules, lead_assignment_pool,
--   lead_assignment_queue, lead_assignment_log, lead_budgets, lead_debts, lead_disclosures,
--   lead_documents, assignments (+ reminder_settings). Functions: assign_lead,
--   calculate_lead_score, trigger_auto_assign_lead, trigger_calculate_lead_score,
--   process_assignment_queue, validate_status_transition.
-- Workflow engine (8 tables): workflow_groups, workflow_rules, workflow_executions,
--   domain_events, webhook_endpoints, outbound_webhook_log, graduation_automation_config,
--   graduation_events. Functions: check_trigger_match, evaluate_workflow_conditions,
--   emit_domain_event.
--
-- Re-adds the A5-deferred leads integration: FK leads.scoring_profile_id ->
--   lead_scoring_profiles, and triggers trg_auto_assign_lead / trg_calculate_lead_score.
-- Re-adds the A8-deferred generate_deadline_reminders() RPC (its deps reminder_settings +
--   assignments now exist).
--
-- Intentional deferrals (re-added by their owning phases):
--   * Trigger trg_notify_matter_assignment on assignments -> notify_matter_assignment()
--     (notifications phase: needs the notifications table + notify_* functions).
--
-- Schema-diff verified vs reference (scoped to the A9 objects). Forward-only; rollback inline.


-- ===== Enums (new for A9) =====
CREATE TYPE public.assignment_action AS ENUM (
    'auto_assigned',
    'manual_assigned',
    'reassigned',
    'unassigned',
    'queue_added',
    'queue_expired'
);
CREATE TYPE public.assignment_method AS ENUM (
    'round_robin',
    'weighted',
    'backlog_based',
    'skillset_match'
);
CREATE TYPE public.assignment_type AS ENUM (
    'primary_attorney',
    'litigation_attorney',
    'client_services_rep',
    'case_manager',
    'negotiator',
    'sales_rep'
);
CREATE TYPE public.entity_type AS ENUM (
    'engagement',
    'case',
    'liability',
    'lead',
    'litigation_matter'
);
CREATE TYPE public.queue_status AS ENUM (
    'pending',
    'assigned',
    'expired',
    'manual'
);
CREATE TYPE public.workflow_entity_type AS ENUM (
    'leads',
    'client_services',
    'liabilities',
    'litigation_matters',
    'tasks',
    'settlements'
);
CREATE TYPE public.workflow_trigger_type AS ENUM (
    'status_changed',
    'field_updated',
    'record_created',
    'time_based',
    'manual'
);
CREATE TYPE public.workflow_execution_status AS ENUM (
    'success',
    'blocked',
    'failed',
    'skipped'
);
CREATE TYPE public.workflow_action_type AS ENUM (
    'create_task',
    'send_notification',
    'update_field',
    'block_transition',
    'trigger_webhook',
    'auto_graduate'
);

-- ===== Tables =====
CREATE TABLE public.lead_scoring_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    interest_type public.lead_interest,
    source public.lead_source,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    criteria jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.lead_assignment_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    method public.assignment_method DEFAULT 'round_robin'::public.assignment_method NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    source public.lead_source,
    interest_type public.lead_interest,
    min_debt_amount numeric,
    max_debt_amount numeric,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.lead_assignment_pool (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    weight integer DEFAULT 10 NOT NULL,
    max_active_leads integer DEFAULT 25,
    is_available boolean DEFAULT true NOT NULL,
    skills jsonb DEFAULT '[]'::jsonb,
    last_assigned_at timestamp with time zone,
    assignment_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.lead_assignment_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    rule_id uuid,
    status public.queue_status DEFAULT 'pending'::public.queue_status NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    queued_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_at timestamp with time zone,
    assigned_to uuid,
    assignment_method public.assignment_method,
    assignment_reason text,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_attempt_at timestamp with time zone,
    next_attempt_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.lead_assignment_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    action public.assignment_action NOT NULL,
    from_staff_id uuid,
    to_staff_id uuid,
    performed_by uuid,
    rule_id uuid,
    method public.assignment_method,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.lead_budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    category text NOT NULL,
    label text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.lead_debts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    creditor_id uuid,
    creditor_name text NOT NULL,
    account_type public.liability_type DEFAULT 'credit_card'::public.liability_type NOT NULL,
    original_balance numeric,
    current_balance numeric NOT NULL,
    account_number_last4 text,
    is_enrolled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.lead_disclosures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    disclosure_type text NOT NULL,
    acknowledged_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.lead_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    document_type text NOT NULL,
    title text NOT NULL,
    file_url text NOT NULL,
    notes text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    entity_type public.entity_type NOT NULL,
    entity_id uuid NOT NULL,
    assignment_type public.assignment_type NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    assigned_date timestamp with time zone DEFAULT now() NOT NULL,
    unassigned_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.reminder_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    response_deadline_days integer[] DEFAULT '{7,3,1}'::integer[] NOT NULL,
    hearing_days integer[] DEFAULT '{7,3,1,0}'::integer[] NOT NULL,
    task_due_days integer[] DEFAULT '{3,1}'::integer[] NOT NULL,
    reminder_hour integer DEFAULT 9 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.workflow_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    entity_type public.workflow_entity_type NOT NULL,
    filter_conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    color text,
    priority integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);
CREATE TABLE public.workflow_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    entity_type public.workflow_entity_type NOT NULL,
    trigger_type public.workflow_trigger_type NOT NULL,
    trigger_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_blocking boolean DEFAULT false NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    group_id uuid
);
CREATE TABLE public.workflow_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_id uuid NOT NULL,
    entity_type public.workflow_entity_type NOT NULL,
    entity_id uuid NOT NULL,
    status public.workflow_execution_status NOT NULL,
    trigger_data jsonb,
    condition_results jsonb,
    actions_executed jsonb,
    error_message text,
    block_message text,
    executed_at timestamp with time zone DEFAULT now() NOT NULL,
    duration_ms integer
);
CREATE TABLE public.domain_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event text NOT NULL,
    entity_type text,
    entity_id uuid,
    company_id uuid,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    processed_at timestamp with time zone,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.webhook_endpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    target_url text NOT NULL,
    auth_method text DEFAULT 'none'::text NOT NULL,
    auth_secret_ref text,
    auth_secret_last4 text,
    event_subscriptions text[] DEFAULT '{}'::text[] NOT NULL,
    custom_headers jsonb DEFAULT '{}'::jsonb NOT NULL,
    body_template text,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    last_fired_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT webhook_endpoints_auth_method_check CHECK ((auth_method = ANY (ARRAY['none'::text, 'bearer'::text, 'hmac_sha256'::text, 'basic'::text])))
);
CREATE TABLE public.outbound_webhook_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    endpoint_id uuid,
    source_event text NOT NULL,
    source_entity_type text,
    source_entity_id uuid,
    target_url text NOT NULL,
    method text DEFAULT 'POST'::text NOT NULL,
    request_headers jsonb,
    request_payload jsonb,
    response_status integer,
    response_body text,
    response_time_ms integer,
    attempt_n integer DEFAULT 1 NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.graduation_automation_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    require_all_liabilities_resolved boolean DEFAULT true NOT NULL,
    fire_contact_close boolean DEFAULT true NOT NULL,
    notification_template_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.graduation_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    client_service_id uuid NOT NULL,
    triggered_by_liability_id uuid,
    previous_status text,
    contact_close_status text,
    notification_sent boolean DEFAULT false NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ===== Primary keys =====
ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.domain_events
    ADD CONSTRAINT domain_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.graduation_automation_config
    ADD CONSTRAINT graduation_automation_config_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.graduation_events
    ADD CONSTRAINT graduation_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lead_assignment_log
    ADD CONSTRAINT lead_assignment_log_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lead_assignment_pool
    ADD CONSTRAINT lead_assignment_pool_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lead_assignment_queue
    ADD CONSTRAINT lead_assignment_queue_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lead_assignment_rules
    ADD CONSTRAINT lead_assignment_rules_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lead_budgets
    ADD CONSTRAINT lead_budgets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lead_debts
    ADD CONSTRAINT lead_debts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lead_disclosures
    ADD CONSTRAINT lead_disclosures_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lead_documents
    ADD CONSTRAINT lead_documents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.lead_scoring_profiles
    ADD CONSTRAINT lead_scoring_profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.outbound_webhook_log
    ADD CONSTRAINT outbound_webhook_log_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.reminder_settings
    ADD CONSTRAINT reminder_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.workflow_executions
    ADD CONSTRAINT workflow_executions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.workflow_groups
    ADD CONSTRAINT workflow_groups_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.workflow_rules
    ADD CONSTRAINT workflow_rules_pkey PRIMARY KEY (id);

-- ===== Unique constraints =====
ALTER TABLE ONLY public.graduation_automation_config
    ADD CONSTRAINT graduation_automation_config_company_id_key UNIQUE (company_id);
ALTER TABLE ONLY public.lead_assignment_pool
    ADD CONSTRAINT lead_assignment_pool_rule_id_staff_id_key UNIQUE (rule_id, staff_id);
ALTER TABLE ONLY public.lead_disclosures
    ADD CONSTRAINT lead_disclosures_lead_id_disclosure_type_key UNIQUE (lead_id, disclosure_type);
ALTER TABLE ONLY public.reminder_settings
    ADD CONSTRAINT reminder_settings_company_id_key UNIQUE (company_id);

-- ===== Foreign keys =====
ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.domain_events
    ADD CONSTRAINT domain_events_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.graduation_automation_config
    ADD CONSTRAINT graduation_automation_config_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.graduation_events
    ADD CONSTRAINT graduation_events_client_service_id_fkey FOREIGN KEY (client_service_id) REFERENCES public.client_services(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.graduation_events
    ADD CONSTRAINT graduation_events_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.graduation_events
    ADD CONSTRAINT graduation_events_triggered_by_liability_id_fkey FOREIGN KEY (triggered_by_liability_id) REFERENCES public.liabilities(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.lead_assignment_log
    ADD CONSTRAINT lead_assignment_log_from_staff_id_fkey FOREIGN KEY (from_staff_id) REFERENCES public.staff(id);
ALTER TABLE ONLY public.lead_assignment_log
    ADD CONSTRAINT lead_assignment_log_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lead_assignment_log
    ADD CONSTRAINT lead_assignment_log_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.staff(id);
ALTER TABLE ONLY public.lead_assignment_log
    ADD CONSTRAINT lead_assignment_log_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.lead_assignment_rules(id);
ALTER TABLE ONLY public.lead_assignment_log
    ADD CONSTRAINT lead_assignment_log_to_staff_id_fkey FOREIGN KEY (to_staff_id) REFERENCES public.staff(id);
ALTER TABLE ONLY public.lead_assignment_pool
    ADD CONSTRAINT lead_assignment_pool_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.lead_assignment_rules(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lead_assignment_pool
    ADD CONSTRAINT lead_assignment_pool_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lead_assignment_queue
    ADD CONSTRAINT lead_assignment_queue_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.staff(id);
ALTER TABLE ONLY public.lead_assignment_queue
    ADD CONSTRAINT lead_assignment_queue_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lead_assignment_queue
    ADD CONSTRAINT lead_assignment_queue_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.lead_assignment_rules(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.lead_assignment_rules
    ADD CONSTRAINT lead_assignment_rules_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lead_budgets
    ADD CONSTRAINT lead_budgets_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lead_debts
    ADD CONSTRAINT lead_debts_creditor_id_fkey FOREIGN KEY (creditor_id) REFERENCES public.creditors(id);
ALTER TABLE ONLY public.lead_debts
    ADD CONSTRAINT lead_debts_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lead_disclosures
    ADD CONSTRAINT lead_disclosures_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lead_documents
    ADD CONSTRAINT lead_documents_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lead_documents
    ADD CONSTRAINT lead_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.staff(id);
ALTER TABLE ONLY public.lead_scoring_profiles
    ADD CONSTRAINT lead_scoring_profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.outbound_webhook_log
    ADD CONSTRAINT outbound_webhook_log_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.outbound_webhook_log
    ADD CONSTRAINT outbound_webhook_log_endpoint_id_fkey FOREIGN KEY (endpoint_id) REFERENCES public.webhook_endpoints(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.reminder_settings
    ADD CONSTRAINT reminder_settings_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.workflow_executions
    ADD CONSTRAINT workflow_executions_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.workflow_rules(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.workflow_groups
    ADD CONSTRAINT workflow_groups_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.workflow_groups
    ADD CONSTRAINT workflow_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.workflow_rules
    ADD CONSTRAINT workflow_rules_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.workflow_rules
    ADD CONSTRAINT workflow_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);
ALTER TABLE ONLY public.workflow_rules
    ADD CONSTRAINT workflow_rules_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.workflow_groups(id) ON DELETE SET NULL;

-- ===== Indexes =====
CREATE INDEX idx_assignment_log_lead ON public.lead_assignment_log USING btree (lead_id, created_at DESC);
CREATE INDEX idx_assignment_rules_lookup ON public.lead_assignment_rules USING btree (company_id, is_active, priority DESC);
CREATE INDEX idx_assignments_entity ON public.assignments USING btree (entity_type, entity_id);
CREATE UNIQUE INDEX idx_assignments_single_role ON public.assignments USING btree (entity_type, entity_id, assignment_type) WHERE ((is_active = true) AND (assignment_type = ANY (ARRAY['litigation_attorney'::public.assignment_type, 'case_manager'::public.assignment_type, 'negotiator'::public.assignment_type, 'primary_attorney'::public.assignment_type, 'client_services_rep'::public.assignment_type, 'sales_rep'::public.assignment_type])));
CREATE INDEX idx_assignments_staff ON public.assignments USING btree (staff_id, is_active);
CREATE INDEX idx_domain_events_event_created ON public.domain_events USING btree (event, created_at DESC);
CREATE INDEX idx_domain_events_unprocessed ON public.domain_events USING btree (created_at) WHERE (processed_at IS NULL);
CREATE INDEX idx_graduation_events_company ON public.graduation_events USING btree (company_id, created_at DESC);
CREATE INDEX idx_graduation_events_service ON public.graduation_events USING btree (client_service_id);
CREATE INDEX idx_lead_scoring_profiles_active ON public.lead_scoring_profiles USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_lead_scoring_profiles_company ON public.lead_scoring_profiles USING btree (company_id);
CREATE UNIQUE INDEX idx_lead_scoring_profiles_unique_default ON public.lead_scoring_profiles USING btree (company_id) WHERE (is_default = true);
CREATE INDEX idx_outbound_log_company_created ON public.outbound_webhook_log USING btree (company_id, created_at DESC);
CREATE INDEX idx_outbound_log_endpoint_created ON public.outbound_webhook_log USING btree (endpoint_id, created_at DESC);
CREATE INDEX idx_outbound_log_source_entity ON public.outbound_webhook_log USING btree (source_entity_type, source_entity_id);
CREATE INDEX idx_pool_available ON public.lead_assignment_pool USING btree (rule_id, is_available) WHERE (is_available = true);
CREATE INDEX idx_queue_pending ON public.lead_assignment_queue USING btree (status, priority DESC, queued_at) WHERE (status = 'pending'::public.queue_status);
CREATE INDEX idx_webhook_endpoints_company_active ON public.webhook_endpoints USING btree (company_id, is_active);
CREATE INDEX idx_webhook_endpoints_subscriptions ON public.webhook_endpoints USING gin (event_subscriptions);
CREATE INDEX idx_workflow_executions_entity ON public.workflow_executions USING btree (entity_type, entity_id, executed_at DESC);
CREATE INDEX idx_workflow_executions_rule ON public.workflow_executions USING btree (rule_id, executed_at DESC);
CREATE INDEX idx_workflow_groups_company_id ON public.workflow_groups USING btree (company_id);
CREATE INDEX idx_workflow_groups_entity_type ON public.workflow_groups USING btree (entity_type);
CREATE INDEX idx_workflow_rules_group_id ON public.workflow_rules USING btree (group_id);
CREATE INDEX idx_workflow_rules_lookup ON public.workflow_rules USING btree (company_id, entity_type, trigger_type, is_active) WHERE (is_active = true);

-- ===== Lead/workflow functions =====
CREATE FUNCTION public.assign_lead(_lead_id uuid, _force_method public.assignment_method DEFAULT NULL::public.assignment_method, _force_staff_id uuid DEFAULT NULL::uuid) RETURNS TABLE(assigned_to uuid, method public.assignment_method, reason text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _lead leads;
  _rule lead_assignment_rules;
  _pool_member lead_assignment_pool;
  _staff_id UUID;
  _method assignment_method;
  _reason TEXT;
  _min_count INTEGER;
  _total_weight INTEGER;
  _rand_weight INTEGER;
  _cumulative INTEGER;
  _user_id UUID;
BEGIN
  SELECT * INTO _lead FROM leads WHERE id = _lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;
  
  IF _force_staff_id IS NOT NULL THEN
    UPDATE leads SET assigned_to = _force_staff_id WHERE id = _lead_id;
    
    INSERT INTO lead_assignment_log (lead_id, action, from_staff_id, to_staff_id, reason)
    VALUES (_lead_id, 'manual_assigned', _lead.assigned_to, _force_staff_id, 'Manual assignment');
    
    SELECT user_id INTO _user_id FROM staff WHERE id = _force_staff_id;
    IF _user_id IS NOT NULL THEN
      PERFORM create_notification(
        _user_id,
        'lead_assigned',
        'New Lead Assigned',
        format('%s %s - Manual assignment', _lead.first_name, _lead.last_name),
        '/leads',
        'lead',
        _lead_id
      );
    END IF;
    
    RETURN QUERY SELECT _force_staff_id, NULL::assignment_method, 'Manual assignment'::TEXT;
    RETURN;
  END IF;
  
  SELECT * INTO _rule
  FROM lead_assignment_rules
  WHERE company_id = _lead.company_id
    AND is_active = true
    AND (source IS NULL OR source = _lead.source)
    AND (interest_type IS NULL OR interest_type = _lead.interest_type)
    AND (min_debt_amount IS NULL OR _lead.estimated_debt_amount >= min_debt_amount)
    AND (max_debt_amount IS NULL OR _lead.estimated_debt_amount <= max_debt_amount)
  ORDER BY priority DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    _reason := 'No matching assignment rule';
    RETURN QUERY SELECT NULL::UUID, NULL::assignment_method, _reason;
    RETURN;
  END IF;
  
  _method := COALESCE(_force_method, _rule.method);
  
  CASE _method
    WHEN 'round_robin' THEN
      SELECT p.staff_id INTO _staff_id
      FROM lead_assignment_pool p
      JOIN staff s ON s.id = p.staff_id
      WHERE p.rule_id = _rule.id
        AND p.is_available = true
        AND s.is_active = true
      ORDER BY p.last_assigned_at ASC NULLS FIRST, p.assignment_count ASC
      LIMIT 1;
      
      _reason := 'Round robin - next in rotation';
      
    WHEN 'weighted' THEN
      SELECT SUM(weight) INTO _total_weight
      FROM lead_assignment_pool p
      JOIN staff s ON s.id = p.staff_id
      WHERE p.rule_id = _rule.id AND p.is_available = true AND s.is_active = true;
      
      IF _total_weight > 0 THEN
        _rand_weight := floor(random() * _total_weight)::INTEGER;
        _cumulative := 0;
        
        FOR _pool_member IN
          SELECT p.* FROM lead_assignment_pool p
          JOIN staff s ON s.id = p.staff_id
          WHERE p.rule_id = _rule.id AND p.is_available = true AND s.is_active = true
          ORDER BY p.weight DESC
        LOOP
          _cumulative := _cumulative + _pool_member.weight;
          IF _cumulative > _rand_weight THEN
            _staff_id := _pool_member.staff_id;
            EXIT;
          END IF;
        END LOOP;
      END IF;
      
      _reason := 'Weighted random selection';
      
    WHEN 'backlog_based' THEN
      SELECT p.staff_id, COUNT(l.id) as active_count INTO _staff_id, _min_count
      FROM lead_assignment_pool p
      JOIN staff s ON s.id = p.staff_id
      LEFT JOIN leads l ON l.assigned_to = p.staff_id 
        AND l.status NOT IN ('converted', 'lost')
      WHERE p.rule_id = _rule.id AND p.is_available = true AND s.is_active = true
      GROUP BY p.staff_id, p.max_active_leads
      HAVING COUNT(l.id) < COALESCE(p.max_active_leads, 25)
      ORDER BY COUNT(l.id) ASC
      LIMIT 1;
      
      _reason := format('Lowest backlog (%s active leads)', COALESCE(_min_count, 0));
      
    WHEN 'skillset_match' THEN
      SELECT p.staff_id INTO _staff_id
      FROM lead_assignment_pool p
      JOIN staff s ON s.id = p.staff_id
      WHERE p.rule_id = _rule.id AND p.is_available = true AND s.is_active = true
      ORDER BY (
        CASE WHEN p.skills @> jsonb_build_array(jsonb_build_object('type', 'interest_type', 'value', _lead.interest_type::text)) THEN 10 ELSE 0 END
        + CASE WHEN _lead.has_active_lawsuit AND p.skills @> jsonb_build_array(jsonb_build_object('type', 'has_lawsuit', 'value', true)) THEN 15 ELSE 0 END
        + CASE WHEN _lead.estimated_debt_amount >= 50000 AND p.skills @> jsonb_build_array(jsonb_build_object('type', 'high_value')) THEN 10 ELSE 0 END
      ) DESC,
      p.assignment_count ASC
      LIMIT 1;
      
      _reason := 'Best skillset match';
      
  END CASE;
  
  IF _staff_id IS NOT NULL THEN
    UPDATE leads SET assigned_to = _staff_id WHERE id = _lead_id;
    
    UPDATE lead_assignment_pool
    SET 
      last_assigned_at = now(),
      assignment_count = assignment_count + 1,
      updated_at = now()
    WHERE rule_id = _rule.id AND staff_id = _staff_id;
    
    INSERT INTO lead_assignment_log (lead_id, action, from_staff_id, to_staff_id, rule_id, method, reason)
    VALUES (_lead_id, 'auto_assigned', _lead.assigned_to, _staff_id, _rule.id, _method, _reason);
    
    SELECT user_id INTO _user_id FROM staff WHERE id = _staff_id;
    IF _user_id IS NOT NULL THEN
      PERFORM create_notification(
        _user_id,
        'lead_assigned',
        'New Lead Assigned',
        format('%s %s - %s', _lead.first_name, _lead.last_name, _reason),
        '/leads',
        'lead',
        _lead_id
      );
    END IF;
  ELSE
    _reason := 'No available staff in pool';
    
    INSERT INTO lead_assignment_queue (lead_id, rule_id, priority)
    VALUES (_lead_id, _rule.id, COALESCE(_lead.lead_score, 0));
    
    INSERT INTO lead_assignment_log (lead_id, action, rule_id, reason)
    VALUES (_lead_id, 'queue_added', _rule.id, _reason);
  END IF;
  
  RETURN QUERY SELECT _staff_id, _method, _reason;
END;
$$;
CREATE FUNCTION public.calculate_lead_score(lead_row public.leads) RETURNS TABLE(score integer, breakdown jsonb)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _profile lead_scoring_profiles;
  _criteria JSONB;
  _total_score INTEGER := 0;
  _breakdown JSONB := '{}'::jsonb;
  _points INTEGER;
  _threshold RECORD;
BEGIN
  SELECT * INTO _profile
  FROM lead_scoring_profiles
  WHERE company_id = lead_row.company_id
    AND is_active = true
    AND (
      id = lead_row.scoring_profile_id
      OR (lead_row.scoring_profile_id IS NULL AND (
        (source = lead_row.source AND interest_type = lead_row.interest_type)
        OR (source = lead_row.source AND interest_type IS NULL)
        OR (source IS NULL AND interest_type = lead_row.interest_type)
        OR (source IS NULL AND interest_type IS NULL AND is_default = true)
      ))
    )
  ORDER BY 
    CASE WHEN id = lead_row.scoring_profile_id THEN 0 ELSE 1 END,
    CASE WHEN source IS NOT NULL AND interest_type IS NOT NULL THEN 0
         WHEN source IS NOT NULL THEN 1
         WHEN interest_type IS NOT NULL THEN 2
         ELSE 3 END
  LIMIT 1;
  
  IF _profile IS NULL THEN
    RETURN QUERY SELECT 0, '{}'::jsonb;
    RETURN;
  END IF;
  
  _criteria := _profile.criteria;
  
  IF lead_row.estimated_debt_amount IS NOT NULL AND _criteria ? 'estimated_debt' THEN
    FOR _threshold IN 
      SELECT * FROM jsonb_to_recordset(_criteria->'estimated_debt'->'thresholds') 
        AS x(min numeric, max numeric, points integer)
      ORDER BY min DESC
    LOOP
      IF lead_row.estimated_debt_amount >= _threshold.min 
         AND (_threshold.max IS NULL OR lead_row.estimated_debt_amount <= _threshold.max) THEN
        _points := _threshold.points;
        _total_score := _total_score + _points;
        _breakdown := _breakdown || jsonb_build_object('estimated_debt', _points);
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  IF lead_row.number_of_debts IS NOT NULL AND _criteria ? 'number_of_debts' THEN
    FOR _threshold IN 
      SELECT * FROM jsonb_to_recordset(_criteria->'number_of_debts'->'thresholds') 
        AS x(min integer, max integer, points integer)
      ORDER BY min DESC
    LOOP
      IF lead_row.number_of_debts >= _threshold.min 
         AND (_threshold.max IS NULL OR lead_row.number_of_debts <= _threshold.max) THEN
        _points := _threshold.points;
        _total_score := _total_score + _points;
        _breakdown := _breakdown || jsonb_build_object('number_of_debts', _points);
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  IF lead_row.has_active_lawsuit = true AND _criteria ? 'has_active_lawsuit' THEN
    IF NOT (_criteria->'has_active_lawsuit' ? 'only_for_interest_types') 
       OR lead_row.interest_type::text = ANY(
         SELECT jsonb_array_elements_text(_criteria->'has_active_lawsuit'->'only_for_interest_types')
       ) THEN
      _points := (_criteria->'has_active_lawsuit'->>'points')::integer;
      _total_score := _total_score + _points;
      _breakdown := _breakdown || jsonb_build_object('has_active_lawsuit', _points);
    END IF;
  END IF;
  
  IF lead_row.credit_auth_given = true AND _criteria ? 'credit_auth_given' THEN
    _points := (_criteria->'credit_auth_given'->>'points')::integer;
    _total_score := _total_score + _points;
    _breakdown := _breakdown || jsonb_build_object('credit_auth_given', _points);
  END IF;
  
  IF lead_row.email IS NOT NULL AND _criteria ? 'email_provided' THEN
    _points := (_criteria->'email_provided'->>'points')::integer;
    _total_score := _total_score + _points;
    _breakdown := _breakdown || jsonb_build_object('email_provided', _points);
  END IF;
  
  IF lead_row.phone IS NOT NULL AND _criteria ? 'phone_provided' THEN
    _points := (_criteria->'phone_provided'->>'points')::integer;
    _total_score := _total_score + _points;
    _breakdown := _breakdown || jsonb_build_object('phone_provided', _points);
  END IF;
  
  IF _criteria ? 'source_quality' AND _criteria->'source_quality' ? lead_row.source::text THEN
    _points := (_criteria->'source_quality'->>lead_row.source::text)::integer;
    _total_score := _total_score + _points;
    _breakdown := _breakdown || jsonb_build_object('source_quality', _points);
  END IF;
  
  RETURN QUERY SELECT _total_score, _breakdown;
END;
$$;
CREATE FUNCTION public.trigger_auto_assign_lead() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _rule lead_assignment_rules;
  _result RECORD;
BEGIN
  IF NEW.assigned_to IS NULL THEN
    SELECT * INTO _rule
    FROM lead_assignment_rules
    WHERE company_id = NEW.company_id
      AND is_active = true
      AND (config->>'auto_assign')::boolean = true
      AND (source IS NULL OR source = NEW.source)
      AND (interest_type IS NULL OR interest_type = NEW.interest_type)
    ORDER BY priority DESC
    LIMIT 1;
    
    IF FOUND THEN
      SELECT * INTO _result FROM assign_lead(NEW.id);
      IF _result.assigned_to IS NOT NULL THEN
        NEW.assigned_to := _result.assigned_to;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.trigger_calculate_lead_score() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _result RECORD;
BEGIN
  SELECT * INTO _result FROM calculate_lead_score(NEW);
  
  NEW.lead_score := _result.score;
  NEW.score_breakdown := _result.breakdown;
  NEW.score_calculated_at := now();
  
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.process_assignment_queue() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _queue_item lead_assignment_queue;
  _result RECORD;
  _processed INTEGER := 0;
BEGIN
  FOR _queue_item IN
    SELECT * FROM lead_assignment_queue
    WHERE status = 'pending'
    ORDER BY priority DESC, queued_at ASC
    LIMIT 50
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT * INTO _result FROM assign_lead(_queue_item.lead_id);
    
    IF _result.assigned_to IS NOT NULL THEN
      UPDATE lead_assignment_queue
      SET 
        status = 'assigned',
        assigned_at = now(),
        assigned_to = _result.assigned_to,
        assignment_method = _result.method,
        assignment_reason = _result.reason
      WHERE id = _queue_item.id;
      
      _processed := _processed + 1;
    ELSE
      UPDATE lead_assignment_queue
      SET 
        attempt_count = attempt_count + 1,
        last_attempt_at = now(),
        next_attempt_at = now() + interval '15 minutes'
      WHERE id = _queue_item.id;
    END IF;
  END LOOP;
  
  RETURN _processed;
END;
$$;
CREATE FUNCTION public.validate_status_transition(_entity_type public.workflow_entity_type, _entity_id uuid, _from_status text, _to_status text) RETURNS TABLE(allowed boolean, block_message text, rule_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  _rule workflow_rules;
  _company_id UUID;
  _conditions_met BOOLEAN;
  _trigger_data JSONB;
  _start_time TIMESTAMPTZ;
  _duration INTEGER;
BEGIN
  CASE _entity_type
    WHEN 'leads' THEN
      SELECT company_id INTO _company_id FROM leads WHERE id = _entity_id;
    WHEN 'client_services' THEN
      SELECT owning_company_id INTO _company_id FROM client_services WHERE id = _entity_id;
    WHEN 'liabilities' THEN
      SELECT cs.owning_company_id INTO _company_id 
      FROM liabilities l
      JOIN client_services cs ON cs.id = l.client_service_id
      WHERE l.id = _entity_id;
    WHEN 'litigation_matters' THEN
      SELECT cs.owning_company_id INTO _company_id 
      FROM litigation_matters lm
      JOIN client_services cs ON cs.id = lm.client_service_id
      WHERE lm.id = _entity_id;
    ELSE
      EXECUTE format('SELECT company_id FROM %I WHERE id = $1', _entity_type::text)
        INTO _company_id USING _entity_id;
  END CASE;
  
  IF _company_id IS NULL THEN
    allowed := true;
    block_message := null;
    rule_name := null;
    RETURN NEXT;
    RETURN;
  END IF;
  
  _trigger_data := jsonb_build_object('from', _from_status, 'to', _to_status);
  
  FOR _rule IN
    SELECT * FROM workflow_rules
    WHERE company_id = _company_id
      AND entity_type = _entity_type
      AND trigger_type = 'status_changed'
      AND is_active = true
      AND is_blocking = true
    ORDER BY priority DESC
  LOOP
    _start_time := clock_timestamp();
    
    IF NOT check_trigger_match(_rule.trigger_config, _trigger_data) THEN
      CONTINUE;
    END IF;
    
    _conditions_met := evaluate_workflow_conditions(
      _rule.conditions,
      _entity_type,
      _entity_id
    );
    
    _duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - _start_time)::INTEGER;
    
    IF _conditions_met THEN
      INSERT INTO workflow_executions (
        rule_id, entity_type, entity_id, status,
        trigger_data, condition_results, block_message, duration_ms
      ) VALUES (
        _rule.id, _entity_type, _entity_id, 'blocked',
        _trigger_data, _rule.conditions,
        COALESCE(_rule.actions->0->'config'->>'message', 'Transition blocked by workflow rule: ' || _rule.name),
        _duration
      );
      
      allowed := false;
      block_message := COALESCE(_rule.actions->0->'config'->>'message', 'Transition blocked by workflow rule: ' || _rule.name);
      rule_name := _rule.name;
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;
  
  allowed := true;
  block_message := null;
  rule_name := null;
  RETURN NEXT;
END;
$_$;
CREATE FUNCTION public.check_trigger_match(_trigger_config jsonb, _trigger_data jsonb) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  _from_statuses TEXT[];
  _to_statuses TEXT[];
BEGIN
  IF _trigger_data ? 'from' AND _trigger_data ? 'to' THEN
    IF _trigger_config ? 'from' AND jsonb_array_length(_trigger_config->'from') > 0 THEN
      SELECT array_agg(value::text) INTO _from_statuses 
      FROM jsonb_array_elements_text(_trigger_config->'from');
      
      IF NOT (_trigger_data->>'from' = ANY(_from_statuses)) THEN
        RETURN false;
      END IF;
    END IF;
    
    IF _trigger_config ? 'to' AND jsonb_array_length(_trigger_config->'to') > 0 THEN
      SELECT array_agg(value::text) INTO _to_statuses 
      FROM jsonb_array_elements_text(_trigger_config->'to');
      
      IF NOT (_trigger_data->>'to' = ANY(_to_statuses)) THEN
        RETURN false;
      END IF;
    END IF;
  END IF;
  
  IF _trigger_config ? 'field' AND _trigger_data ? 'field' THEN
    IF _trigger_config->>'field' != _trigger_data->>'field' THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$;
CREATE FUNCTION public.evaluate_workflow_conditions(_conditions jsonb, _entity_type public.workflow_entity_type, _entity_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  _condition_group JSONB;
  _condition JSONB;
  _group_result BOOLEAN;
  _field_value TEXT;
  _comparison_value TEXT;
  _operator TEXT;
  _related_count INTEGER;
  _related_matching INTEGER;
BEGIN
  IF jsonb_array_length(_conditions) = 0 THEN
    RETURN true;
  END IF;
  
  FOR _condition_group IN SELECT * FROM jsonb_array_elements(_conditions)
  LOOP
    _group_result := true;
    
    FOR _condition IN SELECT * FROM jsonb_array_elements(_condition_group->'rules')
    LOOP
      _operator := _condition->>'operator';
      _comparison_value := _condition->>'value';
      
      IF _condition ? 'related_entity' THEN
        IF _entity_type = 'client_services' AND (_condition->>'related_entity') = 'liabilities' THEN
          SELECT COUNT(*) INTO _related_count
          FROM liabilities
          WHERE client_service_id = _entity_id;
          
          IF _operator = 'all_match' THEN
            SELECT COUNT(*) INTO _related_matching
            FROM liabilities
            WHERE client_service_id = _entity_id
              AND status = ANY(
                SELECT jsonb_array_elements_text(_condition->'value')
              );
            
            IF _related_count = 0 OR _related_matching != _related_count THEN
              _group_result := false;
            END IF;
          ELSIF _operator = 'none_match' THEN
            SELECT COUNT(*) INTO _related_matching
            FROM liabilities
            WHERE client_service_id = _entity_id
              AND status = ANY(
                SELECT jsonb_array_elements_text(_condition->'value')
              );
            
            IF _related_matching > 0 THEN
              _group_result := false;
            END IF;
          ELSIF _operator = 'count_greater' THEN
            IF _related_count <= (_comparison_value::integer) THEN
              _group_result := false;
            END IF;
          END IF;
        END IF;
      ELSE
        EXECUTE format(
          'SELECT %I::text FROM %I WHERE id = $1',
          _condition->>'field',
          _entity_type::text
        ) INTO _field_value USING _entity_id;
        
        CASE _operator
          WHEN 'equals' THEN
            IF _field_value IS DISTINCT FROM _comparison_value THEN
              _group_result := false;
            END IF;
          WHEN 'not_equals' THEN
            IF _field_value IS NOT DISTINCT FROM _comparison_value THEN
              _group_result := false;
            END IF;
          WHEN 'greater_than' THEN
            IF (_field_value::numeric) <= (_comparison_value::numeric) THEN
              _group_result := false;
            END IF;
          WHEN 'less_than' THEN
            IF (_field_value::numeric) >= (_comparison_value::numeric) THEN
              _group_result := false;
            END IF;
          WHEN 'contains' THEN
            IF _field_value NOT ILIKE '%' || _comparison_value || '%' THEN
              _group_result := false;
            END IF;
          WHEN 'in' THEN
            IF NOT (_field_value = ANY(
              SELECT jsonb_array_elements_text(_condition->'value')
            )) THEN
              _group_result := false;
            END IF;
          ELSE
            NULL;
        END CASE;
      END IF;
      
      IF NOT _group_result THEN
        EXIT;
      END IF;
    END LOOP;
    
    IF _group_result THEN
      RETURN true;
    END IF;
  END LOOP;
  
  RETURN false;
END;
$_$;
CREATE FUNCTION public.emit_domain_event(_event text, _entity_type text, _entity_id uuid, _company_id uuid, _payload jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE _id UUID;
BEGIN
  INSERT INTO public.domain_events (event, entity_type, entity_id, company_id, payload)
  VALUES (_event, _entity_type, _entity_id, _company_id, COALESCE(_payload, '{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;
CREATE FUNCTION public.generate_deadline_reminders() RETURNS TABLE(reminders_created integer, errors text[])
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _settings reminder_settings;
  _days INTEGER;
  _created INTEGER := 0;
  _errors TEXT[] := '{}';
BEGIN
  FOR _settings IN SELECT * FROM reminder_settings WHERE is_active = true
  LOOP
    FOREACH _days IN ARRAY _settings.response_deadline_days
    LOOP
      INSERT INTO deadline_reminders (
        reminder_type, entity_id, deadline_date, staff_id, 
        days_before, scheduled_for
      )
      SELECT 
        'response_deadline'::reminder_type,
        lm.id,
        lm.response_deadline,
        a.staff_id,
        _days,
        (lm.response_deadline::date - _days) + (_settings.reminder_hour || ' hours')::interval
      FROM litigation_matters lm
      JOIN assignments a ON a.entity_id = lm.id 
        AND a.entity_type = 'litigation_matter' 
        AND a.is_active = true
      WHERE lm.response_deadline IS NOT NULL
        AND lm.response_deadline > now()
        AND lm.status NOT IN ('settled', 'dismissed', 'dropped', 'judgment', 'declined')
        AND (lm.response_deadline::date - _days) >= CURRENT_DATE
        AND (lm.response_deadline::date - _days) <= CURRENT_DATE + 1
      ON CONFLICT (reminder_type, entity_id, staff_id, days_before) DO NOTHING;
    END LOOP;
    
    FOREACH _days IN ARRAY _settings.hearing_days
    LOOP
      INSERT INTO deadline_reminders (
        reminder_type, entity_id, deadline_date, staff_id,
        days_before, scheduled_for
      )
      SELECT 
        'hearing'::reminder_type,
        lh.id,
        lh.scheduled_date,
        a.staff_id,
        _days,
        (lh.scheduled_date::date - _days) + (_settings.reminder_hour || ' hours')::interval
      FROM litigation_hearings lh
      JOIN litigation_matters lm ON lm.id = lh.matter_id
      JOIN assignments a ON a.entity_id = lm.id 
        AND a.entity_type = 'litigation_matter' 
        AND a.is_active = true
      WHERE lh.scheduled_date > now()
        AND lh.outcome IS NULL
        AND lm.status NOT IN ('settled', 'dismissed', 'dropped', 'judgment', 'declined')
        AND (lh.scheduled_date::date - _days) >= CURRENT_DATE
        AND (lh.scheduled_date::date - _days) <= CURRENT_DATE + 1
      ON CONFLICT (reminder_type, entity_id, staff_id, days_before) DO NOTHING;
    END LOOP;
  END LOOP;
  
  SELECT COUNT(*) INTO _created FROM deadline_reminders 
    WHERE created_at > now() - interval '1 minute' AND status = 'pending';
  
  reminders_created := _created;
  errors := _errors;
  RETURN NEXT;
END;
$$;

-- ===== Triggers =====
CREATE TRIGGER trg_graduation_config_updated_at BEFORE UPDATE ON public.graduation_automation_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_webhook_endpoints_updated_at BEFORE UPDATE ON public.webhook_endpoints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lead_budgets_updated_at BEFORE UPDATE ON public.lead_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reminder_settings_updated_at BEFORE UPDATE ON public.reminder_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workflow_groups_updated_at BEFORE UPDATE ON public.workflow_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workflow_rules_updated_at BEFORE UPDATE ON public.workflow_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Row level security =====
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graduation_automation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graduation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_disclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_scoring_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_webhook_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;

-- ===== Policies =====
CREATE POLICY "Admins can update settings" ON public.reminder_settings FOR UPDATE TO authenticated USING (((company_id = public.get_user_company_id(auth.uid())) AND public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Admins manage company graduation config" ON public.graduation_automation_config TO authenticated USING (((company_id = public.get_user_company_id(auth.uid())) AND public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK (((company_id = public.get_user_company_id(auth.uid())) AND public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Domain events readable by company staff" ON public.domain_events FOR SELECT TO authenticated USING (((company_id IS NULL) OR public.can_access_company(auth.uid(), company_id)));
CREATE POLICY "Outbound webhook log readable by company staff" ON public.outbound_webhook_log FOR SELECT TO authenticated USING (((company_id IS NULL) OR public.can_access_company(auth.uid(), company_id)));
CREATE POLICY "Staff can access lead debts" ON public.lead_debts USING ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = lead_debts.lead_id) AND public.can_access_company(auth.uid(), l.company_id)))));
CREATE POLICY "Staff can access lead disclosures" ON public.lead_disclosures USING ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = lead_disclosures.lead_id) AND public.can_access_company(auth.uid(), l.company_id)))));
CREATE POLICY "Staff can delete lead budgets in their company" ON public.lead_budgets FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.leads l
     JOIN public.staff s ON ((s.company_id = l.company_id)))
  WHERE ((l.id = lead_budgets.lead_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Staff can delete lead documents in their company" ON public.lead_documents FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.leads l
     JOIN public.staff s ON ((s.company_id = l.company_id)))
  WHERE ((l.id = lead_documents.lead_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Staff can insert lead budgets in their company" ON public.lead_budgets FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.leads l
     JOIN public.staff s ON ((s.company_id = l.company_id)))
  WHERE ((l.id = lead_budgets.lead_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Staff can insert lead documents in their company" ON public.lead_documents FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.leads l
     JOIN public.staff s ON ((s.company_id = l.company_id)))
  WHERE ((l.id = lead_documents.lead_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Staff can insert logs" ON public.lead_assignment_log FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = lead_assignment_log.lead_id) AND (l.company_id = public.get_user_company_id(auth.uid()))))));
CREATE POLICY "Staff can manage assignments" ON public.assignments TO authenticated USING ((staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE public.can_access_company(auth.uid(), staff.company_id))));
CREATE POLICY "Staff can manage pools" ON public.lead_assignment_pool USING ((EXISTS ( SELECT 1
   FROM public.lead_assignment_rules r
  WHERE ((r.id = lead_assignment_pool.rule_id) AND (r.company_id = public.get_user_company_id(auth.uid()))))));
CREATE POLICY "Staff can manage queue" ON public.lead_assignment_queue USING ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = lead_assignment_queue.lead_id) AND (l.company_id = public.get_user_company_id(auth.uid()))))));
CREATE POLICY "Staff can update lead budgets in their company" ON public.lead_budgets FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.leads l
     JOIN public.staff s ON ((s.company_id = l.company_id)))
  WHERE ((l.id = lead_budgets.lead_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Staff can view lead budgets in their company" ON public.lead_budgets FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.leads l
     JOIN public.staff s ON ((s.company_id = l.company_id)))
  WHERE ((l.id = lead_budgets.lead_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Staff can view lead documents in their company" ON public.lead_documents FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.leads l
     JOIN public.staff s ON ((s.company_id = l.company_id)))
  WHERE ((l.id = lead_documents.lead_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Staff can view logs" ON public.lead_assignment_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = lead_assignment_log.lead_id) AND (l.company_id = public.get_user_company_id(auth.uid()))))));
CREATE POLICY "Staff can view pools" ON public.lead_assignment_pool FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.lead_assignment_rules r
  WHERE ((r.id = lead_assignment_pool.rule_id) AND (r.company_id = public.get_user_company_id(auth.uid()))))));
CREATE POLICY "Staff can view queue" ON public.lead_assignment_queue FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = lead_assignment_queue.lead_id) AND (l.company_id = public.get_user_company_id(auth.uid()))))));
CREATE POLICY "Staff can view relevant assignments" ON public.assignments FOR SELECT TO authenticated USING ((staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE public.can_access_company(auth.uid(), staff.company_id))));
CREATE POLICY "Staff can view workflow executions" ON public.workflow_executions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workflow_rules r
  WHERE ((r.id = workflow_executions.rule_id) AND (r.company_id = public.get_user_company_id(auth.uid()))))));
CREATE POLICY "System can insert workflow executions" ON public.workflow_executions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workflow_rules r
  WHERE ((r.id = workflow_executions.rule_id) AND (r.company_id = public.get_user_company_id(auth.uid()))))));
CREATE POLICY "Users can create workflow groups in their company" ON public.workflow_groups FOR INSERT WITH CHECK (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Users can delete company rules" ON public.lead_assignment_rules FOR DELETE USING ((company_id = public.get_user_company_id(auth.uid())));
CREATE POLICY "Users can delete company scoring profiles" ON public.lead_scoring_profiles FOR DELETE TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));
CREATE POLICY "Users can delete company workflow rules" ON public.workflow_rules FOR DELETE TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));
CREATE POLICY "Users can delete workflow groups in their company" ON public.workflow_groups FOR DELETE USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Users can insert company rules" ON public.lead_assignment_rules FOR INSERT WITH CHECK ((company_id = public.get_user_company_id(auth.uid())));
CREATE POLICY "Users can insert company scoring profiles" ON public.lead_scoring_profiles FOR INSERT TO authenticated WITH CHECK ((company_id = public.get_user_company_id(auth.uid())));
CREATE POLICY "Users can insert company settings" ON public.reminder_settings FOR INSERT TO authenticated WITH CHECK ((company_id = public.get_user_company_id(auth.uid())));
CREATE POLICY "Users can insert company workflow rules" ON public.workflow_rules FOR INSERT TO authenticated WITH CHECK ((company_id = public.get_user_company_id(auth.uid())));
CREATE POLICY "Users can update company rules" ON public.lead_assignment_rules FOR UPDATE USING ((company_id = public.get_user_company_id(auth.uid())));
CREATE POLICY "Users can update company scoring profiles" ON public.lead_scoring_profiles FOR UPDATE TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));
CREATE POLICY "Users can update company workflow rules" ON public.workflow_rules FOR UPDATE TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));
CREATE POLICY "Users can update workflow groups in their company" ON public.workflow_groups FOR UPDATE USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Users can view company rules" ON public.lead_assignment_rules FOR SELECT USING ((company_id = public.get_user_company_id(auth.uid())));
CREATE POLICY "Users can view company scoring profiles" ON public.lead_scoring_profiles FOR SELECT TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));
CREATE POLICY "Users can view company settings" ON public.reminder_settings FOR SELECT TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));
CREATE POLICY "Users can view company workflow rules" ON public.workflow_rules FOR SELECT TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));
CREATE POLICY "Users can view workflow groups in their company" ON public.workflow_groups FOR SELECT USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Users view company graduation config" ON public.graduation_automation_config FOR SELECT TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));
CREATE POLICY "Users view company graduation events" ON public.graduation_events FOR SELECT TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));
CREATE POLICY "Webhook endpoints admin delete" ON public.webhook_endpoints FOR DELETE TO authenticated USING ((public.can_access_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Webhook endpoints admin insert" ON public.webhook_endpoints FOR INSERT TO authenticated WITH CHECK ((public.can_access_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Webhook endpoints admin update" ON public.webhook_endpoints FOR UPDATE TO authenticated USING ((public.can_access_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK ((public.can_access_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Webhook endpoints readable by company staff" ON public.webhook_endpoints FOR SELECT TO authenticated USING (public.can_access_company(auth.uid(), company_id));

-- ===== leads re-adds (A5-deferred) =====
ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_scoring_profile_id_fkey FOREIGN KEY (scoring_profile_id) REFERENCES public.lead_scoring_profiles(id) ON DELETE SET NULL;
CREATE TRIGGER trg_auto_assign_lead BEFORE INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_assign_lead();
CREATE TRIGGER trg_calculate_lead_score BEFORE INSERT OR UPDATE OF estimated_debt_amount, number_of_debts, has_active_lawsuit, credit_auth_given, email, phone, source, interest_type, scoring_profile_id ON public.leads FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_lead_score();

-- ===== Grants (explicit; pg_dump --no-privileges excludes these from the schema-diff) =====
-- Mutable tables: full DML to authenticated (RLS governs row access).
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.lead_scoring_profiles, public.lead_assignment_rules, public.lead_assignment_pool,
  public.lead_assignment_queue, public.lead_budgets, public.lead_debts, public.lead_disclosures,
  public.lead_documents, public.assignments, public.reminder_settings, public.workflow_groups,
  public.workflow_rules, public.workflow_executions, public.webhook_endpoints,
  public.graduation_automation_config TO authenticated;
-- Append-mostly: insert-able log + read-only event/audit surfaces.
GRANT SELECT, INSERT ON public.lead_assignment_log TO authenticated;
GRANT SELECT ON public.domain_events, public.outbound_webhook_log, public.graduation_events TO authenticated;
GRANT ALL ON
  public.lead_scoring_profiles, public.lead_assignment_rules, public.lead_assignment_pool,
  public.lead_assignment_queue, public.lead_assignment_log, public.lead_budgets, public.lead_debts,
  public.lead_disclosures, public.lead_documents, public.assignments, public.reminder_settings,
  public.workflow_groups, public.workflow_rules, public.workflow_executions, public.domain_events,
  public.webhook_endpoints, public.outbound_webhook_log, public.graduation_automation_config,
  public.graduation_events TO service_role;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- DROP TRIGGER IF EXISTS trg_calculate_lead_score ON public.leads;
-- DROP TRIGGER IF EXISTS trg_auto_assign_lead ON public.leads;
-- ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_scoring_profile_id_fkey;
-- DROP TABLE IF EXISTS public.graduation_events CASCADE;
-- DROP TABLE IF EXISTS public.graduation_automation_config CASCADE;
-- DROP TABLE IF EXISTS public.outbound_webhook_log CASCADE;
-- DROP TABLE IF EXISTS public.webhook_endpoints CASCADE;
-- DROP TABLE IF EXISTS public.domain_events CASCADE;
-- DROP TABLE IF EXISTS public.workflow_executions CASCADE;
-- DROP TABLE IF EXISTS public.workflow_rules CASCADE;
-- DROP TABLE IF EXISTS public.workflow_groups CASCADE;
-- DROP TABLE IF EXISTS public.reminder_settings CASCADE;
-- DROP TABLE IF EXISTS public.assignments CASCADE;
-- DROP TABLE IF EXISTS public.lead_documents CASCADE;
-- DROP TABLE IF EXISTS public.lead_disclosures CASCADE;
-- DROP TABLE IF EXISTS public.lead_debts CASCADE;
-- DROP TABLE IF EXISTS public.lead_budgets CASCADE;
-- DROP TABLE IF EXISTS public.lead_assignment_log CASCADE;
-- DROP TABLE IF EXISTS public.lead_assignment_queue CASCADE;
-- DROP TABLE IF EXISTS public.lead_assignment_pool CASCADE;
-- DROP TABLE IF EXISTS public.lead_assignment_rules CASCADE;
-- DROP TABLE IF EXISTS public.lead_scoring_profiles CASCADE;
-- DROP FUNCTION IF EXISTS public.generate_deadline_reminders();
-- DROP FUNCTION IF EXISTS public.emit_domain_event(text,text,uuid,uuid,jsonb);
-- DROP FUNCTION IF EXISTS public.evaluate_workflow_conditions(jsonb,uuid,text);
-- DROP FUNCTION IF EXISTS public.check_trigger_match(jsonb,jsonb);
-- DROP FUNCTION IF EXISTS public.validate_status_transition(uuid,text,text);
-- DROP FUNCTION IF EXISTS public.process_assignment_queue();
-- DROP FUNCTION IF EXISTS public.trigger_calculate_lead_score();
-- DROP FUNCTION IF EXISTS public.trigger_auto_assign_lead();
-- DROP FUNCTION IF EXISTS public.calculate_lead_score(uuid);
-- DROP FUNCTION IF EXISTS public.assign_lead(uuid);
-- DROP TYPE IF EXISTS public.workflow_action_type;
-- DROP TYPE IF EXISTS public.workflow_execution_status;
-- DROP TYPE IF EXISTS public.workflow_trigger_type;
-- DROP TYPE IF EXISTS public.workflow_entity_type;
-- DROP TYPE IF EXISTS public.queue_status;
-- DROP TYPE IF EXISTS public.entity_type;
-- DROP TYPE IF EXISTS public.assignment_type;
-- DROP TYPE IF EXISTS public.assignment_method;
-- DROP TYPE IF EXISTS public.assignment_action;
