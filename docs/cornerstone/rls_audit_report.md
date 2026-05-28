# RLS Audit Report — Operation Cornerstone Phase 1A

**Generated:** 2026-05-28
**Source:** Supabase linter (`supabase--linter`) + manual review
**Linter result:** 0 errors, 52 warnings

## Summary by category

| Code | Category | Count | Disposition |
|------|----------|-------|-------------|
| 0011 | Function search_path mutable | 1 | **Fix** — add `SET search_path = public` |
| 0014 | Extension in `public` schema | 1 | **Accept** — `pg_cron`/`pg_net` historically pinned to `public` in Supabase. Migrating is risky and not required for bar defensibility. |
| 0024 | Permissive RLS policy (`USING (true)` on UPDATE/DELETE/INSERT) | 13 | **Review** — confirm each is intentional public-write (most are not). |
| 0025 | Public storage bucket allows listing | 2 | **Review** — `litigation-documents`, `client-documents`, `lead-documents` are flagged public per `storage-buckets` memory. Confirm whether listing should be allowed or restricted to signed URLs. |
| 0028 | `SECURITY DEFINER` callable by `anon` | 17 | **Fix where unintended** — revoke `EXECUTE FROM anon` on every SECURITY DEFINER function not meant to be called pre-auth (`has_role`, `can_access_company`, `assign_lead`, etc. should NOT be callable by anon). |
| 0029 | `SECURITY DEFINER` callable by `authenticated` | 17 | **Review** — most are intentional (e.g. `has_role`, `log_audit_event`, `create_notification`). Document which ones, revoke the rest. |
| HIBP | Leaked password protection disabled | 1 | **Fixed in Phase 1A** — enabled via `configure_auth(password_hibp_enabled: true)`. |

## Action items for follow-on migration

A dedicated remediation migration (planned for a follow-up turn within Phase 1A wrap-up) will:

1. Add `SET search_path = public` to the one offending function.
2. Replace each `WITH CHECK (true)` / `USING (true)` policy on writes with a `can_access_company`- or `has_role`-scoped predicate, **unless** the table is explicitly public-write (none identified so far).
3. `REVOKE EXECUTE ... FROM anon` on every SECURITY DEFINER function in the public schema. Keep `authenticated` and `service_role` grants where the function is intentionally callable by signed-in users.
4. Decide per-bucket whether public listing is OK; if not, replace the broad `SELECT` policy on `storage.objects` with an authenticated-only or signed-URL-only pattern.

## Manual review of high-value tables

The following user-facing tables hold sensitive PII or financial data and were spot-checked. Detailed policy review is recommended but no obvious anon-read leak was found in the spot check.

- `clients` — SSN field present (`ssn_encrypted text`). Encryption status: see `ssn_encryption_audit.md`.
- `staff` — staff PII, contact info. Reads scoped via `can_access_company`.
- `transactions` / `payment_schedules` — financial. Scoped via service ownership.
- `litigation_matters`, `liabilities`, `engagements` — case data. Scoped via company ownership.
- `system_audit_log` — new in Phase 1B. Append-only, company-scoped reads, admin override.

**Status:** Phase 1A audit complete. Remediation migration deferred to a focused follow-up so each `REVOKE EXECUTE` and policy rewrite can be reviewed individually rather than mass-applied.
