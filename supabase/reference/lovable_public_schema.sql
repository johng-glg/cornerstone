--
-- PostgreSQL database dump
--

\restrict rN5Dva3n9Ni1mnPh9WyS9NA8D8BbZ1JVuqItqHQHbEkqmdcrdOVAIxyKQrgivpz

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: address_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.address_type AS ENUM (
    'home',
    'work',
    'mailing',
    'other'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'attorney',
    'paralegal',
    'negotiator',
    'case_manager',
    'sales_rep',
    'client_services_rep',
    'payment_processor',
    'correspondent',
    'viewer',
    'of_counsel',
    'eligibility_reviewer'
);


--
-- Name: appearance_request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.appearance_request_status AS ENUM (
    'pending',
    'approved',
    'assigned',
    'completed',
    'cancelled'
);


--
-- Name: assignment_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assignment_action AS ENUM (
    'auto_assigned',
    'manual_assigned',
    'reassigned',
    'unassigned',
    'queue_added',
    'queue_expired'
);


--
-- Name: assignment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assignment_method AS ENUM (
    'round_robin',
    'weighted',
    'backlog_based',
    'skillset_match'
);


--
-- Name: assignment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assignment_type AS ENUM (
    'primary_attorney',
    'litigation_attorney',
    'client_services_rep',
    'case_manager',
    'negotiator',
    'sales_rep'
);


--
-- Name: bank_account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bank_account_type AS ENUM (
    'checking',
    'savings'
);


--
-- Name: billing_entry_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.billing_entry_status AS ENUM (
    'draft',
    'approved',
    'invoiced',
    'paid'
);


--
-- Name: billing_entry_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.billing_entry_type AS ENUM (
    'time',
    'expense'
);


--
-- Name: client_relationship; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.client_relationship AS ENUM (
    'primary_client',
    'co_client',
    'spouse',
    'authorized_contact',
    'other'
);


--
-- Name: client_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.client_status_enum AS ENUM (
    'active',
    'inactive'
);


--
-- Name: communication_direction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.communication_direction AS ENUM (
    'inbound',
    'outbound'
);


--
-- Name: communication_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.communication_type AS ENUM (
    'call',
    'email',
    'sms',
    'meeting',
    'note'
);


--
-- Name: company_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.company_type AS ENUM (
    'law_firm',
    'affiliate',
    'financing_company'
);


--
-- Name: company_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.company_type_enum AS ENUM (
    'law_firm',
    'debt_relief',
    'debt_settlement',
    'legal_plan',
    'hybrid',
    'other'
);


--
-- Name: contact_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.contact_status_enum AS ENUM (
    'reachable',
    'hard_to_reach',
    'unreachable',
    'no_contact_allowed'
);


--
-- Name: creditor_response_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.creditor_response_channel AS ENUM (
    'email',
    'phone',
    'letter',
    'fax',
    'portal',
    'other'
);


--
-- Name: creditor_response_direction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.creditor_response_direction AS ENUM (
    'inbound',
    'outbound'
);


--
-- Name: creditor_response_sentiment; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.creditor_response_sentiment AS ENUM (
    'positive',
    'neutral',
    'negative'
);


--
-- Name: creditor_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.creditor_type AS ENUM (
    'original_creditor',
    'collection_agency',
    'law_firm',
    'debt_buyer'
);


--
-- Name: data_visibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.data_visibility AS ENUM (
    'own_only',
    'parent_and_own',
    'full_hierarchy'
);


--
-- Name: department_new; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.department_new AS ENUM (
    'administration',
    'legal',
    'negotiations',
    'sales',
    'client_services',
    'operations',
    'eligibility'
);


--
-- Name: employment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.employment_status AS ENUM (
    'employed',
    'unemployed',
    'self_employed',
    'retired',
    'disabled'
);


--
-- Name: entity_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.entity_type AS ENUM (
    'engagement',
    'case',
    'liability',
    'lead',
    'litigation_matter'
);


--
-- Name: feature_request_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.feature_request_category AS ENUM (
    'workflow_gap',
    'missing_field',
    'ui_improvement',
    'new_feature',
    'integration',
    'reporting',
    'other'
);


--
-- Name: feature_request_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.feature_request_priority AS ENUM (
    'critical',
    'high',
    'medium',
    'low'
);


--
-- Name: feature_request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.feature_request_status AS ENUM (
    'submitted',
    'under_review',
    'planned',
    'in_progress',
    'completed',
    'declined'
);


--
-- Name: feature_request_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.feature_request_type AS ENUM (
    'existing_workflow',
    'future_improvement'
);


--
-- Name: fee_collection_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fee_collection_method AS ENUM (
    'split',
    'lump_sum'
);


--
-- Name: filing_fee_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.filing_fee_status AS ENUM (
    'pending',
    'submitted_to_client',
    'approved',
    'declined',
    'paid'
);


--
-- Name: hardship_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.hardship_reason AS ENUM (
    'job_loss',
    'medical_emergency',
    'divorce',
    'reduced_income',
    'business_failure',
    'other'
);


--
-- Name: lead_interest; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lead_interest AS ENUM (
    'debt_resolution',
    'litigation',
    'both'
);


--
-- Name: lead_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lead_source AS ENUM (
    'web_form',
    'referral',
    'phone',
    'advertisement',
    'walk_in',
    'other'
);


--
-- Name: lead_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lead_status AS ENUM (
    'new',
    'contacted',
    'qualified',
    'converted',
    'lost',
    'intake',
    'credit_review',
    'plan_selection',
    'qc_pending',
    'docs_pending',
    'eligibility_review'
);


--
-- Name: liability_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.liability_status AS ENUM (
    'enrolled',
    'in_negotiation',
    'settled',
    'in_litigation',
    'dismissed',
    'cancelled'
);


--
-- Name: liability_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.liability_type AS ENUM (
    'credit_card',
    'medical',
    'auto_loan',
    'personal_loan',
    'student_loan',
    'mortgage',
    'other'
);


--
-- Name: litigation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.litigation_status AS ENUM (
    'new',
    'pre_response',
    'post_response',
    'settled',
    'dropped',
    'judgment',
    'declined',
    'dismissed'
);


--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_type AS ENUM (
    'task_assigned',
    'task_due_soon',
    'task_overdue',
    'lead_assigned',
    'matter_assigned',
    'hearing_reminder',
    'settlement_update',
    'mention',
    'system_alert',
    'response_deadline_reminder'
);


--
-- Name: payment_frequency_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_frequency_enum AS ENUM (
    'monthly',
    'semi_monthly',
    'bi_weekly'
);


--
-- Name: payment_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status_enum AS ENUM (
    'current',
    'paused',
    'nsf',
    'past_due',
    'suspended'
);


--
-- Name: payment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_type AS ENUM (
    'lump_sum',
    'payment_plan'
);


--
-- Name: phone_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.phone_type AS ENUM (
    'mobile',
    'home',
    'work',
    'fax',
    'other'
);


--
-- Name: plan_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.plan_type AS ENUM (
    'glg_standard',
    'glg_adjustable',
    'glg_exception'
);


--
-- Name: queue_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.queue_status AS ENUM (
    'pending',
    'assigned',
    'expired',
    'manual'
);


--
-- Name: reminder_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reminder_status AS ENUM (
    'pending',
    'sent',
    'failed',
    'skipped'
);


--
-- Name: reminder_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reminder_type AS ENUM (
    'response_deadline',
    'hearing',
    'task_due'
);


--
-- Name: retention_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.retention_type_enum AS ENUM (
    'client_requested_cancel',
    'company_initiated_cancel',
    'at_risk',
    'churn_risk',
    'complaint'
);


--
-- Name: schedule_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.schedule_status_enum AS ENUM (
    'active',
    'paused',
    'completed',
    'cancelled'
);


--
-- Name: screen_pop_preference_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.screen_pop_preference_enum AS ENUM (
    'toast',
    'auto_navigate',
    'off'
);


--
-- Name: service_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_status AS ENUM (
    'prospect',
    'active',
    'suspended',
    'closed',
    'pending',
    'graduated',
    'dropped',
    'cancelled'
);


--
-- Name: service_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.service_type AS ENUM (
    'debt_resolution',
    'consumer_defense'
);


--
-- Name: settlement_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.settlement_status AS ENUM (
    'offered',
    'accepted',
    'rejected',
    'completed',
    'defaulted',
    'cancelled'
);


--
-- Name: signature_request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.signature_request_status AS ENUM (
    'draft',
    'queued',
    'sent',
    'viewed',
    'partially_signed',
    'completed',
    'declined',
    'expired',
    'canceled',
    'error'
);


--
-- Name: signer_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.signer_status AS ENUM (
    'pending',
    'sent',
    'viewed',
    'signed',
    'declined'
);


--
-- Name: task_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


--
-- Name: task_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'cancelled'
);


--
-- Name: task_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_type AS ENUM (
    'follow_up',
    'document_review',
    'court_deadline',
    'settlement_negotiation',
    'client_call',
    'general'
);


--
-- Name: template_language; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.template_language AS ENUM (
    'en',
    'es'
);


--
-- Name: template_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.template_type AS ENUM (
    'email',
    'sms',
    'document'
);


--
-- Name: transaction_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_status AS ENUM (
    'open',
    'pending',
    'cleared',
    'cancelled'
);


--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type AS ENUM (
    'draft',
    'processor_fee',
    'settlement_payment',
    'contingency_fee',
    'loan_disbursement',
    'loan_settlement_payment',
    'loan_fee_collection'
);


--
-- Name: workflow_action_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.workflow_action_type AS ENUM (
    'create_task',
    'send_notification',
    'update_field',
    'block_transition',
    'trigger_webhook',
    'auto_graduate'
);


--
-- Name: workflow_entity_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.workflow_entity_type AS ENUM (
    'leads',
    'client_services',
    'liabilities',
    'litigation_matters',
    'tasks',
    'settlements'
);


--
-- Name: workflow_execution_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.workflow_execution_status AS ENUM (
    'success',
    'blocked',
    'failed',
    'skipped'
);


--
-- Name: workflow_trigger_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.workflow_trigger_type AS ENUM (
    'status_changed',
    'field_updated',
    'record_created',
    'time_based',
    'manual'
);


--
-- Name: assign_lead(uuid, public.assignment_method, uuid); Type: FUNCTION; Schema: public; Owner: -
--

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
  -- Get lead details
  SELECT * INTO _lead FROM leads WHERE id = _lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;
  
  -- Manual assignment override
  IF _force_staff_id IS NOT NULL THEN
    UPDATE leads SET assigned_to = _force_staff_id WHERE id = _lead_id;
    
    INSERT INTO lead_assignment_log (lead_id, action, from_staff_id, to_staff_id, reason)
    VALUES (_lead_id, 'manual_assigned', _lead.assigned_to, _force_staff_id, 'Manual assignment');
    
    -- Create notification for assigned staff
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
  
  -- Find matching rule (highest priority first)
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
  
  -- Execute assignment based on method
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
  
  -- Update lead and pool if assignment successful
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
    
    -- Create notification for assigned staff
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
    
    -- Add to queue
    INSERT INTO lead_assignment_queue (lead_id, rule_id, priority)
    VALUES (_lead_id, _rule.id, COALESCE(_lead.lead_score, 0));
    
    INSERT INTO lead_assignment_log (lead_id, action, rule_id, reason)
    VALUES (_lead_id, 'queue_added', _rule.id, _reason);
  END IF;
  
  RETURN QUERY SELECT _staff_id, _method, _reason;
END;
$$;


