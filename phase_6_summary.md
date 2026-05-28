# Phase 6 — Optional Phase C Extensions

Status: **Complete (both 6A and 6B delivered).**

## 6A — Creditor Response Tracking

### Schema (`creditor_responses`)
- `creditor_id`, `liability_id?`, `client_service_id?` — polymorphic links
- `direction` (`inbound|outbound`), `channel` (`email|phone|letter|fax|portal|other`)
- `sentiment` (`positive|neutral|negative`, nullable)
- `subject`, `summary`, `body`, `attachments` JSONB
- `received_at`, `response_time_hours` (auto-calculated via trigger when `outbound_reference_id` is set)
- `logged_by` (staff), `metadata` JSONB
- Indexed on creditor, liability, service, company
- RLS scoped to `company_id` via `get_user_company_id(auth.uid())`
- Trigger `calc_creditor_response_time` computes hours-to-reply for inbound responses linked to an outbound record

### UI
- `CreditorResponsesPanel` — inline log + history with sentiment badges, channel chips, avg response time, and quick log form
- `useCreditorResponses` / `useCreateCreditorResponse` / `useDeleteCreditorResponse` hooks
- Designed to mount on Creditor Detail and Liability Detail sheets (`creditorId` or `liabilityId` filter)

### Workflow integration
- Records are available to workflow rule conditions via standard `creditor_responses` reads
- Future: a dedicated `creditor_response_received` trigger type can be added to `workflow_trigger_type` if needed

## 6B — Service Graduation Automation

### Schema
- `graduation_automation_config` (unique per company): `enabled`, `require_all_liabilities_resolved`, `fire_contact_close`, `notification_template_id`. Admin-only write via `has_role(auth.uid(), 'admin')`.
- `graduation_events` (audit log): `client_service_id`, `triggered_by_liability_id`, `previous_status`, `contact_close_status`, `notification_sent`, `details` JSONB.
- New enum value: `workflow_action_type.auto_graduate`.

### Edge function — `service-graduation-check`
- Input: `{ client_service_id, triggered_by_liability_id? }`
- Resolves config; aborts with reason `automation_disabled`, `already_graduated`, `no_liabilities`, or `unresolved_liabilities` when not eligible
- Eligibility: all liabilities in `settled | dismissed | cancelled` (when `require_all_liabilities_resolved=true`)
- On eligibility:
  1. `UPDATE client_services SET status = 'graduated'`
  2. If `fire_contact_close=true`, invoke `plsa-routing` `close_account` (provider-agnostic via Phase 4 routing)
  3. Insert `graduation_events` row capturing trigger, prior status, and close result
- Idempotent on already-graduated services.

### Settings UI
- `GraduationAutomationSettings` card with three toggles (enable, require-all, close-contact). Wired to `useGraduationConfig`/`useUpsertGraduationConfig`. Mount inside Settings → Automation tab.

## Files

**Migration:** `creditor_responses`, `graduation_automation_config`, `graduation_events`, enum additions, RLS + GRANTs, trigger.

**Created**
- `src/hooks/useCreditorResponses.ts`
- `src/hooks/useGraduationConfig.ts`
- `src/components/creditors/CreditorResponsesPanel.tsx`
- `src/components/settings/GraduationAutomationSettings.tsx`
- `supabase/functions/service-graduation-check/index.ts`
- `phase_6_summary.md`

**Edited**
- `supabase/config.toml` — registered `service-graduation-check` with `verify_jwt = false`
- `src/components/creditors/CreditorDetailSheet.tsx` — mounted `CreditorResponsesPanel`
- `src/components/liabilities/LiabilityDetailSheet.tsx` — added Comms tab
- `src/hooks/useLiabilities.ts` — `useUpdateLiabilityStatus` invokes graduation check on terminal status

## Acceptance criteria

- [x] Per-tenant configurable automation (`graduation_automation_config.enabled`)
- [x] Idempotent end-to-end: re-running on graduated service is a no-op
- [x] Audit trail in `graduation_events`
- [x] Provider-agnostic close via Phase 4 PLSA routing
- [x] Creditor response log with sentiment + response-time tracking
- [x] Logged events surfaced on Creditor and Liability detail views

## Risks / open items

1. **Notification template rendering** — `notification_template_id` is stored but not yet rendered/dispatched. Hook into `render-template` + `process-email-queue` when graduation notification copy is finalized.
2. **Workflow `auto_graduate` action** — enum value added; the workflow executor still needs a handler branch to map this action to the edge function. Tracked for a follow-up workflow-engine patch.
3. **`creditor_response_received` trigger type** — not added to `workflow_trigger_type` to keep the migration minimal; add when downstream rules are designed.
4. **Liability eligibility states** — currently `settled | dismissed | cancelled`. Confirm with ops whether `in_litigation` ever resolves outside these terminal states.
