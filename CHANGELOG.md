# Changelog — GLG Case Management System

All notable changes documented per cross-cutting rule: "Documentation by default".

## Admin UX & Permissions Tightening (2026-05-28, PM)

- **Role impersonation dropdown** added to the top bar for admins (view-only). Persists in `sessionStorage`; client-side only — database RLS still enforces real permissions. 11 preset views (Admin, Attorney, Case Manager, Paralegal, Sales Rep, Negotiator, Payment Processor, Correspondence, Client Services Rep, Eligibility Reviewer, Viewer).
- **Leads access revoked** for `attorney` and `case_manager` roles in `role_permissions` (Client Services Rep was already off). Leads sidebar item and module now hidden for those roles. Admin / Sales Rep / Eligibility Reviewer / Negotiator (where granted) retain access. Pure paralegals still gated by `leads.paralegal_visibility` tenant flag.
- **Department field hidden** from Staff create/edit dialog. Department remains in the database (still derived from Role on save) so dashboards, staff-page grouping, and badges continue to work — it's just no longer surfaced in the form since it was always read-only and redundant.
- **Integration test connection** buttons confirmed working for DocuSeal, Forth (Pay + CRM), and Dialpad. Each stamps `last_connected_at` / `last_connection_error` via the shared `markIntegrationConnected` helper; UI invalidates the `company-integrations` query so the "Last connected" pill refreshes immediately. No new credentials needed for any provider.


## Phase 12 — Dialpad Integration (2026-05-28)

- Registered `dialpad` in `integration_providers` (telephony; events `state_changed`, `recording`, `voicemail`). Ships disabled by default per company.
- New `public.dialpad_calls` (company-scoped read, service_role writes). `staff` gains `dialpad_user_id` and `screen_pop_preference`.
- Edge functions: `dialpad-initiate`, `dialpad-webhook` (HMAC-SHA256 signature verification on raw body), `dialpad-backfill-user`, `dialpad-register-webhook`, `dialpad-test-connection`. All registered in `supabase/config.toml`.
- Frontend: `<CallButton>` wired into Client / Lead / Liability / Litigation / Creditor Contact surfaces; `useInitiateCall` hook; live call-state pill via realtime on `dialpad_calls`.
- `ScreenPopProvider` subscribes to inbound calls per current staff and surfaces toast/auto-navigate/off per `screen_pop_preference`.
- Webhook auto-links calls to `clients` / `leads` / `creditor_contacts` by E.164 match; completed calls append a `client_communications` row with duration and signed recording link.
- Secrets added: `DIALPAD_API_TOKEN`, `DIALPAD_WEBHOOK_SECRET`, optional `DIALPAD_DEFAULT_USER_ID`.
- See `phase_12_summary.md` for full schema, acceptance, and rollback.

## Phase 11 — Integrations Management Hub (2026-05-28)

- New tables: `integration_providers` (registry, seeded `docuseal`, `forth_pay`, `forth_crm`), `company_integrations` (per-tenant config, unique `(company_id, provider_key)`, admin-only mutate), `integration_event_log` (universal observability, admin SELECT scoped by company, service_role insert).
- New admin nav item **Integrations** at `/integrations` (promoted out of Settings). Provider cards expose Configure / Test Connection / View Activity with a real-time "Last connected" pill.
- Shared edge helpers (`supabase/functions/_shared/integrations.ts`): `getIntegrationConfig`, `logIntegrationEvent`, `requireIntegrationEnabled`. Existing DocuSeal/Forth functions refactored to log + short-circuit when disabled.
- New `_shared/markIntegrationConnected.ts` stamps `last_connected_at` / `last_connection_error` on every matching provider row after a successful/failed test (handles shared-credential providers like `forth_pay` + `forth_crm`).
- Test functions: `docuseal-test`, `forth-test-connection` (forces fresh OAuth, clears ~9 day cache, stamps both Forth rows), `dialpad-test-connection` (Phase 12). UI invalidates `company-integrations` query so pills refresh immediately.
- Seed: existing tenants with DocuSeal/Forth secrets got `company_integrations` rows with `is_enabled = true` — no downtime.
- No new credentials required for Forth or DocuSeal; both reuse existing secrets.
- See `phase_11_summary.md` for full schema, acceptance, and rollback.

## Operation Cornerstone — Phase 7 (2026-05-28)

### 7 — Storage hardening + Realtime auth
- `lead-documents`, `client-documents`, and `litigation-documents` buckets flipped to **private**. Anonymous internet read access is no longer possible.
- New SECDEF helper `public.can_access_storage_object(bucket, first_folder)` resolves the owning company by joining the first path segment to `leads` / `clients` / `litigation_matters → client_services`, with a fallback that treats the first segment as a company id (used by wizard scratch uploads).
- All 12 legacy `storage.objects` policies for the three buckets dropped and recreated as company-scoped `authenticated`-only policies (SELECT / INSERT / UPDATE / DELETE).
- New frontend layer: `src/lib/storage.ts` adds `extractStoragePath()` + `getSignedDocumentUrl()`; new `<SignedDocumentLink>` component opens a short-lived signed URL on click. Old DB rows with legacy public URLs are handled — the helper parses the path out of them.
- All four upload sites now persist the bucket-relative **path** instead of a public URL: `LeadDocumentFormDialog`, `ClientDocumentFormDialog`, `litigation/DocumentFileUpload`, and `litigation/steps/LitigationDocumentsStep` (the wizard now uploads under `{companyId}/temp/...` so RLS resolves before a matter exists).
- All three viewer surfaces switched to `<SignedDocumentLink>`: `LeadDocumentsTab`, `ClientDocumentsTab`, `LitigationDocumentList`.
- `realtime.messages`: RLS enabled with `authenticated`-only SELECT/INSERT policies. Anonymous clients can no longer subscribe to broadcast channels. Row-level filtering for `postgres_changes` continues to use the source-table RLS.