--
-- Name: audit_company_type_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_company_type_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.company_type IS DISTINCT FROM OLD.company_type THEN
    PERFORM public.log_audit_event(
      'company.type_changed',
      'companies',
      NEW.id,
      NEW.id,
      jsonb_build_object('from', OLD.company_type::text, 'to', NEW.company_type::text),
      NULL, NULL, NULL
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: audit_trigger_fn(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_trigger_fn() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _row jsonb;
  _old jsonb;
  _new jsonb;
  _entity_id uuid;
  _company_id uuid;
  _payload jsonb;
  _action text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _row := to_jsonb(OLD); _old := _row; _new := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    _row := to_jsonb(NEW); _old := NULL; _new := _row;
  ELSE
    _row := to_jsonb(NEW); _old := to_jsonb(OLD); _new := _row;
  END IF;

  BEGIN _entity_id := (_row ->> 'id')::uuid;
  EXCEPTION WHEN OTHERS THEN _entity_id := NULL; END;

  BEGIN _company_id := COALESCE(
      (_row ->> 'company_id')::uuid,
      (_row ->> 'owning_company_id')::uuid,
      (_row ->> 'originating_company_id')::uuid);
  EXCEPTION WHEN OTHERS THEN _company_id := NULL; END;

  _action := TG_TABLE_NAME || '.' || lower(TG_OP);
  _payload := jsonb_build_object('op', TG_OP, 'table', TG_TABLE_NAME, 'old', _old, 'new', _new);

  PERFORM public.log_audit_event(_action, TG_TABLE_NAME, _entity_id, _company_id, _payload, NULL, NULL, NULL);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;


--
-- Name: calc_creditor_response_time(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calc_creditor_response_time() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


SET default_tablespace = '';

SET default_table_access_method = heap;

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
-- Name: calculate_lead_score(public.leads); Type: FUNCTION; Schema: public; Owner: -
--

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
  -- Get scoring profile (explicit assignment > source-specific > interest-specific > default)
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
  
  -- If no profile found, return 0
  IF _profile IS NULL THEN
    RETURN QUERY SELECT 0, '{}'::jsonb;
    RETURN;
  END IF;
  
  _criteria := _profile.criteria;
  
  -- Estimated Debt scoring
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
  
  -- Number of Debts scoring
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
  
  -- Has Active Lawsuit scoring
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
  
  -- Credit Auth scoring
  IF lead_row.credit_auth_given = true AND _criteria ? 'credit_auth_given' THEN
    _points := (_criteria->'credit_auth_given'->>'points')::integer;
    _total_score := _total_score + _points;
    _breakdown := _breakdown || jsonb_build_object('credit_auth_given', _points);
  END IF;
  
  -- Email provided scoring
  IF lead_row.email IS NOT NULL AND _criteria ? 'email_provided' THEN
    _points := (_criteria->'email_provided'->>'points')::integer;
    _total_score := _total_score + _points;
    _breakdown := _breakdown || jsonb_build_object('email_provided', _points);
  END IF;
  
  -- Phone provided scoring
  IF lead_row.phone IS NOT NULL AND _criteria ? 'phone_provided' THEN
    _points := (_criteria->'phone_provided'->>'points')::integer;
    _total_score := _total_score + _points;
    _breakdown := _breakdown || jsonb_build_object('phone_provided', _points);
  END IF;
  
  -- Source quality scoring
  IF _criteria ? 'source_quality' AND _criteria->'source_quality' ? lead_row.source::text THEN
    _points := (_criteria->'source_quality'->>lead_row.source::text)::integer;
    _total_score := _total_score + _points;
    _breakdown := _breakdown || jsonb_build_object('source_quality', _points);
  END IF;
  
  RETURN QUERY SELECT _total_score, _breakdown;
END;
$$;


--
-- Name: can_access_company(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_access_company(_user_id uuid, _company_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = _user_id 
    AND (
      s.company_id = _company_id
      -- Staff in parent can access child
      OR EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = _company_id
        AND c.parent_company_id = s.company_id
      )
      -- Staff in child can access parent
      OR EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = s.company_id
        AND c.parent_company_id = _company_id
      )
    )
  )
$$;


--
-- Name: can_access_storage_object(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_access_storage_object(_bucket text, _first_folder text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _entity_id uuid;
  _company_id uuid;
BEGIN
  IF _first_folder IS NULL OR _first_folder = '' THEN RETURN false; END IF;
  BEGIN
    _entity_id := _first_folder::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  -- Per-entity resolution
  IF _bucket = 'lead-documents' THEN
    SELECT company_id INTO _company_id FROM public.leads WHERE id = _entity_id;
  ELSIF _bucket = 'client-documents' THEN
    SELECT company_id INTO _company_id FROM public.clients WHERE id = _entity_id;
  ELSIF _bucket = 'litigation-documents' THEN
    SELECT cs.owning_company_id INTO _company_id
    FROM public.litigation_matters m
    JOIN public.client_services cs ON cs.id = m.client_service_id
    WHERE m.id = _entity_id;
  END IF;

  IF _company_id IS NOT NULL AND public.can_access_company(auth.uid(), _company_id) THEN
    RETURN true;
  END IF;

  -- Fallback: treat first folder as a company id directly (used by wizards/scratch uploads)
  IF EXISTS (SELECT 1 FROM public.companies WHERE id = _entity_id) THEN
    RETURN public.can_access_company(auth.uid(), _entity_id);
  END IF;

  RETURN false;
END;
$$;


--
-- Name: can_view_leads(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_view_leads(_user_id uuid, _company_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: check_trigger_match(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_trigger_match(_trigger_config jsonb, _trigger_data jsonb) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  _from_statuses TEXT[];
  _to_statuses TEXT[];
BEGIN
  -- For status_changed triggers
  IF _trigger_data ? 'from' AND _trigger_data ? 'to' THEN
    -- Check 'from' filter (if specified)
    IF _trigger_config ? 'from' AND jsonb_array_length(_trigger_config->'from') > 0 THEN
      SELECT array_agg(value::text) INTO _from_statuses 
      FROM jsonb_array_elements_text(_trigger_config->'from');
      
      IF NOT (_trigger_data->>'from' = ANY(_from_statuses)) THEN
        RETURN false;
      END IF;
    END IF;
    
    -- Check 'to' filter (if specified)
    IF _trigger_config ? 'to' AND jsonb_array_length(_trigger_config->'to') > 0 THEN
      SELECT array_agg(value::text) INTO _to_statuses 
      FROM jsonb_array_elements_text(_trigger_config->'to');
      
      IF NOT (_trigger_data->>'to' = ANY(_to_statuses)) THEN
        RETURN false;
      END IF;
    END IF;
  END IF;
  
  -- For field_updated triggers
  IF _trigger_config ? 'field' AND _trigger_data ? 'field' THEN
    IF _trigger_config->>'field' != _trigger_data->>'field' THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$;


--
-- Name: create_notification(uuid, public.notification_type, text, text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_notification(_user_id uuid, _type public.notification_type, _title text, _message text DEFAULT NULL::text, _link text DEFAULT NULL::text, _entity_type text DEFAULT NULL::text, _entity_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _notification_id UUID;
  _in_app_enabled BOOLEAN;
BEGIN
  -- Check if user has in-app notifications enabled for this type
  SELECT COALESCE(in_app_enabled, true) INTO _in_app_enabled
  FROM notification_preferences
  WHERE user_id = _user_id AND notification_type = _type;
  
  -- Default to true if no preference exists
  _in_app_enabled := COALESCE(_in_app_enabled, true);
  
  IF _in_app_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link, entity_type, entity_id)
    VALUES (_user_id, _type, _title, _message, _link, _entity_type, _entity_id)
    RETURNING id INTO _notification_id;
  END IF;
  
  RETURN _notification_id;
END;
$$;


--
-- Name: decrypt_client_ssn(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrypt_client_ssn(_client_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
  RETURN pgp_sym_decrypt(_ct, _key);
END;
$$;


--
-- Name: decrypt_lead_banking(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrypt_lead_banking(_lead_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
    'account_number', CASE WHEN _acct IS NULL THEN NULL ELSE pgp_sym_decrypt(_acct, _key) END,
    'routing_number', CASE WHEN _rout IS NULL THEN NULL ELSE pgp_sym_decrypt(_rout, _key) END);
END;
$$;


--
-- Name: delete_email(text, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_email(queue_name text, message_id bigint) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;


--
-- Name: emit_domain_event(text, text, uuid, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

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


--
-- Name: encrypt_pii(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.encrypt_pii(_plaintext text) RETURNS bytea
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions', 'vault'
    AS $$
DECLARE
  _key text;
BEGIN
  IF _plaintext IS NULL OR length(_plaintext) = 0 THEN
    RETURN NULL;
  END IF;
  SELECT decrypted_secret INTO _key
    FROM vault.decrypted_secrets
    WHERE name = 'pii_encryption_key'
    LIMIT 1;
  IF _key IS NULL THEN
    RAISE EXCEPTION 'PII encryption key not configured in vault';
  END IF;
  RETURN extensions.pgp_sym_encrypt(_plaintext, _key);
END;
$$;


--
-- Name: enqueue_email(text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enqueue_email(queue_name text, payload jsonb) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;


--
-- Name: evaluate_workflow_conditions(jsonb, public.workflow_entity_type, uuid); Type: FUNCTION; Schema: public; Owner: -
--

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
  -- Empty conditions = always true
  IF jsonb_array_length(_conditions) = 0 THEN
    RETURN true;
  END IF;
  
  -- Evaluate each condition group (OR logic between groups)
  FOR _condition_group IN SELECT * FROM jsonb_array_elements(_conditions)
  LOOP
    _group_result := true;
    
    -- Evaluate each condition in the group (AND logic within group)
    FOR _condition IN SELECT * FROM jsonb_array_elements(_condition_group->'rules')
    LOOP
      _operator := _condition->>'operator';
      _comparison_value := _condition->>'value';
      
      -- Handle related entity conditions
      IF _condition ? 'related_entity' THEN
        -- Get counts based on entity type
        IF _entity_type = 'client_services' AND (_condition->>'related_entity') = 'liabilities' THEN
          -- Count liabilities for this service
          SELECT COUNT(*) INTO _related_count
          FROM liabilities
          WHERE client_service_id = _entity_id;
          
          -- Count matching liabilities
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
        -- Handle direct field conditions
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
            -- Unknown operator, skip
            NULL;
        END CASE;
      END IF;
      
      -- Exit early if condition failed
      IF NOT _group_result THEN
        EXIT;
      END IF;
    END LOOP;
    
    -- If any group passes, return true (OR logic)
    IF _group_result THEN
      RETURN true;
    END IF;
  END LOOP;
  
  -- No groups passed
  RETURN false;
END;
$_$;


--
-- Name: generate_deadline_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

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
  -- Process each company's settings
  FOR _settings IN SELECT * FROM reminder_settings WHERE is_active = true
  LOOP
    -- Response Deadlines
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
    
    -- Hearings
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


--
-- Name: generate_lead_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_lead_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.lead_number := 'LEAD-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(nextval('lead_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$;


--
-- Name: generate_service_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_service_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.service_number := 'SVC-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(nextval('engagement_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$;


--
-- Name: get_company_terminology(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_company_terminology(_company_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _company_type TEXT;
  _preset_key   TEXT;
  _label_map    JSONB;
  _override     JSONB;
BEGIN
  SELECT company_type::text INTO _company_type
    FROM public.companies WHERE id = _company_id;
  IF _company_type IS NULL THEN
    _company_type := 'law_firm';
  END IF;

  -- Per-tenant override of preset key
  SELECT value->>'preset_key' INTO _preset_key
    FROM public.tenant_feature_flags
    WHERE company_id = _company_id AND flag_key = 'terminology.preset_key';
  IF _preset_key IS NULL THEN
    _preset_key := _company_type;
  END IF;

  SELECT label_map INTO _label_map
    FROM public.terminology_presets WHERE preset_key = _preset_key;
  IF _label_map IS NULL THEN
    SELECT label_map INTO _label_map
      FROM public.terminology_presets WHERE preset_key = 'law_firm';
  END IF;

  -- Per-tenant label overrides via terminology.overrides flag value
  SELECT value->'labels' INTO _override
    FROM public.tenant_feature_flags
    WHERE company_id = _company_id AND flag_key = 'terminology.overrides';
  IF _override IS NOT NULL AND jsonb_typeof(_override) = 'object' THEN
    _label_map := _label_map || _override;
  END IF;

  RETURN _label_map;
END;
$$;


--
-- Name: get_user_company_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_company_id(_user_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT company_id FROM public.staff WHERE user_id = _user_id LIMIT 1
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_feature_enabled(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_feature_enabled(_company_id uuid, _flag_key text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _enabled boolean;
  _default boolean;
BEGIN
  SELECT enabled INTO _enabled
  FROM public.tenant_feature_flags
  WHERE company_id = _company_id AND flag_key = _flag_key;

  IF FOUND THEN
    RETURN _enabled;
  END IF;

  -- Registry of built-in defaults (keep in sync with frontend FEATURE_FLAG_REGISTRY)
  _default := CASE _flag_key
    WHEN 'leads.paralegal_visibility' THEN false
    WHEN 'leads.show_in_navigation'  THEN true
    ELSE false
  END;

  RETURN COALESCE(_default, false);
END;
$$;


--
-- Name: log_audit_event(text, text, uuid, uuid, jsonb, jsonb, inet, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_audit_event(_action text, _entity_type text DEFAULT NULL::text, _entity_id uuid DEFAULT NULL::uuid, _company_id uuid DEFAULT NULL::uuid, _request_payload jsonb DEFAULT NULL::jsonb, _response_payload jsonb DEFAULT NULL::jsonb, _ip_address inet DEFAULT NULL::inet, _user_agent text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _id UUID;
  _actor UUID := auth.uid();
  _actor_role TEXT;
  _company UUID := _company_id;
BEGIN
  -- Best-effort actor role lookup (first matching role).
  IF _actor IS NOT NULL THEN
    SELECT role::text INTO _actor_role
    FROM public.user_roles
    WHERE user_id = _actor
    LIMIT 1;
  END IF;

  -- If caller didn't pass a company, fall back to actor's primary company.
  IF _company IS NULL AND _actor IS NOT NULL THEN
    _company := public.get_user_company_id(_actor);
  END IF;

  INSERT INTO public.system_audit_log (
    actor_user_id, actor_role, company_id, action,
    entity_type, entity_id, request_payload, response_payload,
    ip_address, user_agent
  ) VALUES (
    _actor, _actor_role, _company, _action,
    _entity_type, _entity_id, _request_payload, _response_payload,
    _ip_address, _user_agent
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;


--
-- Name: move_to_dlq(text, text, bigint, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;


--
-- Name: notify_matter_assignment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_matter_assignment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _user_id UUID;
  _case_number TEXT;
BEGIN
  IF NEW.entity_type = 'litigation_matter' AND NEW.is_active = true THEN
    SELECT user_id INTO _user_id FROM staff WHERE id = NEW.staff_id;
    SELECT case_number INTO _case_number FROM litigation_matters WHERE id = NEW.entity_id;
    
    IF _user_id IS NOT NULL THEN
      PERFORM create_notification(
        _user_id,
        'matter_assigned',
        'You have been assigned to litigation matter ' || COALESCE(_case_number, 'N/A'),
        '/litigation?open=' || NEW.entity_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notify_note_mention(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_note_mention() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _user_id UUID;
  _author_name TEXT;
  _entity_type TEXT;
  _note_content TEXT;
BEGIN
  -- Get mentioned user's user_id
  SELECT user_id INTO _user_id
  FROM staff WHERE id = NEW.mentioned_staff_id;

  -- Get author name and note info
  SELECT 
    s.first_name || ' ' || s.last_name,
    n.entity_type,
    LEFT(n.content, 100)
  INTO _author_name, _entity_type, _note_content
  FROM notes n
  JOIN staff s ON s.id = n.created_by
  WHERE n.id = NEW.note_id;

  IF _user_id IS NOT NULL THEN
    PERFORM create_notification(
      _user_id,
      'mention',
      'You were mentioned in a note',
      format('%s mentioned you: %s', _author_name, _note_content),
      NULL,
      _entity_type,
      NEW.note_id
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: notify_task_assignment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_task_assignment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _assignee_user_id UUID;
BEGIN
  -- Only notify on new assignment or reassignment
  IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
    
    -- Get the user_id from staff table
    SELECT user_id INTO _assignee_user_id
    FROM staff WHERE id = NEW.assigned_to;
    
    IF _assignee_user_id IS NOT NULL THEN
      PERFORM create_notification(
        _assignee_user_id,
        'task_assigned',
        'New Task Assigned',
        NEW.title,
        '/tasks',
        'task',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: process_assignment_queue(); Type: FUNCTION; Schema: public; Owner: -
--

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


--
-- Name: read_email_batch(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer) RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;


--
-- Name: resolve_entity_company_id(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_entity_company_id(_entity_type text, _entity_id uuid) RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE _co uuid;
BEGIN
  IF _entity_type IS NULL OR _entity_id IS NULL THEN
    RETURN NULL;
  END IF;
  CASE _entity_type
    WHEN 'client' THEN
      SELECT company_id INTO _co FROM public.clients WHERE id = _entity_id;
    WHEN 'lead' THEN
      SELECT company_id INTO _co FROM public.leads WHERE id = _entity_id;
    WHEN 'client_service' THEN
      SELECT owning_company_id INTO _co FROM public.client_services WHERE id = _entity_id;
    WHEN 'litigation_matter' THEN
      SELECT cs.owning_company_id INTO _co
      FROM public.litigation_matters m
      JOIN public.client_services cs ON cs.id = m.client_service_id
      WHERE m.id = _entity_id;
    WHEN 'liability' THEN
      SELECT cs.owning_company_id INTO _co
      FROM public.liabilities l
      JOIN public.client_services cs ON cs.id = l.client_service_id
      WHERE l.id = _entity_id;
    WHEN 'transaction' THEN
      SELECT cs.owning_company_id INTO _co
      FROM public.transactions t
      JOIN public.client_services cs ON cs.id = t.client_service_id
      WHERE t.id = _entity_id;
    WHEN 'task' THEN
      SELECT company_id INTO _co FROM public.tasks WHERE id = _entity_id;
    ELSE
      _co := NULL;
  END CASE;
  RETURN _co;
END
$$;


--
-- Name: track_lead_status_transition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_lead_status_transition() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: trigger_auto_assign_lead(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_auto_assign_lead() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _rule lead_assignment_rules;
  _result RECORD;
BEGIN
  -- Only auto-assign if no assignment
  IF NEW.assigned_to IS NULL THEN
    -- Check if there's an active auto-assign rule
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


--
-- Name: trigger_calculate_lead_score(); Type: FUNCTION; Schema: public; Owner: -
--

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


--
-- Name: update_client_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_client_status() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_status_transition(public.workflow_entity_type, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

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
  -- Get company_id based on entity type
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
      -- Default: try to get from entity directly
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
  
  -- Find blocking rules that match
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
    
    -- Check if trigger matches
    IF NOT check_trigger_match(_rule.trigger_config, _trigger_data) THEN
      CONTINUE;
    END IF;
    
    -- Evaluate conditions
    _conditions_met := evaluate_workflow_conditions(
      _rule.conditions,
      _entity_type,
      _entity_id
    );
    
    _duration := EXTRACT(MILLISECONDS FROM clock_timestamp() - _start_time)::INTEGER;
    
    -- If conditions are met for a blocking rule, block the transition
    IF _conditions_met THEN
      -- Log the blocked execution
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
  
  -- No blocking rules triggered
  allowed := true;
  block_message := null;
  rule_name := null;
  RETURN NEXT;
END;
$_$;


--
-- Name: appearance_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appearance_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    matter_id uuid NOT NULL,
    hearing_id uuid,
    requested_date date DEFAULT CURRENT_DATE NOT NULL,
    appearance_date date NOT NULL,
    court_name text,
    description text NOT NULL,
    status public.appearance_request_status DEFAULT 'pending'::public.appearance_request_status NOT NULL,
    assigned_to uuid,
    requested_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assignments; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: billing_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    client_id uuid,
    client_service_id uuid,
    litigation_matter_id uuid,
    entry_type public.billing_entry_type NOT NULL,
    description text NOT NULL,
    billing_date date DEFAULT CURRENT_DATE NOT NULL,
    duration_minutes integer,
    hourly_rate numeric(10,2),
    expense_amount numeric(10,2),
    total_amount numeric(10,2) NOT NULL,
    is_billable boolean DEFAULT true NOT NULL,
    status public.billing_entry_status DEFAULT 'draft'::public.billing_entry_status NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT valid_expense_entry CHECK (((entry_type <> 'expense'::public.billing_entry_type) OR ((expense_amount IS NOT NULL) AND (expense_amount > (0)::numeric)))),
    CONSTRAINT valid_time_entry CHECK (((entry_type <> 'time'::public.billing_entry_type) OR ((duration_minutes IS NOT NULL) AND (duration_minutes > 0))))
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
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    company_type public.company_type DEFAULT 'law_firm'::public.company_type NOT NULL,
    parent_company_id uuid,
    data_visibility public.data_visibility DEFAULT 'own_only'::public.data_visibility NOT NULL,
    address_line1 text,
    address_line2 text,
    city text,
    state text,
    zip_code text,
    phone text,
    email text,
    website text,
    is_active boolean DEFAULT true NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


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
-- Name: deadline_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deadline_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reminder_type public.reminder_type NOT NULL,
    entity_id uuid NOT NULL,
    deadline_date timestamp with time zone NOT NULL,
    staff_id uuid,
    days_before integer NOT NULL,
    scheduled_for timestamp with time zone NOT NULL,
    status public.reminder_status DEFAULT 'pending'::public.reminder_status NOT NULL,
    sent_at timestamp with time zone,
    notification_id uuid,
    error_message text,
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
-- Name: docuseal_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.docuseal_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    docuseal_template_id integer NOT NULL,
    description text,
    signer_roles jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: domain_events; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: eligibility_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.eligibility_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    submitted_by uuid,
    reviewed_by uuid,
    submitted_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    review_notes text,
    decline_reason text,
    flags jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    checklist jsonb DEFAULT '[{"step": "agreement_sent", "completed": false, "completed_at": null, "completed_by": null}, {"step": "agreement_signed", "completed": false, "completed_at": null, "completed_by": null}, {"step": "paperwork_received", "completed": false, "completed_at": null, "completed_by": null}, {"step": "documents_verified", "completed": false, "completed_at": null, "completed_by": null}]'::jsonb
);


--
-- Name: email_send_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_send_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id text,
    template_name text NOT NULL,
    recipient_email text NOT NULL,
    status text NOT NULL,
    error_message text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_send_log_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'suppressed'::text, 'failed'::text, 'bounced'::text, 'complained'::text, 'dlq'::text])))
);


--
-- Name: email_send_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_send_state (
    id integer DEFAULT 1 NOT NULL,
    retry_after_until timestamp with time zone,
    batch_size integer DEFAULT 10 NOT NULL,
    send_delay_ms integer DEFAULT 200 NOT NULL,
    auth_email_ttl_minutes integer DEFAULT 15 NOT NULL,
    transactional_email_ttl_minutes integer DEFAULT 60 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_send_state_id_check CHECK ((id = 1))
);


--
-- Name: email_unsubscribe_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_unsubscribe_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    used_at timestamp with time zone
);


--
-- Name: engagement_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.engagement_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


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
-- Name: feature_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category public.feature_request_category DEFAULT 'other'::public.feature_request_category NOT NULL,
    request_type public.feature_request_type DEFAULT 'future_improvement'::public.feature_request_type NOT NULL,
    priority public.feature_request_priority DEFAULT 'medium'::public.feature_request_priority NOT NULL,
    status public.feature_request_status DEFAULT 'submitted'::public.feature_request_status NOT NULL,
    submitted_by uuid,
    staff_name text,
    department text,
    affected_module text,
    admin_notes text,
    votes integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: filing_fees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.filing_fees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    matter_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text NOT NULL,
    status public.filing_fee_status DEFAULT 'pending'::public.filing_fee_status NOT NULL,
    requested_date date DEFAULT CURRENT_DATE NOT NULL,
    approved_date date,
    paid_date date,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: graduation_automation_config; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: graduation_events; Type: TABLE; Schema: public; Owner: -
--

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
-- Name: job_titles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_titles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role public.app_role NOT NULL,
    title text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: law_firm_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.law_firm_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    law_firm_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    title text,
    email text,
    phone text,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: law_firms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.law_firms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
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
-- Name: lead_assignment_log; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: lead_assignment_pool; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: lead_assignment_queue; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: lead_assignment_rules; Type: TABLE; Schema: public; Owner: -
--

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
-- Name: lead_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    category text NOT NULL,
    label text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lead_debts; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: lead_disclosures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_disclosures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    disclosure_type text NOT NULL,
    acknowledged_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lead_documents; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: lead_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lead_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    job_title text,
    is_active boolean DEFAULT true NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone,
    department public.department_new NOT NULL,
    hourly_rate numeric(10,2) DEFAULT 350.00,
    dialpad_user_id bigint,
    screen_pop_preference public.screen_pop_preference_enum DEFAULT 'toast'::public.screen_pop_preference_enum NOT NULL
);


--
-- Name: COLUMN staff.last_login_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.staff.last_login_at IS 'Timestamp of when the staff member last logged in';


--
-- Name: COLUMN staff.hourly_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.staff.hourly_rate IS 'Default hourly billing rate for this staff member';


--
-- Name: lead_rep_metrics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.lead_rep_metrics WITH (security_invoker='true') AS
 SELECT l.assigned_to AS staff_id,
    s.first_name,
    s.last_name,
    s.avatar_url,
    count(*) AS total_assigned,
    count(
        CASE
            WHEN (l.contacted_at IS NOT NULL) THEN 1
            ELSE NULL::integer
        END) AS contacted_count,
    count(
        CASE
            WHEN (l.credit_auth_given = true) THEN 1
            ELSE NULL::integer
        END) AS credit_pull_count,
    count(
        CASE
            WHEN (l.qualified_at IS NOT NULL) THEN 1
            ELSE NULL::integer
        END) AS qualified_count,
    count(
        CASE
            WHEN (l.status = 'converted'::public.lead_status) THEN 1
            ELSE NULL::integer
        END) AS converted_count,
    count(
        CASE
            WHEN (l.status = 'lost'::public.lead_status) THEN 1
            ELSE NULL::integer
        END) AS lost_count,
    round(((count(
        CASE
            WHEN (l.contacted_at IS NOT NULL) THEN 1
            ELSE NULL::integer
        END))::numeric / (NULLIF(count(*), 0))::numeric), 4) AS contact_ratio,
    round(((count(
        CASE
            WHEN (l.status = 'converted'::public.lead_status) THEN 1
            ELSE NULL::integer
        END))::numeric / (NULLIF(count(*), 0))::numeric), 4) AS conversion_ratio,
    round(avg((EXTRACT(epoch FROM (l.contacted_at - l.created_at)) / (3600)::numeric)), 2) AS avg_hours_to_contact,
    round(avg((EXTRACT(epoch FROM (l.converted_at - l.created_at)) / (86400)::numeric)), 2) AS avg_days_to_convert
   FROM (public.leads l
     LEFT JOIN public.staff s ON ((l.assigned_to = s.id)))
  WHERE (l.assigned_to IS NOT NULL)
  GROUP BY l.assigned_to, s.first_name, s.last_name, s.avatar_url;


--
-- Name: lead_scoring_profiles; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: lead_source_metrics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.lead_source_metrics WITH (security_invoker='true') AS
 SELECT source,
    count(*) AS total_leads,
    count(
        CASE
            WHEN (contacted_at IS NOT NULL) THEN 1
            ELSE NULL::integer
        END) AS contacted_count,
    count(
        CASE
            WHEN (credit_auth_given = true) THEN 1
            ELSE NULL::integer
        END) AS credit_pull_count,
    count(
        CASE
            WHEN (qualified_at IS NOT NULL) THEN 1
            ELSE NULL::integer
        END) AS qualified_count,
    count(
        CASE
            WHEN (status = 'converted'::public.lead_status) THEN 1
            ELSE NULL::integer
        END) AS converted_count,
    count(
        CASE
            WHEN (status = 'lost'::public.lead_status) THEN 1
            ELSE NULL::integer
        END) AS lost_count,
    round(((count(
        CASE
            WHEN (contacted_at IS NOT NULL) THEN 1
            ELSE NULL::integer
        END))::numeric / (NULLIF(count(*), 0))::numeric), 4) AS contact_ratio,
    round(((count(
        CASE
            WHEN (credit_auth_given = true) THEN 1
            ELSE NULL::integer
        END))::numeric / (NULLIF(count(*), 0))::numeric), 4) AS credit_pull_ratio,
    round(((count(
        CASE
            WHEN (qualified_at IS NOT NULL) THEN 1
            ELSE NULL::integer
        END))::numeric / (NULLIF(count(
        CASE
            WHEN (contacted_at IS NOT NULL) THEN 1
            ELSE NULL::integer
        END), 0))::numeric), 4) AS qualification_ratio,
    round(((count(
        CASE
            WHEN (status = 'converted'::public.lead_status) THEN 1
            ELSE NULL::integer
        END))::numeric / (NULLIF(count(*), 0))::numeric), 4) AS conversion_ratio
   FROM public.leads
  GROUP BY source;


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
-- Name: litigation_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.litigation_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    matter_id uuid NOT NULL,
    activity_type text NOT NULL,
    description text NOT NULL,
    outcome text,
    activity_date timestamp with time zone,
    staff_id uuid,
    document_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: litigation_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.litigation_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    matter_id uuid NOT NULL,
    document_type text NOT NULL,
    title text NOT NULL,
    file_url text,
    filed_date date,
    deadline_date date,
    notes text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: litigation_hearings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.litigation_hearings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    matter_id uuid NOT NULL,
    hearing_type text NOT NULL,
    scheduled_date timestamp with time zone NOT NULL,
    location text,
    judge_name text,
    outcome text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    end_date timestamp with time zone
);


--
-- Name: litigation_matters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.litigation_matters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    liability_id uuid NOT NULL,
    client_service_id uuid NOT NULL,
    case_number text,
    court_name text,
    county text,
    state text,
    opposing_party text,
    opposing_counsel text,
    status public.litigation_status DEFAULT 'new'::public.litigation_status NOT NULL,
    service_date date,
    response_deadline date,
    next_hearing_date timestamp with time zone,
    judgment_amount numeric,
    settlement_amount numeric,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    opposing_law_firm_id uuid,
    opposing_counsel_id uuid,
    opposing_creditor_id uuid,
    opposing_contact_id uuid
);


--
-- Name: litigation_team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.litigation_team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: litigation_teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.litigation_teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    color text DEFAULT 'gray'::text,
    is_active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: note_mentions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.note_mentions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    note_id uuid NOT NULL,
    mentioned_staff_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    content text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    notification_type public.notification_type NOT NULL,
    in_app_enabled boolean DEFAULT true NOT NULL,
    email_enabled boolean DEFAULT false NOT NULL,
    sound_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type public.notification_type NOT NULL,
    title text NOT NULL,
    message text,
    link text,
    entity_type text,
    entity_id uuid,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
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
-- Name: outbound_webhook_log; Type: TABLE; Schema: public; Owner: -
--

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
-- Name: reminder_settings; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: report_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    created_by uuid,
    name text NOT NULL,
    description text,
    module text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_preset boolean DEFAULT false NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role public.app_role NOT NULL,
    module text NOT NULL,
    can_read boolean DEFAULT false NOT NULL,
    can_create boolean DEFAULT false NOT NULL,
    can_update boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: role_special_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_special_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role public.app_role NOT NULL,
    permission text NOT NULL,
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
-- Name: signature_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.signature_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    signer_id uuid,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: signature_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.signature_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    template_id uuid,
    docuseal_template_id integer,
    docuseal_submission_id integer,
    title text NOT NULL,
    status public.signature_request_status DEFAULT 'draft'::public.signature_request_status NOT NULL,
    signing_mode text DEFAULT 'parallel'::text NOT NULL,
    delivery_method text DEFAULT 'email_only'::text NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    expires_at timestamp with time zone,
    completed_at timestamp with time zone,
    executed_pdf_url text,
    certificate_url text,
    evidence_json jsonb,
    short_token text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT signature_requests_delivery_method_check CHECK ((delivery_method = ANY (ARRAY['email_sms'::text, 'email_only'::text, 'sms_only'::text]))),
    CONSTRAINT signature_requests_entity_type_check CHECK ((entity_type = ANY (ARRAY['lead'::text, 'client'::text]))),
    CONSTRAINT signature_requests_language_check CHECK ((language = ANY (ARRAY['en'::text, 'es'::text]))),
    CONSTRAINT signature_requests_signing_mode_check CHECK ((signing_mode = ANY (ARRAY['parallel'::text, 'sequential'::text])))
);


--
-- Name: signature_signers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.signature_signers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    signer_role text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    docuseal_submitter_id integer,
    signing_url text,
    short_token text,
    status public.signer_status DEFAULT 'pending'::public.signer_status NOT NULL,
    signed_at timestamp with time zone,
    ip_address text,
    user_agent text,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: suppressed_emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppressed_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    reason text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT suppressed_emails_reason_check CHECK ((reason = ANY (ARRAY['unsubscribe'::text, 'bounce'::text, 'complaint'::text])))
);


--
-- Name: system_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_user_id uuid,
    actor_role text,
    company_id uuid,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    request_payload jsonb,
    response_payload jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: task_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    department public.department_new,
    task_type public.task_type DEFAULT 'general'::public.task_type NOT NULL,
    priority public.task_priority DEFAULT 'medium'::public.task_priority NOT NULL,
    default_title text NOT NULL,
    default_description text,
    default_due_days integer,
    company_id uuid,
    created_by uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    task_type public.task_type DEFAULT 'general'::public.task_type NOT NULL,
    priority public.task_priority DEFAULT 'medium'::public.task_priority NOT NULL,
    status public.task_status DEFAULT 'pending'::public.task_status NOT NULL,
    assigned_to uuid,
    created_by uuid,
    due_date timestamp with time zone,
    completed_at timestamp with time zone,
    entity_type public.entity_type,
    entity_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: template_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    template_type public.template_type,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: template_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    used_by uuid,
    used_at timestamp with time zone DEFAULT now() NOT NULL,
    channel text,
    success boolean DEFAULT true NOT NULL,
    error_message text
);


--
-- Name: template_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_usages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    used_by uuid,
    used_at timestamp with time zone DEFAULT now() NOT NULL,
    channel text,
    success boolean DEFAULT true NOT NULL,
    error_message text
);


--
-- Name: template_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    version_number integer NOT NULL,
    content text NOT NULL,
    content_html text,
    subject text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    change_notes text
);


--
-- Name: templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    category_id uuid,
    template_type public.template_type NOT NULL,
    subject text,
    content text DEFAULT ''::text NOT NULL,
    content_html text,
    merge_fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    conditional_clauses jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    language public.template_language DEFAULT 'en'::public.template_language NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    current_version integer DEFAULT 1 NOT NULL
);


--
-- Name: tenant_feature_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_feature_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    flag_key text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    description text,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: terminology_presets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.terminology_presets (
    preset_key text NOT NULL,
    label_map jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
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
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: webhook_endpoints; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: workflow_executions; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: workflow_groups; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: workflow_rules; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: appearance_requests appearance_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appearance_requests
    ADD CONSTRAINT appearance_requests_pkey PRIMARY KEY (id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: billing_entries billing_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_entries
    ADD CONSTRAINT billing_entries_pkey PRIMARY KEY (id);


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
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


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
-- Name: deadline_reminders deadline_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deadline_reminders
    ADD CONSTRAINT deadline_reminders_pkey PRIMARY KEY (id);


--
-- Name: deadline_reminders deadline_reminders_reminder_type_entity_id_staff_id_days_be_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deadline_reminders
    ADD CONSTRAINT deadline_reminders_reminder_type_entity_id_staff_id_days_be_key UNIQUE (reminder_type, entity_id, staff_id, days_before);


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
-- Name: docuseal_templates docuseal_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docuseal_templates
    ADD CONSTRAINT docuseal_templates_pkey PRIMARY KEY (id);


--
-- Name: domain_events domain_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_events
    ADD CONSTRAINT domain_events_pkey PRIMARY KEY (id);


--
-- Name: eligibility_reviews eligibility_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eligibility_reviews
    ADD CONSTRAINT eligibility_reviews_pkey PRIMARY KEY (id);


--
-- Name: email_send_log email_send_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_send_log
    ADD CONSTRAINT email_send_log_pkey PRIMARY KEY (id);


--
-- Name: email_send_state email_send_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_send_state
    ADD CONSTRAINT email_send_state_pkey PRIMARY KEY (id);


--
-- Name: email_unsubscribe_tokens email_unsubscribe_tokens_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_unsubscribe_tokens
    ADD CONSTRAINT email_unsubscribe_tokens_email_key UNIQUE (email);


--
-- Name: email_unsubscribe_tokens email_unsubscribe_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_unsubscribe_tokens
    ADD CONSTRAINT email_unsubscribe_tokens_pkey PRIMARY KEY (id);


--
-- Name: email_unsubscribe_tokens email_unsubscribe_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_unsubscribe_tokens
    ADD CONSTRAINT email_unsubscribe_tokens_token_key UNIQUE (token);


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
-- Name: entity_communications entity_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_communications
    ADD CONSTRAINT entity_communications_pkey PRIMARY KEY (id);


--
-- Name: feature_requests feature_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_requests
    ADD CONSTRAINT feature_requests_pkey PRIMARY KEY (id);


--
-- Name: filing_fees filing_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filing_fees
    ADD CONSTRAINT filing_fees_pkey PRIMARY KEY (id);


--
-- Name: plsa_sync_log forth_sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plsa_sync_log
    ADD CONSTRAINT forth_sync_log_pkey PRIMARY KEY (id);


--
-- Name: graduation_automation_config graduation_automation_config_company_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.graduation_automation_config
    ADD CONSTRAINT graduation_automation_config_company_id_key UNIQUE (company_id);


--
-- Name: graduation_automation_config graduation_automation_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.graduation_automation_config
    ADD CONSTRAINT graduation_automation_config_pkey PRIMARY KEY (id);


--
-- Name: graduation_events graduation_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.graduation_events
    ADD CONSTRAINT graduation_events_pkey PRIMARY KEY (id);


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
-- Name: job_titles job_titles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_titles
    ADD CONSTRAINT job_titles_pkey PRIMARY KEY (id);


--
-- Name: law_firm_contacts law_firm_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.law_firm_contacts
    ADD CONSTRAINT law_firm_contacts_pkey PRIMARY KEY (id);


--
-- Name: law_firms law_firms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.law_firms
    ADD CONSTRAINT law_firms_pkey PRIMARY KEY (id);


--
-- Name: lead_activities lead_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_activities
    ADD CONSTRAINT lead_activities_pkey PRIMARY KEY (id);


--
-- Name: lead_assignment_log lead_assignment_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_assignment_log
    ADD CONSTRAINT lead_assignment_log_pkey PRIMARY KEY (id);


--
-- Name: lead_assignment_pool lead_assignment_pool_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_assignment_pool
    ADD CONSTRAINT lead_assignment_pool_pkey PRIMARY KEY (id);


--
-- Name: lead_assignment_pool lead_assignment_pool_rule_id_staff_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_assignment_pool
    ADD CONSTRAINT lead_assignment_pool_rule_id_staff_id_key UNIQUE (rule_id, staff_id);


--
-- Name: lead_assignment_queue lead_assignment_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_assignment_queue
    ADD CONSTRAINT lead_assignment_queue_pkey PRIMARY KEY (id);


--
-- Name: lead_assignment_rules lead_assignment_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_assignment_rules
    ADD CONSTRAINT lead_assignment_rules_pkey PRIMARY KEY (id);


--
-- Name: lead_banking lead_banking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_banking
    ADD CONSTRAINT lead_banking_pkey PRIMARY KEY (id);


--
-- Name: lead_budgets lead_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_budgets
    ADD CONSTRAINT lead_budgets_pkey PRIMARY KEY (id);


--
-- Name: lead_debts lead_debts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_debts
    ADD CONSTRAINT lead_debts_pkey PRIMARY KEY (id);


--
-- Name: lead_disclosures lead_disclosures_lead_id_disclosure_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_disclosures
    ADD CONSTRAINT lead_disclosures_lead_id_disclosure_type_key UNIQUE (lead_id, disclosure_type);


--
-- Name: lead_disclosures lead_disclosures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_disclosures
    ADD CONSTRAINT lead_disclosures_pkey PRIMARY KEY (id);


--
-- Name: lead_documents lead_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_documents
    ADD CONSTRAINT lead_documents_pkey PRIMARY KEY (id);


--
-- Name: lead_scoring_profiles lead_scoring_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_scoring_profiles
    ADD CONSTRAINT lead_scoring_profiles_pkey PRIMARY KEY (id);


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
-- Name: litigation_activities litigation_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_activities
    ADD CONSTRAINT litigation_activities_pkey PRIMARY KEY (id);


--
-- Name: litigation_documents litigation_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_documents
    ADD CONSTRAINT litigation_documents_pkey PRIMARY KEY (id);


--
-- Name: litigation_hearings litigation_hearings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_hearings
    ADD CONSTRAINT litigation_hearings_pkey PRIMARY KEY (id);


--
-- Name: litigation_matters litigation_matters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_matters
    ADD CONSTRAINT litigation_matters_pkey PRIMARY KEY (id);


--
-- Name: litigation_team_members litigation_team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_team_members
    ADD CONSTRAINT litigation_team_members_pkey PRIMARY KEY (id);


--
-- Name: litigation_team_members litigation_team_members_staff_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_team_members
    ADD CONSTRAINT litigation_team_members_staff_id_key UNIQUE (staff_id);


--
-- Name: litigation_teams litigation_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_teams
    ADD CONSTRAINT litigation_teams_pkey PRIMARY KEY (id);


--
-- Name: note_mentions note_mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_mentions
    ADD CONSTRAINT note_mentions_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_notification_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_notification_type_key UNIQUE (user_id, notification_type);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: nsf_retry_policies nsf_retry_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nsf_retry_policies
    ADD CONSTRAINT nsf_retry_policies_pkey PRIMARY KEY (id);


--
-- Name: outbound_webhook_log outbound_webhook_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbound_webhook_log
    ADD CONSTRAINT outbound_webhook_log_pkey PRIMARY KEY (id);


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
-- Name: reminder_settings reminder_settings_company_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_settings
    ADD CONSTRAINT reminder_settings_company_id_key UNIQUE (company_id);


--
-- Name: reminder_settings reminder_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_settings
    ADD CONSTRAINT reminder_settings_pkey PRIMARY KEY (id);


--
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_module_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_module_key UNIQUE (role, module);


--
-- Name: role_special_permissions role_special_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_special_permissions
    ADD CONSTRAINT role_special_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_special_permissions role_special_permissions_role_permission_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_special_permissions
    ADD CONSTRAINT role_special_permissions_role_permission_key UNIQUE (role, permission);


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
-- Name: signature_events signature_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signature_events
    ADD CONSTRAINT signature_events_pkey PRIMARY KEY (id);


--
-- Name: signature_requests signature_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signature_requests
    ADD CONSTRAINT signature_requests_pkey PRIMARY KEY (id);


--
-- Name: signature_requests signature_requests_short_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signature_requests
    ADD CONSTRAINT signature_requests_short_token_key UNIQUE (short_token);


--
-- Name: signature_signers signature_signers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signature_signers
    ADD CONSTRAINT signature_signers_pkey PRIMARY KEY (id);


--
-- Name: signature_signers signature_signers_short_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signature_signers
    ADD CONSTRAINT signature_signers_short_token_key UNIQUE (short_token);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: staff staff_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_user_id_key UNIQUE (user_id);


--
-- Name: suppressed_emails suppressed_emails_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppressed_emails
    ADD CONSTRAINT suppressed_emails_email_key UNIQUE (email);


--
-- Name: suppressed_emails suppressed_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppressed_emails
    ADD CONSTRAINT suppressed_emails_pkey PRIMARY KEY (id);


--
-- Name: system_audit_log system_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_audit_log
    ADD CONSTRAINT system_audit_log_pkey PRIMARY KEY (id);


--
-- Name: task_templates task_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: template_categories template_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_categories
    ADD CONSTRAINT template_categories_pkey PRIMARY KEY (id);


--
-- Name: template_usage template_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_usage
    ADD CONSTRAINT template_usage_pkey PRIMARY KEY (id);


--
-- Name: template_usages template_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_usages
    ADD CONSTRAINT template_usages_pkey PRIMARY KEY (id);


--
-- Name: template_versions template_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_versions
    ADD CONSTRAINT template_versions_pkey PRIMARY KEY (id);


--
-- Name: template_versions template_versions_template_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_versions
    ADD CONSTRAINT template_versions_template_id_version_number_key UNIQUE (template_id, version_number);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: tenant_feature_flags tenant_feature_flags_company_id_flag_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_feature_flags
    ADD CONSTRAINT tenant_feature_flags_company_id_flag_key_key UNIQUE (company_id, flag_key);


--
-- Name: tenant_feature_flags tenant_feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_feature_flags
    ADD CONSTRAINT tenant_feature_flags_pkey PRIMARY KEY (id);


--
-- Name: terminology_presets terminology_presets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terminology_presets
    ADD CONSTRAINT terminology_presets_pkey PRIMARY KEY (preset_key);


--
-- Name: transaction_retry_attempts transaction_retry_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_retry_attempts
    ADD CONSTRAINT transaction_retry_attempts_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: payment_schedules unique_active_schedule_per_service; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_schedules
    ADD CONSTRAINT unique_active_schedule_per_service UNIQUE (client_service_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: webhook_endpoints webhook_endpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_pkey PRIMARY KEY (id);


--
-- Name: workflow_executions workflow_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_executions
    ADD CONSTRAINT workflow_executions_pkey PRIMARY KEY (id);


--
-- Name: workflow_groups workflow_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_groups
    ADD CONSTRAINT workflow_groups_pkey PRIMARY KEY (id);


--
-- Name: workflow_rules workflow_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_rules
    ADD CONSTRAINT workflow_rules_pkey PRIMARY KEY (id);


--
-- Name: idx_assignment_log_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_log_lead ON public.lead_assignment_log USING btree (lead_id, created_at DESC);


--
-- Name: idx_assignment_rules_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_rules_lookup ON public.lead_assignment_rules USING btree (company_id, is_active, priority DESC);


--
-- Name: idx_assignments_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_entity ON public.assignments USING btree (entity_type, entity_id);


--
-- Name: idx_assignments_single_role; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_assignments_single_role ON public.assignments USING btree (entity_type, entity_id, assignment_type) WHERE ((is_active = true) AND (assignment_type = ANY (ARRAY['litigation_attorney'::public.assignment_type, 'case_manager'::public.assignment_type, 'negotiator'::public.assignment_type, 'primary_attorney'::public.assignment_type, 'client_services_rep'::public.assignment_type, 'sales_rep'::public.assignment_type])));


--
-- Name: idx_assignments_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_staff ON public.assignments USING btree (staff_id, is_active);


--
-- Name: idx_billing_entries_billing_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_entries_billing_date ON public.billing_entries USING btree (billing_date);


--
-- Name: idx_billing_entries_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_entries_client_id ON public.billing_entries USING btree (client_id);


--
-- Name: idx_billing_entries_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_entries_company_id ON public.billing_entries USING btree (company_id);


--
-- Name: idx_billing_entries_matter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_entries_matter_id ON public.billing_entries USING btree (litigation_matter_id);


--
-- Name: idx_billing_entries_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_entries_staff_id ON public.billing_entries USING btree (staff_id);


--
-- Name: idx_billing_entries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_entries_status ON public.billing_entries USING btree (status);


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
-- Name: idx_company_integrations_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_integrations_company ON public.company_integrations USING btree (company_id);


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
-- Name: idx_deadline_reminders_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deadline_reminders_entity ON public.deadline_reminders USING btree (reminder_type, entity_id);


--
-- Name: idx_deadline_reminders_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deadline_reminders_pending ON public.deadline_reminders USING btree (scheduled_for, status) WHERE (status = 'pending'::public.reminder_status);


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
-- Name: idx_docuseal_templates_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_docuseal_templates_company ON public.docuseal_templates USING btree (company_id);


--
-- Name: idx_domain_events_event_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_events_event_created ON public.domain_events USING btree (event, created_at DESC);


--
-- Name: idx_domain_events_unprocessed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_domain_events_unprocessed ON public.domain_events USING btree (created_at) WHERE (processed_at IS NULL);


--
-- Name: idx_email_send_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_send_log_created ON public.email_send_log USING btree (created_at DESC);


--
-- Name: idx_email_send_log_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_send_log_message ON public.email_send_log USING btree (message_id);


--
-- Name: idx_email_send_log_message_sent_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_email_send_log_message_sent_unique ON public.email_send_log USING btree (message_id) WHERE (status = 'sent'::text);


--
-- Name: idx_email_send_log_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_send_log_recipient ON public.email_send_log USING btree (recipient_email);


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
-- Name: idx_forth_sync_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forth_sync_log_created ON public.plsa_sync_log USING btree (created_at DESC);


--
-- Name: idx_forth_sync_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forth_sync_log_entity ON public.plsa_sync_log USING btree (entity_type, entity_id);


--
-- Name: idx_graduation_events_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_graduation_events_company ON public.graduation_events USING btree (company_id, created_at DESC);


--
-- Name: idx_graduation_events_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_graduation_events_service ON public.graduation_events USING btree (client_service_id);


--
-- Name: idx_integration_event_log_company_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_event_log_company_created ON public.integration_event_log USING btree (company_id, created_at DESC);


--
-- Name: idx_integration_event_log_provider_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_event_log_provider_created ON public.integration_event_log USING btree (provider_key, created_at DESC);


--
-- Name: idx_lead_activities_lead; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_activities_lead ON public.lead_activities USING btree (lead_id);


--
-- Name: idx_lead_scoring_profiles_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_scoring_profiles_active ON public.lead_scoring_profiles USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_lead_scoring_profiles_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_scoring_profiles_company ON public.lead_scoring_profiles USING btree (company_id);


--
-- Name: idx_lead_scoring_profiles_unique_default; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_lead_scoring_profiles_unique_default ON public.lead_scoring_profiles USING btree (company_id) WHERE (is_default = true);


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
-- Name: idx_litigation_activities_matter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_litigation_activities_matter_id ON public.litigation_activities USING btree (matter_id);


--
-- Name: idx_litigation_documents_deadline_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_litigation_documents_deadline_date ON public.litigation_documents USING btree (deadline_date);


--
-- Name: idx_litigation_documents_matter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_litigation_documents_matter_id ON public.litigation_documents USING btree (matter_id);


--
-- Name: idx_litigation_hearings_matter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_litigation_hearings_matter_id ON public.litigation_hearings USING btree (matter_id);


--
-- Name: idx_litigation_hearings_scheduled_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_litigation_hearings_scheduled_date ON public.litigation_hearings USING btree (scheduled_date);


--
-- Name: idx_litigation_matters_client_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_litigation_matters_client_service ON public.litigation_matters USING btree (client_service_id);


--
-- Name: idx_litigation_matters_liability; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_litigation_matters_liability ON public.litigation_matters USING btree (liability_id);


--
-- Name: idx_litigation_team_members_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_litigation_team_members_staff_id ON public.litigation_team_members USING btree (staff_id);


--
-- Name: idx_litigation_team_members_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_litigation_team_members_team_id ON public.litigation_team_members USING btree (team_id);


--
-- Name: idx_litigation_teams_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_litigation_teams_company_id ON public.litigation_teams USING btree (company_id);


--
-- Name: idx_note_mentions_note; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_mentions_note ON public.note_mentions USING btree (note_id);


--
-- Name: idx_note_mentions_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_mentions_staff ON public.note_mentions USING btree (mentioned_staff_id);


--
-- Name: idx_notes_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_created_by ON public.notes USING btree (created_by);


--
-- Name: idx_notes_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_entity ON public.notes USING btree (entity_type, entity_id);


--
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_outbound_log_company_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outbound_log_company_created ON public.outbound_webhook_log USING btree (company_id, created_at DESC);


--
-- Name: idx_outbound_log_endpoint_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outbound_log_endpoint_created ON public.outbound_webhook_log USING btree (endpoint_id, created_at DESC);


--
-- Name: idx_outbound_log_source_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outbound_log_source_entity ON public.outbound_webhook_log USING btree (source_entity_type, source_entity_id);


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
-- Name: idx_pool_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pool_available ON public.lead_assignment_pool USING btree (rule_id, is_available) WHERE (is_available = true);


--
-- Name: idx_queue_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_queue_pending ON public.lead_assignment_queue USING btree (status, priority DESC, queued_at) WHERE (status = 'pending'::public.queue_status);


--
-- Name: idx_recon_company_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_company_status ON public.reconciliation_findings USING btree (company_id, status);


--
-- Name: idx_recon_detector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recon_detector ON public.reconciliation_findings USING btree (detector);


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
-- Name: idx_signature_events_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_signature_events_request ON public.signature_events USING btree (request_id);


--
-- Name: idx_signature_requests_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_signature_requests_company ON public.signature_requests USING btree (company_id);


--
-- Name: idx_signature_requests_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_signature_requests_entity ON public.signature_requests USING btree (entity_type, entity_id);


--
-- Name: idx_signature_requests_short_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_signature_requests_short_token ON public.signature_requests USING btree (short_token);


--
-- Name: idx_signature_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_signature_requests_status ON public.signature_requests USING btree (status);


--
-- Name: idx_signature_signers_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_signature_signers_request ON public.signature_signers USING btree (request_id);


--
-- Name: idx_signature_signers_short_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_signature_signers_short_token ON public.signature_signers USING btree (short_token);


--
-- Name: idx_suppressed_emails_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppressed_emails_email ON public.suppressed_emails USING btree (email);


--
-- Name: idx_system_audit_log_action_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_audit_log_action_time ON public.system_audit_log USING btree (action, created_at DESC);


--
-- Name: idx_system_audit_log_actor_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_audit_log_actor_time ON public.system_audit_log USING btree (actor_user_id, created_at DESC);


--
-- Name: idx_system_audit_log_company_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_audit_log_company_time ON public.system_audit_log USING btree (company_id, created_at DESC);


--
-- Name: idx_system_audit_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_audit_log_entity ON public.system_audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_tasks_assigned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assigned ON public.tasks USING btree (assigned_to, status);


--
-- Name: idx_tasks_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_entity ON public.tasks USING btree (entity_type, entity_id);


--
-- Name: idx_template_categories_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_categories_company ON public.template_categories USING btree (company_id);


--
-- Name: idx_template_usage_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_usage_entity ON public.template_usage USING btree (entity_type, entity_id);


--
-- Name: idx_template_usage_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_usage_template ON public.template_usage USING btree (template_id, used_at DESC);


--
-- Name: idx_template_usages_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_usages_entity ON public.template_usages USING btree (entity_type, entity_id);


--
-- Name: idx_template_usages_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_usages_template ON public.template_usages USING btree (template_id);


--
-- Name: idx_template_versions_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_versions_template ON public.template_versions USING btree (template_id);


--
-- Name: idx_templates_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_active ON public.templates USING btree (is_active);


--
-- Name: idx_templates_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_category ON public.templates USING btree (category_id);


--
-- Name: idx_templates_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_company ON public.templates USING btree (company_id);


--
-- Name: idx_templates_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_type ON public.templates USING btree (template_type);


--
-- Name: idx_tenant_feature_flags_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_feature_flags_company ON public.tenant_feature_flags USING btree (company_id);


--
-- Name: idx_tenant_feature_flags_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_feature_flags_key ON public.tenant_feature_flags USING btree (flag_key);


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
-- Name: idx_tx_retry_original; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tx_retry_original ON public.transaction_retry_attempts USING btree (original_transaction_id);


--
-- Name: idx_tx_retry_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tx_retry_status ON public.transaction_retry_attempts USING btree (status, scheduled_for);


--
-- Name: idx_unsubscribe_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens USING btree (token);


--
-- Name: idx_webhook_endpoints_company_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_endpoints_company_active ON public.webhook_endpoints USING btree (company_id, is_active);


--
-- Name: idx_webhook_endpoints_subscriptions; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_endpoints_subscriptions ON public.webhook_endpoints USING gin (event_subscriptions);


--
-- Name: idx_workflow_executions_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_executions_entity ON public.workflow_executions USING btree (entity_type, entity_id, executed_at DESC);


--
-- Name: idx_workflow_executions_rule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_executions_rule ON public.workflow_executions USING btree (rule_id, executed_at DESC);


--
-- Name: idx_workflow_groups_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_groups_company_id ON public.workflow_groups USING btree (company_id);


--
-- Name: idx_workflow_groups_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_groups_entity_type ON public.workflow_groups USING btree (entity_type);


--
-- Name: idx_workflow_rules_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_rules_group_id ON public.workflow_rules USING btree (group_id);


--
-- Name: idx_workflow_rules_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_rules_lookup ON public.workflow_rules USING btree (company_id, entity_type, trigger_type, is_active) WHERE (is_active = true);


--
-- Name: law_firm_contacts_law_firm_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX law_firm_contacts_law_firm_id_idx ON public.law_firm_contacts USING btree (law_firm_id);


--
-- Name: law_firms_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX law_firms_name_idx ON public.law_firms USING btree (name);


--
-- Name: litigation_matters_opposing_law_firm_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX litigation_matters_opposing_law_firm_id_idx ON public.litigation_matters USING btree (opposing_law_firm_id);


--
-- Name: uq_nsf_retry_policies_active_per_company; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_nsf_retry_policies_active_per_company ON public.nsf_retry_policies USING btree (company_id) WHERE (is_active = true);


--
-- Name: uq_recon_open_per_entity_detector; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_recon_open_per_entity_detector ON public.reconciliation_findings USING btree (detector, entity_type, entity_id) WHERE ((status = 'open'::text) AND (entity_id IS NOT NULL));


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
-- Name: billing_entries trg_audit_billing_entries; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_billing_entries AFTER INSERT OR DELETE OR UPDATE ON public.billing_entries FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: client_services trg_audit_client_services; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_client_services AFTER INSERT OR DELETE OR UPDATE ON public.client_services FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: clients trg_audit_clients; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_clients AFTER INSERT OR DELETE OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: companies trg_audit_company_type_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_company_type_change AFTER UPDATE OF company_type ON public.companies FOR EACH ROW EXECUTE FUNCTION public.audit_company_type_change();


--
-- Name: eligibility_reviews trg_audit_eligibility_reviews; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_eligibility_reviews AFTER INSERT OR DELETE OR UPDATE ON public.eligibility_reviews FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: lead_banking trg_audit_lead_banking; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_lead_banking AFTER INSERT OR DELETE OR UPDATE ON public.lead_banking FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: leads trg_audit_leads; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_leads AFTER INSERT OR DELETE OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: litigation_matters trg_audit_litigation_matters; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_litigation_matters AFTER INSERT OR DELETE OR UPDATE ON public.litigation_matters FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: settlements trg_audit_settlements; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_settlements AFTER INSERT OR DELETE OR UPDATE ON public.settlements FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: staff trg_audit_staff; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_staff AFTER INSERT OR DELETE OR UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: transactions trg_audit_transactions; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_transactions AFTER INSERT OR DELETE OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: user_roles trg_audit_user_roles; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_user_roles AFTER INSERT OR DELETE OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();


--
-- Name: leads trg_auto_assign_lead; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_assign_lead BEFORE INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.trigger_auto_assign_lead();


--
-- Name: leads trg_calculate_lead_score; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_calculate_lead_score BEFORE INSERT OR UPDATE OF estimated_debt_amount, number_of_debts, has_active_lawsuit, credit_auth_given, email, phone, source, interest_type, scoring_profile_id ON public.leads FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_lead_score();


--
-- Name: company_integrations trg_company_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_company_integrations_updated_at BEFORE UPDATE ON public.company_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: creditor_responses trg_creditor_responses_calc_time; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_creditor_responses_calc_time BEFORE INSERT OR UPDATE ON public.creditor_responses FOR EACH ROW EXECUTE FUNCTION public.calc_creditor_response_time();


--
-- Name: creditor_responses trg_creditor_responses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_creditor_responses_updated_at BEFORE UPDATE ON public.creditor_responses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: entity_communications trg_entity_communications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_entity_communications_updated_at BEFORE UPDATE ON public.entity_communications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: graduation_automation_config trg_graduation_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_graduation_config_updated_at BEFORE UPDATE ON public.graduation_automation_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: integration_providers trg_integration_providers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_integration_providers_updated_at BEFORE UPDATE ON public.integration_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: assignments trg_notify_matter_assignment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_matter_assignment AFTER INSERT ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.notify_matter_assignment();


--
-- Name: tasks trg_notify_task_assignment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_task_assignment AFTER INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();


--
-- Name: tenant_feature_flags trg_tenant_feature_flags_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tenant_feature_flags_updated_at BEFORE UPDATE ON public.tenant_feature_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: webhook_endpoints trg_webhook_endpoints_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_webhook_endpoints_updated_at BEFORE UPDATE ON public.webhook_endpoints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: note_mentions trigger_notify_note_mention; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_note_mention AFTER INSERT ON public.note_mentions FOR EACH ROW EXECUTE FUNCTION public.notify_note_mention();


--
-- Name: client_services trigger_update_client_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_client_status AFTER INSERT OR DELETE OR UPDATE OF status, primary_client_id ON public.client_services FOR EACH ROW EXECUTE FUNCTION public.update_client_status();


--
-- Name: appearance_requests update_appearance_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_appearance_requests_updated_at BEFORE UPDATE ON public.appearance_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: billing_entries update_billing_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_billing_entries_updated_at BEFORE UPDATE ON public.billing_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: companies update_companies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
-- Name: deadline_reminders update_deadline_reminders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_deadline_reminders_updated_at BEFORE UPDATE ON public.deadline_reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: docuseal_templates update_docuseal_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_docuseal_templates_updated_at BEFORE UPDATE ON public.docuseal_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: eligibility_reviews update_eligibility_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_eligibility_reviews_updated_at BEFORE UPDATE ON public.eligibility_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: client_services update_engagements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_engagements_updated_at BEFORE UPDATE ON public.client_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: feature_requests update_feature_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_feature_requests_updated_at BEFORE UPDATE ON public.feature_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: filing_fees update_filing_fees_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_filing_fees_updated_at BEFORE UPDATE ON public.filing_fees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: law_firm_contacts update_law_firm_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_law_firm_contacts_updated_at BEFORE UPDATE ON public.law_firm_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: law_firms update_law_firms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_law_firms_updated_at BEFORE UPDATE ON public.law_firms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lead_budgets update_lead_budgets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lead_budgets_updated_at BEFORE UPDATE ON public.lead_budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leads update_leads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: liabilities update_liabilities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_liabilities_updated_at BEFORE UPDATE ON public.liabilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: litigation_hearings update_litigation_hearings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_litigation_hearings_updated_at BEFORE UPDATE ON public.litigation_hearings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: litigation_matters update_litigation_matters_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_litigation_matters_updated_at BEFORE UPDATE ON public.litigation_matters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: litigation_teams update_litigation_teams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_litigation_teams_updated_at BEFORE UPDATE ON public.litigation_teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notes update_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notification_preferences update_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: nsf_retry_policies update_nsf_retry_policies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_nsf_retry_policies_updated_at BEFORE UPDATE ON public.nsf_retry_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_schedules update_payment_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payment_schedules_updated_at BEFORE UPDATE ON public.payment_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reminder_settings update_reminder_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reminder_settings_updated_at BEFORE UPDATE ON public.reminder_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: report_templates update_report_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON public.report_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: role_permissions update_role_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_role_permissions_updated_at BEFORE UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: settlements update_settlements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_settlements_updated_at BEFORE UPDATE ON public.settlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: signature_requests update_signature_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_signature_requests_updated_at BEFORE UPDATE ON public.signature_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: staff update_staff_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: task_templates update_task_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_task_templates_updated_at BEFORE UPDATE ON public.task_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: template_categories update_template_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_template_categories_updated_at BEFORE UPDATE ON public.template_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: templates update_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transactions update_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workflow_groups update_workflow_groups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workflow_groups_updated_at BEFORE UPDATE ON public.workflow_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workflow_rules update_workflow_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workflow_rules_updated_at BEFORE UPDATE ON public.workflow_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: appearance_requests appearance_requests_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appearance_requests
    ADD CONSTRAINT appearance_requests_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.staff(id);


--
-- Name: appearance_requests appearance_requests_hearing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appearance_requests
    ADD CONSTRAINT appearance_requests_hearing_id_fkey FOREIGN KEY (hearing_id) REFERENCES public.litigation_hearings(id) ON DELETE SET NULL;


--
-- Name: appearance_requests appearance_requests_matter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appearance_requests
    ADD CONSTRAINT appearance_requests_matter_id_fkey FOREIGN KEY (matter_id) REFERENCES public.litigation_matters(id) ON DELETE CASCADE;


--
-- Name: appearance_requests appearance_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appearance_requests
    ADD CONSTRAINT appearance_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.staff(id);


--
-- Name: assignments assignments_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: billing_entries billing_entries_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_entries
    ADD CONSTRAINT billing_entries_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: billing_entries billing_entries_client_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_entries
    ADD CONSTRAINT billing_entries_client_service_id_fkey FOREIGN KEY (client_service_id) REFERENCES public.client_services(id);


--
-- Name: billing_entries billing_entries_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_entries
    ADD CONSTRAINT billing_entries_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: billing_entries billing_entries_litigation_matter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_entries
    ADD CONSTRAINT billing_entries_litigation_matter_id_fkey FOREIGN KEY (litigation_matter_id) REFERENCES public.litigation_matters(id);


--
-- Name: billing_entries billing_entries_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_entries
    ADD CONSTRAINT billing_entries_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


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
-- Name: companies companies_parent_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_parent_company_id_fkey FOREIGN KEY (parent_company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: company_integrations company_integrations_provider_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_integrations
    ADD CONSTRAINT company_integrations_provider_key_fkey FOREIGN KEY (provider_key) REFERENCES public.integration_providers(provider_key) ON UPDATE CASCADE;


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
-- Name: deadline_reminders deadline_reminders_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deadline_reminders
    ADD CONSTRAINT deadline_reminders_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id);


--
-- Name: deadline_reminders deadline_reminders_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deadline_reminders
    ADD CONSTRAINT deadline_reminders_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: dialpad_calls dialpad_calls_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dialpad_calls
    ADD CONSTRAINT dialpad_calls_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.staff(id);


--
-- Name: docuseal_templates docuseal_templates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docuseal_templates
    ADD CONSTRAINT docuseal_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: domain_events domain_events_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_events
    ADD CONSTRAINT domain_events_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: eligibility_reviews eligibility_reviews_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eligibility_reviews
    ADD CONSTRAINT eligibility_reviews_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: eligibility_reviews eligibility_reviews_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eligibility_reviews
    ADD CONSTRAINT eligibility_reviews_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.staff(id);


--
-- Name: eligibility_reviews eligibility_reviews_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.eligibility_reviews
    ADD CONSTRAINT eligibility_reviews_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.staff(id);


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
-- Name: entity_communications entity_communications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_communications
    ADD CONSTRAINT entity_communications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: feature_requests feature_requests_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_requests
    ADD CONSTRAINT feature_requests_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: filing_fees filing_fees_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filing_fees
    ADD CONSTRAINT filing_fees_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: filing_fees filing_fees_matter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filing_fees
    ADD CONSTRAINT filing_fees_matter_id_fkey FOREIGN KEY (matter_id) REFERENCES public.litigation_matters(id) ON DELETE CASCADE;


--
-- Name: graduation_automation_config graduation_automation_config_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.graduation_automation_config
    ADD CONSTRAINT graduation_automation_config_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: graduation_events graduation_events_client_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.graduation_events
    ADD CONSTRAINT graduation_events_client_service_id_fkey FOREIGN KEY (client_service_id) REFERENCES public.client_services(id) ON DELETE CASCADE;


--
-- Name: graduation_events graduation_events_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.graduation_events
    ADD CONSTRAINT graduation_events_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: graduation_events graduation_events_triggered_by_liability_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.graduation_events
    ADD CONSTRAINT graduation_events_triggered_by_liability_id_fkey FOREIGN KEY (triggered_by_liability_id) REFERENCES public.liabilities(id) ON DELETE SET NULL;


--
-- Name: law_firm_contacts law_firm_contacts_law_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.law_firm_contacts
    ADD CONSTRAINT law_firm_contacts_law_firm_id_fkey FOREIGN KEY (law_firm_id) REFERENCES public.law_firms(id) ON DELETE CASCADE;


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
-- Name: lead_assignment_log lead_assignment_log_from_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_assignment_log
    ADD CONSTRAINT lead_assignment_log_from_staff_id_fkey FOREIGN KEY (from_staff_id) REFERENCES public.staff(id);


--
-- Name: lead_assignment_log lead_assignment_log_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_assignment_log
    ADD CONSTRAINT lead_assignment_log_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_assignment_log lead_assignment_log_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_assignment_log
    ADD CONSTRAINT lead_assignment_log_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.staff(id);


--
-- Name: lead_assignment_log lead_assignment_log_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_assignment_log
    ADD CONSTRAINT lead_assignment_log_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.lead_assignment_rules(id);


--
-- Name: lead_assignment_log lead_assignment_log_to_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_assignment_log
    ADD CONSTRAINT lead_assignment_log_to_staff_id_fkey FOREIGN KEY (to_staff_id) REFERENCES public.staff(id);


--
-- Name: lead_assignment_pool lead_assignment_pool_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_assignment_pool
    ADD CONSTRAINT lead_assignment_pool_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.lead_assignment_rules(id) ON DELETE CASCADE;


--
-- Name: lead_assignment_pool lead_assignment_pool_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_assignment_pool
    ADD CONSTRAINT lead_assignment_pool_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: lead_assignment_queue lead_assignment_queue_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_assignment_queue
    ADD CONSTRAINT lead_assignment_queue_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.staff(id);


--
-- Name: lead_assignment_queue lead_assignment_queue_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_assignment_queue
    ADD CONSTRAINT lead_assignment_queue_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_assignment_queue lead_assignment_queue_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_assignment_queue
    ADD CONSTRAINT lead_assignment_queue_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.lead_assignment_rules(id) ON DELETE SET NULL;


--
-- Name: lead_assignment_rules lead_assignment_rules_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_assignment_rules
    ADD CONSTRAINT lead_assignment_rules_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: lead_banking lead_banking_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_banking
    ADD CONSTRAINT lead_banking_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_budgets lead_budgets_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_budgets
    ADD CONSTRAINT lead_budgets_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_debts lead_debts_creditor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_debts
    ADD CONSTRAINT lead_debts_creditor_id_fkey FOREIGN KEY (creditor_id) REFERENCES public.creditors(id);


--
-- Name: lead_debts lead_debts_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_debts
    ADD CONSTRAINT lead_debts_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_disclosures lead_disclosures_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_disclosures
    ADD CONSTRAINT lead_disclosures_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_documents lead_documents_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_documents
    ADD CONSTRAINT lead_documents_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_documents lead_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_documents
    ADD CONSTRAINT lead_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.staff(id);


--
-- Name: lead_scoring_profiles lead_scoring_profiles_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_scoring_profiles
    ADD CONSTRAINT lead_scoring_profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


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

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_scoring_profile_id_fkey FOREIGN KEY (scoring_profile_id) REFERENCES public.lead_scoring_profiles(id) ON DELETE SET NULL;


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
-- Name: litigation_activities litigation_activities_matter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_activities
    ADD CONSTRAINT litigation_activities_matter_id_fkey FOREIGN KEY (matter_id) REFERENCES public.litigation_matters(id) ON DELETE CASCADE;


--
-- Name: litigation_activities litigation_activities_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_activities
    ADD CONSTRAINT litigation_activities_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: litigation_documents litigation_documents_matter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_documents
    ADD CONSTRAINT litigation_documents_matter_id_fkey FOREIGN KEY (matter_id) REFERENCES public.litigation_matters(id) ON DELETE CASCADE;


--
-- Name: litigation_documents litigation_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_documents
    ADD CONSTRAINT litigation_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.staff(id);


--
-- Name: litigation_hearings litigation_hearings_matter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_hearings
    ADD CONSTRAINT litigation_hearings_matter_id_fkey FOREIGN KEY (matter_id) REFERENCES public.litigation_matters(id) ON DELETE CASCADE;


--
-- Name: litigation_matters litigation_matters_client_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_matters
    ADD CONSTRAINT litigation_matters_client_service_id_fkey FOREIGN KEY (client_service_id) REFERENCES public.client_services(id) ON DELETE CASCADE;


--
-- Name: litigation_matters litigation_matters_liability_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_matters
    ADD CONSTRAINT litigation_matters_liability_id_fkey FOREIGN KEY (liability_id) REFERENCES public.liabilities(id) ON DELETE CASCADE;


--
-- Name: litigation_matters litigation_matters_opposing_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_matters
    ADD CONSTRAINT litigation_matters_opposing_contact_id_fkey FOREIGN KEY (opposing_contact_id) REFERENCES public.creditor_contacts(id);


--
-- Name: litigation_matters litigation_matters_opposing_counsel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_matters
    ADD CONSTRAINT litigation_matters_opposing_counsel_id_fkey FOREIGN KEY (opposing_counsel_id) REFERENCES public.law_firm_contacts(id);


--
-- Name: litigation_matters litigation_matters_opposing_creditor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_matters
    ADD CONSTRAINT litigation_matters_opposing_creditor_id_fkey FOREIGN KEY (opposing_creditor_id) REFERENCES public.creditors(id);


--
-- Name: litigation_matters litigation_matters_opposing_law_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_matters
    ADD CONSTRAINT litigation_matters_opposing_law_firm_id_fkey FOREIGN KEY (opposing_law_firm_id) REFERENCES public.law_firms(id);


--
-- Name: litigation_team_members litigation_team_members_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_team_members
    ADD CONSTRAINT litigation_team_members_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: litigation_team_members litigation_team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_team_members
    ADD CONSTRAINT litigation_team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.litigation_teams(id) ON DELETE CASCADE;


--
-- Name: litigation_teams litigation_teams_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.litigation_teams
    ADD CONSTRAINT litigation_teams_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: note_mentions note_mentions_mentioned_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_mentions
    ADD CONSTRAINT note_mentions_mentioned_staff_id_fkey FOREIGN KEY (mentioned_staff_id) REFERENCES public.staff(id);


--
-- Name: note_mentions note_mentions_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_mentions
    ADD CONSTRAINT note_mentions_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;


--
-- Name: notes notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: nsf_retry_policies nsf_retry_policies_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nsf_retry_policies
    ADD CONSTRAINT nsf_retry_policies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: outbound_webhook_log outbound_webhook_log_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbound_webhook_log
    ADD CONSTRAINT outbound_webhook_log_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: outbound_webhook_log outbound_webhook_log_endpoint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbound_webhook_log
    ADD CONSTRAINT outbound_webhook_log_endpoint_id_fkey FOREIGN KEY (endpoint_id) REFERENCES public.webhook_endpoints(id) ON DELETE SET NULL;


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
-- Name: reminder_settings reminder_settings_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder_settings
    ADD CONSTRAINT reminder_settings_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: report_templates report_templates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: report_templates report_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


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
-- Name: signature_events signature_events_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signature_events
    ADD CONSTRAINT signature_events_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.signature_requests(id) ON DELETE CASCADE;


--
-- Name: signature_events signature_events_signer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signature_events
    ADD CONSTRAINT signature_events_signer_id_fkey FOREIGN KEY (signer_id) REFERENCES public.signature_signers(id) ON DELETE SET NULL;


--
-- Name: signature_requests signature_requests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signature_requests
    ADD CONSTRAINT signature_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: signature_requests signature_requests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signature_requests
    ADD CONSTRAINT signature_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: signature_requests signature_requests_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signature_requests
    ADD CONSTRAINT signature_requests_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE SET NULL;


--
-- Name: signature_signers signature_signers_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signature_signers
    ADD CONSTRAINT signature_signers_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.signature_requests(id) ON DELETE CASCADE;


--
-- Name: staff staff_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: staff staff_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: task_templates task_templates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: task_templates task_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: template_categories template_categories_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_categories
    ADD CONSTRAINT template_categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: template_usage template_usage_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_usage
    ADD CONSTRAINT template_usage_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;


--
-- Name: template_usage template_usage_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_usage
    ADD CONSTRAINT template_usage_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: template_usages template_usages_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_usages
    ADD CONSTRAINT template_usages_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;


--
-- Name: template_usages template_usages_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_usages
    ADD CONSTRAINT template_usages_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: template_versions template_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_versions
    ADD CONSTRAINT template_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: template_versions template_versions_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_versions
    ADD CONSTRAINT template_versions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;


--
-- Name: templates templates_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.template_categories(id) ON DELETE SET NULL;


--
-- Name: templates templates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: templates templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: tenant_feature_flags tenant_feature_flags_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_feature_flags
    ADD CONSTRAINT tenant_feature_flags_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


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

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_processor_id_fkey FOREIGN KEY (processor_id) REFERENCES public.payment_processors(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.payment_schedules(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_settlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_settlement_id_fkey FOREIGN KEY (settlement_id) REFERENCES public.settlements(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webhook_endpoints webhook_endpoints_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: workflow_executions workflow_executions_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_executions
    ADD CONSTRAINT workflow_executions_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.workflow_rules(id) ON DELETE CASCADE;


--
-- Name: workflow_groups workflow_groups_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_groups
    ADD CONSTRAINT workflow_groups_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: workflow_groups workflow_groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_groups
    ADD CONSTRAINT workflow_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: workflow_rules workflow_rules_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_rules
    ADD CONSTRAINT workflow_rules_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: workflow_rules workflow_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_rules
    ADD CONSTRAINT workflow_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: workflow_rules workflow_rules_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_rules
    ADD CONSTRAINT workflow_rules_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.workflow_groups(id) ON DELETE SET NULL;


--
-- Name: creditor_contacts Active staff can view creditor contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Active staff can view creditor contacts" ON public.creditor_contacts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.is_active = true)))));


--
-- Name: appearance_requests Admins can delete appearance requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete appearance requests" ON public.appearance_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: company_processor_configs Admins can delete company processor configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete company processor configs" ON public.company_processor_configs FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_company(auth.uid(), company_id)));


--
-- Name: creditor_contacts Admins can delete creditor contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete creditor contacts" ON public.creditor_contacts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: entity_communications Admins can delete entity comms in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete entity comms in their company" ON public.entity_communications FOR DELETE TO authenticated USING ((public.can_access_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: tenant_feature_flags Admins can delete feature flags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete feature flags" ON public.tenant_feature_flags FOR DELETE TO authenticated USING ((public.can_access_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: feature_requests Admins can delete feature requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete feature requests" ON public.feature_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: filing_fees Admins can delete filing fees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete filing fees" ON public.filing_fees FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: role_permissions Admins can delete role_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete role_permissions" ON public.role_permissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: role_special_permissions Admins can delete role_special_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete role_special_permissions" ON public.role_special_permissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: staff Admins can delete staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete staff" ON public.staff FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: task_templates Admins can delete task templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete task templates" ON public.task_templates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: company_processor_configs Admins can insert company processor configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert company processor configs" ON public.company_processor_configs FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_company(auth.uid(), company_id)));


--
-- Name: creditor_contacts Admins can insert creditor contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert creditor contacts" ON public.creditor_contacts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tenant_feature_flags Admins can insert feature flags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert feature flags" ON public.tenant_feature_flags FOR INSERT TO authenticated WITH CHECK ((public.can_access_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: role_permissions Admins can insert role_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert role_permissions" ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: role_special_permissions Admins can insert role_special_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert role_special_permissions" ON public.role_special_permissions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: task_templates Admins can insert task templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert task templates" ON public.task_templates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: docuseal_templates Admins can manage company docuseal templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage company docuseal templates" ON public.docuseal_templates USING ((public.can_access_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: deadline_reminders Admins can manage company reminders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage company reminders" ON public.deadline_reminders TO authenticated USING (((staff_id IN ( SELECT s.id
   FROM public.staff s
  WHERE (s.company_id = public.get_user_company_id(auth.uid())))) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: creditors Admins can manage creditors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage creditors" ON public.creditors TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: job_titles Admins can manage job titles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage job titles" ON public.job_titles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: law_firm_contacts Admins can manage law firm contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage law firm contacts" ON public.law_firm_contacts USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: law_firms Admins can manage law firms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage law firms" ON public.law_firms USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: company_processor_configs Admins can read company processor configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read company processor configs" ON public.company_processor_configs FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_company(auth.uid(), company_id)));


--
-- Name: company_processor_configs Admins can update company processor configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update company processor configs" ON public.company_processor_configs FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_company(auth.uid(), company_id))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_company(auth.uid(), company_id)));


--
-- Name: creditor_contacts Admins can update creditor contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update creditor contacts" ON public.creditor_contacts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tenant_feature_flags Admins can update feature flags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update feature flags" ON public.tenant_feature_flags FOR UPDATE TO authenticated USING ((public.can_access_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: role_permissions Admins can update role_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update role_permissions" ON public.role_permissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: role_special_permissions Admins can update role_special_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update role_special_permissions" ON public.role_special_permissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: reminder_settings Admins can update settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update settings" ON public.reminder_settings FOR UPDATE TO authenticated USING (((company_id = public.get_user_company_id(auth.uid())) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: task_templates Admins can update task templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update task templates" ON public.task_templates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: plsa_sync_log Admins can view sync logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view sync logs" ON public.plsa_sync_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: company_integrations Admins delete company integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete company integrations" ON public.company_integrations FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_company(auth.uid(), company_id)));


--
-- Name: company_integrations Admins insert company integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert company integrations" ON public.company_integrations FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND public.can_access_company(auth.uid(), company_id)));


--
-- Name: graduation_automation_config Admins manage company graduation config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage company graduation config" ON public.graduation_automation_config TO authenticated USING (((company_id = public.get_user_company_id(auth.uid())) AND public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK (((company_id = public.get_user_company_id(auth.uid())) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


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
-- Name: creditors All staff can view creditors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All staff can view creditors" ON public.creditors FOR SELECT TO authenticated USING (true);


--
-- Name: law_firm_contacts All staff can view law firm contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All staff can view law firm contacts" ON public.law_firm_contacts FOR SELECT USING (true);


--
-- Name: law_firms All staff can view law firms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All staff can view law firms" ON public.law_firms FOR SELECT USING (true);


--
-- Name: payment_processors All staff can view payment processors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All staff can view payment processors" ON public.payment_processors FOR SELECT TO authenticated USING (true);


--
-- Name: notifications Allow notification inserts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow notification inserts" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: services Anyone can view services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view services" ON public.services FOR SELECT TO authenticated USING (true);


--
-- Name: feature_requests Authenticated users can create feature requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create feature requests" ON public.feature_requests FOR INSERT TO authenticated WITH CHECK ((auth.uid() = submitted_by));


--
-- Name: task_templates Authenticated users can read task templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read task templates" ON public.task_templates FOR SELECT TO authenticated USING (true);


--
-- Name: job_titles Authenticated users can view job titles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view job titles" ON public.job_titles FOR SELECT TO authenticated USING (true);


--
-- Name: notes Authors can delete their own notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authors can delete their own notes" ON public.notes FOR DELETE TO authenticated USING ((created_by IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.user_id = auth.uid()))));


--
-- Name: notes Authors can update their own notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authors can update their own notes" ON public.notes FOR UPDATE TO authenticated USING ((created_by IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.user_id = auth.uid()))));


--
-- Name: domain_events Domain events readable by company staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Domain events readable by company staff" ON public.domain_events FOR SELECT TO authenticated USING (((company_id IS NULL) OR public.can_access_company(auth.uid(), company_id)));


--
-- Name: outbound_webhook_log Outbound webhook log readable by company staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Outbound webhook log readable by company staff" ON public.outbound_webhook_log FOR SELECT TO authenticated USING (((company_id IS NULL) OR public.can_access_company(auth.uid(), company_id)));


--
-- Name: integration_providers Providers are readable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Providers are readable by authenticated" ON public.integration_providers FOR SELECT TO authenticated USING (true);


--
-- Name: company_integrations Read company integrations within company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read company integrations within company" ON public.company_integrations FOR SELECT TO authenticated USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: email_send_log Service role can insert send log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert send log" ON public.email_send_log FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: suppressed_emails Service role can insert suppressed emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: email_unsubscribe_tokens Service role can insert tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert tokens" ON public.email_unsubscribe_tokens FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: email_send_state Service role can manage send state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage send state" ON public.email_send_state USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: email_unsubscribe_tokens Service role can mark tokens as used; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can mark tokens as used" ON public.email_unsubscribe_tokens FOR UPDATE USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: email_send_log Service role can read send log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can read send log" ON public.email_send_log FOR SELECT USING ((auth.role() = 'service_role'::text));


--
-- Name: suppressed_emails Service role can read suppressed emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails FOR SELECT USING ((auth.role() = 'service_role'::text));


--
-- Name: email_unsubscribe_tokens Service role can read tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can read tokens" ON public.email_unsubscribe_tokens FOR SELECT USING ((auth.role() = 'service_role'::text));


--
-- Name: email_send_log Service role can update send log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can update send log" ON public.email_send_log FOR UPDATE USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


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
-- Name: report_templates Staff can access company report templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access company report templates" ON public.report_templates USING ((((company_id IS NULL) AND (is_preset = true)) OR public.can_access_company(auth.uid(), company_id)));


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
-- Name: lead_debts Staff can access lead debts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access lead debts" ON public.lead_debts USING ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = lead_debts.lead_id) AND public.can_access_company(auth.uid(), l.company_id)))));


--
-- Name: lead_disclosures Staff can access lead disclosures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access lead disclosures" ON public.lead_disclosures USING ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = lead_disclosures.lead_id) AND public.can_access_company(auth.uid(), l.company_id)))));


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
-- Name: litigation_activities Staff can access litigation activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access litigation activities" ON public.litigation_activities USING ((EXISTS ( SELECT 1
   FROM (public.litigation_matters lm
     JOIN public.client_services cs ON ((cs.id = lm.client_service_id)))
  WHERE ((lm.id = litigation_activities.matter_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: litigation_documents Staff can access litigation documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access litigation documents" ON public.litigation_documents USING ((EXISTS ( SELECT 1
   FROM (public.litigation_matters lm
     JOIN public.client_services cs ON ((cs.id = lm.client_service_id)))
  WHERE ((lm.id = litigation_documents.matter_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: litigation_hearings Staff can access litigation hearings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access litigation hearings" ON public.litigation_hearings USING ((EXISTS ( SELECT 1
   FROM (public.litigation_matters lm
     JOIN public.client_services cs ON ((cs.id = lm.client_service_id)))
  WHERE ((lm.id = litigation_hearings.matter_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: litigation_matters Staff can access litigation matters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can access litigation matters" ON public.litigation_matters USING ((EXISTS ( SELECT 1
   FROM public.client_services cs
  WHERE ((cs.id = litigation_matters.client_service_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


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
-- Name: eligibility_reviews Staff can create eligibility reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create eligibility reviews" ON public.eligibility_reviews FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.leads l
     JOIN public.staff s ON ((s.company_id = l.company_id)))
  WHERE ((l.id = eligibility_reviews.lead_id) AND (s.user_id = auth.uid())))));


--
-- Name: note_mentions Staff can create note mentions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create note mentions" ON public.note_mentions FOR INSERT TO authenticated WITH CHECK (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.staff s
  WHERE (s.user_id = auth.uid())))));


--
-- Name: notes Staff can create notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.staff s
  WHERE (s.user_id = auth.uid())))));


--
-- Name: lead_budgets Staff can delete lead budgets in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can delete lead budgets in their company" ON public.lead_budgets FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.leads l
     JOIN public.staff s ON ((s.company_id = l.company_id)))
  WHERE ((l.id = lead_budgets.lead_id) AND (s.user_id = auth.uid())))));


--
-- Name: lead_documents Staff can delete lead documents in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can delete lead documents in their company" ON public.lead_documents FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.leads l
     JOIN public.staff s ON ((s.company_id = l.company_id)))
  WHERE ((l.id = lead_documents.lead_id) AND (s.user_id = auth.uid())))));


--
-- Name: appearance_requests Staff can insert appearance requests for their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert appearance requests for their company" ON public.appearance_requests FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.litigation_matters m
     JOIN public.client_services cs ON ((cs.id = m.client_service_id)))
  WHERE ((m.id = appearance_requests.matter_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: entity_communications Staff can insert entity comms in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert entity comms in their company" ON public.entity_communications FOR INSERT TO authenticated WITH CHECK (public.can_access_company(auth.uid(), company_id));


--
-- Name: signature_events Staff can insert events for accessible requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert events for accessible requests" ON public.signature_events FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.signature_requests sr
  WHERE ((sr.id = signature_events.request_id) AND public.can_access_company(auth.uid(), sr.company_id)))));


--
-- Name: filing_fees Staff can insert filing fees for their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert filing fees for their company" ON public.filing_fees FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.litigation_matters m
     JOIN public.client_services cs ON ((cs.id = m.client_service_id)))
  WHERE ((m.id = filing_fees.matter_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: lead_budgets Staff can insert lead budgets in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert lead budgets in their company" ON public.lead_budgets FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.leads l
     JOIN public.staff s ON ((s.company_id = l.company_id)))
  WHERE ((l.id = lead_budgets.lead_id) AND (s.user_id = auth.uid())))));


--
-- Name: lead_documents Staff can insert lead documents in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert lead documents in their company" ON public.lead_documents FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.leads l
     JOIN public.staff s ON ((s.company_id = l.company_id)))
  WHERE ((l.id = lead_documents.lead_id) AND (s.user_id = auth.uid())))));


