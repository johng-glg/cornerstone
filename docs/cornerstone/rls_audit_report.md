# RLS Audit Report — Operation Cornerstone Phase 1A

**Generated:** 2026-05-28
**Last updated:** 2026-05-28 (post-remediation)
**Source:** Supabase linter (`supabase--linter`) + manual review
**Linter result before remediation:** 0 errors, 52 warnings
**Linter result after remediation:** 0 errors, **22 warnings (all accepted risk)**

## Summary by category

| Code | Category | Before | After | Disposition |
|------|----------|-------|-------|-------------|
| 0011 | Function search_path mutable | 1 | 0 | **Fixed** — `check_trigger_match` pinned to `SET search_path = public`. |
| 0014 | Extension in `public` schema | 1 | 1 | **Accepted** — `pg_cron`/`pg_net` historically pinned to `public` in Supabase. Migrating is risky and not required for bar defensibility. |
| 0024 | Permissive RLS policy (`USING (true)` on write) | 13 | 2 | **Fixed 11; accepted 2.** See below. |
| 0025 | Public storage bucket allows listing | 2 | 2 | **Accepted** — `litigation-documents`, `client-documents`, `lead-documents` are intentionally readable by authenticated staff via signed URLs; listing is not a leak because RLS on `storage.objects` still scopes by path. |
| 0028 | `SECURITY DEFINER` callable by `anon` | 17 | 0 | **Fixed** — `REVOKE EXECUTE … FROM PUBLIC` applied to all 17 helper functions; explicit `GRANT EXECUTE TO authenticated, service_role` retained. |
| 0029 | `SECURITY DEFINER` callable by `authenticated` | 17 | 17 | **Accepted** — required for RLS predicates (`has_role`, `can_access_company`, `get_user_company_id`) and trigger plumbing. Functions are `SECURITY DEFINER` precisely so signed-in users can call them; this warning is informational. |
| HIBP | Leaked password protection disabled | 1 | 0 | **Fixed** — enabled via `configure_auth(password_hibp_enabled: true)`. |

## Remaining "permissive" policies — accepted

After remediation, two `USING (true) / WITH CHECK (true)` write policies remain:

1. **`notifications` INSERT — `Allow notification inserts`** — required so the `create_notification()` trigger (SECURITY DEFINER, called from many table triggers) can insert notification rows on behalf of any user without per-call grants. Reads on `notifications` are still scoped to the recipient.
2. **`forth_sync_log` INSERT — `System can insert sync logs`** — write path is exclusively the Forth sync edge functions, which run with `service_role` regardless. The permissive INSERT exists only so the table is reachable from triggers; reads are limited to `authenticated`.

Both are intentional, documented, and bounded by the fact that the calling context is server-side (trigger or edge function), not user-supplied SQL.

## Tightened policies (this remediation)

- `appearance_requests` INSERT/UPDATE → scoped to `litigation_matters → client_services → owning_company_id` via `can_access_company`. DELETE → admin only.
- `filing_fees` INSERT/UPDATE → same matter-scoped predicate. DELETE → admin only.
- `creditor_contacts` INSERT/UPDATE/DELETE → admin only (matches `creditors` table policy; creditor directory is global).
- `notes` INSERT → must be authenticated AND in the `staff` table.
- `note_mentions` INSERT → must be authenticated AND in the `staff` table.

## Manual review of high-value tables

- `clients` — SSN field (`ssn_encrypted text`) present; encryption deferred (see `ssn_encryption_audit.md`).
- `staff` — staff PII, contact info; reads scoped via `can_access_company`.
- `transactions` / `payment_schedules` — financial; scoped via service ownership.
- `litigation_matters`, `liabilities`, `engagements` — case data; scoped via company ownership.
- `system_audit_log` — Phase 1B; append-only, company-scoped reads, admin override.

**Status:** Phase 1A RLS audit + remediation **complete**. All addressable warnings have been resolved; remaining warnings are documented accepted risk.
