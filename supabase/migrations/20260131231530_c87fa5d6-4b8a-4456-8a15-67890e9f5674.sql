-- Guardian Litigation Group CRM - Phase 1 Foundation Schema

-- ============================================
-- ENUMS
-- ============================================

-- Company types
CREATE TYPE public.company_type AS ENUM ('law_firm', 'affiliate', 'financing_company');

-- Data visibility rules for multi-company architecture
CREATE TYPE public.data_visibility AS ENUM ('own_only', 'parent_and_own', 'full_hierarchy');

-- Department types
CREATE TYPE public.department AS ENUM (
  'admin', 
  'sales_intake', 
  'client_services', 
  'attorney', 
  'case_manager', 
  'negotiations', 
  'payment_processing', 
  'correspondence'
);

-- Role types for permissions
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
  'viewer'
);

-- Engagement status
CREATE TYPE public.engagement_status AS ENUM ('prospect', 'active', 'suspended', 'closed');

-- Contact relationship types
CREATE TYPE public.contact_relationship AS ENUM ('primary_client', 'co_client', 'spouse', 'authorized_contact', 'other');

-- Phone types
CREATE TYPE public.phone_type AS ENUM ('mobile', 'home', 'work', 'fax', 'other');

-- Address types
CREATE TYPE public.address_type AS ENUM ('home', 'work', 'mailing', 'other');

-- Service types
CREATE TYPE public.service_type AS ENUM ('debt_resolution', 'consumer_defense', 'hybrid');

-- Assignment types
CREATE TYPE public.assignment_type AS ENUM (
  'primary_attorney',
  'litigation_attorney',
  'client_services_rep',
  'case_manager',
  'negotiator',
  'sales_rep'
);

-- Entity types for flexible assignments
CREATE TYPE public.entity_type AS ENUM ('engagement', 'case', 'liability', 'lead');

-- Task priority
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Task status
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Task types
CREATE TYPE public.task_type AS ENUM ('follow_up', 'document_review', 'court_deadline', 'settlement_negotiation', 'client_call', 'general');

-- Lead status
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');

-- Lead source
CREATE TYPE public.lead_source AS ENUM ('web_form', 'referral', 'phone', 'advertisement', 'walk_in', 'other');

-- Lead interest type
CREATE TYPE public.lead_interest AS ENUM ('debt_resolution', 'litigation', 'both');

-- Creditor types
CREATE TYPE public.creditor_type AS ENUM ('original_creditor', 'collection_agency', 'law_firm', 'debt_buyer');

-- Liability types
CREATE TYPE public.liability_type AS ENUM ('credit_card', 'medical', 'auto_loan', 'personal_loan', 'student_loan', 'mortgage', 'other');

-- Liability status
CREATE TYPE public.liability_status AS ENUM ('enrolled', 'in_negotiation', 'settled', 'in_litigation', 'dismissed', 'cancelled');

-- Settlement status
CREATE TYPE public.settlement_status AS ENUM ('offered', 'accepted', 'rejected', 'completed', 'defaulted');

-- Payment type
CREATE TYPE public.payment_type AS ENUM ('lump_sum', 'payment_plan');

-- ============================================
-- COMPANIES TABLE
-- ============================================

CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_type public.company_type NOT NULL DEFAULT 'law_firm',
  parent_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  data_visibility public.data_visibility NOT NULL DEFAULT 'own_only',
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- STAFF TABLE (User profiles linked to auth.users)
-- ============================================

CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department public.department NOT NULL,
  job_title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- USER ROLES TABLE (Separate from profiles for security)
-- ============================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- ============================================
-- CONTACTS TABLE (Clients and related people)
-- ============================================

CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  email TEXT,
  date_of_birth DATE,
  ssn_encrypted TEXT, -- Encrypted SSN
  preferred_contact_method public.phone_type DEFAULT 'mobile',
  tcpa_consent BOOLEAN DEFAULT false,
  tcpa_consent_date TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- CONTACT PHONES
-- ============================================

CREATE TABLE public.contact_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  phone_type public.phone_type NOT NULL DEFAULT 'mobile',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- CONTACT ADDRESSES
-- ============================================