--
-- Name: lead_assignment_log Staff can insert logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert logs" ON public.lead_assignment_log FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = lead_assignment_log.lead_id) AND (l.company_id = public.get_user_company_id(auth.uid()))))));


--
-- Name: assignments Staff can manage assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage assignments" ON public.assignments TO authenticated USING ((staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE public.can_access_company(auth.uid(), staff.company_id))));


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
-- Name: signature_requests Staff can manage company signature requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage company signature requests" ON public.signature_requests USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: tasks Staff can manage company tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage company tasks" ON public.tasks TO authenticated USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: payment_schedules Staff can manage payment schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage payment schedules" ON public.payment_schedules USING ((EXISTS ( SELECT 1
   FROM public.client_services cs
  WHERE ((cs.id = payment_schedules.client_service_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: lead_assignment_pool Staff can manage pools; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage pools" ON public.lead_assignment_pool USING ((EXISTS ( SELECT 1
   FROM public.lead_assignment_rules r
  WHERE ((r.id = lead_assignment_pool.rule_id) AND (r.company_id = public.get_user_company_id(auth.uid()))))));


--
-- Name: lead_assignment_queue Staff can manage queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage queue" ON public.lead_assignment_queue USING ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = lead_assignment_queue.lead_id) AND (l.company_id = public.get_user_company_id(auth.uid()))))));


