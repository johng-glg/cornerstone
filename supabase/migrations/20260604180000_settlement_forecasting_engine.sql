-- Settlement Forecasting & Early-Warning Engine — core data model + projection functions.
-- Spec: "Cornerstone — Settlement Forecasting & Early-Warning Engine" (J. Greenway).
--
-- This engine computes decisions/projections only; Forth remains the system of record for money
-- (boundary 1). Tables here are a read-only mirror of Forth transactions + parsed offer schedules,
-- plus engine-owned outputs (projection_run, forecast_alert, earned_fee_ar). All ids prefixed
-- *_id (contact_id, debt_id, offer_id) are FORTH ids (bigint), matching VW_TRANSACTIONS_2 /
-- VW_MASS_SETTLEMENT_OFFER_CALCULATIONS. company_id is added for Cornerstone tenant isolation
-- (resolved Forth contact -> client -> company by the sync layer) and standard company-scoped RLS.
--
-- Naming note: the spec's `settlement` clashes with the existing public.settlements (uuid-keyed),
-- so the offer header is `settlement_offer`; the spec's `alert` is `forecast_alert`.

-- ── Config (system-wide; spec §10) ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_setting (
    key text PRIMARY KEY,
    value text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid
);

INSERT INTO public.system_setting (key, value) VALUES
    ('min_balance_floor', '100.00'),
    ('incidental_buffer_per_payment', '6.00'),
    ('default_fee_rate', '0.27'),
    ('alert_horizon_days', '45'),       -- spec §8 open decision: default (b); configurable
    ('fee_recovery_rule', '')           -- spec §7.3 TODO(J.G./Finance): confirm exact rule
ON CONFLICT (key) DO NOTHING;

