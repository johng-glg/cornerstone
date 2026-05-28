# Phases 11 & 12 Build Plan

Two sequential phases. Phase 11 builds the meta-surface (registry, per-tenant config, universal log, Settings UI). Phase 12 registers Dialpad into it and ships click-to-call, webhook ingest, and screen-pop. Each phase ships forward-only migrations with inline rollback SQL in its summary doc, a CHANGELOG entry, and updates to the system spec.

---

## Phase 11 — Integrations Management Hub

### 11A. `integration_providers` registry
Migration creates `public.integration_providers` (provider_key unique, display_name, category, description, docs_url, icon_key, is_active, default_event_subscriptions text[], auth_method, timestamps). GRANT SELECT to authenticated; admin-only mutate. Seed `docuseal`, `forth_pay`, `forth_crm` in this migration; Dialpad seeded in 12A.

### 11B. `company_integrations` per-tenant config
Migration creates `public.company_integrations` (company_id, provider_key FK, is_enabled, credentials_vault_ref, config jsonb, last_connected_at, last_connection_error, created_by, updated_by, timestamps; UNIQUE (company_id, provider_key)). RLS: SELECT via `can_access_company`; INSERT/UPDATE/DELETE require `has_role(_, 'admin')`. Credentials never stored plaintext — only Vault secret name.

### 11C. `integration_event_log`
Migration creates `public.integration_event_log` (company_id, provider_key, event_type, direction, entity_type, entity_id, payload, success, error_message, latency_ms, created_at). Indexes on `(company_id, created_at DESC)` and `(provider_key, created_at DESC)`. RLS: admin SELECT scoped by company; INSERT via service_role only. Existing `forth_sync_log` / `plsa_sync_log` continue unchanged (backward compat).

### 11D. Shared helpers — `supabase/functions/_shared/integrations.ts`
- `getIntegrationConfig(companyId, providerKey)` → row + decrypted credentials via Vault
- `logIntegrationEvent(...)` → service-role insert into `integration_event_log`
- `requireIntegrationEnabled(companyId, providerKey)` → throws when disabled
Refactor existing `docuseal-*` and `forth-*` functions to call `logIntegrationEvent` alongside their existing logs and to short-circuit when `requireIntegrationEnabled` fails.

### 11E. Settings → Integrations page
New admin route `/settings/integrations` added as a tab in `src/pages/Settings.tsx`. Grid of provider cards: name + icon, category badge, enabled toggle, status pill (Connected / Not configured / Error / Disabled), last-activity timestamp, actions: **Configure** (side sheet with provider-specific form, credentials shown only as last-4 after save), **Test Connection** (invokes per-integration test function — `docuseal-test`, new `forth-test`, later `dialpad-test-connection`), **View Activity** (slide-out, last 50 rows from `integration_event_log` filtered to provider).

### 11F. Seed existing tenants
Insert-tool seed: for every existing company that already has DocuSeal/Forth secrets configured, insert `company_integrations` rows with `is_enabled = true` and the Vault refs. Existing edge functions keep working immediately.

**Acceptance:** GLG sees DocuSeal/Forth Pay/Forth CRM as Enabled+Connected; toggling Disabled blocks the function; Test Connection works; `integration_event_log` captures DocuSeal+Forth activity; `phase_11_summary.md` + CHANGELOG + spec sections 9 & 11.

---

## Phase 12 — Dialpad Integration

### 12A. Register Dialpad
Seed migration adds `dialpad` to `integration_providers` (category `telephony`, auth `api_key + webhook_secret`, default_event_subscriptions `{state_changed, recording, voicemail}`). Configure side sheet collects `DIALPAD_API_TOKEN`, `DIALPAD_WEBHOOK_SECRET`, optional `DIALPAD_DEFAULT_USER_ID`.

### 12B. Schema
- `ALTER TABLE staff ADD COLUMN dialpad_user_id BIGINT`.
- New `public.dialpad_calls` (full column set from brief). RLS: SELECT via `can_access_company`; INSERT/UPDATE service_role only. Indexes on `(related_entity_type, related_entity_id)`, `(initiated_by, created_at DESC)`, `(company_id, created_at DESC)`.
- **Communication log target:** project uses `client_communications` (per `useClientCommunications`). Reuse it for `client`/`lead`; for `litigation_matter`/`creditor_contact` write to `system_audit_log` via `log_audit_event` until a dedicated table exists (call this out in the summary as a follow-up).

### 12C. Edge function `dialpad-initiate`
POST. Reads & validates JWT in code via `requireAuth`. Checks `requireIntegrationEnabled`, requires `staff.dialpad_user_id`. Calls `POST https://dialpad.com/api/v2/call` with `custom_data: { related_entity_type, related_entity_id, company_id }`. Inserts `dialpad_calls` row (state `queued`) and logs `outbound_call_initiated`. Returns `{ dialpad_call_id }`. Standard CORS.

