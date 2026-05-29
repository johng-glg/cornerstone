-- Phase A10 — Email infra + templates + e-signatures + notifications + notes
-- (ADR-001 baseline, curated verbatim from the authoritative reference dump). Layers on A3→A9.
--
-- Templates (7): templates, template_versions, template_categories, template_usage,
--   template_usages, terminology_presets, report_templates.
-- Email (4): email_send_log, email_send_state, email_unsubscribe_tokens, suppressed_emails.
-- Signatures (4): signature_requests, signature_signers, signature_events, docuseal_templates.
-- Notifications (2) + Notes (2): notifications, notification_preferences, notes, note_mentions.
--
-- Functions (8): create_notification, get_company_terminology, notify_matter_assignment,
--   notify_note_mention, and the pgmq email queue (enqueue_email, delete_email,
--   read_email_batch, move_to_dlq).
-- Re-adds: the A9-deferred trg_notify_matter_assignment on public.assignments (now that
--   notify_matter_assignment() exists) and the A8-deferred deadline_reminders.notification_id
--   FK -> public.notifications (now that notifications exists).
--
-- Intentional deferrals (re-added by their owning phases):
--   * notify_task_assignment() + trg_notify_task_assignment on public.tasks (A11: needs tasks).
--
-- pgmq backs the email queue; the extension is created here (stripped + stubbed in the local
-- harness, real on Supabase Cloud / CI). Schema-diff verified vs reference (scoped to A10).
-- Forward-only; rollback inline.

CREATE EXTENSION IF NOT EXISTS pgmq;



-- ===== Enums (new for A10) =====
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
CREATE TYPE public.signer_status AS ENUM (
    'pending',
    'sent',
    'viewed',
    'signed',
    'declined'
);
CREATE TYPE public.template_language AS ENUM (
    'en',
    'es'
);
CREATE TYPE public.template_type AS ENUM (
    'email',
    'sms',
    'document'
);

-- ===== Tables =====
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
CREATE TABLE public.terminology_presets (
    preset_key text NOT NULL,
    label_map jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
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
CREATE TABLE public.email_unsubscribe_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    used_at timestamp with time zone
);
CREATE TABLE public.suppressed_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    reason text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT suppressed_emails_reason_check CHECK ((reason = ANY (ARRAY['unsubscribe'::text, 'bounce'::text, 'complaint'::text])))
);
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
CREATE TABLE public.signature_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    signer_id uuid,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
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
CREATE TABLE public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    content text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.note_mentions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    note_id uuid NOT NULL,
    mentioned_staff_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ===== Primary keys =====
ALTER TABLE ONLY public.docuseal_templates
    ADD CONSTRAINT docuseal_templates_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.email_send_log
    ADD CONSTRAINT email_send_log_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.email_send_state
    ADD CONSTRAINT email_send_state_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.email_unsubscribe_tokens
    ADD CONSTRAINT email_unsubscribe_tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.note_mentions
    ADD CONSTRAINT note_mentions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.signature_events
    ADD CONSTRAINT signature_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.signature_requests
    ADD CONSTRAINT signature_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.signature_signers
    ADD CONSTRAINT signature_signers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.suppressed_emails
    ADD CONSTRAINT suppressed_emails_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.template_categories
    ADD CONSTRAINT template_categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.template_usage
    ADD CONSTRAINT template_usage_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.template_usages
    ADD CONSTRAINT template_usages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.template_versions
    ADD CONSTRAINT template_versions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.terminology_presets
    ADD CONSTRAINT terminology_presets_pkey PRIMARY KEY (preset_key);

-- ===== Unique constraints =====
ALTER TABLE ONLY public.email_unsubscribe_tokens
    ADD CONSTRAINT email_unsubscribe_tokens_email_key UNIQUE (email);
ALTER TABLE ONLY public.email_unsubscribe_tokens
    ADD CONSTRAINT email_unsubscribe_tokens_token_key UNIQUE (token);
ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_notification_type_key UNIQUE (user_id, notification_type);
ALTER TABLE ONLY public.signature_requests
    ADD CONSTRAINT signature_requests_short_token_key UNIQUE (short_token);
