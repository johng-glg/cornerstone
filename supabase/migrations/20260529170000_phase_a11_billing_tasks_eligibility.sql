-- Phase A11 — Billing + tasks + eligibility + remaining tables (ADR-001 baseline, curated
-- verbatim from the authoritative reference dump). The FINAL schema phase — completes the full
-- 94-table reference surface. Layers on A3→A10.
--
-- Tables (6): billing_entries, tasks, task_templates, eligibility_reviews, job_titles,
--   feature_requests — with 10 new enums, indexes, RLS, audit + updated_at triggers, grants.
-- Function: notify_task_assignment() (deferred from A10 — its trigger needs `tasks`).
--
-- Re-adds the A10-deferred trg_notify_task_assignment on public.tasks (captured here as a
--   trigger on an in-phase table). billing_entries.litigation_matter_id -> litigation_matters
--   is created here as a normal FK (litigation_matters exists since A8).
--
-- No deferrals: every FK target already exists. Schema-diff verified (scoped to A11).
-- Forward-only; rollback inline.

-- ===== Enums (new for A11) =====
CREATE TYPE public.billing_entry_status AS ENUM (
    'draft',
    'approved',
    'invoiced',
    'paid'
);
CREATE TYPE public.billing_entry_type AS ENUM (
    'time',
    'expense'
);
CREATE TYPE public.department_new AS ENUM (
    'administration',
    'legal',
    'negotiations',
    'sales',
    'client_services',
    'operations',
    'eligibility'
);
CREATE TYPE public.feature_request_category AS ENUM (
    'workflow_gap',
    'missing_field',
    'ui_improvement',
    'new_feature',
    'integration',
    'reporting',
    'other'
);
CREATE TYPE public.feature_request_priority AS ENUM (
    'critical',
    'high',
    'medium',
    'low'
);
CREATE TYPE public.feature_request_status AS ENUM (
    'submitted',
    'under_review',
    'planned',
    'in_progress',
    'completed',
    'declined'
);
CREATE TYPE public.feature_request_type AS ENUM (
    'existing_workflow',
    'future_improvement'
);
CREATE TYPE public.task_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);
CREATE TYPE public.task_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'cancelled'
);
CREATE TYPE public.task_type AS ENUM (
    'follow_up',
    'document_review',
    'court_deadline',
    'settlement_negotiation',
    'client_call',
    'general'
);

-- ===== Tables =====
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
CREATE TABLE public.job_titles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role public.app_role NOT NULL,
    title text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
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

-- ===== Primary keys =====
ALTER TABLE ONLY public.billing_entries
    ADD CONSTRAINT billing_entries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.eligibility_reviews
    ADD CONSTRAINT eligibility_reviews_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.feature_requests
    ADD CONSTRAINT feature_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.job_titles
    ADD CONSTRAINT job_titles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);

-- ===== Foreign keys =====
ALTER TABLE ONLY public.billing_entries
    ADD CONSTRAINT billing_entries_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);
ALTER TABLE ONLY public.billing_entries
    ADD CONSTRAINT billing_entries_client_service_id_fkey FOREIGN KEY (client_service_id) REFERENCES public.client_services(id);
ALTER TABLE ONLY public.billing_entries
    ADD CONSTRAINT billing_entries_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);
ALTER TABLE ONLY public.billing_entries
    ADD CONSTRAINT billing_entries_litigation_matter_id_fkey FOREIGN KEY (litigation_matter_id) REFERENCES public.litigation_matters(id);
ALTER TABLE ONLY public.billing_entries
    ADD CONSTRAINT billing_entries_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);
ALTER TABLE ONLY public.eligibility_reviews
    ADD CONSTRAINT eligibility_reviews_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.eligibility_reviews
    ADD CONSTRAINT eligibility_reviews_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.staff(id);
ALTER TABLE ONLY public.eligibility_reviews
    ADD CONSTRAINT eligibility_reviews_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.staff(id);