-- ── Forth transaction mirror (read-only; written by the sync layer) — spec §3.1 ────────────────
CREATE TABLE IF NOT EXISTS public.forth_transaction (
    id bigint PRIMARY KEY,                       -- Forth transaction id
    company_id uuid NOT NULL,
    contact_id bigint NOT NULL,
    debt_id bigint,
    offer_id bigint,
    linked_to bigint,
    process_date date,
    draft_date date,
    cleared_date date,
    returned_date date,                          -- set => NSF / returned draft
    inout text,                                  -- 'O' = outflow, else inflow
    amount numeric(14, 2),
    net_amount numeric(14, 2),                   -- signed: inout='O' ? -amount : amount
    transaction_type_name text,
    transaction_subtype_name text,
    status_name text,                            -- Open|Pending|Cleared|Shipped|Low Balance|Returned|…
    payee_name text,
    created_at timestamptz NOT NULL DEFAULT now(),
    synced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_forth_transaction_contact ON public.forth_transaction (contact_id, process_date);
CREATE INDEX IF NOT EXISTS idx_forth_transaction_company ON public.forth_transaction (company_id);
CREATE INDEX IF NOT EXISTS idx_forth_transaction_offer ON public.forth_transaction (offer_id);

-- ── Settlement offer header + parsed schedules — spec §3.2 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settlement_offer (
    offer_id bigint PRIMARY KEY,                 -- Forth settlement offer id
    company_id uuid NOT NULL,
    debt_id bigint,
    contact_id bigint NOT NULL,
    status text,                                 -- funds_calculation|active|completed|broken|…
    settled_amount numeric(14, 2),
    fee_rate numeric(6, 4) NOT NULL DEFAULT 0.27,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_settlement_offer_contact ON public.settlement_offer (contact_id);
CREATE INDEX IF NOT EXISTS idx_settlement_offer_status ON public.settlement_offer (status);

-- Creditor payment schedule (parsed from offer json:payments)
CREATE TABLE IF NOT EXISTS public.settlement_payment (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    offer_id bigint NOT NULL REFERENCES public.settlement_offer (offer_id) ON DELETE CASCADE,
    debt_id bigint,
    contact_id bigint NOT NULL,
    seq integer NOT NULL,                        -- payment_num
    process_date date,
    amount numeric(14, 2),
    UNIQUE (offer_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_settlement_payment_offer ON public.settlement_payment (offer_id);

-- EPF (earned performance fee) collection schedule (parsed from offer json:fees)
CREATE TABLE IF NOT EXISTS public.settlement_fee (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    offer_id bigint NOT NULL REFERENCES public.settlement_offer (offer_id) ON DELETE CASCADE,
    debt_id bigint,
    contact_id bigint NOT NULL,
    seq integer NOT NULL,
    process_date date,
    amount numeric(14, 2),
    UNIQUE (offer_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_settlement_fee_offer ON public.settlement_fee (offer_id);

-- ── Earned-fee AR (permanent; survives breaks) — spec §7.1 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.earned_fee_ar (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    settlement_offer_id bigint NOT NULL,
    debt_id bigint,
    contact_id bigint NOT NULL,
    settled_amount numeric(14, 2),
    fee_rate numeric(6, 4) NOT NULL DEFAULT 0.27,
    fee_amount numeric(14, 2) NOT NULL,
    earned_on timestamptz NOT NULL DEFAULT now(),
    source_offer_id bigint,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_earned_fee_ar_contact ON public.earned_fee_ar (contact_id);

-- ── Latest projection per client (fast reads + event diffing) — spec §6/§11 ────────────────────
CREATE TABLE IF NOT EXISTS public.projection_run (
    contact_id bigint PRIMARY KEY,
    company_id uuid NOT NULL,
    min_balance numeric(14, 2),
    breach boolean NOT NULL DEFAULT false,
    additional_needed numeric(14, 2),
    headroom numeric(14, 2),
    breach_date date,
    start_date date,
    payload jsonb,
    computed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projection_run_company ON public.projection_run (company_id);

-- ── Breach alerts with lifecycle — spec §8 ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forecast_alert (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    contact_id bigint NOT NULL,
    type text NOT NULL,                          -- floor_breach|creditor_payment_underfunded|nsf_induced_breach
    severity text,
    breach_date date,
    lead_days integer,
    shortfall_amount numeric(14, 2),
    threatened_offer_id bigint,
    threatened_debt_id bigint,
    status text NOT NULL DEFAULT 'open',         -- open|acknowledged|resolved
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz
);
-- one active alert per (contact, threatened offer, breach date)
CREATE UNIQUE INDEX IF NOT EXISTS forecast_alert_dedupe_key
    ON public.forecast_alert (contact_id, threatened_offer_id, breach_date);
CREATE INDEX IF NOT EXISTS idx_forecast_alert_open ON public.forecast_alert (company_id, status);

-- ── RLS (company-scoped, matching the repo convention) ─────────────────────────────────────────
ALTER TABLE public.forth_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_offer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_fee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earned_fee_ar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projection_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_alert ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_setting ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can access forth_transaction" ON public.forth_transaction
    TO authenticated USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Staff can access settlement_offer" ON public.settlement_offer
    TO authenticated USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Staff can access settlement_payment" ON public.settlement_payment
    TO authenticated USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Staff can access settlement_fee" ON public.settlement_fee
    TO authenticated USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Staff can access earned_fee_ar" ON public.earned_fee_ar
    TO authenticated USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Staff can access projection_run" ON public.projection_run
    TO authenticated USING (public.can_access_company(auth.uid(), company_id));
CREATE POLICY "Staff can access forecast_alert" ON public.forecast_alert
    TO authenticated USING (public.can_access_company(auth.uid(), company_id));
-- system_setting is global config: any authenticated user may read; writes via service role only.
CREATE POLICY "Authenticated can read system_setting" ON public.system_setting
    FOR SELECT TO authenticated USING (true);

-- ── Core projection function (spec §4) — ports VW_MASS_SETTLEMENT_OFFER_CALCULATIONS ───────────
-- Returns the signed, chronological, running-balance timeline for a contact. Prospective offer
-- lines (payments + fees, with the per-payment incidental buffer) are included ONLY when
-- p_prospective_offer_ids is provided (Mode A). Committed obligations of active settlements are
-- already in forth_transaction, so they must NOT be added again (spec §4 double-count rule).
CREATE OR REPLACE FUNCTION public.fn_project_balance(
    p_contact_id bigint,
    p_prospective_offer_ids bigint[] DEFAULT NULL,
    p_floor numeric DEFAULT NULL,            -- accepted for signature symmetry; not used here
    p_incidental numeric DEFAULT NULL
) RETURNS TABLE (
    process_date date,
    net_amount numeric,
    source_type text,
    record_source text,
    sort_key numeric,
    offer_id bigint,
    debt_id bigint,
    running_balance numeric
) LANGUAGE sql STABLE AS $$
    WITH cfg AS (
        SELECT COALESCE(
            p_incidental,
            (SELECT value::numeric FROM public.system_setting WHERE key = 'incidental_buffer_per_payment'),
            6.00
        ) AS incidental
    ),
    combined AS (
        -- Existing mirrored transactions (the cash pool)
        SELECT
            t.process_date,
            t.net_amount,
            t.transaction_type_name AS source_type,
            'EXISTING_TRANSACTION'::text AS record_source,
            t.id::numeric AS sort_key,
            t.offer_id,
            t.debt_id
        FROM public.forth_transaction t
        WHERE t.contact_id = p_contact_id
          AND t.status_name IN ('Open', 'Pending', 'Cleared', 'Shipped', 'Low Balance')
          AND NOT (t.status_name = 'Open' AND t.process_date < CURRENT_DATE)

        UNION ALL
        -- Prospective creditor payments (Mode A only): outflow + incidental buffer
        SELECT
            sp.process_date,
            (-1 * sp.amount) - (SELECT incidental FROM cfg),
            'SETTLEMENT_PAYMENT'::text,
            'SETTLEMENT_PAYMENT'::text,
            sp.seq::numeric,
            sp.offer_id,
            sp.debt_id
        FROM public.settlement_payment sp
        WHERE p_prospective_offer_ids IS NOT NULL
          AND sp.offer_id = ANY (p_prospective_offer_ids)

        UNION ALL
        -- Prospective fees (Mode A only): outflow
        SELECT
            sf.process_date,
            -1 * sf.amount,
            'SETTLEMENT_FEE'::text,
            'SETTLEMENT_FEE'::text,
            sf.seq::numeric,
            sf.offer_id,
            sf.debt_id
        FROM public.settlement_fee sf
        WHERE p_prospective_offer_ids IS NOT NULL
          AND sf.offer_id = ANY (p_prospective_offer_ids)
    )
    SELECT
        c.process_date,
        c.net_amount,
        c.source_type,
        c.record_source,
        c.sort_key,
        c.offer_id,
        c.debt_id,
        SUM(c.net_amount) OVER (
            ORDER BY c.process_date, c.record_source, c.sort_key
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS running_balance
    FROM combined c
    ORDER BY c.process_date, c.record_source, c.sort_key;
$$;

-- ── Verdict (floor-aware aggregate over the timeline) — spec §4.4 ──────────────────────────────
-- With p_floor = 0 this reconciles to VW_MASS_SETTLEMENT_OFFER_CALCULATIONS (acceptance §13.1):
-- additional_needed = 0 - min_balance = ABS(min_balance) when short.
CREATE OR REPLACE FUNCTION public.fn_project_verdict(
    p_contact_id bigint,
    p_prospective_offer_ids bigint[] DEFAULT NULL,
    p_floor numeric DEFAULT NULL,
    p_incidental numeric DEFAULT NULL
) RETURNS TABLE (
    min_balance numeric,
    breach boolean,
    additional_needed numeric,
    headroom numeric,
    breach_date date,
    start_date date
) LANGUAGE sql STABLE AS $$
    WITH cfg AS (
        SELECT COALESCE(
            p_floor,
            (SELECT value::numeric FROM public.system_setting WHERE key = 'min_balance_floor'),
            100.00
        ) AS floor
    ),
    t_start AS (
        SELECT CASE
            WHEN p_prospective_offer_ids IS NOT NULL THEN (
                SELECT MIN(d) FROM (
                    SELECT process_date AS d FROM public.settlement_payment
                        WHERE offer_id = ANY (p_prospective_offer_ids)
                    UNION ALL
                    SELECT process_date FROM public.settlement_fee
                        WHERE offer_id = ANY (p_prospective_offer_ids)
                ) z
            )
            ELSE CURRENT_DATE
        END AS start_date
    ),
    scoped AS (
        SELECT pb.*
        FROM public.fn_project_balance(p_contact_id, p_prospective_offer_ids, p_floor, p_incidental) pb,
             t_start s
        WHERE pb.process_date >= s.start_date
    )
    SELECT
        MIN(scoped.running_balance) AS min_balance,
        (MIN(scoped.running_balance) < (SELECT floor FROM cfg)) AS breach,
        CASE WHEN MIN(scoped.running_balance) < (SELECT floor FROM cfg)
             THEN (SELECT floor FROM cfg) - MIN(scoped.running_balance) END AS additional_needed,
        CASE WHEN MIN(scoped.running_balance) >= (SELECT floor FROM cfg)
             THEN MIN(scoped.running_balance) - (SELECT floor FROM cfg) END AS headroom,
        (SELECT MIN(s2.process_date) FROM scoped s2 WHERE s2.running_balance < (SELECT floor FROM cfg)) AS breach_date,
        (SELECT start_date FROM t_start) AS start_date
    FROM scoped;
$$;
