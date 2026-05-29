-- Phase A8 — Litigation domain + storage hardening (ADR-001 baseline, from reference).
-- Tables (11): law_firms, law_firm_contacts, litigation_teams, litigation_matters,
--   litigation_team_members, litigation_activities, litigation_documents, litigation_hearings,
--   appearance_requests, filing_fees, deadline_reminders.
-- Storage hardening: can_access_storage_object() helper + private document buckets
--   (client-documents / lead-documents / litigation-documents) + storage.objects RLS.
-- Helpers reused from A3: can_access_company / has_role / get_user_company_id /
--   update_updated_at_column / audit_trigger_fn / log_audit_event. Forward-only.
--
-- Intentional deferrals (re-added by their owning phases, see CHANGELOG):
--   * deadline_reminders.notification_id -> notifications(id) FK — `notifications` lands later.
--   * generate_deadline_reminders() RPC — depends on reminder_settings + assignments (later phase).

-- ===== Enums =====
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

CREATE TYPE public.appearance_request_status AS ENUM (
    'pending',
    'approved',
    'assigned',
    'completed',
    'cancelled'
);

CREATE TYPE public.filing_fee_status AS ENUM (
    'pending',
    'submitted_to_client',
    'approved',
    'declined',
    'paid'
);

CREATE TYPE public.reminder_type AS ENUM (
    'response_deadline',
    'hearing',
    'task_due'
);

CREATE TYPE public.reminder_status AS ENUM (
    'pending',
    'sent',
    'failed',
    'skipped'
);

-- ===== Tables (dependency order) =====

-- law_firms (global / non-company-scoped reference data)
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

CREATE TABLE public.litigation_team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

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

-- ===== Primary keys =====
ALTER TABLE ONLY public.law_firms ADD CONSTRAINT law_firms_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.law_firm_contacts ADD CONSTRAINT law_firm_contacts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.litigation_teams ADD CONSTRAINT litigation_teams_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.litigation_matters ADD CONSTRAINT litigation_matters_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.litigation_team_members ADD CONSTRAINT litigation_team_members_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.litigation_activities ADD CONSTRAINT litigation_activities_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.litigation_documents ADD CONSTRAINT litigation_documents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.litigation_hearings ADD CONSTRAINT litigation_hearings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.appearance_requests ADD CONSTRAINT appearance_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.filing_fees ADD CONSTRAINT filing_fees_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.deadline_reminders ADD CONSTRAINT deadline_reminders_pkey PRIMARY KEY (id);

-- ===== Unique constraints =====
ALTER TABLE ONLY public.litigation_team_members
    ADD CONSTRAINT litigation_team_members_staff_id_key UNIQUE (staff_id);
ALTER TABLE ONLY public.deadline_reminders
    ADD CONSTRAINT deadline_reminders_reminder_type_entity_id_staff_id_days_be_key UNIQUE (reminder_type, entity_id, staff_id, days_before);

