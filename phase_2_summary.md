# Phase 2 Summary — Forth Adapter Hardening

Status: **Complete** (2A–2F)

## What shipped

### 2A — Shared OAuth helper
- New `supabase/functions/_shared/forthAuth.ts` with `getAccessToken`, `buildForthHeaders`, `forthFetch`, `clearTokenCache`.
- All 8 `forth-*` functions refactored to import the shared helper. ~340 lines of duplication removed.
- Token cache keyed by `companyId` (or `'default'`), 9-day TTL.

### 2B — Per-tenant credentials (plaintext, encryption deferred)
- `getAccessToken(companyId)` looks up `public.company_processor_configs.config` JSONB for `{ client_id, api_key }` and falls back to `FORTH_CLIENT_ID` / `FORTH_API_KEY` env secrets.
- Stored plaintext for now; revisit when SSN encryption infrastructure lands (see `mem://security/deferred-cornerstone-items`).
- No GLG row seeded — env fallback covers the root tenant.

### 2C — Scheduled poller
- Added `transactions.last_polled_at TIMESTAMPTZ` + partial index `idx_transactions_pending_last_polled` for fast scans.
- `forth-poll-transactions` now `ORDER BY last_polled_at NULLS FIRST` and stamps `last_polled_at` on every successful fetch (so the queue rotates even when status is unchanged).
- `pg_cron` job `cornerstone-forth-poll-transactions` scheduled `*/15 * * * *` via `net.http_post` to the edge function.

### 2D — Pause/Resume UI
- `ServiceDetailSheet` Program tab now exposes **Pause drafts** / **Resume drafts** buttons under the Forth Pay card when `forth_crm_id` is present. Wired through existing `usePauseForthClient` / `useResumeForthClient` hooks.

### 2E — 429 / Retry-After backoff
- `forthFetch(url, init, opts)` retries 429 responses up to 3 times with 1s / 4s / 16s waits (or honors `Retry-After`).
- Retries logged to `forth_sync_log` with `action='retry'` and `{caller, url, attempt, wait_ms, company_id}` payload.
- All Forth API calls across the 8 functions swapped from raw `fetch(` to `forthFetch(`.

### 2F — Blocking register-client with rollback
- `forth-register-client` rewritten: bank → debts → enroll are now **blocking**. Any failure triggers `rollbackForthContact()` which `DELETE`s the Forth contact and logs `action='rollback_forth_client'`.
- Local `clients.forth_crm_id` update is the only step that does NOT rollback on failure — we surface a warning so an operator can paste the ID manually.

## Files touched
- created `supabase/functions/_shared/forthAuth.ts` (Phase 2A)
- edited all 8 `supabase/functions/forth-*/index.ts`
- edited `src/components/services/ServiceDetailSheet.tsx` (2D)
- migration: `transactions.last_polled_at` + partial index
- cron: `cornerstone-forth-poll-transactions` (*/15)

## Open items / follow-ups
- **2B encryption**: `company_processor_configs.api_key_encrypted` column unused; revisit when SSN encryption ships.
- **2B seed**: no tenant rows seeded; env fallback in use. Seed via UI when multi-tenant rollout begins.
- **Pause/Resume on multiple services**: pause/resume targets the Forth *client* (not service-scoped). If a client has multiple services, both pause together — by Forth design.
- **Cron observability**: no dashboard yet for cron run history; check `cron.job_run_details` directly until Phase 5 reconciliation dashboard.

## Risks
- Rate-limit log writes on every retry could spike `forth_sync_log` volume under a sustained 429 storm. Consider sampling if it becomes a problem.
- `rollbackForthContact` uses `DELETE /contacts/:id` — verify Forth treats this as idempotent if the contact is partially enrolled.

## Next phase
Phase 3 — new Forth operations (`fetch-balance`, `contact-update`, `contact-close`, `payment-to-creditor`). Requires Forth Pay API spec confirmation before scoping.
