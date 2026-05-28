# Phase 1C Summary — Tenant Feature Flags + Paralegal Lead Visibility

**Status:** ✅ Complete

## Shipped

**Database**
- New `tenant_feature_flags` table (`company_id` + `flag_key` unique), admin-write / staff-read RLS, `updated_at` trigger.
- `is_feature_enabled(company_id, flag_key)` SECDEF helper with built-in default registry.
- `can_view_leads(user_id, company_id)` SECDEF helper — paralegal-only users gated by `leads.paralegal_visibility`; all other roles unaffected.
- `leads` SELECT/ALL policies rewritten to use `can_view_leads` (was raw `can_access_company`).
- Seeded `leads.paralegal_visibility = false` for every existing company.
- Both new functions: `REVOKE EXECUTE FROM anon/PUBLIC`, `GRANT TO authenticated, service_role`.

**Frontend**
- `src/hooks/useFeatureFlags.ts` — `FEATURE_FLAG_REGISTRY`, `useTenantFeatureFlags`, `useFeatureFlag(key)`, `useSetFeatureFlag()`.
- `src/components/settings/FeatureFlagsTab.tsx` — admin-only toggle UI driven by registry.
- New **Feature Flags** tab in Settings.

## Registered flags

| Key | Default | Purpose |
|---|---|---|
| `leads.paralegal_visibility` | **OFF** | Paralegal-only users see/manage leads when ON. |
| `leads.show_in_navigation` | ON | Reserved — sidebar gating wiring left for Phase 1D. |

## Linter delta

22 → **24** warnings (delta = +2 SECDEF callable by authenticated; both are required for RLS — accepted).

## Behavior verification

- Admins flipping `leads.paralegal_visibility` ON in Settings → Feature Flags immediately allows pure-paralegal accounts to query `leads` (RLS-level, not just UI).
- Pure paralegals with the flag OFF receive zero rows from `leads.*` regardless of `can_access_company`.
- Users holding any non-paralegal role (attorney, sales_rep, admin, …) are never gated by the flag.

## Open follow-ups (Phase 1D candidates)

1. Wire `leads.show_in_navigation` into `AppSidebar` to hide Leads / Lead Metrics items at the UI layer.
2. Add `feature-flag-changed` audit event via `log_audit_event()` from `useSetFeatureFlag`.
3. Add a "Why is this off?" empty-state in `/leads` for pure paralegals when the flag is OFF.

## Follow-up remediation (verification pass)

All three previously-deferred follow-ups are now shipped:

1. ✅ `leads.show_in_navigation` wired into `AppSidebar` — Leads + Lead Metrics nav items hide when the flag is OFF for the tenant.
2. ✅ `useSetFeatureFlag` now emits a `feature_flag.changed` audit event via `log_audit_event()` (best-effort, non-blocking).
3. ✅ `/leads` shows a "not enabled for your role" empty state for pure paralegals when `leads.paralegal_visibility` is OFF, instead of an empty Kanban.

**Status:** Phase 1C fully complete. No outstanding items.
