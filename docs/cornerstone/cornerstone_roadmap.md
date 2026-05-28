# Operation Cornerstone — Full Build Prompt

> **Source of truth.** This is the original 8-phase build prompt for Operation Cornerstone, preserved verbatim. Phase summaries (`phase_N_summary.md`) and CHANGELOG entries track execution against it.

---

## Lovable Build Prompt — Operation Cornerstone Sprint

**Audience:** Lovable AI build assistant inside the GLG Case Management System project.
**Purpose:** Execute the 6-month Operation Cornerstone build in sequenced phases. Decouple Forth from servicing, harden the platform for multi-tenant commercial launch, and prepare for a new in-house PLSA processor.
**Reference documents (in project documentation center):** `GLG_System_Specification.pdf`, `forth_integration_audit-fb101ee5.md`.

---

## Read this first — cross-cutting rules for every phase

Apply these in every phase. Do not skip them per-phase.

1. **Documentation by default.** After every phase, update the project documentation center: regenerate the system specification section affected, add a CHANGELOG entry for the phase, update inline JSDoc/TSDoc on changed functions, update edge function descriptions in `supabase/config.toml`. Documentation is not optional output — treat it as part of the acceptance criteria.
2. **Reversible migrations only.** Every schema migration must include a corresponding down migration. No `DROP COLUMN` without a backup migration first. No `DROP TABLE` without prior coordination.
3. **Backward compatibility during deploy.** Schema additions are nullable defaults during the deploy window. Backfills run after the column lands. Backward-incompatible changes only with explicit migration plan.
4. **Respect existing patterns.** Multi-tenancy uses `can_access_company(auth.uid(), company_id)` for RLS. Role checks use `has_role(auth.uid(), 'role_name')`. Edge functions called by users use `verify_jwt = true`; service-role functions use `verify_jwt = false`. Do not invent parallel patterns.
5. **No regression.** Existing functionality must not break. Run the existing test suite after every phase. Add new tests for new functionality. Functional regressions block phase completion.
6. **Branch per phase.** Commit each phase to its own branch. PR title: "Cornerstone Phase N — [phase name]." Do not bundle phases.
7. **Audit trail on Forth/PLSA operations.** Every Forth call writes to `forth_sync_log` (rename to `plsa_sync_log` in Phase 4); every administrative action writes to the central audit log added in Phase 1.
8. **Sensitive fields stay encrypted.** SSN, bank account numbers, routing numbers, API secrets. Use pgcrypto / Supabase Vault. Never log unmasked values; mask in logs to last 4 digits at most.
9. **Tenant flags for tenant-scoped behavior.** When a feature varies between GLG and future commercial tenants (leads module mode, paralegal role visibility, etc.), drive the difference from a `tenant_feature_flags` table — not from hardcoded branches.

---

## Phase 1 — Security remediation, multi-tenancy hardening, terminology, audit log

**Dependencies:** None. Start immediately.
**Why first:** Independent of Forth integration. Bar-defensibility blockers (SSN encryption is Critical). Establishes the multi-tenancy and terminology baseline every subsequent phase builds on.

### 1A — Security posture (Critical and High issues from the system spec §12)
- Verify SSN encryption at rest. Audit `clients.ssn_encrypted` and `clients.ssn_last4_encrypted` columns. Confirm pgcrypto or Supabase Vault is the encryption mechanism. If not encrypted, add column-level encryption using `pgp_sym_encrypt` with a key sourced from Supabase Vault. Migration includes data backfill for existing rows. Document the encryption method in the security section of the spec.
- Enable Supabase leaked password protection in Auth settings (config or dashboard). Document the setting in the spec.
- Implement 30-minute inactivity session timeout via Supabase Auth session lifetime configuration + frontend middleware that logs out on inactivity.
- Add rate limiting on auth endpoints and edge functions. Use Supabase Auth rate limit settings; add per-IP throttling middleware on edge functions that take user input.
- Input sanitization audit. Review every edge function input parameter for SQL injection vulnerability, command injection, and XSS in any field that ends up in HTML. Use parameterized queries; sanitize string concatenation contexts.
- RLS policy audit. For every table, verify the SELECT/INSERT/UPDATE/DELETE policies match the documented intent. Output: an `rls_audit_report.md` document listing every policy with its purpose and a pass/fail verdict.
- User-initiated password reset. Add a "forgot password" flow using Supabase Auth recovery emails.
- MFA support (optional). Add TOTP-based MFA as an optional second factor. Allow but don't require.
- API key rotation policy. Document the rotation procedure for `FORTH_CLIENT_ID`, `FORTH_API_KEY`, DocuSeal API key, and any other external API credentials.