ALTER TABLE ONLY public.signature_signers
    ADD CONSTRAINT signature_signers_short_token_key UNIQUE (short_token);
ALTER TABLE ONLY public.suppressed_emails
    ADD CONSTRAINT suppressed_emails_email_key UNIQUE (email);
ALTER TABLE ONLY public.template_versions
    ADD CONSTRAINT template_versions_template_id_version_number_key UNIQUE (template_id, version_number);

-- ===== Foreign keys =====
ALTER TABLE ONLY public.docuseal_templates
    ADD CONSTRAINT docuseal_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.note_mentions
    ADD CONSTRAINT note_mentions_mentioned_staff_id_fkey FOREIGN KEY (mentioned_staff_id) REFERENCES public.staff(id);
ALTER TABLE ONLY public.note_mentions
    ADD CONSTRAINT note_mentions_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);
ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);
ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);
ALTER TABLE ONLY public.signature_events
    ADD CONSTRAINT signature_events_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.signature_requests(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.signature_events
    ADD CONSTRAINT signature_events_signer_id_fkey FOREIGN KEY (signer_id) REFERENCES public.signature_signers(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.signature_requests
    ADD CONSTRAINT signature_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.signature_requests
    ADD CONSTRAINT signature_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.signature_requests
    ADD CONSTRAINT signature_requests_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.signature_signers
    ADD CONSTRAINT signature_signers_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.signature_requests(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.template_categories
    ADD CONSTRAINT template_categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.template_usage
    ADD CONSTRAINT template_usage_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.template_usage
    ADD CONSTRAINT template_usage_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.staff(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.template_usages
    ADD CONSTRAINT template_usages_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.template_usages
    ADD CONSTRAINT template_usages_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.staff(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.template_versions
    ADD CONSTRAINT template_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.template_versions
    ADD CONSTRAINT template_versions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.template_categories(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;

-- ===== Indexes =====
CREATE INDEX idx_docuseal_templates_company ON public.docuseal_templates USING btree (company_id);
CREATE INDEX idx_email_send_log_created ON public.email_send_log USING btree (created_at DESC);
CREATE INDEX idx_email_send_log_message ON public.email_send_log USING btree (message_id);
CREATE UNIQUE INDEX idx_email_send_log_message_sent_unique ON public.email_send_log USING btree (message_id) WHERE (status = 'sent'::text);
CREATE INDEX idx_email_send_log_recipient ON public.email_send_log USING btree (recipient_email);
CREATE INDEX idx_note_mentions_note ON public.note_mentions USING btree (note_id);
CREATE INDEX idx_note_mentions_staff ON public.note_mentions USING btree (mentioned_staff_id);
CREATE INDEX idx_notes_created_by ON public.notes USING btree (created_by);
CREATE INDEX idx_notes_entity ON public.notes USING btree (entity_type, entity_id);
CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);
CREATE INDEX idx_signature_events_request ON public.signature_events USING btree (request_id);
CREATE INDEX idx_signature_requests_company ON public.signature_requests USING btree (company_id);
CREATE INDEX idx_signature_requests_entity ON public.signature_requests USING btree (entity_type, entity_id);
CREATE INDEX idx_signature_requests_short_token ON public.signature_requests USING btree (short_token);
CREATE INDEX idx_signature_requests_status ON public.signature_requests USING btree (status);
CREATE INDEX idx_signature_signers_request ON public.signature_signers USING btree (request_id);
CREATE INDEX idx_signature_signers_short_token ON public.signature_signers USING btree (short_token);
CREATE INDEX idx_suppressed_emails_email ON public.suppressed_emails USING btree (email);
CREATE INDEX idx_template_categories_company ON public.template_categories USING btree (company_id);
CREATE INDEX idx_template_usage_entity ON public.template_usage USING btree (entity_type, entity_id);
CREATE INDEX idx_template_usage_template ON public.template_usage USING btree (template_id, used_at DESC);
CREATE INDEX idx_template_usages_entity ON public.template_usages USING btree (entity_type, entity_id);
CREATE INDEX idx_template_usages_template ON public.template_usages USING btree (template_id);
CREATE INDEX idx_template_versions_template ON public.template_versions USING btree (template_id);
CREATE INDEX idx_templates_active ON public.templates USING btree (is_active);
CREATE INDEX idx_templates_category ON public.templates USING btree (category_id);
CREATE INDEX idx_templates_company ON public.templates USING btree (company_id);
CREATE INDEX idx_templates_type ON public.templates USING btree (template_type);
CREATE INDEX idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens USING btree (token);

-- ===== Functions (notifications / terminology / email queue / entity resolver) =====
CREATE FUNCTION public.create_notification(_user_id uuid, _type public.notification_type, _title text, _message text DEFAULT NULL::text, _link text DEFAULT NULL::text, _entity_type text DEFAULT NULL::text, _entity_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _notification_id UUID;
  _in_app_enabled BOOLEAN;
BEGIN
  SELECT COALESCE(in_app_enabled, true) INTO _in_app_enabled
  FROM notification_preferences
  WHERE user_id = _user_id AND notification_type = _type;
  
  _in_app_enabled := COALESCE(_in_app_enabled, true);
  
  IF _in_app_enabled THEN
    INSERT INTO notifications (user_id, type, title, message, link, entity_type, entity_id)
    VALUES (_user_id, _type, _title, _message, _link, _entity_type, _entity_id)
    RETURNING id INTO _notification_id;
  END IF;
  
  RETURN _notification_id;
END;
$$;
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

  SELECT value->'labels' INTO _override
    FROM public.tenant_feature_flags
    WHERE company_id = _company_id AND flag_key = 'terminology.overrides';
  IF _override IS NOT NULL AND jsonb_typeof(_override) = 'object' THEN
    _label_map := _label_map || _override;
  END IF;

  RETURN _label_map;
END;
$$;
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
  SELECT user_id INTO _user_id
  FROM staff WHERE id = NEW.mentioned_staff_id;

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
CREATE FUNCTION public.delete_email(queue_name text, message_id bigint) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;
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

-- ===== Triggers =====
CREATE TRIGGER trigger_notify_note_mention AFTER INSERT ON public.note_mentions FOR EACH ROW EXECUTE FUNCTION public.notify_note_mention();
CREATE TRIGGER update_docuseal_templates_updated_at BEFORE UPDATE ON public.docuseal_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON public.report_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_signature_requests_updated_at BEFORE UPDATE ON public.signature_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_template_categories_updated_at BEFORE UPDATE ON public.template_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Row level security =====
ALTER TABLE public.docuseal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminology_presets ENABLE ROW LEVEL SECURITY;

-- ===== Policies =====
CREATE POLICY "Admins can manage company docuseal templates" ON public.docuseal_templates USING ((public.can_access_company(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Allow notification inserts" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authors can delete their own notes" ON public.notes FOR DELETE TO authenticated USING ((created_by IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.user_id = auth.uid()))));
CREATE POLICY "Authors can update their own notes" ON public.notes FOR UPDATE TO authenticated USING ((created_by IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.user_id = auth.uid()))));
CREATE POLICY "Service role can insert send log" ON public.email_send_log FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "Service role can insert tokens" ON public.email_unsubscribe_tokens FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "Service role can manage send state" ON public.email_send_state USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "Service role can mark tokens as used" ON public.email_unsubscribe_tokens FOR UPDATE USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "Service role can read send log" ON public.email_send_log FOR SELECT USING ((auth.role() = 'service_role'::text));
CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails FOR SELECT USING ((auth.role() = 'service_role'::text));
CREATE POLICY "Service role can read tokens" ON public.email_unsubscribe_tokens FOR SELECT USING ((auth.role() = 'service_role'::text));
CREATE POLICY "Service role can update send log" ON public.email_send_log FOR UPDATE USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));
CREATE POLICY "Staff can access company report templates" ON public.report_templates USING ((((company_id IS NULL) AND (is_preset = true)) OR public.can_access_company(auth.uid(), company_id)));
CREATE POLICY "Staff can create note mentions" ON public.note_mentions FOR INSERT TO authenticated WITH CHECK (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.staff s
  WHERE (s.user_id = auth.uid())))));