### 12D. Edge function `dialpad-webhook`
Public POST. Reads **raw body** then verifies `x-dialpad-signature` = base64(HMAC-SHA256(raw, DIALPAD_WEBHOOK_SECRET)); 401 on mismatch. Upserts `dialpad_calls` by `dialpad_call_id` (state, durations, URLs, transcript, timestamps, raw). When `custom_data` identifies a record, append a `client_communications` row (type `phone`, direction matches call, auto-summary like `Outbound call · 2:14 · Voicemail`). Logs `inbound_webhook` with success/error.

### 12E. Edge function `dialpad-backfill-user`
Admin-only POST `{ staff_id, email }`. Calls `GET /api/v2/users?email=...`, writes numeric id to `staff.dialpad_user_id`, logs event.

### 12F. Edge function `dialpad-test-connection`
Registered with Phase 11 hub. Calls `GET /api/v2/users?limit=1` to validate token; returns success + user count + configured webhook URL.

### 12G. Click-to-call
New `<CallButton phone relatedEntity={type,id} />`. Invokes `dialpad-initiate`. Disabled when integration off or current user has no `dialpad_user_id`. Wired into Client Detail, Lead Detail, Liability Detail (current creditor phone), Litigation Matter (opposing counsel phone), Creditor Contact rows. Toast updates via Realtime subscription on `dialpad_calls` filtered by the returned `dialpad_call_id`.

### 12H. Call state pill + activity entry
Live pill (Queued → Ringing → Connected → Ended) using `useRealtimeSubscription` on `dialpad_calls` for `initiated_by = auth.uid()`. On hangup, the activity stream renders the new `client_communications` row with duration, signed-URL recording link (reusing `SignedDocumentLink` pattern), and voicemail transcript.

### 12I. Inbound screen pop
In `dialpad-webhook`, on `inbound` events: normalize `target_phone` to E.164 and look up `clients` / `leads` / `creditor_contacts`. Single match → `supabase.channel('screenpop:<user_id>').send(broadcast)` with `{ entity_type, entity_id, phone }`. Multiple/no match → broadcast a toast-only payload. Frontend `useScreenPop()` hook (new) subscribes to the per-user channel and shows a non-blocking toast with **Open record** action (no auto-navigation, to avoid hijacking active work).

### 12J. Staff → Dialpad mapping
Staff Detail (admin view) shows `dialpad_user_id` or a **Link to Dialpad** button that invokes `dialpad-backfill-user` with the staff email.

**Acceptance:** All 8 criteria in the brief, plus `phase_12_summary.md` + CHANGELOG + spec sections 9 & 11 refreshed.

---

## Cross-cutting

- Forward-only migrations; each phase summary contains the inline `-- Rollback:` SQL block.
- All new public-schema tables ship with explicit `GRANT` statements alongside `ENABLE ROW LEVEL SECURITY` and policies.
- Secrets requested via `add_secret` (Phase 12 needs `DIALPAD_API_TOKEN`, `DIALPAD_WEBHOOK_SECRET`) — only after the user confirms they're ready to provision Dialpad.
- No regression: existing DocuSeal/Forth edge functions, `forth_sync_log`, `plsa_sync_log` continue working; new central log is additive.
- Demo safety: Phase 11 fully safe. For Phase 12 we ship the feature **disabled by default** in `company_integrations` for GLG so click-to-call doesn't fire real calls until the admin enables it.

## Suggested sequencing
1. 11A + 11B + 11C (tables + grants + RLS).
2. 11D + 11F (shared helpers + seed existing tenants; refactor DocuSeal/Forth to log).
3. 11E (Settings → Integrations UI + Test Connection wiring).
4. 12A + 12B (Dialpad registry seed + schema + grants).
5. 12C + 12D + 12F (initiate + webhook + test-connection). Request `DIALPAD_*` secrets here.
6. 12E + 12J (backfill function + Staff UI).
7. 12G + 12H (CallButton + live pill + activity entry).
8. 12I (screen pop broadcast + hook).

## Open questions
1. **Recording storage**: Dialpad serves recordings via authenticated URL with a short TTL. Want me to (a) just store the Dialpad URL and proxy on click, or (b) download into the `client-documents` bucket on webhook receipt? (a) is simpler; (b) is more durable.
2. **Screen pop UX**: confirm non-blocking toast with "Open record" action (my recommendation) vs. auto-navigate.
3. **Litigation/creditor call logging target**: OK to write those to `system_audit_log` for now, or do you want a new `contact_call_activity` table this phase?