## Operation Cornerstone — Phase 2 (in progress, 2026-05-28)

### 2E — Storage hardening (part 1)
- Bucket configs on all 4 doc buckets: 25 MB size cap + MIME allowlist (PDF, Office, images, .eml/.msg). Executables, scripts, archives, etc. rejected server-side.
- New `src/lib/storage.ts` — shared `validateDocumentUpload()` + constants wired into all 4 upload dialogs.
- 2E-2 deferred: flip public buckets to private + signed-URL read layer; virus scanning. See `phase_2e_summary.md`.


### 2D — Inactivity session timeout
- 30-min idle threshold with 2-min warning dialog (countdown + Stay/Sign-out actions).
- Cross-tab activity sync via `localStorage` (`glg.lastActivityAt`).
- Auto sign-out → toast → redirect to `/auth`. Only mounted inside `AppLayout` (auth pages excluded).
- New: `src/hooks/useInactivityTimeout.ts`, `src/components/auth/InactivityTimeoutDialog.tsx`. See `phase_2d_summary.md`.

### 2B — Audit log wiring (DB triggers)
- `audit_trigger_fn()` fires on 11 sensitive tables; `decrypt_*` helpers self-log `pii.reveal.*`. See `phase_2b_summary.md`.

### 2A — PII encryption foundation
- Vault key + SECDEF `encrypt_pii` / `decrypt_client_ssn` / `decrypt_lead_banking`; new ciphertext columns. See `phase_2a_summary.md`.

## Operation Cornerstone — Phase 1 (2026-05-28)

Phase 1 hardens the platform for multi-tenant commercial launch. Sub-phases were shipped in dependency order: 1B → 1A → 1C → 1E → 1D.

### 1B — Central audit trail log
- New table `public.system_audit_log` (actor_user_id, actor_role, company_id, action, entity_type, entity_id, request_payload, response_payload, ip_address, user_agent).
- New SECDEF function `log_audit_event(...)` callable from edge functions and frontend mutations.
- Indexes on `(actor_user_id, created_at DESC)` and `(entity_type, entity_id)`.
- RLS: staff SELECT within company scope; INSERT via SECDEF only.

### 1A — Security posture
- SSN encryption audit published (`docs/cornerstone/ssn_encryption_audit.md`) — current state documented; backfill deferred (logged as accepted risk).
- HIBP leaked-password protection enabled.
- Forgot-password + reset-password flows added (`/forgot-password`, `/reset-password`).
- Optional TOTP MFA opt-in card on Profile Settings.
- Input validation audit published (`docs/cornerstone/input_validation_audit.md`).
- RLS audit published (`docs/cornerstone/rls_audit_report.md`).
- API key rotation policy published (`docs/cornerstone/api_key_rotation_policy.md`).
- Rate limiting + 30-min inactivity timeout: deferred (logged as accepted risk).

### 1C — Multi-tenancy hardening
- New table `public.tenant_feature_flags` (company_id, flag_key, enabled, value, description, updated_by).
- New SECDEF helpers `is_feature_enabled(company_id, flag_key)` and `can_view_leads(user_id, company_id)`.
- Built-in registry: `leads.paralegal_visibility` (default OFF), `leads.show_in_navigation` (default ON).
- `leads` RLS rewritten to use `can_view_leads`; pure paralegals gated by flag.
- Settings → Feature Flags admin tab; sidebar Leads nav respects `leads.show_in_navigation`; `/leads` shows empty-state for gated paralegals.
- Audit event emitted on flag changes.

### 1E — DocuSeal signed-doc auto-save
- `docuseal-webhook` `submission.completed` handler now downloads executed PDF + audit certificate, stores them in the private `signed-documents` bucket at `{company_id}/{request_id}/{kind}-{ts}-{safe_name}`, and mirrors into `client_documents` when bound to a client.
- Archive paths appended to `signature_requests.evidence_json.archived_files` for replay.
- All archive errors caught — webhook never fails on side-effect errors.

### 1D — Terminology pass
- Glossary published (`docs/cornerstone/terminology_glossary.md`).
- New `src/lib/terminology.ts` constants (`TERMS`).
- UI labels swapped (display only — table names, columns, enums, routes, types unchanged):
  - "Debt Settlement" → "Consumer Debt Defense"
  - "Service" / "Services" → "Engagement" / "Engagements"
  - "Escrow" → "PLSA"
- Sweep covers: sidebar, Engagements page, Engagement form/detail/summary, Client Hub tabs + cards, Lead Conversion wizard, PLSA chart/projection, workflow + template + report field labels, docs center (schema/role/feature/roadmap guides).
- Permission `module` strings (`'Services'` in `role_permissions`) intentionally unchanged — data-driven; would require a coordinated migration.

### Out of scope / deferred
- See `mem://security/deferred-cornerstone-items` for the full deferred list (SSN backfill, rate limits, inactivity timeout, lead/litigation mirroring of signed docs, backfill of previously-completed signature requests).