--
-- Name: signature_signers Staff can manage signers for accessible requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage signers for accessible requests" ON public.signature_signers USING ((EXISTS ( SELECT 1
   FROM public.signature_requests sr
  WHERE ((sr.id = signature_signers.request_id) AND public.can_access_company(auth.uid(), sr.company_id)))));


--
-- Name: note_mentions Staff can read note mentions for their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can read note mentions for their company" ON public.note_mentions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.notes n
  WHERE ((n.id = note_mentions.note_id) AND public.can_access_company(auth.uid(), public.resolve_entity_company_id(n.entity_type, n.entity_id))))));


--
-- Name: notes Staff can read notes for their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can read notes for their company" ON public.notes FOR SELECT TO authenticated USING (public.can_access_company(auth.uid(), public.resolve_entity_company_id(entity_type, entity_id)));


--
-- Name: appearance_requests Staff can update appearance requests for their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update appearance requests for their company" ON public.appearance_requests FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.litigation_matters m
     JOIN public.client_services cs ON ((cs.id = m.client_service_id)))
  WHERE ((m.id = appearance_requests.matter_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: eligibility_reviews Staff can update eligibility reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update eligibility reviews" ON public.eligibility_reviews FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = eligibility_reviews.lead_id) AND public.can_access_company(auth.uid(), l.company_id)))));


--
-- Name: entity_communications Staff can update entity comms in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update entity comms in their company" ON public.entity_communications FOR UPDATE TO authenticated USING (public.can_access_company(auth.uid(), company_id)) WITH CHECK (public.can_access_company(auth.uid(), company_id));


--
-- Name: filing_fees Staff can update filing fees for their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update filing fees for their company" ON public.filing_fees FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.litigation_matters m
     JOIN public.client_services cs ON ((cs.id = m.client_service_id)))
  WHERE ((m.id = filing_fees.matter_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: lead_budgets Staff can update lead budgets in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update lead budgets in their company" ON public.lead_budgets FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.leads l
     JOIN public.staff s ON ((s.company_id = l.company_id)))
  WHERE ((l.id = lead_budgets.lead_id) AND (s.user_id = auth.uid())))));


