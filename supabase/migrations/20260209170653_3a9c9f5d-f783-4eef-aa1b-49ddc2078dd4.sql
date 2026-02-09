
-- Create role_permissions table
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  module TEXT NOT NULL,
  can_read BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_update BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, module)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert role_permissions"
  ON public.role_permissions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update role_permissions"
  ON public.role_permissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete role_permissions"
  ON public.role_permissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create role_special_permissions table
CREATE TABLE public.role_special_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, permission)
);

ALTER TABLE public.role_special_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read role_special_permissions"
  ON public.role_special_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert role_special_permissions"
  ON public.role_special_permissions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update role_special_permissions"
  ON public.role_special_permissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete role_special_permissions"
  ON public.role_special_permissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed role_permissions from hardcoded data
INSERT INTO public.role_permissions (role, module, can_read, can_create, can_update, can_delete, notes) VALUES
-- admin
('admin', 'Dashboard', true, false, false, false, NULL),
('admin', 'Leads', true, true, true, true, NULL),
('admin', 'Clients', true, true, true, true, NULL),
('admin', 'Services', true, true, true, true, NULL),
('admin', 'Liabilities', true, true, true, true, NULL),
('admin', 'Settlements', true, true, true, true, NULL),
('admin', 'Litigation', true, true, true, true, NULL),
('admin', 'Tasks', true, true, true, true, NULL),
('admin', 'Reports', true, true, true, true, NULL),
('admin', 'Creditors', true, true, true, true, NULL),
('admin', 'Companies', true, true, true, true, NULL),
('admin', 'Staff', true, true, true, true, NULL),
('admin', 'Payments', true, true, true, true, NULL),
('admin', 'Settings', true, true, true, true, NULL),
-- attorney
('attorney', 'Dashboard', true, false, false, false, NULL),
('attorney', 'Leads', true, false, false, false, 'View only for case context'),
('attorney', 'Clients', true, false, true, false, NULL),
('attorney', 'Services', true, false, true, false, NULL),
('attorney', 'Liabilities', true, false, true, false, NULL),
('attorney', 'Settlements', true, true, true, false, 'Can approve settlements'),
('attorney', 'Litigation', true, true, true, false, NULL),
('attorney', 'Tasks', true, true, true, true, NULL),
('attorney', 'Reports', true, true, true, false, NULL),
('attorney', 'Creditors', true, false, false, false, NULL),
-- case_manager
('case_manager', 'Dashboard', true, false, false, false, NULL),
('case_manager', 'Leads', true, false, false, false, NULL),
('case_manager', 'Clients', true, true, true, false, NULL),
('case_manager', 'Services', true, true, true, false, NULL),
('case_manager', 'Liabilities', true, true, true, false, NULL),
('case_manager', 'Settlements', true, false, true, false, 'Cannot create, can update status'),
('case_manager', 'Litigation', true, true, true, false, NULL),
('case_manager', 'Tasks', true, true, true, true, NULL),
('case_manager', 'Reports', true, true, true, false, NULL),
('case_manager', 'Creditors', true, false, false, false, NULL),
-- negotiator
('negotiator', 'Dashboard', true, false, false, false, NULL),
('negotiator', 'Leads', false, false, false, false, NULL),
('negotiator', 'Clients', true, false, false, false, NULL),
('negotiator', 'Services', true, false, false, false, NULL),
('negotiator', 'Liabilities', true, false, true, false, NULL),
('negotiator', 'Settlements', true, true, true, false, NULL),
('negotiator', 'Litigation', true, false, false, false, NULL),
('negotiator', 'Tasks', true, true, true, false, NULL),
('negotiator', 'Creditors', true, true, true, false, NULL),
-- sales_rep
('sales_rep', 'Dashboard', true, false, false, false, NULL),
('sales_rep', 'Leads', true, true, true, false, NULL),
('sales_rep', 'Clients', true, true, false, false, 'Create during conversion only'),
('sales_rep', 'Services', true, true, false, false, 'Create during enrollment only'),
('sales_rep', 'Liabilities', false, false, false, false, NULL),
('sales_rep', 'Settlements', false, false, false, false, NULL),
('sales_rep', 'Litigation', false, false, false, false, NULL),
('sales_rep', 'Tasks', true, true, true, false, NULL),
('sales_rep', 'Creditors', true, false, false, false, NULL),
-- client_services_rep
('client_services_rep', 'Dashboard', true, false, false, false, NULL),
('client_services_rep', 'Leads', false, false, false, false, NULL),
('client_services_rep', 'Clients', true, false, true, false, NULL),
('client_services_rep', 'Services', true, false, true, false, NULL),
('client_services_rep', 'Liabilities', true, false, false, false, NULL),
('client_services_rep', 'Settlements', true, false, false, false, NULL),
('client_services_rep', 'Litigation', true, false, false, false, NULL),
('client_services_rep', 'Tasks', true, true, true, false, NULL),
('client_services_rep', 'Creditors', true, false, false, false, NULL),
-- payment_processor
('payment_processor', 'Dashboard', true, false, false, false, NULL),
('payment_processor', 'Leads', false, false, false, false, NULL),
('payment_processor', 'Clients', true, false, false, false, NULL),
('payment_processor', 'Services', true, false, true, false, 'Payment-related fields only'),
('payment_processor', 'Liabilities', true, false, false, false, NULL),
('payment_processor', 'Settlements', true, false, true, false, 'Payment status only'),
('payment_processor', 'Litigation', false, false, false, false, NULL),
('payment_processor', 'Tasks', true, true, true, false, NULL),
('payment_processor', 'Payments', true, true, true, false, NULL),
-- correspondence
('correspondent', 'Dashboard', true, false, false, false, NULL),
('correspondent', 'Leads', false, false, false, false, NULL),
('correspondent', 'Clients', true, false, false, false, NULL),
('correspondent', 'Services', true, false, false, false, NULL),
('correspondent', 'Liabilities', true, false, true, false, 'Creditor contact updates'),
('correspondent', 'Settlements', true, false, false, false, NULL),
('correspondent', 'Litigation', true, false, true, false, 'Document uploads'),
('correspondent', 'Tasks', true, true, true, false, NULL),
('correspondent', 'Creditors', true, true, true, false, NULL);