CREATE POLICY "Staff can create notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.staff s
  WHERE (s.user_id = auth.uid())))));
CREATE POLICY "Staff can insert events for accessible requests" ON public.signature_events FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.signature_requests sr
  WHERE ((sr.id = signature_events.request_id) AND public.can_access_company(auth.uid(), sr.company_id)))));
CREATE POLICY "Staff can manage company signature requests" ON public.signature_requests USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Staff can manage signers for accessible requests" ON public.signature_signers USING ((EXISTS ( SELECT 1
   FROM public.signature_requests sr
  WHERE ((sr.id = signature_signers.request_id) AND public.can_access_company(auth.uid(), sr.company_id)))));
CREATE POLICY "Staff can read note mentions for their company" ON public.note_mentions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.notes n
  WHERE ((n.id = note_mentions.note_id) AND public.can_access_company(auth.uid(), public.resolve_entity_company_id(n.entity_type, n.entity_id))))));
CREATE POLICY "Staff can read notes for their company" ON public.notes FOR SELECT TO authenticated USING (public.can_access_company(auth.uid(), public.resolve_entity_company_id(entity_type, entity_id)));
CREATE POLICY "Staff can view company docuseal templates" ON public.docuseal_templates FOR SELECT USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Staff can view company signature requests" ON public.signature_requests FOR SELECT USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Staff can view events for accessible requests" ON public.signature_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.signature_requests sr
  WHERE ((sr.id = signature_events.request_id) AND public.can_access_company(auth.uid(), sr.company_id)))));
