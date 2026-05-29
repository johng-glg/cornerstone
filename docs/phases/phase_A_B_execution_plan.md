# Phase A + B — Execution Plan

> **Section 8.5/8.6 deliverable.** One-page execution plan for Phase A (Repository Standup +
> Pattern Extraction) and Phase B (Local Dev + Engineer Onboarding), sized against the actual
> `lovable-source` tree (94 tables, 78 migrations, 34 edge functions — see
> `lovable_pattern_inventory.md`), not the v4 spec digest.
>
> **Date:** 2026-05-29 · **Branch convention:** `feature/{phase}-{slug}` → PR → `main`.

---

## Framing & sizing reality

The seed sizes Phase A at weeks 1–3. The inventory shows the system is ~2–3× the spec's
apparent scope. **Faithful replication of 78 migrations + 34 edge functions + 275 RLS policies
at production quality (with the test coverage Lovable lacks) does not fit 3 weeks** if "done"
means every module ported and tested. Two ways to honor the deadline:

- **Phase A = production-quality foundation + the spine**, not the entire surface. The spine is:
  tenancy/RLS substrate, audit trail, PII crypto, feature flags, integrations hub, PLSA routing
  + mock adapter, and the auth/app shell — everything the rest depends on and everything on the
  critical compliance/money/PII path. The remaining CRM modules (litigation, lead engine,
  workflow engine, email infra, billing) port in Phase A-continuation / early C at production
  quality behind the same gates.
- This keeps the **exit criteria** intact (clones cleanly, `npm run dev` against local Supabase,
  CI green, Google SSO login, tenant isolation proven by tests) while being honest that
  full-surface parity is a Phase A→C arc, not a 3-week single drop.

> **Decision needed from PM (see open questions Q-A1):** confirm "Phase A = spine, full surface
> by end of C" vs "Phase A = entire surface." The PR breakdown below assumes spine-first.

---

## Phase A — Repository Standup + Pattern Extraction

**Goal:** Clean repo, production-quality baseline, the dependency spine replicated and tested.

| PR | Title | Scope | Acceptance criteria |
|---|---|---|---|
| **A1** | `[Phase A] Repo scaffold + tooling` | Dir structure (`/src /supabase/{migrations,functions} /tests /docs /scripts /.github/workflows`); Vite+React+TS strict; ESLint+Prettier; Husky+lint-staged; Vitest; Playwright; Zod; `.env.example`; strip `lovable-tagger`. | `npm install` clean; `npm run typecheck/lint/build` pass; pre-commit hook runs lint-staged; no secrets in tree. |
| **A2** | `[Phase A] Initial CI pipeline` | `.github/workflows/ci.yml`: typecheck + lint + test + build on PR; coverage gate scaffold; `npm audit` (high/critical block). | CI green on a no-op PR; failing test blocks merge; coverage reported. |
| **A3** | `[Phase A] Supabase local + schema spine (tenancy/RLS/audit/PII)` | Migrations for `companies`, `staff`, `user_roles`, `role_permissions`, `tenant_feature_flags`; helpers `can_access_company`, `has_role`, `get_user_company_id`, `is_feature_enabled`, `log_audit_event`, `audit_trigger_fn`, `encrypt_pii`/`decrypt_*`; `system_audit_log`; vault key. All forward-only **with inline rollback SQL**. | `supabase start` + `supabase db reset` applies cleanly; types regenerate; **cross-tenant isolation tests pass (100%)**; PII reveal admin-gated + self-logging tested. |
| **A4** | `[Phase A] Auth + app shell + Google SSO` | Auth flow, forgot/reset password, MFA opt-in, inactivity timeout, app layout, routing skeleton, role impersonation (view-only), Supabase client. | User logs in via Google SSO against local Supabase; protected routes gated; session timeout works; smoke E2E green. |
| **A5** | `[Phase A] Integrations hub + PLSA routing + mock adapter` | `integration_providers`/`company_integrations`/`integration_event_log`; `_shared/{requireAuth,integrations,markIntegrationConnected,forthAuth}`; `plsa-routing` + `plsa-adapter-mock`; `company_processor_configs` (**credentials encrypted, diverging from Lovable plaintext**). | Routing dispatches all 12 ADR-009 ops to mock; integration event log writes; **edge-fn integration tests** cover happy path + auth failure + disabled-provider short-circuit; ADR-009 conformance test green. |
| **A6** | `[Phase A] Core CRM domain (clients/leads/liabilities/services/transactions)` | The core business tables + RLS + the read/write hooks and pages for the central entities; `plsaApi.ts` client adapter. | RLS tests per table; happy/failure unit tests on business-logic hooks; pages render against seeded local data. |
| **A7** | `[Phase A] Pattern inventory + ADR-009 ratification draft + phase summary` | Finalize `lovable_pattern_inventory.md`; ADR-009 → ratified copy under `docs/adrs/`; resolve duplicate-table question; `docs/phases/phase_A_summary.md`; CHANGELOG. | Inventory merged; ADR-009 status updated; duplicate-table decision documented; CI green. |

