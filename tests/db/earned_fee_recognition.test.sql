-- Earned-fee AR recognition (migration 20260605120000, spec §7.1). Rolls back.
-- Rule: EPF is earned only once the offer is accepted AND its first creditor payment has cleared.
\set ON_ERROR_STOP on
BEGIN;

\set co '''20000000-0000-4000-8000-000000000001'''

-- Four offers, same contact (4242), all settled 1000 @ 27% -> EPF would be 270.
INSERT INTO public.settlement_offer (offer_id, company_id, debt_id, contact_id, status, settled_amount, fee_rate) VALUES
  (8001, :co, 701, 4242, 'accepted', 1000, 0.27),  -- A: accepted + cleared creditor payment  -> EARN
  (8002, :co, 702, 4242, 'accepted', 1000, 0.27),  -- B: accepted, NO cleared payment          -> no
  (8003, :co, 703, 4242, 'accepted', 1000, 0.27),  -- C: only a cleared EPF *fee* outflow       -> no
  (8004, :co, 704, 4242, 'voided',   1000, 0.27);  -- D: cleared payment but offer voided       -> no

INSERT INTO public.forth_transaction (id, company_id, contact_id, offer_id, inout, status_name, transaction_type_name) VALUES
  (90001, :co, 4242, 8001, 'O', 'Cleared', 'Creditor Payment'),  -- A: qualifying first payment
  (90003, :co, 4242, 8003, 'O', 'Cleared', 'EPF Fee'),           -- C: fee, excluded by name
  (90004, :co, 4242, 8004, 'O', 'Cleared', 'Creditor Payment');  -- D: payment, but offer voided

DO $$
DECLARE _n int; _fee numeric;
BEGIN
  _n := public.fn_recognize_earned_fees(4242);
  ASSERT _n = 1, format('expected 1 newly-earned offer, got %s', _n);

  -- Only offer A earned, at the full EPF.
  ASSERT (SELECT count(*) FROM public.earned_fee_ar WHERE contact_id = 4242) = 1, 'exactly one AR row expected';
  SELECT fee_amount INTO _fee FROM public.earned_fee_ar WHERE settlement_offer_id = 8001;
  ASSERT _fee = 270.00, format('expected fee 270.00, got %s', _fee);

  ASSERT NOT EXISTS (SELECT 1 FROM public.earned_fee_ar WHERE settlement_offer_id = 8002), 'B must not earn (no cleared payment)';
  ASSERT NOT EXISTS (SELECT 1 FROM public.earned_fee_ar WHERE settlement_offer_id = 8003), 'C must not earn (fee outflow only)';
  ASSERT NOT EXISTS (SELECT 1 FROM public.earned_fee_ar WHERE settlement_offer_id = 8004), 'D must not earn (offer voided)';

  -- Idempotent: re-running earns nothing more and leaves the row intact.
  _n := public.fn_recognize_earned_fees(4242);
  ASSERT _n = 0, format('re-run should earn 0, got %s', _n);
  ASSERT (SELECT count(*) FROM public.earned_fee_ar WHERE contact_id = 4242) = 1, 'AR must stay at one row after re-run';

  -- Survives a break: voiding A's offer after earning does NOT remove the AR row.
  UPDATE public.settlement_offer SET status = 'broken' WHERE offer_id = 8001;
  _n := public.fn_recognize_earned_fees(4242);
  ASSERT (SELECT count(*) FROM public.earned_fee_ar WHERE settlement_offer_id = 8001) = 1, 'earned AR must survive a later break';

  RAISE NOTICE 'earned_fee_recognition: OK';
END $$;

ROLLBACK;