CREATE TABLE public.contact_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  address_type public.address_type NOT NULL DEFAULT 'home',
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- SERVICES CATALOG
-- ============================================

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  service_type public.service_type NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default services
INSERT INTO public.services (name, service_type, description) VALUES
  ('Debt Resolution', 'debt_resolution', 'Negotiating and settling consumer debts'),
  ('Consumer Defense', 'consumer_defense', 'Defending consumers in debt collection lawsuits'),
  ('Hybrid Services', 'hybrid', 'Combined debt resolution and litigation defense');

-- ============================================
-- ENGAGEMENTS TABLE
-- ============================================

CREATE TABLE public.engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_number TEXT NOT NULL UNIQUE,
  originating_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  owning_company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  primary_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  status public.engagement_status NOT NULL DEFAULT 'prospect',
  enrolled_date DATE,
  closed_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ENGAGEMENT CONTACTS (Junction table)
-- ============================================

CREATE TABLE public.engagement_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  relationship public.contact_relationship NOT NULL DEFAULT 'primary_client',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, contact_id)
);

-- ============================================
-- ENGAGEMENT SERVICES (Junction table)
-- ============================================

CREATE TABLE public.engagement_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, service_id)
);

-- ============================================
-- ASSIGNMENTS TABLE (Flexible entity assignments)
-- ============================================

CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
  entity_type public.entity_type NOT NULL,
  entity_id UUID NOT NULL,
  assignment_type public.assignment_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_assignments_entity ON public.assignments(entity_type, entity_id);
CREATE INDEX idx_assignments_staff ON public.assignments(staff_id, is_active);

-- ============================================
-- TASKS TABLE
-- ============================================

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type public.task_type NOT NULL DEFAULT 'general',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'pending',
  assigned_to UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  entity_type public.entity_type,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to, status);
CREATE INDEX idx_tasks_entity ON public.tasks(entity_type, entity_id);

-- ============================================
-- LEADS TABLE
-- ============================================

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_number TEXT NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  originating_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source public.lead_source NOT NULL DEFAULT 'web_form',
  status public.lead_status NOT NULL DEFAULT 'new',
  interest_type public.lead_interest NOT NULL DEFAULT 'debt_resolution',
  estimated_debt_amount DECIMAL(12,2),
  number_of_debts INTEGER,
  has_active_lawsuit BOOLEAN DEFAULT false,
  disqualification_reason TEXT,
  notes TEXT,
  assigned_to UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  converted_engagement_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_status ON public.leads(status, company_id);
CREATE INDEX idx_leads_assigned ON public.leads(assigned_to);

-- ============================================
-- LEAD ACTIVITIES
-- ============================================

CREATE TABLE public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL, -- call, email, sms, meeting, note
  outcome TEXT, -- answered, voicemail, no_answer, etc.
  notes TEXT,
  next_action TEXT,
  next_action_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_activities_lead ON public.lead_activities(lead_id);

-- ============================================
-- CREDITORS TABLE
-- ============================================

CREATE TABLE public.creditors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  creditor_type public.creditor_type NOT NULL DEFAULT 'original_creditor',
  phone TEXT,
  fax TEXT,
  email TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_creditors_name ON public.creditors(name);

-- ============================================
-- LIABILITIES TABLE
-- ============================================

CREATE TABLE public.liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  current_creditor_id UUID REFERENCES public.creditors(id) ON DELETE SET NULL,
  original_creditor_id UUID REFERENCES public.creditors(id) ON DELETE SET NULL,
  account_number TEXT,
  liability_type public.liability_type NOT NULL DEFAULT 'credit_card',
  original_balance DECIMAL(12,2),
  current_balance DECIMAL(12,2),
  enrolled_balance DECIMAL(12,2),
  status public.liability_status NOT NULL DEFAULT 'enrolled',
  priority INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_liabilities_engagement ON public.liabilities(engagement_id);
CREATE INDEX idx_liabilities_status ON public.liabilities(status);

-- ============================================
-- LIABILITY ACTIONS
-- ============================================

CREATE TABLE public.liability_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liability_id UUID REFERENCES public.liabilities(id) ON DELETE CASCADE NOT NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- settlement_offer, payment, court_filing, balance_update
  description TEXT NOT NULL,
  amount DECIMAL(12,2),
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_liability_actions_liability ON public.liability_actions(liability_id);

-- ============================================
-- SETTLEMENTS TABLE
-- ============================================

CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liability_id UUID REFERENCES public.liabilities(id) ON DELETE CASCADE NOT NULL,
  offer_amount DECIMAL(12,2) NOT NULL,
  offer_percentage DECIMAL(5,2),
  payment_type public.payment_type NOT NULL DEFAULT 'lump_sum',
  number_of_payments INTEGER DEFAULT 1,
  status public.settlement_status NOT NULL DEFAULT 'offered',
  offered_date DATE NOT NULL DEFAULT CURRENT_DATE,
  accepted_date DATE,
  completed_date DATE,
  attorney_approved BOOLEAN DEFAULT false,
  attorney_approved_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  attorney_approved_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_settlements_liability ON public.settlements(liability_id);
CREATE INDEX idx_settlements_status ON public.settlements(status);

-- ============================================
-- PAYMENT PROCESSORS (Mock data structure)
-- ============================================

CREATE TABLE public.payment_processors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  processor_type TEXT NOT NULL, -- forth_pay, global_holdings
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default processors
INSERT INTO public.payment_processors (name, processor_type) VALUES
  ('Forth Pay', 'forth_pay'),
  ('Global Holdings', 'global_holdings');

-- ============================================
-- COMPANY PROCESSOR CONFIGS
-- ============================================

CREATE TABLE public.company_processor_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  processor_id UUID REFERENCES public.payment_processors(id) ON DELETE CASCADE NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  api_key_encrypted TEXT,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, processor_id)
);

-- ============================================
-- TRANSACTIONS (Mock structure)
-- ============================================

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE CASCADE NOT NULL,
  processor_id UUID REFERENCES public.payment_processors(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  transaction_type TEXT NOT NULL, -- payment, refund, fee
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  external_id TEXT,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_engagement ON public.transactions(engagement_id);

-- ============================================
-- AUTO-UPDATE TIMESTAMPS TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply to all tables with updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_engagements_updated_at BEFORE UPDATE ON public.engagements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_creditors_updated_at BEFORE UPDATE ON public.creditors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_liabilities_updated_at BEFORE UPDATE ON public.liabilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settlements_updated_at BEFORE UPDATE ON public.settlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SEQUENCE FUNCTIONS FOR AUTO-NUMBERING
-- ============================================

CREATE SEQUENCE IF NOT EXISTS engagement_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS lead_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_engagement_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.engagement_number := 'ENG-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(nextval('engagement_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.generate_lead_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.lead_number := 'LEAD-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || LPAD(nextval('lead_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_engagement_number_trigger BEFORE INSERT ON public.engagements FOR EACH ROW WHEN (NEW.engagement_number IS NULL) EXECUTE FUNCTION public.generate_engagement_number();
CREATE TRIGGER generate_lead_number_trigger BEFORE INSERT ON public.leads FOR EACH ROW WHEN (NEW.lead_number IS NULL) EXECUTE FUNCTION public.generate_lead_number();

-- ============================================
-- SECURITY DEFINER FUNCTIONS FOR RLS
-- ============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.staff WHERE user_id = _user_id LIMIT 1
$$;

-- Function to check if user can access company data
CREATE OR REPLACE FUNCTION public.can_access_company(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE user_id = _user_id 
    AND (
      company_id = _company_id
      OR EXISTS (
        SELECT 1 FROM public.companies c
        WHERE c.id = _company_id
        AND c.parent_company_id = (SELECT company_id FROM public.staff WHERE user_id = _user_id LIMIT 1)
      )
    )
  )
$$;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creditors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liability_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_processors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_processor_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Companies: Staff can view their own company and children
CREATE POLICY "Staff can view accessible companies" ON public.companies
  FOR SELECT TO authenticated
  USING (public.can_access_company(auth.uid(), id));

-- Staff: Can view staff in accessible companies
CREATE POLICY "Staff can view accessible staff" ON public.staff
  FOR SELECT TO authenticated
  USING (public.can_access_company(auth.uid(), company_id));

CREATE POLICY "Staff can update own profile" ON public.staff
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- User roles: Users can see their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can manage roles
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Contacts: Company-based access
CREATE POLICY "Staff can view company contacts" ON public.contacts
  FOR SELECT TO authenticated
  USING (public.can_access_company(auth.uid(), company_id));

CREATE POLICY "Staff can manage company contacts" ON public.contacts
  FOR ALL TO authenticated
  USING (public.can_access_company(auth.uid(), company_id));

-- Contact phones: Access through contact
CREATE POLICY "Staff can access contact phones" ON public.contact_phones
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contacts c 
    WHERE c.id = contact_id 
    AND public.can_access_company(auth.uid(), c.company_id)
  ));