CREATE POLICY "Staff can view signers for accessible requests" ON public.signature_signers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.signature_requests sr
  WHERE ((sr.id = signature_signers.request_id) AND public.can_access_company(auth.uid(), sr.company_id)))));
CREATE POLICY "Terminology presets managed by admin" ON public.terminology_presets TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Terminology presets readable by authenticated" ON public.terminology_presets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create template categories in their company" ON public.template_categories FOR INSERT WITH CHECK (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Users can create template versions for their company's template" ON public.template_versions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.templates t
  WHERE ((t.id = template_versions.template_id) AND public.can_access_company(auth.uid(), t.company_id)))));
CREATE POLICY "Users can create templates in their company" ON public.templates FOR INSERT WITH CHECK (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Users can delete their company's non-system templates" ON public.templates FOR DELETE USING ((public.can_access_company(auth.uid(), company_id) AND (is_system = false)));
CREATE POLICY "Users can delete their company's template categories" ON public.template_categories FOR DELETE USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Users can insert own preferences" ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can log template usages for their company's templates" ON public.template_usages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.templates t
  WHERE ((t.id = template_usages.template_id) AND public.can_access_company(auth.uid(), t.company_id)))));
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can update own preferences" ON public.notification_preferences FOR UPDATE TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can update their company's template categories" ON public.template_categories FOR UPDATE USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Users can update their company's templates" ON public.templates FOR UPDATE USING ((public.can_access_company(auth.uid(), company_id) AND (is_system = false)));
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view own preferences" ON public.notification_preferences FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Users can view template usages for their company's templates" ON public.template_usages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.templates t
  WHERE ((t.id = template_usages.template_id) AND public.can_access_company(auth.uid(), t.company_id)))));
CREATE POLICY "Users can view template versions for their company's templates" ON public.template_versions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.templates t
  WHERE ((t.id = template_versions.template_id) AND public.can_access_company(auth.uid(), t.company_id)))));
CREATE POLICY "Users can view their company's template categories" ON public.template_categories FOR SELECT USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Users can view their company's templates" ON public.templates FOR SELECT USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Users log template usage for their company" ON public.template_usage FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.templates t
  WHERE ((t.id = template_usage.template_id) AND public.can_access_company(auth.uid(), t.company_id)))));
CREATE POLICY "Users view template usage for their company" ON public.template_usage FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.templates t
  WHERE ((t.id = template_usage.template_id) AND public.can_access_company(auth.uid(), t.company_id)))));

