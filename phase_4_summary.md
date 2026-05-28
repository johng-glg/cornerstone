# Phase 4 — PLSA Adapter Abstraction (Routing Layer)

Status: complete.

## What shipped

### 4A — `plsa-routing` edge function
- New canonical entry point at `supabase/functions/plsa-routing/index.ts`.
- Input: `{ operation, client_id?, client_service_id?, transaction_id?, settlement_id?, payload? }`.
- Resolves `plsa_provider_id` in this order: explicit `payload.provider_id` → `client_service_id` lookup → `transaction_id` lookup → most-recent service for `client_id` → default `'forth'`.
- Dispatches to the provider-specific edge function via internal HTTP (`/functions/v1/<fn>`), forwarding the caller's `Authorization` header.
- Always returns `provider_id` in the response.
- Supports 12 canonical operations: `auth_test`, `register_client`, `sync_client`, `fetch_balance`, `contact_update`, `contact_close`, `create_draft`, `update_draft`, `cancel_draft`, `pause_resume`, `poll_transactions`, `payment_to_creditor`.

### 4B — `plsa-adapter-mock`
- New `supabase/functions/plsa-adapter-mock/index.ts`.
- Implements every canonical operation with realistic-shape canned responses, no real side effects.
- Selected by setting `client_services.plsa_provider_id = 'mock'`.

### 4C — `src/lib/forthApi.ts` → `src/lib/plsaApi.ts`
- New canonical module `src/lib/plsaApi.ts` — every helper now invokes `plsa-routing` instead of the `forth-*` functions directly.
- Public signatures preserved (`createForthDraft`, `pauseForthClient`, `fetchForthBalance`, etc.) so existing hooks and components keep working.
- `src/lib/forthApi.ts` reduced to a one-line `export * from './plsaApi'` shim for backwards compatibility.
- `useForthApi.ts` and `TransactionDetailSheet.tsx` repointed to `@/lib/plsaApi` directly.

### 4D — Schema rename
- `forth_sync_log` table renamed to `plsa_sync_log`.
- Added `provider_id text NOT NULL DEFAULT 'forth'` (backfilled on existing rows).
- New index `idx_plsa_sync_log_provider(provider_id, created_at DESC)`.
- All 12 forth-* edge functions (and `_shared/forthAuth.ts`) updated to write to `plsa_sync_log`.

### 4E — Provider awareness schema
- `client_services`: added `plsa_provider_id text default 'forth'`, `early_exit_eligible boolean default false`, `early_exit_status text default 'none'`, `loan_provider_id text null`.
- `transactions`: added `plsa_provider_id text default 'forth'`.
- `transaction_type` enum extended with `loan_disbursement`, `loan_settlement_payment`, `loan_fee_collection` (reserved for future ASAP loan flow — not yet emitted by any code path).

## Acceptance criteria

- [x] `plsa-routing` dispatches correctly to `forth-*` based on `plsa_provider_id`.
- [x] Mock adapter returns realistic shapes for every operation.
- [x] App functions through the routing layer; no UI changes required.
- [x] `plsa_sync_log` rename complete; `provider_id` populated.
- [x] New columns/enum values exist for future ASAP architectural accommodation.

## Notes & deferred

- All UI calls now go through routing, but the registered provider for every existing service is `'forth'`, so production behavior is unchanged. To smoke-test the mock adapter, flip a single `client_services.plsa_provider_id` to `'mock'`.
- The legacy `forth-*` edge functions are still callable directly (they have to be — `plsa-routing` invokes them by URL). They can be removed only after every call site has been migrated to routing, which is now true on the frontend; any external schedulers (e.g. cron for `forth-poll-transactions`) should also be repointed to `plsa-routing { operation: 'poll_transactions' }` in a follow-up.
- `forthApi.ts` shim can be deleted once any out-of-tree consumers are migrated; left in place to avoid churn.
- Phase 4 unblocks Phase 5 (servicing module) per the roadmap.
