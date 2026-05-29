# Changelog

All notable changes to Cornerstone are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); the project uses conventional commits.

## [Unreleased]

### Added — Phase E

- **Phase E — Multi-tenant SaaS readiness (full phase in one change).** Tenant lifecycle:
  provision → operate → export → delete, all gated and audited. **Platform admin:**
  `platform_admins` table + `is_platform_admin()` (cross-tenant super-admin, distinct from the
  per-tenant `admin` role) — provisioning/deletion gate on this, not a tenant role.
  **Provisioning:** `provision_tenant()` (atomic company + first-admin staff + admin role;
  platform-admin gated; audit-logged) + the `provision-tenant` edge function (creates the admin
  auth user via the Auth API, then the RPC; Zod-validated, rate-limited, rolls back the orphan
  auth user on failure). **Subdomain routing:** `companies.subdomain` (DNS-label CHECK,
  case-insensitive unique, nullable) + `resolve_tenant_by_subdomain()` (DNS/CDN mapping is Phase
  F). **Feature-flag catalog:** `feature_flag_catalog` + `effective_feature_flag()` (override
  else catalog default) so the flag UI is comprehensive — no engineer-only flags. **Usage
  metrics:** `tenant_usage_metrics` view (`security_invoker`; staff/calls/signatures/
  transactions/clients, total + this-month). **Export/deletion (GDPR/CCPA):**
  `export_tenant_data()` (JSON snapshot; platform admin or tenant's own admin; PII stays
  ciphertext) and `delete_tenant_data()` (platform-admin only; requires deactivation + exact-name
  confirmation; cascade; audit-logged before delete). **Frontend:** `src/hooks/useTenantAdmin.ts`
  (usage, flag catalog, per-tenant flag upsert, provisioning mutation) + row types. **Runbook:**
  `docs/runbooks/tenant-onboarding.md` (the <15-min provisioning path — the Phase E exit
  criterion). **Tests:** `rls_isolation.test.sql` group 22 (platform gating, provision, subdomain,
  flag catalog, usage, export, deletion guards + cascade, audit) and `useTenantAdmin.test.tsx`
  (5). Verified end-to-end on local Postgres 16 (12 migrations apply, 22-group isolation suite +
  seed_verify green); `phase_E_summary.md` records the closeout.

### Added — Phase D

- **Phase D — Security & compliance posture, codified (full phase in one change).** Resolves the
  Lovable "accepted risks" and codifies the security posture. **Rate limiting:** a Postgres-backed
  fixed-window limiter (`rate_limit_counters` table, RLS-locked; `check_rate_limit()`
  service-role-only with atomic increment + opportunistic prune) and a shared `enforceRateLimit()`
  edge helper (HTTP 429 + `Retry-After`, fails open on limiter outage), wired into the
  auth-adjacent / external-API functions (`forth-auth`, `dialpad-initiate`, `docuseal-send`,
  `docuseal-test`, `dialpad-test-connection`) by user id and into the unauthenticated webhooks
  (`dialpad-webhook`, `docuseal-webhook`) by source IP before HMAC. **PII plaintext:**
  `pii_plaintext_audit` view + `assert_no_plaintext_pii()` (service-role-only) prove the
  deprecated plaintext-era columns hold no data. **SAST:** CodeQL job in CI (`security-extended`,
  JS/TS). **Q-A8 resolved:** CI type-checks edge-function source via `deno check --no-check=remote`
  (only the esm.sh remote type graph is skipped). **Docs:** `docs/security-overview.md` and the
  `docs/compliance-evidence/` corpus — `rls_audit_report.md` (95/95 tables RLS-enabled, verified
  live; 212 policies), `ssn_backfill_evidence.md` (auto-verified), and TSR §310.3(a)(1) / DFPI /
  bar-trust-accounting scaffolds grounded in real schema and pending sign-off (Q-A5).
  **Tests:** `tests/db/rls_isolation.test.sql` groups 20 (rate limiter) + 21 (PII verifier);
  `supabase/functions/_shared/rateLimit.test.ts`. Verified end-to-end on local Postgres 16: all
  11 migrations apply, the limiter and PII assertion behave correctly, and the full 21-group
  isolation suite passes. `phase_D_summary.md` records the closeout.