### 1B — Central audit trail log
- Create `public.system_audit_log` table. Columns: `id uuid pk`, `actor_user_id uuid`, `actor_role text`, `action text`, `entity_type text`, `entity_id uuid`, `request_payload jsonb`, `response_payload jsonb`, `ip_address inet`, `user_agent text`, `created_at timestamptz default now()`.
- RLS: authenticated staff can SELECT within their company's scope; only service role can INSERT.
- Add `log_audit_event(...)` security-definer function. Edge functions and frontend mutations call it for any data-changing action.
- Index on `(actor_user_id, created_at DESC)` and `(entity_type, entity_id)`.
- Document in spec §8 (Database Functions).

### 1C — Multi-tenancy hardening
- Tenant feature flags. Create `public.tenant_feature_flags` table: `company_id`, `flag_name text`, `enabled boolean`, `config jsonb`, `updated_at`. Seed initial flags: `leads_module_enabled`, `paralegal_role_visible`, `cody_external_sales_integration_enabled`.
- App reads flags via `get_tenant_flag(company_id, flag_name)` security-definer function. Cache in app memory per session.
- Update Leads module rendering to respect `leads_module_enabled` per tenant.
- Update Staff role assignment UI to hide paralegal option when `paralegal_role_visible = false` for that company.
- Re-audit every cross-tenant data access path. Confirm no edge function lets a user in company A read company B data.

### 1D — Terminology pass
- UI string replacement: "debt settlement" → "consumer debt defense" everywhere user-facing. "Service" → "engagement" in UI labels (keep `client_services` table name). "Escrow" → "PLSA (administered by Set Forth)" or context-appropriate alternative. "Debt" stays where it's already liability in code; replace only stray UI "debt" strings.
- Document the terminology mapping in `terminology_glossary.md` (in documentation center).
- Note: table names and column identifiers stay as-is to avoid migration churn. Only display strings change.

### 1E — Signed Documents to Client Records
- Extend `docuseal-webhook` edge function: when event is `submission.completed`, retrieve executed PDF via DocuSeal API, store in `client-documents` bucket at path `clients/{client_id}/signed/{submission_id}.pdf`, create `client_documents` record with `document_type = 'Signed Agreement'`, link the `signature_request_id` reference.
- Also store the completion certificate as a separate `client_documents` record with `document_type = 'Signature Certificate'`.
- Display in Client Detail → Documents tab.

### Phase 1 acceptance criteria
- All 10 security issues from spec §12 marked Resolved or with explicit accepted-risk justification.
- `rls_audit_report.md` published and reviewed.
- `tenant_feature_flags` table live; leads and paralegal flags driving rendering.
- Terminology glossary published; UI strings updated.
- DocuSeal-completed signatures auto-save to client records.
- All documentation updated.

---

## Phase 2 — Forth adapter refactoring (no new operations)

**Dependencies:** Phase 1 must be complete for multi-tenancy infrastructure (`company_processor_configs` activation).

### 2A — Extract shared OAuth helper
- Create `supabase/functions/_shared/forthAuth.ts` exporting `getAccessToken(companyId?: string)`.
- Replace 8 duplicated `getAccessToken()` implementations in `forth-*` functions with imports from `_shared`.
- Cache token per company in shared module memory with the existing 9-day TTL.
- Defensive token-shape handling preserved from existing implementations.

### 2B — Activate per-tenant Forth credentials
- `public.company_processor_configs` table exists from migration `20260131231530_...` but is unused. Activate it: when `getAccessToken(companyId)` is called, look up `api_key_encrypted` for that company; fall back to `FORTH_CLIENT_ID` / `FORTH_API_KEY` Supabase secrets if the per-company row is absent or null.
- Decrypt `api_key_encrypted` using the same pgcrypto/Vault mechanism from Phase 1A.
- Seed GLG company row with the existing `FORTH_CLIENT_ID` / `FORTH_API_KEY` values for backward compatibility.