**Phase A exit (seed):** repo clones cleanly · `npm install && npm run dev` works against local
Supabase · CI green · Google SSO login · **tenant isolation verified by automated tests**.

**Estimated landing:** A1–A2 within ~3–4 days. A3–A5 (the spine + isolation tests) ~2 weeks.
A6–A7 ~1 week. **Phase A spine lands ~2026-06-19 (≈3 weeks);** full-surface parity (litigation,
lead engine, workflow engine, email infra, billing ported + tested) trails into Phase C —
target ~2026-07-10. Caveat: depends on Q-A1 scope decision and Supabase local fidelity for
`pgmq`/`pg_cron`/`vault`.

---

## Phase B — Local Development + Engineer Onboarding

**Goal:** a senior engineer goes clone → contributing in under a day. Runs largely in parallel
with late Phase A.

| PR | Title | Scope | Acceptance criteria |
|---|---|---|---|
| **B1** | `[Phase B] Local stack + seed data` | `supabase start` full stack; idempotent seed scripts: synthetic tenants/users/engagements, **no real PII**; covers the cross-tenant test fixtures. | Fresh `supabase db reset && seed` yields 2+ synthetic tenants and login-ready users. |
| **B2** | `[Phase B] Dev docs + env` | `docs/dev-setup.md` (clone→running), `docs/contributor-guide.md` (branching/PR/review), `.env.example` complete, VS Code workspace + recommended extensions. | A clean follow-through of `dev-setup.md` reaches a running app in <60 min. |
| **B3** | `[Phase B] Docker Compose option` | Compose path for engineers preferring native containers. | `docker compose up` brings up the stack; documented. |
| **B4** | `[Phase B] Onboarding validation` | A throwaway "test PR" exercising the full CI pipeline; capture evidence in phase summary. | Test PR completes full CI green; `docs/phases/phase_B_summary.md` + CHANGELOG. |

**Phase B exit (seed):** fresh clone → working dev env in <60 min via docs; a test PR completes
the full CI pipeline. **Estimated landing:** ~1 week after Phase A spine, overlapping A6–A7.

---

## Cross-cutting quality gates (every PR, from A1)

Typecheck · ESLint+Prettier · Vitest (no unjustified skips) · production build · `npm audit`
(high/critical block) · coverage thresholds (100% on auth/isolation/money/PII/RLS) · migrations
forward-only with inline rollback SQL · docs + CHANGELOG updated in the same PR.

## Dependencies & risks

- **Supabase local fidelity** for `pgmq`, `pg_cron`, `pg_net`, `supabase_vault` — verify in B1;
  if any can't run locally, document a stub/seam so tests don't gate on cloud-only features.
- **Secret hygiene** — the Lovable `.env` carries live keys; never propagate. CI secret scan in A2.
- **Scope decision Q-A1** gates the A6/Phase-C boundary.
- **ADR-009 ratification (2026-06-17)** lands inside Phase A — A5/A7 must align with the final
  contract; the new-processor team builds against it.
