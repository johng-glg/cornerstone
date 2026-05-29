# Cornerstone

**Guardian Litigation Group Case Management System** — a production-grade, multi-tenant case
management platform. This repository is the production destination for Cornerstone; the Lovable
environment is the design/demo reference (see `docs/lovable_pattern_inventory.md`).

## Stack

| Layer        | Technology                                                       |
| ------------ | ---------------------------------------------------------------- |
| Frontend     | React 18, TypeScript (strict), Vite, Tailwind CSS, shadcn/ui     |
| Data / state | TanStack Query, TanStack Table                                   |
| Backend      | Supabase — Postgres, Auth, Storage, Edge Functions (Deno)        |
| Realtime     | Supabase Realtime                                                |
| Validation   | Zod (every edge-function input / webhook)                        |
| Charts       | Recharts                                                         |
| Testing      | Vitest, Testing Library, Playwright                              |
| Hosting      | Supabase Cloud (backend) + hyperscaler static hosting (frontend) |

## Quickstart

Requires Node ≥ 20 and the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm install
cp .env.example .env        # fill in local Supabase values
npm run dev                 # http://localhost:8080
```

Full local setup (local Supabase stack + synthetic seed data, two backend paths, seeded login
credentials) is documented in `docs/dev-setup.md`. Contribution conventions and the quality bar
are in `docs/contributor-guide.md`.

## Scripts

| Command                           | Purpose                                               |
| --------------------------------- | ----------------------------------------------------- |
| `npm run dev`                     | Start the Vite dev server                             |
| `npm run build`                   | Type-check then production build                      |
| `npm run typecheck`               | TypeScript, no emit                                   |
| `npm run lint` / `lint:fix`       | ESLint (+ autofix)                                    |
| `npm run format` / `format:check` | Prettier                                              |
| `npm run test` / `test:coverage`  | Vitest unit/integration tests                         |
| `npm run test:e2e`                | Playwright E2E                                        |
| `npm run check:zod`               | CI gate: every edge function validates input with Zod |
| `npm run check:cors`              | CI gate: no wildcard CORS in edge functions           |

## Quality bar

TypeScript strict mode; no `any`. Coverage targets: 80% on business logic, **100% on auth,
tenant isolation, money flow, PII handling, and RLS policies**. All gates run in CI; no merge to
`main` with failing tests. Migrations are forward-only with inline rollback SQL.

## Repository layout

```
src/                     React app (routes, components, hooks, lib)
src/integrations/supabase Supabase client + generated types
supabase/migrations/     Forward-only SQL migrations (with rollback SQL)
supabase/functions/      Deno edge functions (+ _shared helpers)
tests/                   unit/ and e2e/ (Playwright) suites
scripts/                 CI gate scripts
docs/                    Architecture, ADRs, runbooks, phase summaries, compliance evidence
.github/workflows/       CI/CD
```

## Documentation

- `docs/dev-setup.md` — local development setup (Supabase CLI + Docker Compose paths, seed data)
- `docs/contributor-guide.md` — branch/commit/PR conventions + the quality gates
- `docs/lovable_pattern_inventory.md` — inventory of the Lovable reference system + porting notes
- `docs/phases/phase_A_B_execution_plan.md` — current execution plan
- `docs/phases/` — phase closeouts (A, B, D)
- `docs/security-overview.md` — threat model, isolation, encryption, audit, rate limiting
- `docs/compliance-evidence/` — RLS audit, SSN-backfill evidence, TSR/DFPI/bar artifacts
- `docs/open_questions.md` — open decisions
- `docs/adrs/` — Architecture Decision Records (ADR-009 = PLSA adapter interface)