--
-- Name: staff Staff can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update own profile" ON public.staff FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: companies Staff can view accessible companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view accessible companies" ON public.companies FOR SELECT TO authenticated USING (public.can_access_company(auth.uid(), id));


--
-- Name: staff Staff can view accessible staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view accessible staff" ON public.staff FOR SELECT TO authenticated USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: appearance_requests Staff can view appearance requests for their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view appearance requests for their company" ON public.appearance_requests FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.litigation_matters m
     JOIN public.client_services cs ON ((cs.id = m.client_service_id)))
  WHERE ((m.id = appearance_requests.matter_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: client_services Staff can view company client_services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view company client_services" ON public.client_services FOR SELECT USING (public.can_access_company(auth.uid(), owning_company_id));


--
-- Name: clients Staff can view company clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view company clients" ON public.clients FOR SELECT USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: docuseal_templates Staff can view company docuseal templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view company docuseal templates" ON public.docuseal_templates FOR SELECT USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: tenant_feature_flags Staff can view company feature flags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view company feature flags" ON public.tenant_feature_flags FOR SELECT TO authenticated USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: leads Staff can view company leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view company leads" ON public.leads FOR SELECT TO authenticated USING (public.can_view_leads(auth.uid(), company_id));


--
-- Name: signature_requests Staff can view company signature requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view company signature requests" ON public.signature_requests FOR SELECT USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: tasks Staff can view company tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view company tasks" ON public.tasks FOR SELECT TO authenticated USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: eligibility_reviews Staff can view eligibility reviews for their company leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view eligibility reviews for their company leads" ON public.eligibility_reviews FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = eligibility_reviews.lead_id) AND public.can_access_company(auth.uid(), l.company_id)))));


--
-- Name: entity_communications Staff can view entity comms in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view entity comms in their company" ON public.entity_communications FOR SELECT TO authenticated USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: signature_events Staff can view events for accessible requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view events for accessible requests" ON public.signature_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.signature_requests sr
  WHERE ((sr.id = signature_events.request_id) AND public.can_access_company(auth.uid(), sr.company_id)))));


