-- Earned-fee AR recognition (settlement forecasting engine, spec §7.1).
--
-- Business rule (confirmed J.G., 2026-06-05): a settlement's performance fee (EPF) is *scheduled*
-- up front but does NOT become EARNED — and cannot be collected — until BOTH:
--   (a) the settlement offer is accepted (not in a dead state: rejected/void/withdrawn/…), and
--   (b) the FIRST creditor payment on that offer has cleared.
-- Once earned, the row is permanent: it survives a later break of the plan (that's the whole point
-- of earned_fee_ar vs. the prospective settlement_fee schedule).
--
-- The full EPF is recognized once per offer (settled_amount × fee_rate). Recognition is idempotent
-- (NOT EXISTS guard on settlement_offer_id) so it can be re-run after every sync.

CREATE OR REPLACE FUNCTION public.fn_recognize_earned_fees(p_contact_id bigint DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    inserted_count integer;
BEGIN
    WITH eligible AS (
        SELECT
            so.offer_id,
            so.company_id,
            so.debt_id,
            so.contact_id,
            so.settled_amount,
            so.fee_rate,
            round(so.settled_amount * so.fee_rate, 2) AS fee_amount
        FROM public.settlement_offer so
        WHERE so.settled_amount IS NOT NULL
          AND (p_contact_id IS NULL OR so.contact_id = p_contact_id)
          -- (a) accepted: not in a dead/withdrawn state. A cleared creditor payment already implies
          -- acceptance; this is a guard against earning on a voided offer with a stray cleared row.
          AND COALESCE(so.status, '') NOT ILIKE ALL (ARRAY[
              '%reject%', '%void%', '%withdraw%', '%declin%', '%cancel%', '%expire%'
          ])
          -- (b) first creditor payment cleared: a cleared/shipped OUTFLOW on this offer that is not
          -- an EPF fee transaction (fees are excluded by name).
          AND EXISTS (
              SELECT 1 FROM public.forth_transaction ft
              WHERE ft.offer_id = so.offer_id
                AND ft.inout = 'O'
                AND ft.status_name IN ('Cleared', 'Shipped')
                AND COALESCE(ft.transaction_type_name, '') NOT ILIKE '%fee%'
                AND COALESCE(ft.transaction_subtype_name, '') NOT ILIKE '%fee%'
          )
          -- idempotent: don't re-earn an offer already in AR
          AND NOT EXISTS (
              SELECT 1 FROM public.earned_fee_ar e WHERE e.settlement_offer_id = so.offer_id
          )
    ),
    ins AS (
        INSERT INTO public.earned_fee_ar (
            company_id, settlement_offer_id, debt_id, contact_id,
            settled_amount, fee_rate, fee_amount, earned_on, source_offer_id
        )
        SELECT
            company_id, offer_id, debt_id, contact_id,
            settled_amount, fee_rate, fee_amount, now(), offer_id
        FROM eligible
        RETURNING 1
    )
    SELECT count(*) INTO inserted_count FROM ins;

    RETURN inserted_count;
END;
$$;

COMMENT ON FUNCTION public.fn_recognize_earned_fees(bigint) IS
    'Recognize earned EPF into earned_fee_ar once a settlement is accepted AND its first creditor '
    'payment has cleared (spec §7.1). Idempotent; returns the number of newly-earned offers.';
