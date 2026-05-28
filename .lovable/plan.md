# Phase 9 & 10 Build Plan

Two large, mostly independent phases. Recommend shipping Phase 9 first (UI/config only, low risk) and then Phase 10 (real outbound HTTP). Each phase ends with its own summary doc, CHANGELOG entry, and forward-only migration with inline rollback SQL.

---

## Phase 9 — Company Type & Mode Switching

### 9A. `companies.company_type` enum
- Migration creates enum `company_type_enum` (`law_firm`, `debt_relief`, `debt_settlement`, `legal_plan`, `hybrid`, `other`).
- Adds `companies.company_type` NOT NULL DEFAULT `law_firm`; backfills existing rows.
- Trigger on UPDATE writes `company.type_changed` to `system_audit_log` via `log_audit_event`.

### 9B. Tenant-aware terminology
- New table `terminology_presets(preset_key text pk, label_map jsonb)` seeded with one row per company_type.
- New SECDEF function `get_company_terminology(_company_id uuid)` → resolves `tenant_feature_flags.terminology_preset_key` or falls back to company_type default; returns merged `label_map` (preset + per-company overrides).
- Refactor `src/lib/terminology.ts` → keep static `TERMS` as fallback; add `useTerminology()` hook backed by React Query (cached per company, invalidated on company switch).
- Replace all `TERMS.*` consumers with `useTerminology().t(...)`.

### 9C. Module-visibility flags
Add to `FEATURE_FLAG_REGISTRY` (with per-company-type defaults computed in `is_feature_enabled`-style resolver):
- `litigation.module_visible`
- `litigation.court_calendar_visible`
- `litigation.teams_module_visible`
- `litigation.summons_alert_module_visible`
- `roles.attorney_role_available`
- `billing.module_visible`
Sidebar, route guards, and Cmd+K palette read flags via a `useFeatureFlag()` hook.

### 9D. Summons Tracking lightweight module
- Migration adds columns to `liabilities`: `summons_received_at`, `summons_notes`, `referred_to_law_firm_at`, `referred_to_law_firm_company_id` (FK to `companies`).
- New route `/lawsuit-alerts` (gated by `litigation.summons_alert_module_visible && !litigation.module_visible`).
- Liability detail sheet gains "Mark as Sued / Summons Received" action → updates columns, emits `liability.summons_received` event (writes to a new `domain_events` queue table consumed by Phase 10 dispatcher; in Phase 9 we only insert + audit-log so wiring is verifiable).
- New Settings → Referral Partners tab (admin only, scaffolded; full wiring to webhooks in Phase 10).

### 9E. Role taxonomy
- `app_role` enum unchanged.
- Staff role-assignment UI filters available roles via `roles.attorney_role_available` etc.
- Staff record shows yellow warning callout when assigned role isn't active for the company's type.

### 9F. Settings → Company Type & Mode tab
- Admin-only tab showing current `company_type`, terminology preset selector, and all module/role flags with their default vs override state.
- Confirmation dialog before changing `company_type` explains downstream effects.

**Acceptance:** switching test company type updates nav, palette, labels, and role pickers on next load; summons action emits event; phase_9_summary.md + CHANGELOG.

---

## Phase 10 — Outbound Webhook & API Trigger System

### 10A. Verify & complete `trigger_webhook` workflow action
Recon: UI for `trigger_webhook` exists in `ActionConfig.tsx`/`types/workflow.ts`, but workflow executor needs inspection. Will refactor any existing implementation to call the shared executor from 10F.

### 10B. `webhook_endpoints` table
Migration creates `public.webhook_endpoints` (id, company_id, name, target_url, auth_method check-constrained, auth_secret_ref, event_subscriptions text[], is_active, created_by, timestamps). GRANTs + RLS: company-scoped read; admin-only mutate via `has_role(_, 'admin')`.

### 10C. `outbound_webhook_log` table
Migration creates `public.outbound_webhook_log` with the spec'd columns + indexes on `(endpoint_id, created_at DESC)` and `(source_entity_type, source_entity_id)`. RLS: company-scoped SELECT; INSERT only via service_role. UI in Settings → Webhooks → Activity.

### 10D. Event taxonomy
- Document canonical events in `docs/cornerstone/webhook_event_catalog.md` (engagement / liability / settlement / payment / client / lead).
- Each emitter writes a row into a `domain_events` queue table (`event`, `entity_type`, `entity_id`, `company_id`, `payload jsonb`, `processed_at`).
- Wire emitters from: Phase 9D summons action, plsa/forth payment cleared/NSF functions, settlement state changes, engagement status changes, client/lead create/qualify/convert.

### 10E. Authentication options
- `none`, `bearer`, `hmac_sha256`, `basic` — all secrets stored in Supabase Vault via `auth_secret_ref`; UI only shows last-4 after creation.
- Document HMAC signing recipe in `docs/cornerstone/webhook_security.md`.

### 10F. Shared `webhookExecutor.ts`
- `supabase/functions/_shared/webhookExecutor.ts` exports `fireWebhook(endpoint_id, event, entity_type, entity_id, payload)`.
- Renders body + headers, applies auth, 10s timeout, writes `outbound_webhook_log` row.
- Retry on 5xx/408/429: 5s → 30s → 120s, max 3 attempts. 4xx not retried. Final failure logs + `system_audit_log` `webhook.delivery_failed`.

### 10G. `webhook-dispatcher` edge function
- Cron-style poll of `domain_events` where `processed_at IS NULL` (chosen over LISTEN/NOTIFY for reliability in Supabase edge runtime).
- For each event, query matching active endpoints and call `fireWebhook` for each. Mark event processed.
- Direct invoke path also supported from emitter functions for low-latency events.

### 10H. Settings → Webhooks UI
- List + create/edit endpoints with name, URL, event subscriptions (checklist from catalog), auth method.
- Each row shows last fired, 7-day success rate (computed from `outbound_webhook_log`).
- "Test Webhook" button fires a synthetic payload via `fireWebhook`.

**Acceptance:** summons → webhook fires; synthetic test delivers; failure case retries 3× and surfaces in Activity; HMAC verifies per documented recipe; phase_10_summary.md + CHANGELOG.

---

## Documentation & cross-cutting
- Update GLG System Specification PDF addendum at the end of each phase.
- Update `mem://` index with Company Type, Terminology Engine, Webhook Engine entries.
- Each migration ships with inline `-- Rollback:` SQL in the phase summary doc.
- No regression: existing `TERMS.*` keeps working; existing workflows continue to fire.

## Suggested sequencing (to keep PR sizes manageable)
1. 9A + 9B (enum + terminology engine + hook).
2. 9C + 9F (flags + Settings tab).
3. 9D + 9E (summons module + role filtering).
4. 10B + 10C + 10E (tables + auth scaffolding).
5. 10D + 10F + 10G (events + executor + dispatcher).
6. 10H + 10A (UI + workflow action wired to executor).

## Demo safety
- Phase 9: safe.
- Phase 10: seed `webhook_endpoints` with webhook.site URLs only until past Phase 7.5 validation.