-- Seed role_special_permissions
INSERT INTO public.role_special_permissions (role, permission) VALUES
-- admin
('admin', 'Create and manage staff accounts'),
('admin', 'Configure company settings'),
('admin', 'Assign roles to users'),
('admin', 'Access all reports including financial'),
('admin', 'Override status changes requiring approval'),
('admin', 'Manage creditor master list'),
('admin', 'View audit logs'),
-- attorney
('attorney', 'Approve settlement offers'),
('attorney', 'File court documents'),
('attorney', 'Manage litigation matters'),
('attorney', 'Assign cases to case managers'),
('attorney', 'View court calendar'),
('attorney', 'Generate legal reports'),
-- case_manager
('case_manager', 'Manage assigned client cases'),
('case_manager', 'Update liability information'),
('case_manager', 'Escalate to litigation'),
('case_manager', 'Create and assign tasks'),
('case_manager', 'Log client communications'),
('case_manager', 'Upload client documents'),
-- negotiator
('negotiator', 'Create settlement offers'),
('negotiator', 'Update offer status'),
('negotiator', 'Log creditor communications'),
('negotiator', 'Request attorney approval'),
('negotiator', 'Update creditor contact information'),
('negotiator', 'Track settlement negotiations'),
-- sales_rep
('sales_rep', 'Create and manage leads'),
('sales_rep', 'Run enrollment wizard'),
('sales_rep', 'Convert leads to clients'),
('sales_rep', 'Log lead activities'),
('sales_rep', 'Schedule follow-ups'),
('sales_rep', 'View lead reports'),
-- client_services_rep
('client_services_rep', 'Update client contact information'),
('client_services_rep', 'Log client communications'),
('client_services_rep', 'Handle retention cases'),
('client_services_rep', 'Update payment information'),
('client_services_rep', 'Request status changes'),
('client_services_rep', 'Upload client documents'),
-- payment_processor
('payment_processor', 'Process escrow deposits'),
('payment_processor', 'Schedule settlement payments'),
('payment_processor', 'Process fee collections'),
('payment_processor', 'Handle failed payments'),
('payment_processor', 'View payment history'),
('payment_processor', 'Generate payment reports'),
-- correspondence
('correspondent', 'Upload correspondence documents'),
('correspondent', 'Update creditor addresses'),
('correspondent', 'Log incoming mail'),
('correspondent', 'Process outgoing letters'),
('correspondent', 'Create creditor records'),
('correspondent', 'Flag urgent correspondence');