-- Contact addresses: Access through contact
CREATE POLICY "Staff can access contact addresses" ON public.contact_addresses
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contacts c 
    WHERE c.id = contact_id 
    AND public.can_access_company(auth.uid(), c.company_id)
  ));

-- Services: All authenticated users can view
CREATE POLICY "Anyone can view services" ON public.services
  FOR SELECT TO authenticated
  USING (true);

-- Engagements: Company-based access
CREATE POLICY "Staff can view company engagements" ON public.engagements
  FOR SELECT TO authenticated
  USING (public.can_access_company(auth.uid(), owning_company_id));

CREATE POLICY "Staff can manage company engagements" ON public.engagements
  FOR ALL TO authenticated
  USING (public.can_access_company(auth.uid(), owning_company_id));

-- Engagement contacts: Access through engagement
CREATE POLICY "Staff can access engagement contacts" ON public.engagement_contacts
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.engagements e 
    WHERE e.id = engagement_id 
    AND public.can_access_company(auth.uid(), e.owning_company_id)
  ));

-- Engagement services: Access through engagement
CREATE POLICY "Staff can access engagement services" ON public.engagement_services
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.engagements e 
    WHERE e.id = engagement_id 
    AND public.can_access_company(auth.uid(), e.owning_company_id)
  ));

-- Assignments: Can view own and team assignments
CREATE POLICY "Staff can view relevant assignments" ON public.assignments
  FOR SELECT TO authenticated
  USING (
    staff_id IN (SELECT id FROM public.staff WHERE public.can_access_company(auth.uid(), company_id))
  );

CREATE POLICY "Staff can manage assignments" ON public.assignments
  FOR ALL TO authenticated
  USING (
    staff_id IN (SELECT id FROM public.staff WHERE public.can_access_company(auth.uid(), company_id))
  );

-- Tasks: Company-based access
CREATE POLICY "Staff can view company tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (public.can_access_company(auth.uid(), company_id));

CREATE POLICY "Staff can manage company tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (public.can_access_company(auth.uid(), company_id));

-- Leads: Company-based access
CREATE POLICY "Staff can view company leads" ON public.leads
  FOR SELECT TO authenticated
  USING (public.can_access_company(auth.uid(), company_id));

CREATE POLICY "Staff can manage company leads" ON public.leads
  FOR ALL TO authenticated
  USING (public.can_access_company(auth.uid(), company_id));

-- Lead activities: Access through lead
CREATE POLICY "Staff can access lead activities" ON public.lead_activities
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leads l 
    WHERE l.id = lead_id 
    AND public.can_access_company(auth.uid(), l.company_id)
  ));

-- Creditors: All authenticated can view (shared resource)
CREATE POLICY "All staff can view creditors" ON public.creditors
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage creditors" ON public.creditors
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Liabilities: Access through engagement
CREATE POLICY "Staff can access liabilities" ON public.liabilities
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.engagements e 
    WHERE e.id = engagement_id 
    AND public.can_access_company(auth.uid(), e.owning_company_id)
  ));

-- Liability actions: Access through liability
CREATE POLICY "Staff can access liability actions" ON public.liability_actions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.liabilities l
    JOIN public.engagements e ON e.id = l.engagement_id
    WHERE l.id = liability_id 
    AND public.can_access_company(auth.uid(), e.owning_company_id)
  ));

-- Settlements: Access through liability
CREATE POLICY "Staff can access settlements" ON public.settlements
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.liabilities l
    JOIN public.engagements e ON e.id = l.engagement_id
    WHERE l.id = liability_id 
    AND public.can_access_company(auth.uid(), e.owning_company_id)
  ));

-- Payment processors: All authenticated can view
CREATE POLICY "All staff can view payment processors" ON public.payment_processors
  FOR SELECT TO authenticated
  USING (true);

-- Company processor configs: Company-based access
CREATE POLICY "Staff can access company processor configs" ON public.company_processor_configs
  FOR ALL TO authenticated
  USING (public.can_access_company(auth.uid(), company_id));

-- Transactions: Access through engagement
CREATE POLICY "Staff can access transactions" ON public.transactions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.engagements e 
    WHERE e.id = engagement_id 
    AND public.can_access_company(auth.uid(), e.owning_company_id)
  ));