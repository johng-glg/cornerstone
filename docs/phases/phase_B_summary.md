# Phase B — Summary

> **Phase B closeout.** Local development + engineer onboarding. Records what landed, how it was
> verified, and what carries forward. Companion to `phase_A_B_execution_plan.md` (the plan),
> `phase_A_summary.md` (the prior phase), and `lovable_sync_log.md` (the divergence ledger).
>
> **Date:** 2026-05-29 · **Status:** Complete. Delivered as a single change (PM decision:
> "larger chunks"), covering the planned B1–B4 in one PR, verified end-to-end on a local
> Postgres rather than only statically.

---

## 1. What Phase B set out to do

Per `phase_A_B_execution_plan.md` §Phase B: take a fresh clone to a working dev environment in
under an hour, with a synthetic multi-tenant seed, dev/contributor docs, a complete env template,
an editor workspace, a Docker Compose alternative, and an onboarding-validation pass through CI.

Two PM decisions shaped delivery:

- **One chunk.** All of B1–B4 in a single change rather than four PRs.
- **Verify in CI.** The "stack actually boots" criterion is satisfied in GitHub CI (the existing
  `db-verify` job), since the dev sandbox cannot pull container images (blocker **B-A1**).

## 2. What landed

| Planned PR                     | Delivered                                                                                                                                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1** — Local stack + seed    | `supabase/seed.sql`: synthetic, PII-free, **idempotent** multi-tenant seed (see §3). `tests/db/seed_verify.test.sql` proves the acceptance criteria and is wired into the CI `db-verify` job.                                                                       |
| **B2** — Dev docs + env        | `docs/dev-setup.md` (fresh-clone → running app <60 min, two backend paths, seeded-user reference, troubleshooting), `docs/contributor-guide.md` (branch/commit/PR conventions + quality-gate table), expanded `.env.example`, `.vscode/{settings,extensions}.json`. |
| **B3** — Docker Compose option | `docker-compose.yml` + `scripts/compose/{bootstrap,apply}.sh`: stock Postgres with the Supabase-managed surface stubbed, all migrations applied, and the seed loaded — for engineers without the Supabase CLI.                                                      |
| **B4** — Onboarding validation | This PR exercises the full CI surface, including the new seed-verification gate. `phase_B_summary.md` (this file) + CHANGELOG record the evidence.                                                                                                                  |

## 3. The seed

`supabase/seed.sql` is loaded automatically by `supabase start` / `db reset` (via
`[db.seed]` in `config.toml`). Design contract:

- **Synthetic + PII-free.** Obviously-fake names/emails; SSNs in the `900-00-000x` range stored
  **only** through `encrypt_pii()`; processor api keys stored **encrypted** (mirrors the Q-A4
  per-tenant credential-encryption contract).
- **Idempotent.** Every insert is `ON CONFLICT`-guarded with a stable id, so re-running is a no-op
  — verified by applying the seed three times with row counts unchanged.
- **CI-safe.** Uses a UUID space (`0a/0b/0c…`, users `d1…d6`) **disjoint** from the
  `rls_isolation.test.sql` fixtures (`1111…`/`2222…`) and never writes the globally-readable
  tables that suite counts unscoped (e.g. `task_templates`), so both suites coexist.

Contents: 3 tenants (one per `company_type`), 6 login-ready users (password `Cornerstone!1`,
confirmed email + `auth.identities`), staff + roles, and cross-tenant clients / leads /
client-services / a liability / processor configs / integrations / templates / notifications for
the two primary tenants. The `leads.paralegal_visibility` flag is on for one tenant and off for
another so the paralegal lead-gate is visible out of the box.

## 4. How it was verified

Because a full Postgres 16 server is available in the environment (even though container image
pulls are blocked — B-A1), the whole path was exercised **end-to-end**, not just statically:

1. `scripts/compose/bootstrap.sql` applied to a throwaway cluster (Supabase surface stubbed).
2. All **10 migrations** applied cleanly (cloud-only `CREATE EXTENSION` lines stripped, as the
   Compose path does).
3. `supabase/seed.sql` applied cleanly.
4. `tests/db/seed_verify.test.sql` — **all 6 groups pass** (and caught a real bug during
   development: a `uuid LIKE` comparison needing a `::text` cast).
5. `tests/db/rls_isolation.test.sql` — **all 19 groups still pass with the seed loaded**,
   confirming the disjoint-UUID design and no `task_templates`/count collisions. This replicates
   the exact CI `db-verify` order (seed loads first, then isolation runs).
6. Seed applied **3×** → row counts identical (file-level idempotency).
7. JS/TS gates green: typecheck, lint, unit tests, `check:zod`, `check:cors`, `check:secrets`
   (the seed's fake keys do not trip the secret scan), Prettier.

CI enforces the same on every PR via the extended `db-verify` job.

## 5. Phase B exit criteria — status

| Criterion                                                             | Status                                                                            |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Fresh clone → working dev env <60 min                                 | ✅ documented + scripted (two paths)                                              |
| `supabase db reset && seed` → 2+ synthetic tenants, login-ready users | ✅ 3 tenants, 6 users; verified                                                   |
| Cross-tenant test fixtures                                            | ✅ clients/leads/services across tenants; isolation suite green with seed present |
| Dev docs + complete `.env` + editor workspace                         | ✅ `dev-setup.md`, `contributor-guide.md`, `.env.example`, `.vscode/`             |
| Docker Compose path                                                   | ✅ `docker-compose.yml` + initializer; DB + migrations + seed                     |
| Test PR completes full CI                                             | ✅ this PR; seed-verification added to `db-verify`                                |

## 6. Carried forward

| Item                                            | Status                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B-A1** — sandbox cannot pull container images | Still open as a _sandbox_ constraint. Worked around: a native Postgres install allowed real end-to-end verification here, and CI verifies on the real Supabase stack. The full multi-service `supabase start` (Auth/Storage/Edge/Studio) still can't run in the sandbox — engineers run it locally. |
| **Q-A8** — restore edge-fn type-checking in CI  | Phase D hardening (unchanged).                                                                                                                                                                                                                                                                      |
| **Q-A3** — Forth poller cron registration       | Phase F (unchanged).                                                                                                                                                                                                                                                                                |
| Compose path is **DB-only**                     | Intentional. Full local service mesh is Path A (`supabase start`). If demand appears for a full-stack Compose path, revisit.                                                                                                                                                                        |

**Phase B is complete.** Next: the program moves toward the hardening/deployment phases
(Phase C/D hardening, Phase F deployment provisioning) per the execution plan.
