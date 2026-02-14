
-- Seed default permissions for eligibility_reviewer
INSERT INTO public.role_permissions (role, module, can_read, can_create, can_update, can_delete, notes)
VALUES
  ('eligibility_reviewer', 'Dashboard', true, false, false, false, 'View own dashboard'),
  ('eligibility_reviewer', 'Leads', true, false, false, false, 'Read-only access to review lead data'),
  ('eligibility_reviewer', 'Eligibility Reviews', true, true, true, false, 'Full access to review and approve/decline eligibility submissions'),
  ('eligibility_reviewer', 'Clients', true, false, false, false, 'Read-only to verify client info'),
  ('eligibility_reviewer', 'Services', false, false, false, false, NULL),
  ('eligibility_reviewer', 'Liabilities', true, false, false, false, 'Read-only to review debt info'),
  ('eligibility_reviewer', 'Settlements', false, false, false, false, NULL),
  ('eligibility_reviewer', 'Litigation', false, false, false, false, NULL),
  ('eligibility_reviewer', 'Tasks', true, true, true, false, 'Manage own tasks'),
  ('eligibility_reviewer', 'Reports', false, false, false, false, NULL),
  ('eligibility_reviewer', 'Creditors', false, false, false, false, NULL),
  ('eligibility_reviewer', 'Companies', false, false, false, false, NULL),
  ('eligibility_reviewer', 'Staff', false, false, false, false, NULL),
  ('eligibility_reviewer', 'Payments', false, false, false, false, NULL),
  ('eligibility_reviewer', 'Settings', false, false, false, false, NULL)
ON CONFLICT (role, module) DO NOTHING;

-- Mark bank account feature request as completed
UPDATE public.feature_requests 
SET status = 'completed', admin_notes = 'Banking info collected during enrollment via BankingDisclosureStep.'
WHERE title ILIKE '%bank account%' AND status != 'completed';
