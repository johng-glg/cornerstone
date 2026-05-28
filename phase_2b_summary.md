# Phase 2B Summary — Audit Log Wiring

**Window:** Operation Cornerstone, Phase 2 chunk B
**Status:** ✅ Complete

## What shipped

### Generic audit trigger
- `public.audit_trigger_fn()` (SECURITY DEFINER, search_path pinned).
- Fires AFTER INSERT/UPDATE/DELETE on attached tables.
- Records to `public.system_audit_log` via existing `log_audit_event()`:
  - `action` = `<table>.<op>` (e.g. `clients.update`)
  - `entity_type` = table name
  - `entity_id` = `id` column of the row
  - `company_id` = first non-null of `company_id`, `owning_company_id`, `originating_company_id`
  - `request_payload` = `{op, table, old, new}` JSONB row snapshots (full row diff)
  - Actor + role inferred by `log_audit_event` from `auth.uid()`

### Tables now audited
1. `clients`
2. `client_services`
3. `leads`
4. `settlements`
5. `transactions`
6. `staff`
7. `user_roles` (role grants/revocations)
8. `eligibility_reviews`
9. `litigation_matters`
10. `billing_entries`
11. `lead_banking`

All 11 triggers installed as `trg_audit_<table>`. Idempotent — `DROP TRIGGER IF EXISTS` first.

### PII reveal functions now self-log
- `decrypt_client_ssn(uuid)` — writes `pii.reveal.client_ssn` to audit log on every call (before decrypting).
- `decrypt_lead_banking(uuid)` — writes `pii.reveal.lead_banking` to audit log on every call.
- Both still admin-only + company-scoped (raises on violation, before logging).
- Anon `EXECUTE` revoked.

### Param rename
- `decrypt_lead_banking` parameter renamed from `_lead_banking_id` to `_lead_id` (function had to be dropped + recreated; no external callers in app).

## Verification

- Migration applied cleanly.
- Linter delta = +3 accepted SECDEF warnings for the new/recreated functions (same category as Phase 1A & 2A; documented in `docs/cornerstone/rls_audit_report.md`).
- Each trigger visible in `pg_trigger` under name `trg_audit_<table>`.
- Reveal functions raise for non-admins, raise for cross-company, log on success.

## Why DB triggers instead of app-layer wiring
- One source of truth — every code path (UI, edge function, direct SQL, future imports) gets logged.
- Cannot be bypassed by forgetting to add `log_audit_event()` in a new mutation.
- Captures full row diff, not just curated fields.
- Eliminates risk of inconsistent action naming across files.

## Out of scope (intentional)

- Admin "Audit Log" UI page → Phase 2B-2 (small, isolated). Admins can already SELECT from `system_audit_log` via existing RLS policy.
- Pruning / retention policy for old audit rows → Phase 2F (operational).
- Diff compaction (only changed columns instead of full new+old) → optimization, defer until volume justifies.
- Triggers on `notes`, `tasks`, `lead_activities`, `client_communications` — these are append-mostly activity feeds; their own rows already serve as audit. Add later if needed.

## Risks / open items
1. Audit log grows fast with full-row JSONB diffs — monitor `system_audit_log` size; add monthly partition or trim job in 2F.
2. `audit_trigger_fn` swallows row's company on DELETE of related-via-FK rows (e.g. `lead_banking` row carries no company_id directly) — `log_audit_event` falls back to actor's company. Acceptable.
3. `service_role` writes are logged with NULL actor; consider tagging when wiring edge functions in 2C+.

## Phase 2B sign-off

Every mutation on sensitive tables is now logged automatically, and every admin PII reveal is permanently recorded with actor + target + timestamp. The audit substrate that Phase 2C onwards (rate-limit responses, session events, storage hardening) will write into is in place.

**Ready for Phase 2C (rate limiting + CAPTCHA on intake/auth).**