-- ===== Foreign keys (in-set + satisfied cross-domain refs) =====
ALTER TABLE ONLY public.law_firm_contacts
    ADD CONSTRAINT law_firm_contacts_law_firm_id_fkey FOREIGN KEY (law_firm_id) REFERENCES public.law_firms(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.litigation_teams
    ADD CONSTRAINT litigation_teams_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.litigation_matters
    ADD CONSTRAINT litigation_matters_client_service_id_fkey FOREIGN KEY (client_service_id) REFERENCES public.client_services(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.litigation_matters
    ADD CONSTRAINT litigation_matters_liability_id_fkey FOREIGN KEY (liability_id) REFERENCES public.liabilities(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.litigation_matters
    ADD CONSTRAINT litigation_matters_opposing_contact_id_fkey FOREIGN KEY (opposing_contact_id) REFERENCES public.creditor_contacts(id);
ALTER TABLE ONLY public.litigation_matters
    ADD CONSTRAINT litigation_matters_opposing_counsel_id_fkey FOREIGN KEY (opposing_counsel_id) REFERENCES public.law_firm_contacts(id);
ALTER TABLE ONLY public.litigation_matters
    ADD CONSTRAINT litigation_matters_opposing_creditor_id_fkey FOREIGN KEY (opposing_creditor_id) REFERENCES public.creditors(id);
ALTER TABLE ONLY public.litigation_matters
    ADD CONSTRAINT litigation_matters_opposing_law_firm_id_fkey FOREIGN KEY (opposing_law_firm_id) REFERENCES public.law_firms(id);

ALTER TABLE ONLY public.litigation_team_members
    ADD CONSTRAINT litigation_team_members_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.litigation_team_members
    ADD CONSTRAINT litigation_team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.litigation_teams(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.litigation_activities
    ADD CONSTRAINT litigation_activities_matter_id_fkey FOREIGN KEY (matter_id) REFERENCES public.litigation_matters(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.litigation_activities
    ADD CONSTRAINT litigation_activities_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);

ALTER TABLE ONLY public.litigation_documents
    ADD CONSTRAINT litigation_documents_matter_id_fkey FOREIGN KEY (matter_id) REFERENCES public.litigation_matters(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.litigation_documents
    ADD CONSTRAINT litigation_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.staff(id);

ALTER TABLE ONLY public.litigation_hearings
    ADD CONSTRAINT litigation_hearings_matter_id_fkey FOREIGN KEY (matter_id) REFERENCES public.litigation_matters(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.appearance_requests
    ADD CONSTRAINT appearance_requests_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.staff(id);
ALTER TABLE ONLY public.appearance_requests
    ADD CONSTRAINT appearance_requests_hearing_id_fkey FOREIGN KEY (hearing_id) REFERENCES public.litigation_hearings(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.appearance_requests
    ADD CONSTRAINT appearance_requests_matter_id_fkey FOREIGN KEY (matter_id) REFERENCES public.litigation_matters(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.appearance_requests
    ADD CONSTRAINT appearance_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.staff(id);

ALTER TABLE ONLY public.filing_fees
    ADD CONSTRAINT filing_fees_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);
ALTER TABLE ONLY public.filing_fees
    ADD CONSTRAINT filing_fees_matter_id_fkey FOREIGN KEY (matter_id) REFERENCES public.litigation_matters(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.deadline_reminders
    ADD CONSTRAINT deadline_reminders_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;
-- DEFERRED: deadline_reminders_notification_id_fkey -> public.notifications(id) (table lands later).

-- ===== Indexes =====
CREATE INDEX idx_litigation_matters_client_service ON public.litigation_matters USING btree (client_service_id);
CREATE INDEX idx_litigation_matters_liability ON public.litigation_matters USING btree (liability_id);
CREATE INDEX litigation_matters_opposing_law_firm_id_idx ON public.litigation_matters USING btree (opposing_law_firm_id);
CREATE INDEX idx_litigation_teams_company_id ON public.litigation_teams USING btree (company_id);
CREATE INDEX idx_litigation_team_members_staff_id ON public.litigation_team_members USING btree (staff_id);
CREATE INDEX idx_litigation_team_members_team_id ON public.litigation_team_members USING btree (team_id);
CREATE INDEX idx_litigation_activities_matter_id ON public.litigation_activities USING btree (matter_id);
CREATE INDEX idx_litigation_documents_deadline_date ON public.litigation_documents USING btree (deadline_date);
CREATE INDEX idx_litigation_documents_matter_id ON public.litigation_documents USING btree (matter_id);
CREATE INDEX idx_litigation_hearings_matter_id ON public.litigation_hearings USING btree (matter_id);
CREATE INDEX idx_litigation_hearings_scheduled_date ON public.litigation_hearings USING btree (scheduled_date);
CREATE INDEX law_firms_name_idx ON public.law_firms USING btree (name);
CREATE INDEX law_firm_contacts_law_firm_id_idx ON public.law_firm_contacts USING btree (law_firm_id);
CREATE INDEX idx_deadline_reminders_entity ON public.deadline_reminders USING btree (reminder_type, entity_id);
CREATE INDEX idx_deadline_reminders_pending ON public.deadline_reminders USING btree (scheduled_for, status) WHERE (status = 'pending'::public.reminder_status);

-- ===== Triggers (updated_at + audit on litigation_matters) =====
CREATE TRIGGER update_law_firms_updated_at BEFORE UPDATE ON public.law_firms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_law_firm_contacts_updated_at BEFORE UPDATE ON public.law_firm_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_litigation_teams_updated_at BEFORE UPDATE ON public.litigation_teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_litigation_hearings_updated_at BEFORE UPDATE ON public.litigation_hearings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appearance_requests_updated_at BEFORE UPDATE ON public.appearance_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_filing_fees_updated_at BEFORE UPDATE ON public.filing_fees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deadline_reminders_updated_at BEFORE UPDATE ON public.deadline_reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_litigation_matters_updated_at BEFORE UPDATE ON public.litigation_matters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_audit_litigation_matters AFTER INSERT OR DELETE OR UPDATE ON public.litigation_matters FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- ===== RLS =====
ALTER TABLE public.law_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.law_firm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.litigation_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.litigation_matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.litigation_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.litigation_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.litigation_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.litigation_hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appearance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filing_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadline_reminders ENABLE ROW LEVEL SECURITY;

-- law_firms / law_firm_contacts: global reference data — all staff read, admins manage.
CREATE POLICY "Admins can manage law firms" ON public.law_firms USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "All staff can view law firms" ON public.law_firms FOR SELECT USING (true);
CREATE POLICY "Admins can manage law firm contacts" ON public.law_firm_contacts USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "All staff can view law firm contacts" ON public.law_firm_contacts FOR SELECT USING (true);

-- litigation_teams: company-scoped via staff membership.
CREATE POLICY "Users can create litigation teams in their company" ON public.litigation_teams FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.company_id = litigation_teams.company_id)))));
CREATE POLICY "Users can delete litigation teams in their company" ON public.litigation_teams FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.company_id = litigation_teams.company_id)))));
CREATE POLICY "Users can update litigation teams in their company" ON public.litigation_teams FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.company_id = litigation_teams.company_id)))));
CREATE POLICY "Users can view litigation teams in their company" ON public.litigation_teams FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.company_id = litigation_teams.company_id)))));

