# Phase 5 — Servicing Layer Features (Complete)

## 5A — NSF Retry Logic
- Tables: `nsf_retry_policies` (one active per company), `transaction_retry_attempts`.
- Edge fn: `plsa-nsf-retry` (modes: `schedule`, `process_due`). Cron `plsa-nsf-retry-hourly`.
- `forth-poll-transactions` triggers `schedule` mode automatically when NSF detected.
- Settings UI: **NSF Retry** tab (active toggle, max attempts, configurable delay steps).

## 5B — Escrow Balance Automation
- Edge fn: `plsa-escrow-sync` iterates active services, calls `plsa-routing fetch_balance`,
  writes `client_services.escrow_balance_synced` + `escrow_balance_synced_at`.
- Cron `plsa-escrow-sync-nightly` at 02:00 UTC.
- Drift → `reconciliation_findings` (detector `escrow_drift`).
- `LiabilityDetailSheet` now prefers synced balance when <24h old for projections.

## 5C — Reconciliation Job + Dashboard
- Edge fn: `plsa-reconciliation` detectors:
  - `stale_pending_tx` (pending tx not polled >6h, also force-polls)
  - `escrow_balance_stale` (>36h since sync)
  - `escrow_drift` (count of open drift findings)
- Cron `plsa-reconciliation-hourly`.
- Page `/reports/reconciliation` — counts, table of open findings, manual scan + resolve.

## 5D — Template System Extensions
- `render-template` adds entity types: `transaction`, `loan` (loan placeholder).
- New merge fields: `{transaction.*}` (amount, type, status, scheduled/processed dates,
  description, external_id) and `{loan.*}` (amount, term, rate, monthly_payment, status,
  disbursement_date).
- SMS template variant: enum already supported `sms`; render-template treats content as text.

## Notes / Risk
- Cron registration is best-effort: if the migration role lacks `cron` privilege, schedules
  must be added manually. Service-role key is read from vault entry `service_role_key`;
  falls back to `MISSING_SERVICE_KEY` (cron will 401 until updated).
- No `loans` table exists; `loan` merge fields rely on `additional_data` overrides until
  ASAP loan entity ships.
- No cached forth fields on services yet, so `service_field_drift` detector is reserved
  but not active.
