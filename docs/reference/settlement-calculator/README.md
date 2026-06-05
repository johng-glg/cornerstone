# Settlement calculator — source of truth

GLG's Snowflake views (the "NG & PPD Queries") that define the settlement funds-availability
calculation shown on the Forth "Settlements & Negotiations" page. The Cornerstone engine and the
settlement builder are ported from these — keep them in sync when GLG changes the logic.

- `VW_MASS_SETTLEMENT_OFFER_CALCULATIONS.sql` — the calc: running "Client Balance" over the
  transaction timeline; settlement payments are `(−amount − 6)` custodial outflows, EPF fees are
  `−amount`; `MIN(running) < 0 ⇒ "CLIENT GOES SHORT"`, additional funds = `ABS(min)`. MIN is taken
  over rows on/after the offer's first payment date.
- `VW_TRANSACTIONS_2.sql` — `NET_AMOUNT = (INOUT='O' ? −AMOUNT : AMOUNT)`; status set
  Open/Pending/Cleared/Shipped/Low Balance.
- `VW_SETTLEMENT_OFFER_PARSED_PAYMENTS.sql` / `VW_SETTLEMENT_OFFER_PARSED_FEES.sql` — the per-offer
  payment and Earned-Performance-Fee schedules parsed from the offer JSON.

Ported in: `supabase/migrations/20260604180000_settlement_forecasting_engine.sql`
(`fn_project_balance` / `fn_project_verdict`) and `src/lib/settlementMath.ts`
(`projectOfferFeasibility`).

Sample-data CSVs were intentionally NOT committed (they contain real contact PII).