### Added — Phase B

- **B1–B4 — Local development + engineer onboarding (full Phase B in one change).** Replaced the
  placeholder `supabase/seed.sql` with a synthetic, **PII-free, idempotent** multi-tenant seed:
  3 tenants spanning all `company_type`s (Northstar `law_firm`, Beacon `affiliate`, Cornerstone
  `financing_company`), 6 **login-ready** users (bcrypt password `Cornerstone!1`, confirmed email,
  matching `auth.identities` rows) across `admin`/`attorney`/`paralegal`/`case_manager` roles, plus
  cross-tenant clients, leads, client-services, a liability, per-tenant PLSA processor configs
  (api key stored **encrypted**, mirroring the Q-A4 contract), integrations, email templates, and
  notifications. SSNs are synthetic (`900-00-000x`) and stored only via `encrypt_pii`. The seed
  uses a UUID space disjoint from the `tests/db/rls_isolation.test.sql` fixtures so the two
  coexist. Added `tests/db/seed_verify.test.sql` (6 groups: tenant count, login-readiness,
  password verification, cross-tenant fixtures, PII/credential encryption, and a re-seed
  idempotency check across 11 tables) and wired it into the CI `db-verify` job after the isolation
  suite. Added `docs/dev-setup.md` (fresh-clone → running app in <60 min, two backend paths,
  seeded-user table, troubleshooting), `docs/contributor-guide.md` (branch/commit/PR conventions
  plus the full quality-gate table), an expanded `.env.example`, and
  `.vscode/{settings,extensions}.json`. Added a Docker Compose DB-only path
  (`docker-compose.yml` with `scripts/compose/{bootstrap,apply}.sh`) for engineers without the
  Supabase CLI: stock Postgres with the Supabase-managed surface stubbed, all migrations applied,
  and the seed loaded. Verified end-to-end on a local Postgres 16 — all 10 migrations apply, the
  seed loads, `seed_verify` passes, the existing 19-group isolation suite still passes with the
  seed present, and three consecutive seed applications leave row counts unchanged.
  `phase_B_summary.md` records the closeout; B-A1 (sandbox image pulls) remains the one item
  proven in CI rather than the sandbox.

### Added — Phase A

