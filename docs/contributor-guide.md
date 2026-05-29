# Contributor Guide

> How we work in Cornerstone: branches, commits, PRs, and the quality bar every change must
> clear. For getting a dev environment running, see [`dev-setup.md`](./dev-setup.md).

## Workflow at a glance

1. Branch off `main`.
2. Make the change **with tests and docs in the same PR**.
3. Run the gates locally (`npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build`).
4. Open a PR. CI must be green to merge.

## Branches

- Branch from up-to-date `main`.
- Naming: `feature/{phase}-{slug}` (e.g. `feature/b1-local-seed`), or `fix/{slug}` for bug fixes.
- One logical change per branch. Keep PRs reviewable.

## Commits

- Imperative, present tense: "Add seed verification", not "Added".
- Explain the _why_ in the body when it isn't obvious from the diff.
- Don't commit secrets. `.env` is gitignored; only `.env.example` is tracked, and the
  `check:secrets` gate scans every commit.

## Migrations

- **Forward-only**, one migration per logical change, timestamped
  (`YYYYMMDDHHMMSS_description.sql`) so they apply in order.
- **Every migration includes inline rollback SQL** (commented `-- DROP …` at the foot), per
  ADR-001.
- Never edit a migration that has landed on `main` — add a new one.
- After a schema change, regenerate types:
  `npx supabase gen types typescript --local > src/integrations/supabase/types.ts`.
- Verify locally with `npx supabase db reset` (re-applies all migrations + reseeds).

## Seed data

- `supabase/seed.sql` is **synthetic and PII-free** and must stay that way — fake names/emails,
  SSNs only via `encrypt_pii` in the `900-00-000x` range.
- It must remain **idempotent**: every insert is `ON CONFLICT`-guarded with a stable id, so
  re-running is a no-op. `tests/db/seed_verify.test.sql` enforces this in CI.
- Use a UUID space disjoint from the test fixtures in `tests/db/rls_isolation.test.sql`
  (seed uses `0a/0b/0c…`, `d1…d6`; the isolation test uses `1111…`/`2222…`).

## Edge functions

- Every edge-function input/webhook payload is **Zod-validated** — enforced by `check:zod`.
- **No wildcard CORS** (`Access-Control-Allow-Origin: *`) — enforced by `check:cors`.
- Per-environment secrets come from the secret manager, never the repo.

## Tests

- Unit/integration: Vitest. E2E smoke: Playwright. DB isolation/seed: SQL suites in `tests/db/`
  (run in the CI `db-verify` job against a real local Postgres).
- **Coverage bar: 80% on business logic; 100% on auth, tenant isolation, money flow, PII
  handling, and RLS policies.**
- No unjustified skipped tests.

## The quality gates (all run in CI; all must pass to merge)

| Gate             | Command                 | Enforces                                                     |
| ---------------- | ----------------------- | ------------------------------------------------------------ |
| Typecheck        | `npm run typecheck`     | TypeScript strict, no `any`                                  |
| Lint             | `npm run lint`          | ESLint (flat config)                                         |
| Format           | `npm run format:check`  | Prettier                                                     |
| Unit/integration | `npm run test:coverage` | Vitest + coverage thresholds                                 |
| Build            | `npm run build`         | Production build succeeds                                    |
| Audit            | `npm audit`             | No high/critical advisories                                  |
| Zod gate         | `npm run check:zod`     | Every edge fn validates input with Zod                       |
| CORS gate        | `npm run check:cors`    | No wildcard CORS                                             |
| Secret scan      | `npm run check:secrets` | No credentials in tracked files                              |
| DB verify        | (CI) `db-verify`        | Migrations apply; RLS/PII isolation; seed valid + idempotent |
| E2E smoke        | `npm run test:e2e`      | App boots and core flow renders                              |
| Edge fn tests    | (CI) `deno test`        | Edge-function logic                                          |

## Pull requests

- Title: `[Phase X] Short summary` for phased work.
- Description: what changed, why, and how it was verified.
- Tests + docs + CHANGELOG entry land **in the same PR** as the code.
- Don't merge with red CI. Address review comments before merge.

## Where things live

```
src/                      React app (routes, components, hooks, lib)
src/integrations/supabase Supabase client + generated types
supabase/migrations/      Forward-only SQL migrations (with rollback SQL)
supabase/functions/       Deno edge functions (+ _shared helpers)
supabase/seed.sql         Synthetic local seed data
tests/db/                 SQL isolation + seed verification suites
tests/e2e/                Playwright
scripts/                  CI gate scripts (check:zod / check:cors / check:secrets)
docs/                     Architecture, ADRs, phase summaries, dev docs
.github/workflows/        CI
```
