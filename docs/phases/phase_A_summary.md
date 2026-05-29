# Phase A — Summary

> **A12 deliverable.** Closeout for Phase A (Repository Standup + Full-Surface Replication).
> Records what landed, how fidelity was proven, which decisions were locked, and what carries
> forward. Companion to `phase_A_B_execution_plan.md` (the plan) and `lovable_sync_log.md` (the
> per-sync divergence ledger).
>
> **Date:** 2026-05-29 · **Status:** Phase A schema + edge + frontend-skeleton complete;
> exit gated only on the container-dependent items tracked in §7.

---

## 1. What Phase A set out to do

Per the locked decision **Q-A1 (ENTIRE SURFACE)**, Phase A replicates the _full_ system
validated in the Lovable reference build — **94 tables, ~38 DB functions, the edge-function
layer, and the frontend module surface** — at production + test quality, rather than a
spine-first slice. This absorbs most of what the original seed framed as Phase C (integration
replication), leaving Phase C/D as hardening only. The arc to the **Phase 8 cutover (~2026-10-14)**
is unchanged.

The reference surface (from `lovable_pattern_inventory.md`): **94 tables · 94 RLS-enabled ·
212 live policies · 38 functions · 34 edge functions · 275 raw `CREATE POLICY` statements**
(212 live is the expected net after the Lovable history's DROP/CREATE churn).

## 2. What landed (PR by PR)

| PR        | Title                                                | Outcome                                                                                                                                                                                                                                                                                                          |
| --------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A1**    | Repo scaffold + tooling                              | Vite + React 18 + TS (strict), Tailwind + shadcn/ui, ESLint (flat, `no-explicit-any`) + Prettier, Husky + lint-staged, Vitest + Testing Library, Playwright, Zod, `.env.example`. `lovable-tagger` stripped; `@supabase/supabase-js` pinned.                                                                     |
| **A2**    | CI pipeline + quality gates                          | `ci.yml` (typecheck, lint, format, unit+coverage, build, `npm audit`, Playwright). Custom divergence gates `check:zod` / `check:cors` / `check:secrets`, each negative-tested.                                                                                                                                   |
| **A3**    | Tenancy / RLS / audit / PII spine                    | `companies`, `staff`, `user_roles`, `role_permissions`, `role_special_permissions`, `tenant_feature_flags`, `system_audit_log`; access helpers; central audit; vault-backed `encrypt_pii`. `db-verify` CI job added (boots local Supabase in CI; see B-A1).                                                      |
| **A4**    | Auth + app shell + Google SSO                        | `AuthProvider`/`useAuth` (email-password + Google OAuth, reset, MFA opt-in, view-only impersonation that never affects RLS), `ProtectedRoute`, `AppLayout`, inactivity timeout.                                                                                                                                  |
| **A5**    | Core CRM domain                                      | 20 tables (`clients`/`leads`/`liabilities`/`creditors`/`services`/`client_services`/`settlements`/`transactions` + children), 27 enums, RLS, the deferred `decrypt_*`/`can_view_leads`, audit attachments. Schema-diff verified. Q-A2 resolved (`services` ≠ `client_services`). + frontend core-CRM data layer. |
| **A6**    | PLSA layer + Forth adapter                           | 7 payment tables; **`plsa-routing` (the ADR-009 12-op dispatcher) + `plsa-adapter-mock` + 12 `forth-*` adapters + `plsa-nsf-retry`/`plsa-escrow-sync`/`plsa-reconciliation`** (17 edge functions). Per-tenant Forth credential **encryption** (Q-A4). ADR-009 conformance exercised.                             |
| **A7**    | Integrations hub + DocuSeal + Dialpad                | `integration_providers`/`company_integrations`/`integration_event_log`/`dialpad_calls`/`entity_communications`; Dialpad (HMAC webhook, screen-pop, click-to-call) + test-connection endpoints.                                                                                                                   |
| **A8**    | Litigation module                                    | 11 tables (`litigation_matters` + children, `appearance_requests`, `filing_fees`, `law_firms`); **storage hardening** — private buckets + `can_access_storage_object` + path-scoped `storage.objects` RLS.                                                                                                       |
| **A9**    | Lead engine + workflow engine                        | 19 tables + 10 functions (scoring, round-robin/pool assignment, workflow evaluation, domain-event bus); re-adds the A5-deferred `leads` scoring FK + triggers.                                                                                                                                                   |
| **A10**   | Email infra + templates + signatures + notifications | 19 tables + 9 functions (pgmq email queue, templates, signature lifecycle, notifications/notes); DocuSeal `send`/`webhook` edge functions.                                                                                                                                                                       |
| **A11**   | Billing + tasks + eligibility + remaining tables     | Final 6 tables (`billing_entries`, `tasks`, `task_templates`, `eligibility_reviews`, `job_titles`, `feature_requests`); `notify_task_assignment` + re-added trigger. **Completes the 94-table surface.**                                                                                                         |
| **A11.1** | Spine reconciliation                                 | Whole-schema diff (now possible at 94 tables) exposed early A3/A5 drift; corrective forward-only migration brought the schema to parity.                                                                                                                                                                         |
| **A12**   | ADR-009 ratification + phase summary                 | ADR-009 relocated to `docs/adrs/` and **ratified** (this PR); this summary; CHANGELOG + sync-log finalized.                                                                                                                                                                                                      |

## 3. Schema fidelity — how parity was proven

ADR-001 commits us to a **squashed clean baseline** (one forward-only migration per logical
module, each with inline rollback SQL) rather than replaying the 78 historical Lovable
migrations, with correctness enforced by **schema-diff against the authoritative reference**.

- The reference schema is generated by `scripts/schema-harness/`, which applies the **full**
  Lovable migration chain on stock Postgres and dumps the final `public` schema to
  `supabase/reference/lovable_public_schema.sql` (the ADR-001 diff baseline).
- Each schema-bearing PR (A3→A11) was scoped-diffed against that baseline as it landed.
- Completing the surface at A11 enabled a **whole-schema diff**, which caught spine drift the
  per-phase scoped diffs had missed; **A11.1** reconciled it.

**Result: the whole-schema object diff is empty — all 954 objects match — with one accepted,
documented divergence:** the physical column _ordering_ of `staff`. The column set, types,
nullability, and defaults are byte-identical; Postgres cannot reorder columns without a
destructive rebuild of a table the whole schema FKs into, and no production data exists to
justify that, so the ordering difference is logged and accepted.

## 4. Quality gates (enforced every PR from A1)

Typecheck · ESLint + Prettier · Vitest (no unjustified skips) · production build · `npm audit`
(high/critical block) · coverage thresholds (100% on auth / isolation / money / PII / RLS) ·
migrations forward-only with inline rollback SQL · **`check:zod`** (every edge-fn input
Zod-validated — guards 24 edge functions) · **`check:cors`** (no wildcard origin) ·
**`check:secrets`** · docs + CHANGELOG in the same PR.

Database verification (`db-verify`) runs in **GitHub CI** rather than the dev sandbox, because
the sandbox cannot pull container images (blocker **B-A1**). The SQL isolation/PII/audit suite
in `tests/db/` grew alongside the schema to **19 groups** (cross-tenant isolation per domain,
PII reveal gating, audit-trigger wiring, and the A11.1 reconciliation checks), passing on the
reconciled A3→A11.1 schema.

## 5. Decisions locked during Phase A

- **ADR-001 — Migration strategy** (Accepted, 2026-05-29): squashed clean baseline + schema-diff gate.
- **ADR-009 — PLSA adapter interface contract** (**Ratified, 2026-05-29**): the 10 outbound
  operations + 13 inbound events + error/idempotency/provider-id semantics are frozen; A6
  implements and conforms. One external follow-up open: new-processor team co-sign (target
  2026-06-17). See `docs/adrs/ADR-009-*.md`.
- **Q-A1** — Phase A scope = entire surface. **Q-A2** — `services`/`client_services` are
  distinct, not duplicates. **Q-A4** — all four divergences approved + applied (below).
  **Q-A6** — backend = Supabase Cloud (managed), frontend = a hyperscaler static host (specific
  cloud deferred to Phase F, Q-A6b). Not Vercel.

## 6. Divergences from Lovable (all logged in `lovable_sync_log.md`)

1. **Pinned `@supabase/supabase-js`** to one exact version everywhere (Lovable mixes versions).
2. **Removed `lovable-tagger`** (Lovable-Cloud dev-only plugin).
3. **No secrets in source** — `.env.example` only + `check:secrets` gate (Lovable committed a live `.env`).
4. **Restricted CORS** — `check:cors` forbids `Access-Control-Allow-Origin: *`; per-env allowlists.
5. **Zod on every edge-fn input** — `check:zod` gate (Lovable validation was inconsistent).
6. **Squashed baseline** instead of replaying 78 migrations (ADR-001).
7. **Per-tenant Forth credential encryption** — `api_key_encrypted` + service-role-only
   `decrypt_processor_credentials` RPC (Lovable stored creds plaintext).
8. **`extensions.`-qualified PII crypto** + pinned `search_path` (Lovable's were unqualified/fragile).

## 7. Open items carried forward

| Item                                                                              | Type                | Status / where it goes                                                                                                                                              |
| --------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B-A1** — sandbox cannot pull container images                                   | Blocker             | Open. `supabase start` impossible locally; schema verification runs in GitHub CI. Resolve in Phase B1 (widen network policy, hosted dev Postgres, or keep CI-only). |
| **ADR-009 new-processor co-sign**                                                 | External            | Rep named by 2026-06-03; co-sign target 2026-06-17. Does not reopen the interface.                                                                                  |
| **Q-A8** — restore edge-fn type-checking in CI                                    | Follow-up           | `deno test --no-check` today (esm.sh type graph pulls `@types/node`). Phase D hardening.                                                                            |
| **Q-A3** — Forth poller cron: migration vs dashboard                              | Open                | In-repo crons are escrow-sync/nsf-retry/reconciliation; cron registration deferred to Phase F (env-specific URLs/keys).                                             |
| `staff` physical column ordering                                                  | Accepted divergence | Documented in §3; logical schema is identical.                                                                                                                      |
| **Q3** (eng hire), **Q5** (processor sandbox 2026-08-19), **Q6** (cohort cutover) | Program             | Outside Phase A scope; tracked in `open_questions.md`.                                                                                                              |

## 8. Phase A exit criteria — status

| Criterion (seed + Q-A1)                               | Status                                                                              |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Repo clones cleanly; `npm install && npm run dev`     | ✅                                                                                  |
| CI green (typecheck/lint/test/build/audit/gates)      | ✅                                                                                  |
| Google SSO login vs Supabase                          | ✅ (live SSO needs the Google provider configured in Supabase Auth — env, not code) |
| Tenant isolation verified by automated tests          | ✅ in CI (`tests/db/`, 19 groups) — local run blocked only by B-A1                  |
| Full-surface parity with `lovable-source` (94 tables) | ✅ whole-schema diff empty except the documented `staff` ordering                   |
| All four Q-A4 divergences applied + logged            | ✅                                                                                  |
| ADR-009 ratified                                      | ✅ (2026-05-29; co-sign follow-up tracked)                                          |

**Phase A is functionally complete.** The only gate not satisfiable _inside this environment_ is
local container-based DB verification (B-A1) — which is fully satisfied in CI. Phase B (local
dev + onboarding) begins from this baseline and is where B-A1 is resolved for engineers.
