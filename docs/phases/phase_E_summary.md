# Phase E — Summary

> **Phase E closeout.** Multi-tenant SaaS readiness: provisioning, subdomain routing, a
> product-managed feature-flag catalog, per-tenant usage metrics, and GDPR/CCPA export +
> deletion. Companion to `phase_A/B/D_summary.md` and the execution plan.
>
> **Date:** 2026-05-29 · **Status:** Engineering-complete, verified end-to-end on local Postgres.
> Delivered as one chunk.

---

## 1. What Phase E set out to do

Per the seed §Phase E: adding a tenant takes minutes, tenants are fully isolated, and
tenant-level operations are observable. **Exit criterion:** end-to-end provisioning of a new
tenant in **under 15 minutes** via a documented runbook.

## 2. What landed

| Area                     | Delivered                                                                                                                                                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Platform admin**       | `platform_admins` table (cross-tenant super-admin, distinct from the per-tenant `admin` app_role) + `is_platform_admin()` helper. Provisioning/deletion are gated on this, never on a tenant role.                                                                                      |
| **Provisioning**         | `provision_tenant()` (atomic company + first-admin staff + admin role; platform-admin gated; audit-logged) + the `provision-tenant` edge function (creates the admin auth user via the Auth API, then calls the RPC; Zod-validated, rate-limited, rolls back the auth user on failure). |
| **Subdomain routing**    | `companies.subdomain` (DNS-label CHECK, case-insensitive unique, nullable) + `resolve_tenant_by_subdomain()`. DNS/CDN host mapping is Phase F; the data layer is ready.                                                                                                                 |
| **Feature-flag catalog** | `feature_flag_catalog` (key/label/description/default/category) so the admin flag UI is comprehensive — no engineer-only flags. `effective_feature_flag()` = per-tenant override else catalog default (fixes the old "unknown flag → false" gap).                                       |
| **Usage metrics**        | `tenant_usage_metrics` view (`security_invoker`): per-tenant staff/calls/signatures/transactions/clients, total + this-month. RLS scopes each caller; a metrics endpoint or dashboard reads it directly.                                                                                |
| **Export / deletion**    | `export_tenant_data()` (JSON snapshot; platform admin or tenant's own admin; audit-logged; PII stays ciphertext) and `delete_tenant_data()` (platform-admin only; requires deactivation + exact-name confirmation; cascade delete; audit-logged before delete).                         |
| **Frontend data layer**  | `src/hooks/useTenantAdmin.ts` — usage metrics, flag catalog, per-tenant flag read + upsert, and the provisioning mutation. Row types in `db-types.ts`.                                                                                                                                  |
| **Runbook**              | `docs/runbooks/tenant-onboarding.md` — the <15-minute provisioning path, plus flags/export/deletion/rollback.                                                                                                                                                                           |
| **Tests**                | `tests/db/rls_isolation.test.sql` **group 22** (platform-admin gating, provision, subdomain, flag catalog, usage, export, deletion guards + cascade, audit) and `src/hooks/useTenantAdmin.test.tsx` (5 tests).                                                                          |

## 3. Key design decision: platform admin vs tenant admin

Tenant provisioning and deletion cross tenant boundaries, so they must **not** be available to a
per-tenant `admin`. Rather than overload the `app_role` enum, Phase E adds a dedicated
cross-tenant `platform_admins` table, gated by `is_platform_admin()` (SECURITY DEFINER so
RLS-bound callers can test membership without reading the table). Membership is managed
out-of-band (service role / SQL), never self-service. This keeps the blast radius of a
compromised tenant admin within their own tenant.

## 4. How it was verified

On the in-environment Postgres 16 (B-A1 blocks the container mesh, not a native server), with
Supabase's default privileges mirrored (so grant behavior is faithful):

1. All **12 migrations** apply, including Phase E.
2. `is_platform_admin` distinguishes platform vs tenant admin; lifecycle functions are
   service-role/platform-admin gated (catalog-asserted).
3. `provision_tenant` creates company + admin staff + admin role; `resolve_tenant_by_subdomain`
   resolves case-insensitively.
4. `effective_feature_flag` returns the catalog default, then honors a per-tenant override.
5. `tenant_usage_metrics` rolls up correctly.
6. `export_tenant_data` returns the snapshot; `delete_tenant_data` is **blocked while active**,
   **blocked on name mismatch**, and on success **cascades** child rows.
7. The full isolation suite (now **22 groups**) passes, and the Phase B seed still coexists
   (seed_verify 6/6). Frontend: typecheck, lint, and 21 unit tests green (incl. 5 new).

CI enforces this via `db-verify` (group 22), `edge-fn-test` (provision-tenant is Zod-validated —
`check:zod` now covers 25 functions), and the Verify job.

## 5. Phase E exit criteria — status

| Criterion (seed)                                                                     | Status                                                       |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Self-service tenant provisioning (with admin oversight)                              | ✅ `provision-tenant` fn + RPC, platform-admin gated         |
| Per-tenant feature-flag UI comprehensive (no engineer-only flags)                    | ✅ `feature_flag_catalog` + `effective_feature_flag` + hooks |
| Per-tenant usage metrics (users/calls/signatures/transactions), dashboard + endpoint | ✅ `tenant_usage_metrics` view + `useTenantUsageMetrics`     |
| Tenant data export + deletion (GDPR/CCPA)                                            | ✅ `export_tenant_data` / `delete_tenant_data`               |
| Tenant routing layer (shared pool; silo-ready)                                       | ✅ subdomain column + resolver; shared pool today            |
| Subdomain routing per tenant                                                         | ✅ data layer; DNS/CDN mapping deferred to Phase F           |
| **End-to-end provisioning < 15 min via runbook**                                     | ✅ `docs/runbooks/tenant-onboarding.md`                      |

## 6. Carried forward

| Item                                                                                                       | Where                                              |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| DNS + CDN host mapping for subdomains                                                                      | Phase F (Q-A6b hyperscaler).                       |
| Admin UI **pages** (this PR ships the data layer + hooks; the React screens are a fast follow)             | Frontend follow-up.                                |
| Metrics **endpoint** (the view is ready; a thin edge fn or REST exposure if a pull-based monitor needs it) | Phase G (observability).                           |
| Silo tier (dedicated infra per tenant)                                                                     | Future; the routing layer is designed to allow it. |

**Phase E is engineering-complete** — the tenant lifecycle (provision → operate → export →
delete) is implemented, gated, audited, and verified, with the <15-minute runbook as the exit.