--
-- Name: filing_fees Staff can view filing fees for their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view filing fees for their company" ON public.filing_fees FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.litigation_matters m
     JOIN public.client_services cs ON ((cs.id = m.client_service_id)))
  WHERE ((m.id = filing_fees.matter_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: lead_budgets Staff can view lead budgets in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view lead budgets in their company" ON public.lead_budgets FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.leads l
     JOIN public.staff s ON ((s.company_id = l.company_id)))
  WHERE ((l.id = lead_budgets.lead_id) AND (s.user_id = auth.uid())))));


--
-- Name: lead_documents Staff can view lead documents in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view lead documents in their company" ON public.lead_documents FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.leads l
     JOIN public.staff s ON ((s.company_id = l.company_id)))
  WHERE ((l.id = lead_documents.lead_id) AND (s.user_id = auth.uid())))));


--
-- Name: lead_assignment_log Staff can view logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view logs" ON public.lead_assignment_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = lead_assignment_log.lead_id) AND (l.company_id = public.get_user_company_id(auth.uid()))))));


--
-- Name: payment_schedules Staff can view payment schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view payment schedules" ON public.payment_schedules FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.client_services cs
  WHERE ((cs.id = payment_schedules.client_service_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));


--
-- Name: lead_assignment_pool Staff can view pools; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pools" ON public.lead_assignment_pool FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.lead_assignment_rules r
  WHERE ((r.id = lead_assignment_pool.rule_id) AND (r.company_id = public.get_user_company_id(auth.uid()))))));