### 2C — Schedule forth-poll-transactions
- Add pg_cron migration scheduling `forth-poll-transactions` to run every 15 minutes.
- Function continues to be invokable manually from the UI button (existing path stays).
- Add a `last_polled_at` column on transactions table; update on each successful poll.

### 2D — Wire forth-pause-resume to UI
- Add Pause / Resume buttons to `ServiceDetailSheet.tsx` for any service whose status allows it.
- Confirm dialog before triggering.
- Pause action posts a system note to Forth via `forth-sync-client post_note` describing the pause reason.

### 2E — Rate limit handling
- In `forthAuth.ts` and each `forth-*` edge function: detect HTTP 429 responses, parse `Retry-After` header, sleep, retry up to 3 times with exponential backoff (1s, 4s, 16s).
- Log retry attempts to `forth_sync_log` with `action = 'retry'`.

### 2F — Fix forth-register-client non-blocking failure pattern
*(Conditional on OQ-37 resolution — assume YES unless told otherwise.)*
- Change bank-account, debt, and enroll calls inside `forth-register-client` from non-blocking to blocking.
- If any of the four steps fails, rollback: delete the partially-created contact from Forth (best effort), mark the local `clients.forth_crm_id` as null, return `success: false` to caller with structured error.
- Enrollment wizard catches the failure and prompts the user.

### Phase 2 acceptance criteria
- Single `getAccessToken` source.
- Per-tenant credentials active.
- Poll scheduled and idempotent.
- Pause/resume in UI.
- Rate limit handling verified with a synthetic 429.
- Register-client failure paths produce a clean rollback.
- All documentation updated.

---

## Phase 3 — New Forth operations (the gaps from the audit)

**Dependencies:** Phase 2 (for shared auth, audit log, error handling).

