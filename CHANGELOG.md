# Changelog — GLG Case Management System

All notable changes documented per cross-cutting rule: "Documentation by default".

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