--
-- Name: lead_assignment_queue Staff can view queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view queue" ON public.lead_assignment_queue FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = lead_assignment_queue.lead_id) AND (l.company_id = public.get_user_company_id(auth.uid()))))));


--
-- Name: assignments Staff can view relevant assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view relevant assignments" ON public.assignments FOR SELECT TO authenticated USING ((staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE public.can_access_company(auth.uid(), staff.company_id))));


--
-- Name: signature_signers Staff can view signers for accessible requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view signers for accessible requests" ON public.signature_signers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.signature_requests sr
  WHERE ((sr.id = signature_signers.request_id) AND public.can_access_company(auth.uid(), sr.company_id)))));


--
-- Name: deadline_reminders Staff can view their reminders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view their reminders" ON public.deadline_reminders FOR SELECT TO authenticated USING ((staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.user_id = auth.uid()))));


--
-- Name: workflow_executions Staff can view workflow executions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view workflow executions" ON public.workflow_executions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.workflow_rules r
  WHERE ((r.id = workflow_executions.rule_id) AND (r.company_id = public.get_user_company_id(auth.uid()))))));


--
-- Name: nsf_retry_policies Staff manage NSF policies in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff manage NSF policies in their company" ON public.nsf_retry_policies TO authenticated USING (public.can_access_company(auth.uid(), company_id)) WITH CHECK (public.can_access_company(auth.uid(), company_id));