ALTER TABLE ONLY public.feature_requests
    ADD CONSTRAINT feature_requests_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);
ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);
ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.staff(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;

-- ===== Indexes =====
CREATE INDEX idx_billing_entries_billing_date ON public.billing_entries USING btree (billing_date);
CREATE INDEX idx_billing_entries_client_id ON public.billing_entries USING btree (client_id);
CREATE INDEX idx_billing_entries_company_id ON public.billing_entries USING btree (company_id);
CREATE INDEX idx_billing_entries_matter_id ON public.billing_entries USING btree (litigation_matter_id);
CREATE INDEX idx_billing_entries_staff_id ON public.billing_entries USING btree (staff_id);
CREATE INDEX idx_billing_entries_status ON public.billing_entries USING btree (status);
CREATE INDEX idx_tasks_assigned ON public.tasks USING btree (assigned_to, status);
CREATE INDEX idx_tasks_entity ON public.tasks USING btree (entity_type, entity_id);

-- ===== Functions =====
CREATE FUNCTION public.notify_task_assignment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _assignee_user_id UUID;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
    
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

-- ===== Triggers =====
CREATE TRIGGER trg_audit_billing_entries AFTER INSERT OR DELETE OR UPDATE ON public.billing_entries FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER trg_audit_eligibility_reviews AFTER INSERT OR DELETE OR UPDATE ON public.eligibility_reviews FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER trg_notify_task_assignment AFTER INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();
CREATE TRIGGER update_billing_entries_updated_at BEFORE UPDATE ON public.billing_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_eligibility_reviews_updated_at BEFORE UPDATE ON public.eligibility_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_feature_requests_updated_at BEFORE UPDATE ON public.feature_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_task_templates_updated_at BEFORE UPDATE ON public.task_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Row level security =====
ALTER TABLE public.billing_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eligibility_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ===== Policies =====
CREATE POLICY "Admins can delete feature requests" ON public.feature_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete task templates" ON public.task_templates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can insert task templates" ON public.task_templates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can manage job titles" ON public.job_titles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update task templates" ON public.task_templates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Authenticated users can create feature requests" ON public.feature_requests FOR INSERT TO authenticated WITH CHECK ((auth.uid() = submitted_by));
CREATE POLICY "Authenticated users can read task templates" ON public.task_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view job titles" ON public.job_titles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create eligibility reviews" ON public.eligibility_reviews FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.leads l
     JOIN public.staff s ON ((s.company_id = l.company_id)))
  WHERE ((l.id = eligibility_reviews.lead_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Staff can manage company tasks" ON public.tasks TO authenticated USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Staff can update eligibility reviews" ON public.eligibility_reviews FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = eligibility_reviews.lead_id) AND public.can_access_company(auth.uid(), l.company_id)))));
CREATE POLICY "Staff can view company tasks" ON public.tasks FOR SELECT TO authenticated USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Staff can view eligibility reviews for their company leads" ON public.eligibility_reviews FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.leads l
  WHERE ((l.id = eligibility_reviews.lead_id) AND public.can_access_company(auth.uid(), l.company_id)))));
CREATE POLICY "Submitters and admins can view feature requests" ON public.feature_requests FOR SELECT TO authenticated USING (((auth.uid() = submitted_by) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Users can delete draft billing entries in their company" ON public.billing_entries FOR DELETE USING (((status = 'draft'::public.billing_entry_status) AND (EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.company_id = billing_entries.company_id))))));
CREATE POLICY "Users can insert billing entries in their company" ON public.billing_entries FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.company_id = billing_entries.company_id)))));
CREATE POLICY "Users can update billing entries in their company" ON public.billing_entries FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.company_id = billing_entries.company_id)))));
CREATE POLICY "Users can update own requests or admins any" ON public.feature_requests FOR UPDATE TO authenticated USING (((auth.uid() = submitted_by) OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Users can view billing entries in their company" ON public.billing_entries FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.staff s
  WHERE ((s.user_id = auth.uid()) AND (s.company_id = billing_entries.company_id)))));

-- ===== Grants (explicit; pg_dump --no-privileges excludes these from the schema-diff) =====
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.billing_entries, public.tasks, public.task_templates, public.eligibility_reviews,
  public.job_titles, public.feature_requests TO authenticated;
GRANT ALL ON
  public.billing_entries, public.tasks, public.task_templates, public.eligibility_reviews,
  public.job_titles, public.feature_requests TO service_role;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- DROP TABLE IF EXISTS public.feature_requests CASCADE;
-- DROP TABLE IF EXISTS public.job_titles CASCADE;
-- DROP TABLE IF EXISTS public.eligibility_reviews CASCADE;
-- DROP TABLE IF EXISTS public.task_templates CASCADE;
-- DROP TABLE IF EXISTS public.tasks CASCADE;          -- (drops trg_notify_task_assignment)
-- DROP TABLE IF EXISTS public.billing_entries CASCADE;
-- DROP FUNCTION IF EXISTS public.notify_task_assignment();
-- DROP TYPE IF EXISTS public.task_type;
-- DROP TYPE IF EXISTS public.task_status;
-- DROP TYPE IF EXISTS public.task_priority;
-- DROP TYPE IF EXISTS public.feature_request_type;
-- DROP TYPE IF EXISTS public.feature_request_status;
-- DROP TYPE IF EXISTS public.feature_request_priority;
-- DROP TYPE IF EXISTS public.feature_request_category;
-- DROP TYPE IF EXISTS public.department_new;
-- DROP TYPE IF EXISTS public.billing_entry_type;
-- DROP TYPE IF EXISTS public.billing_entry_status;