-- litigation_team_members: company-scoped via the team's company.
CREATE POLICY "Users can delete team members in their company" ON public.litigation_team_members FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.litigation_teams lt
     JOIN public.staff s ON ((s.company_id = lt.company_id)))
  WHERE ((lt.id = litigation_team_members.team_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Users can manage team members in their company" ON public.litigation_team_members FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.litigation_teams lt
     JOIN public.staff s ON ((s.company_id = lt.company_id)))
  WHERE ((lt.id = litigation_team_members.team_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Users can update team members in their company" ON public.litigation_team_members FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.litigation_teams lt
     JOIN public.staff s ON ((s.company_id = lt.company_id)))
  WHERE ((lt.id = litigation_team_members.team_id) AND (s.user_id = auth.uid())))));
CREATE POLICY "Users can view team members in their company" ON public.litigation_team_members FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.litigation_teams lt
     JOIN public.staff s ON ((s.company_id = lt.company_id)))
  WHERE ((lt.id = litigation_team_members.team_id) AND (s.user_id = auth.uid())))));

-- litigation_matters / activities / documents / hearings: company-scoped via client_services.
CREATE POLICY "Staff can access litigation matters" ON public.litigation_matters USING ((EXISTS ( SELECT 1
   FROM public.client_services cs
  WHERE ((cs.id = litigation_matters.client_service_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));
CREATE POLICY "Staff can access litigation activities" ON public.litigation_activities USING ((EXISTS ( SELECT 1
   FROM (public.litigation_matters lm
     JOIN public.client_services cs ON ((cs.id = lm.client_service_id)))
  WHERE ((lm.id = litigation_activities.matter_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));
CREATE POLICY "Staff can access litigation documents" ON public.litigation_documents USING ((EXISTS ( SELECT 1
   FROM (public.litigation_matters lm
     JOIN public.client_services cs ON ((cs.id = lm.client_service_id)))
  WHERE ((lm.id = litigation_documents.matter_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));
CREATE POLICY "Staff can access litigation hearings" ON public.litigation_hearings USING ((EXISTS ( SELECT 1
   FROM (public.litigation_matters lm
     JOIN public.client_services cs ON ((cs.id = lm.client_service_id)))
  WHERE ((lm.id = litigation_hearings.matter_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));

-- appearance_requests: company-scoped via matter; admins delete.
CREATE POLICY "Admins can delete appearance requests" ON public.appearance_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Staff can insert appearance requests for their company" ON public.appearance_requests FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.litigation_matters m
     JOIN public.client_services cs ON ((cs.id = m.client_service_id)))
  WHERE ((m.id = appearance_requests.matter_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));
CREATE POLICY "Staff can update appearance requests for their company" ON public.appearance_requests FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.litigation_matters m
     JOIN public.client_services cs ON ((cs.id = m.client_service_id)))
  WHERE ((m.id = appearance_requests.matter_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));
CREATE POLICY "Staff can view appearance requests for their company" ON public.appearance_requests FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.litigation_matters m
     JOIN public.client_services cs ON ((cs.id = m.client_service_id)))
  WHERE ((m.id = appearance_requests.matter_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));

-- filing_fees: company-scoped via matter; admins delete.
CREATE POLICY "Admins can delete filing fees" ON public.filing_fees FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Staff can insert filing fees for their company" ON public.filing_fees FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.litigation_matters m
     JOIN public.client_services cs ON ((cs.id = m.client_service_id)))
  WHERE ((m.id = filing_fees.matter_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));
CREATE POLICY "Staff can update filing fees for their company" ON public.filing_fees FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.litigation_matters m
     JOIN public.client_services cs ON ((cs.id = m.client_service_id)))
  WHERE ((m.id = filing_fees.matter_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));
CREATE POLICY "Staff can view filing fees for their company" ON public.filing_fees FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.litigation_matters m
     JOIN public.client_services cs ON ((cs.id = m.client_service_id)))
  WHERE ((m.id = filing_fees.matter_id) AND public.can_access_company(auth.uid(), cs.owning_company_id)))));

-- deadline_reminders: staff see their own; admins manage their company's (writes via RPC).
CREATE POLICY "Admins can manage company reminders" ON public.deadline_reminders TO authenticated USING (((staff_id IN ( SELECT s.id
   FROM public.staff s
  WHERE (s.company_id = public.get_user_company_id(auth.uid())))) AND public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Staff can view their reminders" ON public.deadline_reminders FOR SELECT TO authenticated USING ((staff_id IN ( SELECT staff.id
   FROM public.staff
  WHERE (staff.user_id = auth.uid()))));

-- ===== Grants (explicit; pg_dump --no-privileges excludes these from the schema-diff) =====
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.law_firms, public.law_firm_contacts, public.litigation_teams, public.litigation_matters,
  public.litigation_team_members, public.litigation_activities, public.litigation_documents,
  public.litigation_hearings, public.appearance_requests, public.filing_fees,
  public.deadline_reminders TO authenticated;
GRANT ALL ON
  public.law_firms, public.law_firm_contacts, public.litigation_teams, public.litigation_matters,
  public.litigation_team_members, public.litigation_activities, public.litigation_documents,
  public.litigation_hearings, public.appearance_requests, public.filing_fees,
  public.deadline_reminders TO service_role;

-- ============================================================================
-- Storage hardening: private document buckets + path-scoped RLS on storage.objects.
-- The can_access_storage_object() helper resolves the first path folder (an entity id) to a
-- company and defers to can_access_company. Guarded so the migration is a no-op where the
-- Supabase-managed `storage` schema is absent (e.g. a public-only harness).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_access_storage_object(_bucket text, _first_folder text) RETURNS boolean
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

DO $storage$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'storage schema absent — skipping bucket + storage.objects RLS (public-only harness).';
    RETURN;
  END IF;

  -- Private document buckets (never public).
  INSERT INTO storage.buckets (id, name, public)
  VALUES
    ('client-documents', 'client-documents', false),
    ('lead-documents', 'lead-documents', false),
    ('litigation-documents', 'litigation-documents', false)
  ON CONFLICT (id) DO NOTHING;

  -- Path-scoped RLS: authenticated staff may touch objects whose first folder resolves to a
  -- company they can access. Idempotent (drop-then-create).
  EXECUTE 'DROP POLICY IF EXISTS "Doc bucket read scoped to company" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Doc bucket insert scoped to company" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Doc bucket update scoped to company" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Doc bucket delete scoped to company" ON storage.objects';

  EXECUTE $p$
    CREATE POLICY "Doc bucket read scoped to company" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id IN ('client-documents','lead-documents','litigation-documents')
           AND public.can_access_storage_object(bucket_id, (storage.foldername(name))[1]))
  $p$;
  EXECUTE $p$
    CREATE POLICY "Doc bucket insert scoped to company" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id IN ('client-documents','lead-documents','litigation-documents')
                AND public.can_access_storage_object(bucket_id, (storage.foldername(name))[1]))
  $p$;
  EXECUTE $p$
    CREATE POLICY "Doc bucket update scoped to company" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id IN ('client-documents','lead-documents','litigation-documents')
           AND public.can_access_storage_object(bucket_id, (storage.foldername(name))[1]))
  $p$;
  EXECUTE $p$
    CREATE POLICY "Doc bucket delete scoped to company" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id IN ('client-documents','lead-documents','litigation-documents')
           AND public.can_access_storage_object(bucket_id, (storage.foldername(name))[1]))
  $p$;