--
-- Name: system_audit_log Staff read audit events in accessible companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff read audit events in accessible companies" ON public.system_audit_log FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR ((company_id IS NOT NULL) AND public.can_access_company(auth.uid(), company_id))));


--
-- Name: dialpad_calls Staff read dialpad calls within company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff read dialpad calls within company" ON public.dialpad_calls FOR SELECT TO authenticated USING (public.can_access_company(auth.uid(), company_id));


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
-- Name: feature_requests Submitters and admins can view feature requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Submitters and admins can view feature requests" ON public.feature_requests FOR SELECT TO authenticated USING (((auth.uid() = submitted_by) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: plsa_sync_log System can insert sync logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert sync logs" ON public.plsa_sync_log FOR INSERT WITH CHECK (true);


--
-- Name: workflow_executions System can insert workflow executions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert workflow executions" ON public.workflow_executions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.workflow_rules r
  WHERE ((r.id = workflow_executions.rule_id) AND (r.company_id = public.get_user_company_id(auth.uid()))))));


--
-- Name: terminology_presets Terminology presets managed by admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Terminology presets managed by admin" ON public.terminology_presets TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: terminology_presets Terminology presets readable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Terminology presets readable by authenticated" ON public.terminology_presets FOR SELECT TO authenticated USING (true);


--
-- Name: litigation_teams Users can create litigation teams in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create litigation teams in their company" ON public.litigation_teams FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.company_id = litigation_teams.company_id)))));


--
-- Name: template_categories Users can create template categories in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create template categories in their company" ON public.template_categories FOR INSERT WITH CHECK (public.can_access_company(auth.uid(), company_id));


--
-- Name: template_versions Users can create template versions for their company's template; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create template versions for their company's template" ON public.template_versions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.templates t
  WHERE ((t.id = template_versions.template_id) AND public.can_access_company(auth.uid(), t.company_id)))));


--
-- Name: templates Users can create templates in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create templates in their company" ON public.templates FOR INSERT WITH CHECK (public.can_access_company(auth.uid(), company_id));


--
-- Name: workflow_groups Users can create workflow groups in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create workflow groups in their company" ON public.workflow_groups FOR INSERT WITH CHECK (public.can_access_company(auth.uid(), company_id));


--
-- Name: lead_assignment_rules Users can delete company rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete company rules" ON public.lead_assignment_rules FOR DELETE USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: lead_scoring_profiles Users can delete company scoring profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete company scoring profiles" ON public.lead_scoring_profiles FOR DELETE TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: workflow_rules Users can delete company workflow rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete company workflow rules" ON public.workflow_rules FOR DELETE TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: billing_entries Users can delete draft billing entries in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete draft billing entries in their company" ON public.billing_entries FOR DELETE USING (((status = 'draft'::public.billing_entry_status) AND (EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.company_id = billing_entries.company_id))))));


--
-- Name: litigation_teams Users can delete litigation teams in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete litigation teams in their company" ON public.litigation_teams FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.company_id = litigation_teams.company_id)))));


--
-- Name: litigation_team_members Users can delete team members in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete team members in their company" ON public.litigation_team_members FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.litigation_teams lt
     JOIN public.staff s ON ((s.company_id = lt.company_id)))
  WHERE ((lt.id = litigation_team_members.team_id) AND (s.user_id = auth.uid())))));


--
-- Name: templates Users can delete their company's non-system templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their company's non-system templates" ON public.templates FOR DELETE USING ((public.can_access_company(auth.uid(), company_id) AND (is_system = false)));


--
-- Name: template_categories Users can delete their company's template categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their company's template categories" ON public.template_categories FOR DELETE USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: workflow_groups Users can delete workflow groups in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete workflow groups in their company" ON public.workflow_groups FOR DELETE USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: billing_entries Users can insert billing entries in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert billing entries in their company" ON public.billing_entries FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.company_id = billing_entries.company_id)))));


--
-- Name: lead_assignment_rules Users can insert company rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert company rules" ON public.lead_assignment_rules FOR INSERT WITH CHECK ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: lead_scoring_profiles Users can insert company scoring profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert company scoring profiles" ON public.lead_scoring_profiles FOR INSERT TO authenticated WITH CHECK ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: reminder_settings Users can insert company settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert company settings" ON public.reminder_settings FOR INSERT TO authenticated WITH CHECK ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: workflow_rules Users can insert company workflow rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert company workflow rules" ON public.workflow_rules FOR INSERT TO authenticated WITH CHECK ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: notification_preferences Users can insert own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own preferences" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: template_usages Users can log template usages for their company's templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can log template usages for their company's templates" ON public.template_usages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.templates t
  WHERE ((t.id = template_usages.template_id) AND public.can_access_company(auth.uid(), t.company_id)))));


--
-- Name: litigation_team_members Users can manage team members in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage team members in their company" ON public.litigation_team_members FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.litigation_teams lt
     JOIN public.staff s ON ((s.company_id = lt.company_id)))
  WHERE ((lt.id = litigation_team_members.team_id) AND (s.user_id = auth.uid())))));


--
-- Name: role_permissions Users can read permissions for their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read permissions for their own roles" ON public.role_permissions FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: role_special_permissions Users can read special permissions for their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read special permissions for their own roles" ON public.role_special_permissions FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: billing_entries Users can update billing entries in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update billing entries in their company" ON public.billing_entries FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.company_id = billing_entries.company_id)))));


--
-- Name: lead_assignment_rules Users can update company rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update company rules" ON public.lead_assignment_rules FOR UPDATE USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: lead_scoring_profiles Users can update company scoring profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update company scoring profiles" ON public.lead_scoring_profiles FOR UPDATE TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: workflow_rules Users can update company workflow rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update company workflow rules" ON public.workflow_rules FOR UPDATE TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: litigation_teams Users can update litigation teams in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update litigation teams in their company" ON public.litigation_teams FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.company_id = litigation_teams.company_id)))));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: notification_preferences Users can update own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own preferences" ON public.notification_preferences FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: feature_requests Users can update own requests or admins any; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own requests or admins any" ON public.feature_requests FOR UPDATE TO authenticated USING (((auth.uid() = submitted_by) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: litigation_team_members Users can update team members in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update team members in their company" ON public.litigation_team_members FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.litigation_teams lt
     JOIN public.staff s ON ((s.company_id = lt.company_id)))
  WHERE ((lt.id = litigation_team_members.team_id) AND (s.user_id = auth.uid())))));


--
-- Name: template_categories Users can update their company's template categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their company's template categories" ON public.template_categories FOR UPDATE USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: templates Users can update their company's templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their company's templates" ON public.templates FOR UPDATE USING ((public.can_access_company(auth.uid(), company_id) AND (is_system = false)));


--
-- Name: workflow_groups Users can update workflow groups in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update workflow groups in their company" ON public.workflow_groups FOR UPDATE USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: billing_entries Users can view billing entries in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view billing entries in their company" ON public.billing_entries FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.company_id = billing_entries.company_id)))));


--
-- Name: lead_assignment_rules Users can view company rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view company rules" ON public.lead_assignment_rules FOR SELECT USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: lead_scoring_profiles Users can view company scoring profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view company scoring profiles" ON public.lead_scoring_profiles FOR SELECT TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: reminder_settings Users can view company settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view company settings" ON public.reminder_settings FOR SELECT TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: workflow_rules Users can view company workflow rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view company workflow rules" ON public.workflow_rules FOR SELECT TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: litigation_teams Users can view litigation teams in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view litigation teams in their company" ON public.litigation_teams FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.company_id = litigation_teams.company_id)))));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: notification_preferences Users can view own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own preferences" ON public.notification_preferences FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: litigation_team_members Users can view team members in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view team members in their company" ON public.litigation_team_members FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.litigation_teams lt
     JOIN public.staff s ON ((s.company_id = lt.company_id)))
  WHERE ((lt.id = litigation_team_members.team_id) AND (s.user_id = auth.uid())))));


--
-- Name: template_usages Users can view template usages for their company's templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view template usages for their company's templates" ON public.template_usages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.templates t
  WHERE ((t.id = template_usages.template_id) AND public.can_access_company(auth.uid(), t.company_id)))));


--
-- Name: template_versions Users can view template versions for their company's templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view template versions for their company's templates" ON public.template_versions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.templates t
  WHERE ((t.id = template_versions.template_id) AND public.can_access_company(auth.uid(), t.company_id)))));


--
-- Name: template_categories Users can view their company's template categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their company's template categories" ON public.template_categories FOR SELECT USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: templates Users can view their company's templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their company's templates" ON public.templates FOR SELECT USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: workflow_groups Users can view workflow groups in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view workflow groups in their company" ON public.workflow_groups FOR SELECT USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: creditor_responses Users delete company creditor responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users delete company creditor responses" ON public.creditor_responses FOR DELETE TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: creditor_responses Users insert company creditor responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users insert company creditor responses" ON public.creditor_responses FOR INSERT TO authenticated WITH CHECK ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: template_usage Users log template usage for their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users log template usage for their company" ON public.template_usage FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.templates t
  WHERE ((t.id = template_usage.template_id) AND public.can_access_company(auth.uid(), t.company_id)))));


--
-- Name: creditor_responses Users update company creditor responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update company creditor responses" ON public.creditor_responses FOR UPDATE TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: creditor_responses Users view company creditor responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view company creditor responses" ON public.creditor_responses FOR SELECT TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: graduation_automation_config Users view company graduation config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view company graduation config" ON public.graduation_automation_config FOR SELECT TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: graduation_events Users view company graduation events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view company graduation events" ON public.graduation_events FOR SELECT TO authenticated USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: template_usage Users view template usage for their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view template usage for their company" ON public.template_usage FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.templates t
  WHERE ((t.id = template_usage.template_id) AND public.can_access_company(auth.uid(), t.company_id)))));


--
-- Name: webhook_endpoints Webhook endpoints admin delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Webhook endpoints admin delete" ON public.webhook_endpoints FOR DELETE TO authenticated USING ((public.can_access_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: webhook_endpoints Webhook endpoints admin insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Webhook endpoints admin insert" ON public.webhook_endpoints FOR INSERT TO authenticated WITH CHECK ((public.can_access_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: webhook_endpoints Webhook endpoints admin update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Webhook endpoints admin update" ON public.webhook_endpoints FOR UPDATE TO authenticated USING ((public.can_access_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK ((public.can_access_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: webhook_endpoints Webhook endpoints readable by company staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Webhook endpoints readable by company staff" ON public.webhook_endpoints FOR SELECT TO authenticated USING (public.can_access_company(auth.uid(), company_id));


--
-- Name: appearance_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.appearance_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.billing_entries ENABLE ROW LEVEL SECURITY;

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
-- Name: companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: company_integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: company_processor_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_processor_configs ENABLE ROW LEVEL SECURITY;

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
-- Name: deadline_reminders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deadline_reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: dialpad_calls; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dialpad_calls ENABLE ROW LEVEL SECURITY;

--
-- Name: docuseal_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.docuseal_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: domain_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;

--
-- Name: eligibility_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.eligibility_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: email_send_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

--
-- Name: email_send_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

--
-- Name: email_unsubscribe_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: entity_communications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.entity_communications ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: filing_fees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.filing_fees ENABLE ROW LEVEL SECURITY;

--
-- Name: graduation_automation_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.graduation_automation_config ENABLE ROW LEVEL SECURITY;

--
-- Name: graduation_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.graduation_events ENABLE ROW LEVEL SECURITY;

--
-- Name: integration_event_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integration_event_log ENABLE ROW LEVEL SECURITY;

--
-- Name: integration_providers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integration_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: job_titles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.job_titles ENABLE ROW LEVEL SECURITY;

--
-- Name: law_firm_contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.law_firm_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: law_firms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.law_firms ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_assignment_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_assignment_log ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_assignment_pool; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_assignment_pool ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_assignment_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_assignment_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_assignment_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_assignment_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_banking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_banking ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_budgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_budgets ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_debts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_debts ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_disclosures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_disclosures ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_scoring_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_scoring_profiles ENABLE ROW LEVEL SECURITY;

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
-- Name: litigation_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.litigation_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: litigation_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.litigation_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: litigation_hearings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.litigation_hearings ENABLE ROW LEVEL SECURITY;

--
-- Name: litigation_matters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.litigation_matters ENABLE ROW LEVEL SECURITY;

--
-- Name: litigation_team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.litigation_team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: litigation_teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.litigation_teams ENABLE ROW LEVEL SECURITY;

--
-- Name: note_mentions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.note_mentions ENABLE ROW LEVEL SECURITY;

--
-- Name: notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: nsf_retry_policies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nsf_retry_policies ENABLE ROW LEVEL SECURITY;

--
-- Name: outbound_webhook_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.outbound_webhook_log ENABLE ROW LEVEL SECURITY;

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
-- Name: reminder_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: report_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: role_special_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.role_special_permissions ENABLE ROW LEVEL SECURITY;

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
-- Name: signature_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.signature_events ENABLE ROW LEVEL SECURITY;

--
-- Name: signature_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: signature_signers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.signature_signers ENABLE ROW LEVEL SECURITY;

--
-- Name: staff; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

--
-- Name: suppressed_emails; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

--
-- Name: system_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: task_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: template_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: template_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.template_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: template_usages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.template_usages ENABLE ROW LEVEL SECURITY;

--
-- Name: template_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_feature_flags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_feature_flags ENABLE ROW LEVEL SECURITY;

--
-- Name: terminology_presets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.terminology_presets ENABLE ROW LEVEL SECURITY;

--
-- Name: transaction_retry_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transaction_retry_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_endpoints; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_executions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict rN5Dva3n9Ni1mnPh9WyS9NA8D8BbZ1JVuqItqHQHbEkqmdcrdOVAIxyKQrgivpz

