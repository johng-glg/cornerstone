-- =====================================================================
-- Cornerstone — Guardian Litigation Group demo data
-- Populates the operational modules so every screen has realistic content.
-- Scoped to the Guardian tenant (0a..01). Idempotent (fixed UUIDs + ON CONFLICT).
-- Safe to run multiple times. Run in the Supabase SQL editor.
-- =====================================================================

-- Prerequisite: run the base seed (seed.sql) first — it creates the tenant + staff:
--   company  0a000000-0000-4000-8000-000000000001  Guardian Litigation Group
--   staff    Nadia (admin) · Theo (attorney) · Priya (paralegal)
-- Staff FKs (leads.assigned_to, billing_entries.staff_id, tasks.*, client_communications.staff_id)
-- target staff.id (a random PK), so we resolve it from the stable staff.user_id (d1/d2/d3) via
-- subquery rather than hardcoding — works regardless of the generated staff.id values.

-- 1. Creditors (global directory) ----------------------------------------------
INSERT INTO public.creditors (id, name, creditor_type, phone, email, state, is_active) VALUES
  ('aa000000-0000-4000-8000-000000000001','Capital One','original_creditor','800-555-0100','disputes@capitalone.test','VA',true),
  ('aa000000-0000-4000-8000-000000000002','Midland Credit Management','debt_buyer','800-555-0101','info@midland.test','CA',true),
  ('aa000000-0000-4000-8000-000000000003','Portfolio Recovery','collection_agency','800-555-0102','contact@pra.test','VA',true),
  ('aa000000-0000-4000-8000-000000000004','Synchrony Bank','original_creditor','800-555-0103','support@synchrony.test','UT',true),
  ('aa000000-0000-4000-8000-000000000005','LVNV Funding','debt_buyer','800-555-0104','info@lvnv.test','SC',true),
  ('aa000000-0000-4000-8000-000000000006','Discover','original_creditor','800-555-0105','help@discover.test','IL',true)
ON CONFLICT (id) DO NOTHING;

-- 2. Leads (varied stages) -----------------------------------------------------
INSERT INTO public.leads (id, lead_number, company_id, first_name, last_name, email, phone, source, status, interest_type, estimated_debt_amount, number_of_debts, state, assigned_to) VALUES
  ('ab000000-0000-4000-8000-000000000001','LEAD-2026-2001','0a000000-0000-4000-8000-000000000001','Marcus','Reed','marcus.reed@example.com','555-0201','web_form','new','debt_resolution',42000,4,'TX',(SELECT id FROM public.staff WHERE user_id = 'd2000000-0000-4000-8000-000000000002')),
  ('ab000000-0000-4000-8000-000000000002','LEAD-2026-2002','0a000000-0000-4000-8000-000000000001','Elena','Ramos','elena.ramos@example.com','555-0202','referral','contacted','debt_resolution',58000,6,'CA',(SELECT id FROM public.staff WHERE user_id = 'd3000000-0000-4000-8000-000000000003')),
  ('ab000000-0000-4000-8000-000000000003','LEAD-2026-2003','0a000000-0000-4000-8000-000000000001','Derek','Okafor','derek.okafor@example.com','555-0203','phone','qualified','both',75000,7,'NY',(SELECT id FROM public.staff WHERE user_id = 'd2000000-0000-4000-8000-000000000002')),
  ('ab000000-0000-4000-8000-000000000004','LEAD-2026-2004','0a000000-0000-4000-8000-000000000001','Sophie','Tran','sophie.tran@example.com','555-0204','advertisement','lost','debt_resolution',18000,2,'AZ',NULL),
  ('ab000000-0000-4000-8000-000000000005','LEAD-2026-2005','0a000000-0000-4000-8000-000000000001','Andre','Boateng','andre.b@example.com','555-0205','referral','qualified','litigation',91000,8,'FL',(SELECT id FROM public.staff WHERE user_id = 'd2000000-0000-4000-8000-000000000002'))
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lead_debts (id, lead_id, creditor_name, account_type, original_balance, current_balance, is_enrolled) VALUES
  ('bf000000-0000-4000-8000-000000000001','ab000000-0000-4000-8000-000000000003','Capital One','credit_card',12000,13500,true),
  ('bf000000-0000-4000-8000-000000000002','ab000000-0000-4000-8000-000000000003','Discover','credit_card',9000,9800,true),
  ('bf000000-0000-4000-8000-000000000003','ab000000-0000-4000-8000-000000000005','Synchrony Bank','credit_card',15000,16200,true)
