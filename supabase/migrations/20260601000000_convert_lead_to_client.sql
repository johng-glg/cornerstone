-- convert_lead_to_client — atomic lead → client + engagement + liabilities conversion.
--
-- Used by the Consumer Defense enrollment wizard's "Complete Enrollment" step. Runs as a single
-- transaction so a partially-enrolled lead can never exist. SECURITY DEFINER (bypasses RLS for
-- the multi-table writes) but re-checks authorization: the caller must belong to the lead's
-- company via can_access_company. Only SSN last-4 is captured (no full SSN), so no PII crypto
-- is needed here.
--
-- Payload (jsonb): first_name, middle_name, last_name, email, date_of_birth, ssn_last4,
--   tcpa_consent, employment_status, monthly_income, hardship_notes, in_bankruptcy,
--   term_months, monthly_payment, payment_frequency, first_payment_date, plan_type,
--   settlement_fee_percentage, total_enrolled_debt, notes,
--   debts: [{ creditor_name, account_type, original_balance, current_balance, account_number_last4 }]
--
-- Returns the new client_services.id (the engagement).

CREATE OR REPLACE FUNCTION public.convert_lead_to_client(_lead_id uuid, _payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lead public.leads;
  _client_id uuid;
  _service_id uuid;
  _debt jsonb;
BEGIN
  SELECT * INTO _lead FROM public.leads WHERE id = _lead_id;
  IF _lead.id IS NULL THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  IF NOT public.can_access_company(auth.uid(), _lead.company_id) THEN
    RAISE EXCEPTION 'Not authorized for this lead';
  END IF;

  IF _lead.converted_service_id IS NOT NULL THEN
    RAISE EXCEPTION 'Lead is already converted';
  END IF;

  -- 1. Client (identity + contact). Only SSN last-4 is stored.
  INSERT INTO public.clients (
    company_id, first_name, middle_name, last_name, email, date_of_birth,
    ssn_last4, tcpa_consent, tcpa_consent_date, status, is_active, notes
  )
  VALUES (
    _lead.company_id,
    COALESCE(NULLIF(_payload->>'first_name', ''), _lead.first_name),
    NULLIF(_payload->>'middle_name', ''),
    COALESCE(NULLIF(_payload->>'last_name', ''), _lead.last_name),
    COALESCE(NULLIF(_payload->>'email', ''), _lead.email),
    NULLIF(_payload->>'date_of_birth', '')::date,
    NULLIF(_payload->>'ssn_last4', ''),
    COALESCE((_payload->>'tcpa_consent')::boolean, false),
    CASE WHEN COALESCE((_payload->>'tcpa_consent')::boolean, false) THEN now() END,
    'active',
    true,
    NULLIF(_payload->>'hardship_notes', '')
  )
  RETURNING id INTO _client_id;

  -- 2. Engagement (client_services). service_number is set by a BEFORE INSERT trigger.
  INSERT INTO public.client_services (
    owning_company_id, originating_company_id, primary_client_id, status,
    enrolled_date, program_start_date, program_type, term_months, monthly_payment,
    payment_frequency, first_payment_date, first_draft_date, plan_type,
    settlement_fee_percentage, total_enrolled_debt, notes
  )
  VALUES (
    _lead.company_id, _lead.company_id, _client_id, 'active',
    CURRENT_DATE, CURRENT_DATE, 'debt_settlement',
    NULLIF(_payload->>'term_months', '')::int,
    NULLIF(_payload->>'monthly_payment', '')::numeric,
    COALESCE(NULLIF(_payload->>'payment_frequency', ''), 'monthly'),
    NULLIF(_payload->>'first_payment_date', '')::date,
    NULLIF(_payload->>'first_payment_date', '')::date,
    COALESCE(NULLIF(_payload->>'plan_type', '')::public.plan_type, 'glg_standard'),
    COALESCE((_payload->>'settlement_fee_percentage')::numeric, 25),
    COALESCE((_payload->>'total_enrolled_debt')::numeric, 0),
    NULLIF(_payload->>'notes', '')
  )
  RETURNING id INTO _service_id;

  -- 3. Liabilities from the enrolled debts.
  FOR _debt IN SELECT * FROM jsonb_array_elements(COALESCE(_payload->'debts', '[]'::jsonb))
  LOOP
    INSERT INTO public.liabilities (
      client_service_id, account_number, liability_type,
      original_balance, current_balance, enrolled_balance, status, notes
    )
    VALUES (
      _service_id,
      NULLIF(_debt->>'account_number_last4', ''),
      COALESCE(NULLIF(_debt->>'account_type', '')::public.liability_type, 'credit_card'),
      NULLIF(_debt->>'original_balance', '')::numeric,
      NULLIF(_debt->>'current_balance', '')::numeric,
      NULLIF(_debt->>'current_balance', '')::numeric,
      'enrolled',
      NULLIF(_debt->>'creditor_name', '')
    );
  END LOOP;

  -- 4. Mark the lead converted and fold in any captured fields.
  UPDATE public.leads
     SET status = 'converted',
         converted_service_id = _service_id,
         converted_at = now(),
         in_bankruptcy = COALESCE((_payload->>'in_bankruptcy')::boolean, in_bankruptcy),
         employment_status = COALESCE(
           NULLIF(_payload->>'employment_status', '')::public.employment_status, employment_status),
         monthly_income = COALESCE((_payload->>'monthly_income')::numeric, monthly_income)
   WHERE id = _lead_id;

  RETURN _service_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_lead_to_client(uuid, jsonb) TO authenticated;

-- Rollback:
-- DROP FUNCTION IF EXISTS public.convert_lead_to_client(uuid, jsonb);