END
$storage$;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- DO $r$ BEGIN
--   IF to_regclass('storage.objects') IS NOT NULL THEN
--     EXECUTE 'DROP POLICY IF EXISTS "Doc bucket delete scoped to company" ON storage.objects';
--     EXECUTE 'DROP POLICY IF EXISTS "Doc bucket update scoped to company" ON storage.objects';
--     EXECUTE 'DROP POLICY IF EXISTS "Doc bucket insert scoped to company" ON storage.objects';
--     EXECUTE 'DROP POLICY IF EXISTS "Doc bucket read scoped to company" ON storage.objects';
--     DELETE FROM storage.buckets WHERE id IN ('client-documents','lead-documents','litigation-documents');
--   END IF;
-- END $r$;
-- DROP FUNCTION IF EXISTS public.can_access_storage_object(text, text);
-- DROP TABLE IF EXISTS public.deadline_reminders CASCADE;
-- DROP TABLE IF EXISTS public.filing_fees CASCADE;
-- DROP TABLE IF EXISTS public.appearance_requests CASCADE;
-- DROP TABLE IF EXISTS public.litigation_hearings CASCADE;
-- DROP TABLE IF EXISTS public.litigation_documents CASCADE;
-- DROP TABLE IF EXISTS public.litigation_activities CASCADE;
-- DROP TABLE IF EXISTS public.litigation_team_members CASCADE;
-- DROP TABLE IF EXISTS public.litigation_matters CASCADE;
-- DROP TABLE IF EXISTS public.litigation_teams CASCADE;
-- DROP TABLE IF EXISTS public.law_firm_contacts CASCADE;
-- DROP TABLE IF EXISTS public.law_firms CASCADE;
-- DROP TYPE IF EXISTS public.reminder_status;
-- DROP TYPE IF EXISTS public.reminder_type;
-- DROP TYPE IF EXISTS public.filing_fee_status;
-- DROP TYPE IF EXISTS public.appearance_request_status;
-- DROP TYPE IF EXISTS public.litigation_status;