ON CONFLICT (id) DO NOTHING;

-- 3. Clients -------------------------------------------------------------------
INSERT INTO public.clients (id, company_id, first_name, last_name, email, date_of_birth, ssn_last4, status, is_active, tcpa_consent) VALUES
  ('ac000000-0000-4000-8000-000000000001','0a000000-0000-4000-8000-000000000001','Janet','Maxwell','janet.maxwell@example.com','1979-04-12','4821','active',true,true),
  ('ac000000-0000-4000-8000-000000000002','0a000000-0000-4000-8000-000000000001','Carlos','Mendez','carlos.mendez@example.com','1985-09-30','7733','active',true,true),
  ('ac000000-0000-4000-8000-000000000003','0a000000-0000-4000-8000-000000000001','Priya','Nadar','priya.nadar@example.com','1990-01-22','9015','active',true,false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.client_phones (id, client_id, phone_number, phone_type, is_primary, is_active) VALUES
  ('ac100000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000001','555-0301','mobile',true,true),
  ('ac100000-0000-4000-8000-000000000002','ac000000-0000-4000-8000-000000000002','555-0302','mobile',true,true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.client_addresses (id, client_id, address_type, city, state, zip_code, is_primary, is_active) VALUES
  ('ac200000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000001','home','Austin','TX','78701',true,true),
  ('ac200000-0000-4000-8000-000000000002','ac000000-0000-4000-8000-000000000002','home','San Diego','CA','92101',true,true)
ON CONFLICT (id) DO NOTHING;

-- 4. Engagements (client_services) --------------------------------------------
INSERT INTO public.client_services (id, service_number, owning_company_id, originating_company_id, primary_client_id, status, enrolled_date, program_start_date, program_type, term_months, monthly_payment, payment_frequency, first_payment_date, plan_type, settlement_fee_percentage, total_enrolled_debt, escrow_balance) VALUES
  ('ad000000-0000-4000-8000-000000000001','SVC-2026-3001','0a000000-0000-4000-8000-000000000001','0a000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000001','active','2026-02-01','2026-02-01','debt_settlement',36,720,'monthly','2026-02-15','glg_standard',25,32400,2160),
  ('ad000000-0000-4000-8000-000000000002','SVC-2026-3002','0a000000-0000-4000-8000-000000000001','0a000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000002','active','2026-03-01','2026-03-01','debt_settlement',48,890,'monthly','2026-03-15','glg_adjustable',25,51000,1780),
  ('ad000000-0000-4000-8000-000000000003','SVC-2026-3003','0a000000-0000-4000-8000-000000000001','0a000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000003','active','2026-04-01','2026-04-01','debt_settlement',24,650,'monthly','2026-04-15','glg_standard',25,14900,650)
ON CONFLICT (id) DO NOTHING;

-- 5. Liabilities ---------------------------------------------------------------
INSERT INTO public.liabilities (id, client_service_id, current_creditor_id, account_number, liability_type, original_balance, current_balance, enrolled_balance, status, notes) VALUES
  ('ae000000-0000-4000-8000-000000000001','ad000000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000001','8841','credit_card',12000,13200,13200,'enrolled','Capital One'),
  ('ae000000-0000-4000-8000-000000000002','ad000000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000006','2299','credit_card',10000,11000,11000,'in_negotiation','Discover'),
  ('ae000000-0000-4000-8000-000000000003','ad000000-0000-4000-8000-000000000002','aa000000-0000-4000-8000-000000000004','5610','credit_card',18000,19500,19500,'enrolled','Synchrony Bank'),
  ('ae000000-0000-4000-8000-000000000004','ad000000-0000-4000-8000-000000000002','aa000000-0000-4000-8000-000000000002','7420','credit_card',15000,16100,16100,'in_litigation','Midland'),
  ('ae000000-0000-4000-8000-000000000005','ad000000-0000-4000-8000-000000000003','aa000000-0000-4000-8000-000000000005','1188','personal_loan',14000,14900,14900,'enrolled','LVNV Funding')
ON CONFLICT (id) DO NOTHING;

-- 6. Transactions (payments) ---------------------------------------------------
INSERT INTO public.transactions (id, client_service_id, amount, transaction_type, status, scheduled_date, processed_at) VALUES
  ('af000000-0000-4000-8000-000000000001','ad000000-0000-4000-8000-000000000001',720,'draft','cleared','2026-02-15','2026-02-15'),
  ('af000000-0000-4000-8000-000000000002','ad000000-0000-4000-8000-000000000001',720,'draft','cleared','2026-03-15','2026-03-15'),
  ('af000000-0000-4000-8000-000000000003','ad000000-0000-4000-8000-000000000001',6600,'settlement_payment','pending','2026-05-01',NULL),
  ('af000000-0000-4000-8000-000000000004','ad000000-0000-4000-8000-000000000002',890,'draft','cleared','2026-03-15','2026-03-15'),
  ('af000000-0000-4000-8000-000000000005','ad000000-0000-4000-8000-000000000002',890,'draft','open','2026-04-15',NULL),
  ('af000000-0000-4000-8000-000000000006','ad000000-0000-4000-8000-000000000003',650,'draft','cleared','2026-04-15','2026-04-15'),
  ('af000000-0000-4000-8000-000000000007','ad000000-0000-4000-8000-000000000001',75,'processor_fee','cleared','2026-02-15','2026-02-15')
ON CONFLICT (id) DO NOTHING;

-- 7. Billing entries -----------------------------------------------------------
INSERT INTO public.billing_entries (id, company_id, staff_id, client_id, client_service_id, entry_type, description, billing_date, duration_minutes, hourly_rate, total_amount, is_billable, status) VALUES
  ('ba000000-0000-4000-8000-000000000001','0a000000-0000-4000-8000-000000000001',(SELECT id FROM public.staff WHERE user_id = 'd2000000-0000-4000-8000-000000000002'),'ac000000-0000-4000-8000-000000000001','ad000000-0000-4000-8000-000000000001','time','Creditor negotiation call',  '2026-03-10',45,250,187.50,true,'approved'),
  ('ba000000-0000-4000-8000-000000000002','0a000000-0000-4000-8000-000000000001',(SELECT id FROM public.staff WHERE user_id = 'd2000000-0000-4000-8000-000000000002'),'ac000000-0000-4000-8000-000000000002','ad000000-0000-4000-8000-000000000002','time','Litigation response drafting','2026-04-02',90,250,375.00,true,'draft'),
  ('ba000000-0000-4000-8000-000000000003','0a000000-0000-4000-8000-000000000001',(SELECT id FROM public.staff WHERE user_id = 'd3000000-0000-4000-8000-000000000003'),'ac000000-0000-4000-8000-000000000001',NULL,'expense','Court filing fee','2026-04-05',NULL,NULL,95.00,true,'invoiced')
ON CONFLICT (id) DO NOTHING;

-- 8. Tasks ---------------------------------------------------------------------
INSERT INTO public.tasks (id, company_id, title, task_type, priority, status, assigned_to, created_by, due_date, entity_type, entity_id) VALUES
  ('bb000000-0000-4000-8000-000000000001','0a000000-0000-4000-8000-000000000001','Follow up with Marcus Reed','follow_up','high','pending',(SELECT id FROM public.staff WHERE user_id = 'd2000000-0000-4000-8000-000000000002'),(SELECT id FROM public.staff WHERE user_id = 'd1000000-0000-4000-8000-000000000001'),'2026-06-05','lead','ab000000-0000-4000-8000-000000000001'),
  ('bb000000-0000-4000-8000-000000000002','0a000000-0000-4000-8000-000000000001','Collect bank statements','document_review','medium','in_progress',(SELECT id FROM public.staff WHERE user_id = 'd3000000-0000-4000-8000-000000000003'),(SELECT id FROM public.staff WHERE user_id = 'd1000000-0000-4000-8000-000000000001'),'2026-06-08','client','ac000000-0000-4000-8000-000000000001'),
  ('bb000000-0000-4000-8000-000000000003','0a000000-0000-4000-8000-000000000001','File answer to summons','court_deadline','urgent','pending',(SELECT id FROM public.staff WHERE user_id = 'd2000000-0000-4000-8000-000000000002'),(SELECT id FROM public.staff WHERE user_id = 'd1000000-0000-4000-8000-000000000001'),'2026-06-03','client','ac000000-0000-4000-8000-000000000002'),
  ('bb000000-0000-4000-8000-000000000004','0a000000-0000-4000-8000-000000000001','Settlement negotiation — Synchrony','settlement_negotiation','high','pending',(SELECT id FROM public.staff WHERE user_id = 'd2000000-0000-4000-8000-000000000002'),(SELECT id FROM public.staff WHERE user_id = 'd1000000-0000-4000-8000-000000000001'),'2026-06-12','client','ac000000-0000-4000-8000-000000000002'),
  ('bb000000-0000-4000-8000-000000000005','0a000000-0000-4000-8000-000000000001','Welcome call','client_call','low','completed',(SELECT id FROM public.staff WHERE user_id = 'd3000000-0000-4000-8000-000000000003'),(SELECT id FROM public.staff WHERE user_id = 'd1000000-0000-4000-8000-000000000001'),'2026-04-16','client','ac000000-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- 9. Litigation matters --------------------------------------------------------
INSERT INTO public.litigation_matters (id, liability_id, client_service_id, case_number, court_name, state, opposing_party, status, response_deadline, next_hearing_date) VALUES
  ('bc000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000004','ad000000-0000-4000-8000-000000000002','CV-2026-1182','San Diego Superior Court','CA','Midland Funding LLC','pre_response','2026-06-20','2026-07-10')
ON CONFLICT (id) DO NOTHING;

-- 10. Communications -----------------------------------------------------------
INSERT INTO public.client_communications (id, client_id, communication_type, direction, subject, notes, outcome, staff_id, communication_date) VALUES
  ('ca000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000001','call','outbound','Program check-in','Reviewed escrow progress and next draft','Positive',  (SELECT id FROM public.staff WHERE user_id = 'd3000000-0000-4000-8000-000000000003'),'2026-04-20'),
  ('ca000000-0000-4000-8000-000000000002','ac000000-0000-4000-8000-000000000002','email','inbound','Question about lawsuit','Client asked about Midland summons','Replied',(SELECT id FROM public.staff WHERE user_id = 'd2000000-0000-4000-8000-000000000002'),'2026-05-02')
ON CONFLICT (id) DO NOTHING;

-- 11. Feature requests ---------------------------------------------------------
INSERT INTO public.feature_requests (id, title, description, category, request_type, priority, status, staff_name, votes) VALUES
  ('bd000000-0000-4000-8000-000000000001','Bulk SMS to leads','Send templated SMS to a filtered lead list','new_feature','future_improvement','medium','under_review','Nadia Admin',7),
  ('bd000000-0000-4000-8000-000000000002','Escrow forecast chart','Project escrow vs. settlement timeline','reporting','existing_workflow','low','submitted','Theo Counsel',3),
  ('bd000000-0000-4000-8000-000000000003','Auto-assign by state','Route new leads to attorneys licensed in the state','workflow_gap','future_improvement','high','planned','Nadia Admin',12)
ON CONFLICT (id) DO NOTHING;

-- 12. Eligibility reviews ------------------------------------------------------
INSERT INTO public.eligibility_reviews (id, lead_id, status, submitted_at) VALUES
  ('be000000-0000-4000-8000-000000000001','ab000000-0000-4000-8000-000000000003','pending','2026-05-20'),
  ('be000000-0000-4000-8000-000000000002','ab000000-0000-4000-8000-000000000005','pending','2026-05-22')
ON CONFLICT (id) DO NOTHING;

-- Done. Refresh the app; every module should now show data.
