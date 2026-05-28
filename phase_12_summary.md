# Phase 12 — Dialpad Integration

Shipped: 2026-05-28

Phase 12 registers Dialpad into the Phase 11 hub and adds click-to-call, signed-webhook ingest, call-state realtime, and inbound screen-pop. Ships **disabled by default** in `company_integrations` so click-to-call cannot fire real calls until an admin enables it.

## Registry + secrets
- `integration_providers` seed: `dialpad` (category `telephony`, auth `api_key + webhook_secret`, default events `{state_changed, recording, voicemail}`).
- Secrets: `DIALPAD_API_TOKEN`, `DIALPAD_WEBHOOK_SECRET`, optional `DIALPAD_DEFAULT_USER_ID`.
- Configure side sheet on `/integrations` collects the above.

## Schema
- `ALTER TABLE staff ADD COLUMN dialpad_user_id BIGINT`.
- `ALTER TABLE staff ADD COLUMN screen_pop_preference TEXT` (`toast` default, `auto_navigate`, `off`).
- New `public.dialpad_calls`:
  - Columns: `company_id`, `dialpad_call_id` (unique), `related_entity_type`, `related_entity_id`, `initiated_by` (FK → staff), `target_phone`, `direction`, `state`, `duration_seconds`, `recording_url`, `voicemail_url`, `voicemail_transcript`, `started_at`, `ended_at`, `raw jsonb`, `created_at`.
  - Indexes: `(related_entity_type, related_entity_id)`, `(initiated_by, created_at DESC)`, `(company_id, created_at DESC)`.
  - RLS: SELECT via `can_access_company`; INSERT/UPDATE service_role only.
- Communication log targets (dual-table, by entity type):
  - `client` surfaces → append to `client_communications` (legacy client-only table).
  - All other polymorphic surfaces (`litigation_matter`, `creditor_contact`, `lead`, etc.) → append to `entity_communications` (polymorphic `entity_type` / `entity_id` / `related_record_id`, full RLS + grants, added in migration `20260528163538`).
  - `dialpad_calls` is always the source-of-truth row; the `*_communications` insert is the per-surface activity log.

## Edge functions
- **`dialpad-initiate`** (POST) — validates JWT in code via `requireAuth`, checks `requireIntegrationEnabled('dialpad')`, requires `staff.dialpad_user_id`. Calls `POST https://dialpad.com/api/v2/call` with `custom_data: { related_entity_type, related_entity_id, company_id }`, inserts `dialpad_calls` row (state `queued`), logs `outbound_call_initiated`, returns `{ dialpad_call_id }`.
- **`dialpad-webhook`** (public POST) — reads **raw body** and verifies `x-dialpad-signature = base64(HMAC-SHA256(raw, DIALPAD_WEBHOOK_SECRET))`; 401 on mismatch. Upserts `dialpad_calls` by `dialpad_call_id` (state, durations, URLs, transcript, timestamps, raw). When `custom_data` identifies a record, appends a `client_communications` row (type `phone`, direction matches; auto-summary like `Outbound call · 2:14 · Voicemail`). Inbound calls trigger screen-pop (see below). Logs `inbound_webhook` with success/error.
- **`dialpad-backfill-user`** (admin-only POST `{ staff_id, email }`) — calls `GET /api/v2/users?email=...`, writes numeric id to `staff.dialpad_user_id`.
- **`dialpad-register-webhook`** — one-shot helper to (re)register the company's webhook URL + signing secret with Dialpad.
- **`dialpad-test-connection`** — calls `GET /api/v2/users?limit=1`; on success stamps `last_connected_at` and returns user count + configured webhook URL. Registered with the Phase 11 hub.

All five Dialpad functions are declared in `supabase/config.toml` with `verify_jwt = false` and validate auth in code where needed.

## Frontend
- **`<CallButton phone relatedEntity={type,id} />`** — invokes `dialpad-initiate`. Disabled when the integration is off or the current user has no `dialpad_user_id`. Wired into Client Detail, Lead Detail, Liability Detail (current creditor phone), Litigation Matter (opposing counsel phone), and Creditor Contact rows.
- **`useInitiateCall` hook** — `useMutation` wrapper with toast feedback.
- **Live call-state pill** — `useRealtimeSubscription` on `dialpad_calls` for `initiated_by = auth.uid()` (Queued → Ringing → Connected → Ended).
- **Activity entry on hangup** — activity stream renders the new `client_communications` row with duration, signed-URL recording link (reuses `<SignedDocumentLink>` pattern), and voicemail transcript.
- **Inbound screen-pop** — `ScreenPopProvider` subscribes to `dialpad_calls` inserts scoped to the current staff's company. Behavior driven by `staff.screen_pop_preference`:
  - `toast` (default) — sticky 30s toast with "Open" action.
  - `auto_navigate` — routes immediately to the matched record.
  - `off` — does nothing.
- **Staff → Dialpad mapping** — Staff Detail (admin) shows `dialpad_user_id` or a **Link to Dialpad** button invoking `dialpad-backfill-user`.

## Phone matching
On inbound events the webhook normalizes `target_phone` to E.164 and looks up `clients` / `leads` / `creditor_contacts`. Single match → linked + screen-pop with `entity_type, entity_id, phone`. Multiple/no match → screen-pop with toast-only payload, no auto-navigation.

## Acceptance
1. Admin can configure Dialpad on `/integrations`, run Test Connection, and see "Last connected".
2. Staff with a linked `dialpad_user_id` see CallButtons; others see disabled state.
3. Click-to-call rings the staff's Dialpad device; the live pill transitions through states.
4. Webhook signature mismatches are rejected (401) and logged with `success = false`.
5. Completed calls write to `client_communications` with duration and (where present) signed recording link.
6. Inbound calls fire screen-pop per the staff member's preference.
7. Disabling `dialpad` in `company_integrations` blocks `dialpad-initiate` immediately.
8. `dialpad_calls` is admin-readable within company scope; service_role-only writes.

## Rollback (forward-only)
```sql
DROP TABLE IF EXISTS public.dialpad_calls;
ALTER TABLE public.staff DROP COLUMN IF EXISTS dialpad_user_id;
ALTER TABLE public.staff DROP COLUMN IF EXISTS screen_pop_preference;
DELETE FROM public.integration_providers WHERE provider_key = 'dialpad';
DELETE FROM public.company_integrations WHERE provider_key = 'dialpad';
```
Edge functions can be left deployed — they no-op once the registry row is gone.

## Follow-ups
- Dedicated `contact_call_activity` table so litigation / creditor calls don't ride on `system_audit_log`.
- Recording durability: currently we store the Dialpad URL and proxy via signed-link UI; option (b) — downloading into `client-documents` on webhook receipt — left as a future toggle.