- **A1 — Repository scaffold + tooling.** Vite + React 18 + TypeScript (strict) baseline;
  Tailwind CSS + shadcn/ui configuration; ESLint (flat config, `no-explicit-any` error) +
  Prettier; Husky + lint-staged pre-commit hook; Vitest + Testing Library (with a real unit
  test, replacing Lovable's single placeholder); Playwright E2E scaffold; Zod; `.env.example`
  with no committed secrets. Removed Lovable-Cloud-specific `lovable-tagger`. Pinned
  `@supabase/supabase-js` to an exact version (divergence from Lovable; see
  `docs/lovable_pattern_inventory.md` §9).
- **A2 — CI pipeline + quality gates.** GitHub Actions `ci.yml` (PR + push to `main`):
  `verify` job runs typecheck, lint, format check, unit tests with coverage, production
  build, and `npm audit` (high/critical block merge); `e2e` job runs the Playwright smoke
  test. Three custom gate scripts enforcing approved divergences (Q-A4) and secret hygiene:
  `check:zod` (every edge function validates input with Zod), `check:cors` (no wildcard
  `Access-Control-Allow-Origin: *`), `check:secrets` (high-signal secret scan over tracked
  files). All gates negative-tested to confirm they fail on violations.
- **A3 — Tenancy / RLS / audit / PII spine (in progress).** Consolidated baseline migration
  (`20260529090000_phase_a3_*`, per ADR-001) for the table-independent foundation: `companies`,
  `staff`, `user_roles`, `role_permissions`, `role_special_permissions`, `tenant_feature_flags`,
  `system_audit_log`; access helpers `can_access_company` / `has_role` / `get_user_company_id` /
  `is_feature_enabled`; central audit (`log_audit_event` + `audit_trigger_fn`, attached to
  `staff` / `user_roles`); vault-backed `encrypt_pii`. Forward-only with inline rollback SQL.
  Added a `db-verify` CI job (boots local Supabase, applies migrations, runs the SQL
  tenant-isolation / PII / audit tests in `tests/db/rls_isolation.test.sql`) — verification runs
  in CI because the dev sandbox cannot pull container images (open_questions B-A1). Added the
  Supabase CLI + full local `config.toml`.
- **A4 — Auth + app shell + Google SSO.** `AuthProvider`/`useAuth` context (email-password +
  **Google OAuth** sign-in, sign-up, password reset, `updatePassword`, role state, and admin
  view-only role impersonation that never affects RLS); `ProtectedRoute` guard (loading →
  redirect-to-`/auth`); `AppLayout` shell (top bar with impersonation lens + sign-out, inactivity
  timeout mounted); `useInactivityTimeout` (30-min idle, 2-min warning, cross-tab sync, fires
  once) + `InactivityTimeoutDialog`; Auth / Forgot-password / Reset-password pages; TOTP `MfaCard`
  - Settings; Dashboard/NotFound; the shadcn primitives they need (button, input, label, card,
    alert-dialog, sonner). Unit tests for the route guard and inactivity timer; E2E smoke updated
    for the auth gate. Live Google SSO requires the Google provider configured in Supabase Auth
    (environment config, not code).
- **A5 — Core CRM domain.** Consolidated baseline migration (`20260529100000_phase_a5_*`, ADR-001)
  curated from the authoritative reference: **20 tables** — `clients` (+addresses/phones/
  communications/documents), `client_services` (+`client_service_clients`/`client_service_types`/
  `service_status_history`), `services`, `leads` (+`lead_activities`/`lead_banking`), `liabilities`
  (+`liability_actions`), `creditors` (+`creditor_contacts`/`creditor_responses`), `settlements`,
  `transactions` — with 27 enums, indexes, RLS policies, triggers, and explicit grants. Lands the
  ADR-001-deferred `decrypt_client_ssn`/`decrypt_lead_banking`/`can_view_leads` (now their tables
  exist) and audit-trigger attachments. **Schema-diff verified** against the reference (only the
  intentional deferrals differ). Deferred to owning phases: FKs to `lead_scoring_profiles` (A9) and
  `payment_processors`/`payment_schedules` (A6), and the `leads` lead-engine triggers (A9). Hardened
  `pgp_sym_decrypt` calls with the `extensions.` schema qualifier. Expanded `tests/db/` isolation
  suite: clients/leads cross-tenant + `can_view_leads` paralegal gating (12 groups pass locally on
  the A3+A5 schema).
- **A5 (frontend) — core-CRM data layer.** Hand-authored row types (`src/lib/db-types.ts`) for the
  five core entities; TanStack Query read hooks (`useClients`/`useLeads`/`useLiabilities`/
  `useClientServices`/`useTransactions`) over RLS-scoped queries; Clients and Leads list pages with
  shared loading/error/empty (`QueryState`); top-bar nav. Hook unit tests (success/error/empty,
  mocked Supabase). Full generated `Database` types are deferred to a Docker-capable environment/CI
  (`supabase gen types` needs Docker — B-A1); the row projections keep the data layer strictly
  typed meanwhile. Remaining list pages (liabilities/engagements/transactions) follow the same
  pattern as a fast follow.
- **A6 — PLSA / payments schema.** Consolidated baseline (`20260529110000_phase_a6_*`, ADR-001):
  7 tables — `payment_processors`, `payment_schedules`, `company_processor_configs`
  (per-tenant processor creds; `api_key_encrypted` column — encryption enforced in the forth
  adapter edge functions, Q-A4), `plsa_sync_log`, `reconciliation_findings`, `nsf_retry_policies`,
  `transaction_retry_attempts` — plus 2 enums and the explicit grants. **Re-adds the two
  A5-deferred `transactions` FKs** (`processor_id` → `payment_processors`, `schedule_id` →
  `payment_schedules`). Schema-diff vs reference clean (structure exact; least-privilege grants on
  the append-mostly audit tables). Expanded `tests/db/` to 14 groups: adds `company_processor_configs`
  admin-only + company-scoped isolation. Edge functions (`plsa-routing` + mock/forth adapters)
  land in the A6 edge-function increment.
- **A6 (edge functions, core) — PLSA routing + mock adapter.** `plsa-routing` (the canonical
  ADR-009 12-operation dispatcher: Zod-validated input, provider resolution
  override→service→transaction→client→`forth`, downstream dispatch forwarding the caller's auth)
  and `plsa-adapter-mock` (realistic ADR-009-shaped responses for every operation). Shared
  `_shared/cors.ts` (restricted origin allowlist — **no wildcard**, Q-A4) and hardened
  `_shared/requireAuth.ts` (constant-time service-role compare). First real exercise of the
  `check:zod` / `check:cors` gates on edge functions (negative-tested). New CI **edge-fn-test**
  job runs Deno tests; pure logic (schema, provider resolution, route mapping, mock shapes) is
  unit-tested (server guarded by `import.meta.main` so imports don't boot it). The 12 `forth-*`
  adapters + `forthAuth` (with `company_processor_configs` credential encryption) + reconciliation
  functions land in the next A6 increment.
- **A6 (Forth auth + credential encryption).** `decrypt_processor_credentials(company_id)` —
  SECURITY DEFINER, **service-role-only** — returns `{client_id, api_key}` with the api_key decrypted
  from `company_processor_configs.api_key_encrypted` (Q-A4: encrypted per-tenant creds, vs Lovable's
  plaintext `config`). `_shared/forth.ts` pure helpers (secret normalize, OAuth-token extraction
  across Forth's response shapes, 429 backoff) with Deno tests; `_shared/forthAuth.ts` credential-aware
  OAuth/token-cache/`forthFetch` (reads creds via the RPC; env fallback). db-verify expanded to 15
  groups (encrypt→decrypt roundtrip + service-role-only gating). The 12 `forth-*` adapters consume
  this next.
- **A6 (Forth adapters — drafts/poll).** `_shared/forthLogic.ts` pure logic (Forth→local status
  map, NSF detection, Forth-tx matching, 7-day lock window) with Deno tests. First two adapters on
  the production pattern (Zod input, restricted CORS, `requireAuth`, `forthFetch`, `plsa_sync_log`):
  `forth-cancel-draft` (lock-window + status guards) and `forth-poll-transactions` (status
  reconciliation + NSF-retry scheduling, round-robin by `last_polled_at`). Remaining group-1
  adapters (`forth-auth`, `forth-create-draft`, `forth-update-draft`) follow. **Now added:** `forth-auth` (diagnostic OAuth, per-tenant via `company_id`), `forth-create-draft` (resolves the client's Forth CRM id via service→client lookups, posts the draft, stores `external_id`), and `forth-update-draft` (amount/process_date with the 7-day lock + status guards). All Zod-validated, restricted CORS, `requireAuth`, `forthFetch`. check:zod now guards 7 edge functions.
- **A6 (Forth client/contact adapters).** `forth-sync-client` (fetch / link / post_note), `forth-pause-resume`, `forth-contact-update` (no-op when unlinked), `forth-contact-close` (PUT /close → DELETE fallback, sets local forth_status). All Zod-validated, restricted CORS, `requireAuth`, per-tenant `getAccessToken(company_id)`, `forthFetch`, `plsa_sync_log`. check:zod now guards 11 edge functions. `forth-register-client` (blocking + rollback) and the money adapters (`fetch-balance`, `payment-to-creditor`) follow.
- **A6 (Forth adapters complete — 12/12).** `forth-register-client` (blocking create→bank→debts→enroll with best-effort contact-DELETE rollback on any failure), `forth-fetch-balance` (balance read + escrow-drift detection via the unit-tested `_shared/escrow.ts`, logs `escrow_drift_detected`), and `forth-payment-to-creditor` (attorney-approved / no-prior-payment / sufficient-escrow guards; `payment_send_status` state machine to avoid double-sends; payee resolved via separate lookups). All Zod + restricted CORS + `requireAuth` + per-tenant `getAccessToken` + `forthFetch`. check:zod guards 14 edge functions. The 3 reconciliation functions (`plsa-reconciliation`/`nsf-retry`/`escrow-sync`) + crons are the next batch.
- **A6 (reconciliation — completes the edge layer).** `plsa-nsf-retry` (schedule retry attempts
  from the active policy's delay pattern via unit-tested `_shared/nsfRetry.ts`; process_due fires
  due retries as child transactions through routing `create_draft`), `plsa-escrow-sync` (nightly
  balance sync via routing `fetch_balance` → `escrow_balance_synced` + escrow_drift findings), and
  `plsa-reconciliation` (detectors: stale_pending_tx + force-poll, escrow_balance_stale, open
  escrow_drift count). All Zod, restricted CORS, `requireAuth`, `import.meta.main`. **17 edge
  functions** total; cron registration deferred to Phase F (env-specific URLs/keys).
  A6 edge layer complete; A7 (DocuSeal/Dialpad) next.
- **A7 (integrations-hub + Dialpad schema).** `integration_providers` (seeded docuseal/forth*pay/
  forth_crm/dialpad), `company_integrations` (admin-only mutate, company-scoped read),
  `integration_event_log` (admin read, service insert), `dialpad_calls` (company-scoped), polymorphic
  `entity_communications`; `staff` gains `dialpad_user_id` + `screen_pop_preference`. Schema-diff
  clean vs reference; db-verify expanded to 16 groups (hub cross-tenant + admin-only mutate). Edge
  functions (docuseal-*/dialpad-\_) follow.
- **A7 (Dialpad + integrations-hub edge functions).** Shared hub helpers: `_shared/integrations.ts`
  (service-role config lookup, `requireIntegrationEnabled` gate, `logIntegrationEvent`),
  `_shared/markIntegrationConnected.ts` (JWT→company resolution + `last_connected_at`/
  `last_connection_error` stamping across shared-credential providers), `_shared/hmac.ts` (Web-Crypto
  HMAC-SHA256/base64 verify, constant-time compare; unit-tested against a known vector), and
  `_shared/dialpad.ts` (E.164 normalization, custom-data parsing, terminal-state + comms-table
  routing, call summaries; unit-tested). Functions: `dialpad-webhook` (HMAC-verified receiver — upserts
  `dialpad_calls`, phone-matches inbound calls to clients→leads, and on terminal states appends a call
  activity to `client_communications` or polymorphic `entity_communications`), `dialpad-initiate`
  (click-to-call — integration-enabled + `staff.dialpad_user_id` guards), and three test-connection
  endpoints (`dialpad-test-connection`, `forth-test-connection` [stamps shared forth_pay+forth_crm],
  `docuseal-test`). All Zod-validated (webhook uses a passthrough schema — HMAC is the trust boundary),
  restricted CORS, `requireAuth` (webhook excepted — HMAC-authenticated), `import.meta.main`-guarded.
  check:zod now guards 22 edge functions; new Deno tests for `hmac`/`dialpad`. DocuSeal webhook/send
  deferred (depend on the A10 signatures schema + signed-documents storage bucket).
- **A8 — Litigation domain + storage hardening.** Consolidated baseline
  (`20260529140000_phase_a8_*`, ADR-001): **11 tables** — `litigation_matters` (+`litigation_teams`/
  `litigation_team_members`/`litigation_activities`/`litigation_documents`/`litigation_hearings`),
  `appearance_requests`, `filing_fees`, `deadline_reminders`, and global reference `law_firms`
  (+`law_firm_contacts`) — with 5 enums (`litigation_status`/`appearance_request_status`/
  `filing_fee_status`/`reminder_type`/`reminder_status`), indexes, RLS (matters and their children
  company-scoped via `client_services.owning_company_id`; law firms globally readable; filing-fee/
  appearance writes matter-scoped; reminders staff-own + admin-manage), the `litigation_matters`
  audit trigger, and explicit grants. **Storage hardening (Q-A4):** `can_access_storage_object()`
  helper (resolves the first path-folder entity id → company) plus three **private** document buckets
  (`client-documents`/`lead-documents`/`litigation-documents`) and path-scoped `storage.objects` RLS,
  applied behind a `storage`-schema guard so the migration is a no-op on a public-only harness.
  **Schema-diff verified** against the reference: all 11 table definitions, enums, and the storage
  helper are byte-identical; the only differences are two intentional deferrals re-added by their
  owning phases — `deadline_reminders.notification_id → notifications` (notifications phase) and the
  `generate_deadline_reminders()` RPC (depends on `reminder_settings` + `assignments`). `tests/db/`
  expanded to **15 groups** (litigation cross-tenant isolation + global law-firm visibility +
  matter-scoped filing-fee RLS); full suite passes locally on the A3→A8 schema.
- **A9 — Lead engine + workflow engine.** Consolidated baseline (`20260529150000_phase_a9_*`,
  ADR-001), curated **verbatim** from the authoritative reference: **19 tables** — lead engine
  (`lead_scoring_profiles`, `lead_assignment_rules`/`_pool`/`_queue`/`_log`, `lead_budgets`/
  `lead_debts`/`lead_disclosures`/`lead_documents`, `assignments`, `reminder_settings`) and workflow
  engine (`workflow_groups`/`workflow_rules`/`workflow_executions`, `domain_events`,
  `webhook_endpoints`, `outbound_webhook_log`, `graduation_automation_config`, `graduation_events`) —
  with 9 new enums, indexes, RLS (lead/workflow rows company-scoped via `leads`/`get_user_company_id`;
  `assignments` staff(company)-scoped; `domain_events`/`outbound_webhook_log`/`graduation_events`
  company-scoped read with service-role writes), and explicit grants. **10 functions:** lead scoring
  - round-robin/pool assignment (`assign_lead`, `calculate_lead_score`, `trigger_auto_assign_lead`,
    `trigger_calculate_lead_score`, `process_assignment_queue`, `validate_status_transition`), workflow
    evaluation/event bus (`check_trigger_match`, `evaluate_workflow_conditions`, `emit_domain_event`),
    and the now-unblocked `generate_deadline_reminders()` (A8 deferral — `reminder_settings` +
    `assignments` now exist). **Re-adds the A5-deferred `leads` integration:** the
    `leads.scoring_profile_id → lead_scoring_profiles` FK and the `trg_auto_assign_lead` /
    `trg_calculate_lead_score` triggers. **Schema-diff verified** vs reference: all 19 table
    definitions, 9 enums, and 10 function bodies are byte-identical; the only difference is one
    intentional deferral — `trg_notify_matter_assignment` on `assignments` (needs the notifications
    table + `notify_matter_assignment()`, lands in the notifications phase). `tests/db/` expanded to
    **16 groups** (lead/workflow cross-tenant isolation + lead-trigger wiring); full suite passes
    locally on the A3→A9 schema.
- **A10 — Email infra + templates + e-signatures + notifications + notes.** Consolidated baseline
  (`20260529160000_phase_a10_*`, ADR-001), curated **verbatim** from the authoritative reference:
  **19 tables** — templates (`templates`, `template_versions`, `template_categories`,
  `template_usage`, `template_usages`, `terminology_presets`, `report_templates`), email
  (`email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails`),
  signatures (`signature_requests`, `signature_signers`, `signature_events`, `docuseal_templates`),
  and notifications/notes (`notifications`, `notification_preferences`, `notes`, `note_mentions`) —
  with 5 new enums, indexes (incl. the partial unique `email_send_log` sent-dedupe index), RLS
  (templates/signatures company-scoped; notifications/preferences user-scoped; email tables
  service-role-only; notes/note_mentions company-resolved via `resolve_entity_company_id`), and
  explicit grants. **9 functions:** `create_notification`, `get_company_terminology`,
  `notify_matter_assignment`, `notify_note_mention`, the pgmq email queue (`enqueue_email`,
  `delete_email`, `read_email_batch`, `move_to_dlq`), and `resolve_entity_company_id` (created here
  because the notes RLS needs it; its `tasks` branch is runtime-only). `pgmq` extension created
  (stripped + stubbed in the local harness, real on Supabase Cloud / CI). **Re-adds two earlier
  deferrals now that their deps exist:** the A9 `trg_notify_matter_assignment` trigger on
  `assignments` (→ `notify_matter_assignment`) and the A8 `deadline_reminders.notification_id →
notifications` FK. **Schema-diff verified** vs reference: all 19 table definitions, 5 enums, and
  9 function bodies are byte-identical; the only difference is one intentional deferral —
  `trg_notify_task_assignment` on `tasks` + `notify_task_assignment()` (A11: needs `tasks`).
  `tests/db/` expanded to **17 groups** (templates/signatures/notifications/notes cross-tenant
  isolation + the entity resolver; group 17 also confirms the re-added matter-assignment trigger
  fires a notification end-to-end); full suite passes locally on the A3→A10 schema. DocuSeal
  `webhook`/`send` edge functions (now unblocked by this signatures schema) follow as the A10 edge
  increment.
- **A10 (edge functions) — DocuSeal e-signatures.** `docuseal-send` (authenticated: dispatches a
  drafted `signature_request` — builds a DocuSeal submission from its `docuseal_template_id` + signer
  rows, stores the submission/submitter ids and signing URLs, flips status to `sent`, records a
  `sent` signature_event) and `docuseal-webhook` (HMAC-verified receiver: advances signer/request
  status across `form.viewed`/`form.completed`/`form.declined`/`submission.completed`/`expired`,
  stores the executed PDF + certificate + evidence on completion, and appends a signature_event;
  never downgrades a terminal request). New pure, unit-tested `_shared/docuseal.ts` (event
  classification, status mapping, submission-id resolution across form/submission payload shapes,
  submission-payload builder) and a hex-HMAC variant in `_shared/hmac.ts` (`hmacSha256Hex` /
  `verifyHmacSha256Hex`, for DocuSeal's `X-Docuseal-Signature`; vectors verified via openssl). All
  Zod-validated (webhook uses a passthrough schema — HMAC is the trust boundary), restricted CORS,
  `import.meta.main`-guarded. check:zod now guards **24 edge functions**; new Deno tests for the hex
  HMAC + DocuSeal logic. Completes the integrations edge layer (Forth, Dialpad, DocuSeal).
- **A-frontend (catch-up) — list pages for the post-A5 domains.** Read hooks + RLS-scoped list
  pages so the UI tracks the backend landed since the core CRM: the A5 fast-follows
  (**Liabilities**, **Engagements** = `client_services`, **Transactions**, reusing the existing
  `useCoreCrm` hooks) plus new `src/hooks/useDomains.ts` (`useLitigationMatters`, `useTemplates`,
  `useSignatureRequests`, `useNotifications`) and pages **Litigation** (A8), **Templates** /
  **Signatures** / **Notifications** (A10). Hand-authored row projections in `db-types.ts`
  (`LitigationMatterListRow`, `TemplateListRow`, `SignatureRequestListRow`, `NotificationListRow`);
  routes wired in `App.tsx` and links added to the `AppLayout` nav. Hook unit tests
  (`useDomains.test.tsx`: success/error/empty, mocked Supabase). All read paths rely on RLS for
  tenant/user scoping (the hooks never filter by company/user themselves). typecheck / lint /
  Vitest (16 tests) / production build all green.
- **A11 — Billing + tasks + eligibility (final schema phase).** Consolidated baseline
  (`20260529170000_phase_a11_*`, ADR-001), curated **verbatim** from the authoritative reference:
  the last **6 tables** — `billing_entries` (time/expense entries with inline CHECK constraints),
  `tasks`, `task_templates`, `eligibility_reviews`, `job_titles`, `feature_requests` — with 10 new
  enums, indexes, RLS (billing/tasks company-scoped; task_templates + job_titles globally readable,
  admin-managed; feature_requests submitter-or-admin), audit + `updated_at` triggers, and explicit
  grants. Lands `notify_task_assignment()` and **re-adds the A10-deferred `trg_notify_task_assignment`
  on `tasks`** (now that `tasks` exists); `billing_entries.litigation_matter_id → litigation_matters`
  is created here as a normal FK. **This completes the full 94-table reference surface** — the local
  A3→A11 chain applies cleanly and yields exactly 94 public base tables. Schema-diff verified vs
  reference: all 6 table defs, 10 enums, and the function body are byte-identical (scoped diff clean
  both directions). `tests/db/` expanded to **18 groups** (billing/tasks cross-tenant isolation +
  global task templates); full suite passes locally on the A3→A11 schema.
- **A11.1 — Spine reconciliation (closes the full-surface diff).** Completing the 94-table surface
  enabled a **whole-schema diff** against the reference, which exposed drift in the early **A3/A5
  spine** that the per-phase scoped diffs had missed. Forward-only corrective migration
  (`20260529180000_phase_a11_spine_reconciliation.sql`) brings it to parity: `app_role` gains
  `of_counsel` / `eligibility_reviewer`; `staff` gains `hourly_rate` (default 350.00) + `last_login_at`
  and `screen_pop_preference` becomes NOT NULL; `staff.department` is migrated from the hand-made
  `department` enum to the reference `department_new` (documented value map; the old enum is dropped);
  the orphan reference enums `company_type_enum` / `transaction_status` / `transaction_type` are
  created for parity (no column uses them); `companies` gains `audit_company_type_change()` +
  `trg_audit_company_type_change`; the `role_permissions` / `role_special_permissions` policies and a
  missing `staff` DELETE policy are aligned to the reference; and three non-reference indexes are
  dropped. **The whole-schema object diff is now empty** — all 954 objects match — **except `staff`
  physical column ordering** (the column _set_, types, nullability, and defaults are byte-identical;
  Postgres cannot reorder columns without a destructive rebuild of a table the whole schema FKs into,
  so this is an accepted, documented divergence). No production data exists yet, so the `department`
  remap is non-destructive. `tests/db/` expanded to **19 groups** (adds reconciliation checks: new
  `app_role` values, `staff.hourly_rate` default, company-type-change audit); full suite passes
  locally on the reconciled A3→A11.1 schema.
- **A12 — ADR-009 ratification + Phase A summary (Phase A closeout).** Relocated
  `ADR-009-plsa-adapter-interface-contract.md` from the repo root into the canonical
  `docs/adrs/` and **ratified** it (Status: Accepted, 2026-05-29, by the PM/decision-owner):
  the 10 outbound operations + 13 inbound events + error/idempotency/provider-id semantics are
  frozen, with the merged A6 `plsa-routing` dispatcher and `plsa-adapter-mock` recorded as the
  conforming implementation. The one remaining external item — the new-processor team co-sign
  (target 2026-06-17) — is tracked as an open follow-up that does not reopen the interface. Added
  `docs/phases/phase_A_summary.md`: the Phase A closeout (PR-by-PR landing, schema-fidelity proof
  — whole-schema object diff empty across 954 objects except the documented `staff` column
  ordering, quality gates, locked decisions, the eight logged divergences, carried-forward items
  incl. B-A1, and exit-criteria status). Finalized `docs/lovable_sync_log.md` with the A12 entry.