-- ===== Re-adds (A8 deadline_reminders.notification_id FK + A9 trg_notify_matter_assignment) =====
ALTER TABLE ONLY public.deadline_reminders
    ADD CONSTRAINT deadline_reminders_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id);
CREATE TRIGGER trg_notify_matter_assignment AFTER INSERT ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.notify_matter_assignment();

-- ===== Grants (explicit; pg_dump --no-privileges excludes these from the schema-diff) =====
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.templates, public.template_versions, public.template_categories, public.template_usage,
  public.template_usages, public.terminology_presets, public.report_templates,
  public.email_send_state, public.signature_requests, public.signature_signers,
  public.docuseal_templates, public.notifications, public.notification_preferences,
  public.notes, public.note_mentions TO authenticated;
-- Append-mostly logs / event surfaces.
GRANT SELECT, INSERT ON public.email_send_log, public.signature_events,
  public.email_unsubscribe_tokens, public.suppressed_emails TO authenticated;
GRANT ALL ON
  public.templates, public.template_versions, public.template_categories, public.template_usage,
  public.template_usages, public.terminology_presets, public.report_templates,
  public.email_send_log, public.email_send_state, public.email_unsubscribe_tokens,
  public.suppressed_emails, public.signature_requests, public.signature_signers,
  public.signature_events, public.docuseal_templates, public.notifications,
  public.notification_preferences, public.notes, public.note_mentions TO service_role;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- ALTER TABLE public.deadline_reminders DROP CONSTRAINT IF EXISTS deadline_reminders_notification_id_fkey;
-- DROP TRIGGER IF EXISTS trg_notify_matter_assignment ON public.assignments;
-- DROP TABLE IF EXISTS public.note_mentions CASCADE;
-- DROP TABLE IF EXISTS public.notes CASCADE;
-- DROP TABLE IF EXISTS public.notification_preferences CASCADE;
-- DROP TABLE IF EXISTS public.notifications CASCADE;
-- DROP TABLE IF EXISTS public.docuseal_templates CASCADE;
-- DROP TABLE IF EXISTS public.signature_events CASCADE;
-- DROP TABLE IF EXISTS public.signature_signers CASCADE;
-- DROP TABLE IF EXISTS public.signature_requests CASCADE;
-- DROP TABLE IF EXISTS public.suppressed_emails CASCADE;
-- DROP TABLE IF EXISTS public.email_unsubscribe_tokens CASCADE;
-- DROP TABLE IF EXISTS public.email_send_state CASCADE;
-- DROP TABLE IF EXISTS public.email_send_log CASCADE;
-- DROP TABLE IF EXISTS public.report_templates CASCADE;
-- DROP TABLE IF EXISTS public.terminology_presets CASCADE;
-- DROP TABLE IF EXISTS public.template_usages CASCADE;
-- DROP TABLE IF EXISTS public.template_usage CASCADE;
-- DROP TABLE IF EXISTS public.template_categories CASCADE;
-- DROP TABLE IF EXISTS public.template_versions CASCADE;
-- DROP TABLE IF EXISTS public.templates CASCADE;
-- DROP FUNCTION IF EXISTS public.move_to_dlq(text,text,bigint,jsonb);
-- DROP FUNCTION IF EXISTS public.read_email_batch(text,integer,integer);
-- DROP FUNCTION IF EXISTS public.delete_email(text,bigint);
-- DROP FUNCTION IF EXISTS public.enqueue_email(text,jsonb);
-- DROP FUNCTION IF EXISTS public.notify_note_mention();
-- DROP FUNCTION IF EXISTS public.notify_matter_assignment();
-- DROP FUNCTION IF EXISTS public.get_company_terminology(uuid);
-- DROP FUNCTION IF EXISTS public.create_notification(uuid,public.notification_type,text,text,text,text,uuid);
-- DROP TYPE IF EXISTS public.template_type;
-- DROP TYPE IF EXISTS public.template_language;
-- DROP TYPE IF EXISTS public.signer_status;
-- DROP TYPE IF EXISTS public.signature_request_status;
-- DROP TYPE IF EXISTS public.notification_type;
