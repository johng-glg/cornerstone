# Phase 3 Summary — New Forth Operations

Status: **Scaffolded & deployed** (3A–3D). Endpoints are best-guess pending Forth Pay / Forth CRM API doc confirmation.

## What shipped

### 3A — `forth-fetch-balance`
- New edge function. Input `{ client_id }`. Looks up `forth_crm_id`, calls Forth Pay balance endpoint, returns canonical `{ balance, balance_cents, as_of_timestamp, source: 'forth', local_projection, drift_detected }`.
- Reconciliation: compares against sum of `client_services.escrow_balance` for the client; if drift > $1.00 AND > 5%, logs `escrow_drift_detected` via `log_audit_event` to `system_audit_log`.
- Refresh button wired in **ServiceDetailSheet → Program tab → PLSA Balance** (only shown when `forth_crm_id` present).
- TODO(forth-docs): confirm endpoint `GET /v1/contacts/{id}/balance` and response shape.

### 3B — `forth-contact-update`
- New edge function. Input `{ client_id, updates }`. PUT to `/v1/contacts/{id}`. No-ops with `skipped: true` if client not yet linked to Forth.
- Hook `useUpdateForthContact` exposed; **not auto-wired into ClientFormDialog save flow yet** — needs design choice on blocking vs background sync. See "Open items" below.
- TODO(forth-docs): confirm PUT vs PATCH + field names (`first_name` vs `firstName`, etc.).

### 3C — `forth-contact-close`
- New edge function. Input `{ client_id, close_reason }`. Tries `PUT /v1/contacts/{id}/close` first; falls back to `DELETE /v1/contacts/{id}` on 404/405.
- Sets `clients.forth_status = 'closed'` on success.
- New schema column `clients.forth_status text`.
- Hook `useCloseForthContact` exposed; **not auto-wired into StatusChangeModal yet** — same reason as 3B.

### 3D — `forth-payment-to-creditor` (largest)
- New edge function. Input `{ settlement_id, payment_method? }`. Validates `attorney_approved`, no prior `external_payment_id`, and local escrow >= offer. Resolves payee from `liability.current_creditor_id` → creditor name + `liability.account_number`.
- Marks `settlements.payment_send_status = 'sending'` before the network call (crash breadcrumb), then transitions to `sent` / `failed` / `sent_no_id`.
- Stores `external_payment_id`, `payment_sent_at`, `payment_method` on `settlements`.
- "Send Payment" button on `SettlementCard` shows when status=`accepted`, attorney-approved, and no prior external id. After send, a badge shows the truncated external id.
- TODO(forth-docs): confirm disbursement endpoint + payload (payee bank info, RCC vs ACH selection, processing-date offset rules, response keys).

## Schema changes (migration applied)
- `clients.forth_status text`
- `settlements.external_payment_id text` + index
- `settlements.payment_send_status text`
- `settlements.payment_sent_at timestamptz`
- `settlements.payment_method text`
- `client_services.escrow_balance_synced numeric` (Phase 5B groundwork)
- `client_services.escrow_balance_synced_at timestamptz` (Phase 5B groundwork)

## Files touched
- created `supabase/functions/forth-fetch-balance/index.ts`
- created `supabase/functions/forth-contact-update/index.ts`
- created `supabase/functions/forth-contact-close/index.ts`
- created `supabase/functions/forth-payment-to-creditor/index.ts`
- edited  `supabase/config.toml` (added `verify_jwt = false` for all 4)
- edited  `src/lib/forthApi.ts` (added 4 wrappers + types)
- edited  `src/hooks/useForthApi.ts` (added 4 hooks)
- edited  `src/components/services/ServiceDetailSheet.tsx` (Refresh button)
- edited  `src/components/liabilities/SettlementCard.tsx` (Send Payment button + badge)
- migration: Phase 3 schema additions

## Open items / follow-ups
1. **All four endpoints are placeholders.** Every Forth API URL is marked `TODO(forth-docs)`. Once real specs arrive, only the URLs + request/response key parsing need to change — the contract & wiring stay.
2. **3B auto-wire**: ClientFormDialog should call `useUpdateForthContact` on save, but blocking vs fire-and-forget hasn't been decided. Likely fire-and-forget with a non-fatal toast.
3. **3C auto-wire**: `StatusChangeModal` should call `useCloseForthContact` when a service transitions to graduated/cancelled/terminated AND no other active services exist for the client. Needs a "last active service" guard.
4. **3D poller extension**: Roadmap says `forth-poll-transactions` should also poll outbound payments by `external_payment_id`. Not done — current poller only handles drafts.
5. **3D payee data**: We pass `payee_name` + `account_number` but no payee bank/address. Real disbursement likely requires more. Add a `settlement_payees` table per roadmap when spec lands.
6. **3A drift threshold** ($1 & 5%) is hardcoded; could move to a settings row later.

## Risks
- Calling any of these against the real Forth sandbox today will likely 404 until URLs are confirmed. Edge functions return a clear error in that case and log to `forth_sync_log` — no silent failures.
- `forth-payment-to-creditor` mutates `settlements.payment_send_status` before the network call. If the function crashes mid-flight, the row is left at `sending` and needs operator review. Acceptable trade-off vs the alternative (double-send).
- `clients.forth_status` is informational only; not yet referenced by RLS, dashboards, or workflow rules.

## Next phase
Phase 4 — PLSA adapter abstraction (routing layer). All four Forth ops above will be reachable through `plsa-routing` once Phase 4 lands. Forth API URLs ideally confirmed before Phase 4 so the rename happens against working code.