### 3A — forth-fetch-balance
- New edge function `forth-fetch-balance`. Input: `client_id`. Looks up `forth_crm_id`, calls Forth Pay balance endpoint (research the actual endpoint name; if Forth's API documentation is unclear, request it through the Forth Pay API docs).
- Returns canonical shape: `{ balance_cents: number, as_of_timestamp: timestamptz, source: 'forth' }`.
- Add reconciliation function `reconcile_local_escrow_projection(client_id)` that compares local projection to Forth balance; if drift > $1.00 or > 5%, log to `system_audit_log` with `action escrow_drift_detected`.
- Hook into existing `useEscrowProjection` so a Refresh button triggers a fetch.

### 3B — forth-contact-update
- New edge function `forth-contact-update`. Input: `client_id` + fields to update (address, phone, email, name).
- Calls `PUT https://api.forthcrm.com/v1/contacts/{forth_crm_id}` (confirm method/URL with Forth API).
- Mirrors local fields on success.
- Triggered from Client Detail edit form on save.

### 3C — forth-contact-close
- New edge function `forth-contact-close`. Input: `client_id`, `close_reason`.
- Calls Forth contact close/delete endpoint (research correct URL).
- Sets local `clients.forth_status` to closed; sets `client_services.status = 'graduated' | 'cancelled' | 'terminated'` as appropriate.
- Triggered from service graduation, cancellation, or termination workflows.

### 3D — forth-payment-to-creditor (largest item — ~1 week)
- New edge function `forth-payment-to-creditor`. Input: `settlement_id`.
- Looks up settlement, validates `attorney_approved = true` and escrow balance sufficient. Constructs payment payload: payee (from `settlement_payees` reference), amount, scheduled date, payment method (RCC or ACH per Forth's options).
- Calls Forth Pay disbursement endpoint (research). Stores returned payment id in `settlement_offer_payments.external_payment_id`.
- Returns canonical response: `{ external_payment_id, scheduled_date, status }`.
- Update `settlements.status` transitions accordingly.
- Triggered from approved settlement → "Send Payment" button.
- Status reconciliation joins the `forth-poll-transactions` cadence (extend poller to also poll outbound payments).

### Phase 3 acceptance criteria
- 4 new edge functions deployed.
- All ADR-009 canonical operations have an implementing function.
- Reconciliation flags catch contrived drift in test data.
- Settlement payment flow end-to-end works against Forth Pay sandbox.
- All documentation updated.

---

## Phase 4 — PLSA adapter abstraction (routing layer)

**Dependencies:** Phase 3 complete (Forth side fully implemented before abstracting).

### 4A — plsa-routing edge function
- New `supabase/functions/plsa-routing/index.ts`. Input: `{ operation: string, client_service_id?, transaction_id?, payload }`.
- Reads `client_services.plsa_provider_id` (default: `'forth'`). Dispatches to provider-specific edge function (initially: `forth-*` functions only).
- Returns canonical response with `provider_id` field always populated.

### 4B — plsa-adapter-mock
- New `supabase/functions/plsa-adapter-mock/index.ts`. Implements every canonical operation with canned responses.
- Used for development / testing when new processor is not yet sandbox-available.
- Returns realistic shape but no real-world side effects.

### 4C — Refactor src/lib/forthApi.ts → src/lib/plsaApi.ts
- Rename file. Update imports across the app.
- Internal calls go through `supabase.functions.invoke('plsa-routing', { operation: ..., ... })` instead of directly invoking `forth-*`.
- Existing function signatures preserved at the call-site level (no UI changes required).

### 4D — Rename forth_sync_log → plsa_sync_log
- Migration: rename table, add `provider_id text` column populated to `'forth'` for existing rows.
- Update edge function writes to include `provider_id`.
- Update audit log queries to reference new table name.

### 4E — Schema additions for provider awareness
- Add `client_services.plsa_provider_id text default 'forth'`.
- Add `transactions.plsa_provider_id text default 'forth'`.
- Extend `transaction_type` enum with `loan_disbursement`, `loan_settlement_payment`, `loan_fee_collection` (for future ASAP support — values added now, not used until ASAP origination is built).
- Add `client_services.early_exit_eligible boolean default false`, `early_exit_status text default 'none'`, `loan_provider_id text default null` (for ASAP architectural accommodation — see `asap_program_brief.md`).

### Phase 4 acceptance criteria
- `plsa-routing` dispatches correctly to `forth-*` based on `plsa_provider_id`.
- Mock adapter returns realistic shapes for every operation.
- App functions through routing layer without behavior change.
- Old `forth-*` direct calls from frontend code removed.
- ASAP schema hooks present (unused, but present).
- All documentation updated.

---

## Phase 5 — Servicing layer features

**Dependencies:** Phase 4 (routing layer must exist so new logic is provider-agnostic from the start).

### 5A — NSF Retry Logic
- Add `nsf_retry_policies` table: `id`, `company_id`, `attempts integer`, `delay_pattern jsonb` (e.g., `[{day: 5}, {day: 10}]`), `is_active`.
- Add `transaction_retry_attempts` table tracking retries per failed transaction.
- Edge function `plsa-routing nsf_retry` (or extension to `forth-poll-transactions`): when a transaction returns NSF, look up the policy and schedule a retry transaction.
- UI: configurable retry policy per company in Settings.

### 5B — Escrow Balance Automation
- Cron job (via pg_cron) calls `forth-fetch-balance` for every active `client_service` nightly.
- Updates a new `client_services.escrow_balance_synced` column with the canonical balance and `escrow_balance_synced_at` timestamp.
- `useEscrowProjection` prefers the synced value when present; falls back to local computation when stale (> 24h).
- Discrepancies between projection and synced trigger an alert in the central audit log.

### 5C — Forth-vs-local reconciliation job
- Daily cron: scan transactions with `status = 'pending'` and `last_sync_at` older than 6 hours. Force-poll those.
- Scan `client_services` where local fields differ from cached Forth fields (name, phone, address). Flag for manual review.
- Outputs to a Reconciliation Dashboard in Reports module.

### 5D — Complete Template System
- Confirm Phases 1–3 of Template System are complete per existing roadmap.
- Add merge field support for new entity types: `settlement`, `transaction`, `loan` (for future ASAP).
- Add SMS template variant (for Twilio integration when wired).
- Ensure `render-template` edge function supports all variants.

### Phase 5 acceptance criteria
- NSF retry policy configurable per tenant; retries fire on schedule.
- Escrow balance synced nightly; drift detected.
- Reconciliation dashboard exists with at least 3 drift detectors.
- Template system supports all current entity types and template variants.
- All documentation updated.

---

## Phase 6 — Optional Phase C extensions (capacity permitting)

### 6A — Creditor Response Tracking
- `creditor_responses` table tracking inbound creditor communications, response times, sentiment.
- UI: response log on Creditor Detail and on Liability Detail.
- Workflow rule integration: trigger follow-up tasks based on response patterns.

### 6B — Service Graduation Automation
- Workflow rule type `auto_graduate`: when all liabilities for a service are `paid_off` or removed, automatically transition service to `graduated`, fire `forth-contact-close`, send graduation notification template.
- Configurable per tenant.

### Phase 6 acceptance criteria
- If pursued: features functional, configurable per tenant, tested end-to-end.
- If deferred: explicit decision logged; backlog updated.
- All documentation updated.

---

## Phase 7 — New PLSA processor adapter

**Duration estimate:** ~2 weeks active build (when processor is ready). Sandbox integration starts when processor sandbox is available.
**Dependencies:** New processor's sandbox available (~ Phase D start in program plan, target 2026-08-19). ADR-009 v2 ratified.

### 7A — plsa-adapter-{new processor name} edge functions
- Mirror the canonical operation set: `create_account`, `update_account`, `close_account`, `schedule_draft`, `modify_draft`, `cancel_draft`, `request_payment_to_creditor`, `place_hold`, `release_hold`, `fetch_balance`.
- One edge function per operation, parallel to `forth-*` structure.
- Configuration in `company_processor_configs` extended with processor type (`'forth' | 'new_processor'`).

### 7B — Integration testing
- Test suite runs against new processor sandbox.
- Mock adapter (`plsa-adapter-mock`) refactored to be drop-in interchangeable with both Forth and new processor adapters.

### Phase 7 acceptance criteria
- All canonical operations work against sandbox.
- Sandbox testing produces zero reconciliation discrepancies over a 1-week test window.
- All documentation updated.

---

## Phase 8 — Cohort routing logic + production cutover

**Duration estimate:** ~3 weeks across cohort weeks.
**Dependencies:** Phase 7 production-ready.

### 8A — Cohort selection logic
- New `cohort_assignments` table: `id`, `client_service_id`, `cohort_id`, `provider_id`, `assigned_at`, `validated_at`, `status`.
- `plsa-routing` reads cohort assignment for new enrollments; routes to assigned provider.
- Admin UI in Settings to define cohort policy (manual selection, percentage rollout, etc.).

### 8B — Parallel-running validation per cohort
- For first N enrollments routed to new processor, also execute against Forth in dry-run mode; compare results, log discrepancies, alert on mismatch.
- Two-week parallel period before each cohort expansion.

### 8C — Forth servicing decommissioning
- Disable ForthCRM operational UI paths (servicing decisions now happen in Lovable for ALL accounts, regardless of provider).
- Forth becomes pure transaction rail for existing accounts; new accounts go straight to new processor.

### Phase 8 acceptance criteria
- Cohort routing works end-to-end.
- Zero per-cohort reconciliation discrepancies.
- Bar attestation review complete.
- Cutover communication to staff and affected staff training delivered.
- All documentation updated.

---

## Sequencing notes
- Phase 1 starts immediately and can run in parallel with anything. It has no dependencies on Forth integration.
- Phases 2–5 run sequentially within the Forth/PLSA track.
- Phase 6 is optional depending on capacity.
- Phase 7 starts when the new processor sandbox is available (~weeks 13–16 of the program). Can overlap with Phase 5/6.
- Phase 8 starts when Phase 7 is production-ready (~weeks 17–20 of the program).

## Per-phase deliverables checklist
For every phase, deliver:
- Code changes (committed on phase branch).
- Migration scripts (forward + reverse).
- Tests (unit + integration where applicable).
- Documentation updates (system spec section, CHANGELOG, edge function descriptions in `supabase/config.toml`, inline docstrings).
- Risk / open items log (anything discovered during the phase that needs follow-up).
- Phase summary memo posted to the Program Manager (in the project root as `phase_N_summary.md`).

*End of build prompt. If anything is ambiguous, ask before guessing. Phases are sequenced; do not skip ahead.*
