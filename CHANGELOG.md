# Changelog

All notable changes to Cornerstone are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); the project uses conventional commits.

## [Unreleased]

### Added — Phase A

- **A1 — Repository scaffold + tooling.** Vite + React 18 + TypeScript (strict) baseline;
  Tailwind CSS + shadcn/ui configuration; ESLint (flat config, `no-explicit-any` error) +
  Prettier; Husky + lint-staged pre-commit hook; Vitest + Testing Library (with a real unit
  test, replacing Lovable's single placeholder); Playwright E2E scaffold; Zod; `.env.example`
  with no committed secrets. Removed Lovable-Cloud-specific `lovable-tagger`. Pinned
  `@supabase/supabase-js` to an exact version (divergence from Lovable; see
  `docs/lovable_pattern_inventory.md` §9).
- **A2 — CI pipeline + quality gates.** GitHub Actions `ci.yml` (PR + push to `main`):
  `verify` job runs typecheck, lint, format check, unit tests with coverage, production
  build, and `npm audit` (high/critical block merge); `e2e` job runs the Playwright smoke
  test. Three custom gate scripts enforcing approved divergences (Q-A4) and secret hygiene:
  `check:zod` (every edge function validates input with Zod), `check:cors` (no wildcard
  `Access-Control-Allow-Origin: *`), `check:secrets` (high-signal secret scan over tracked
  files). All gates negative-tested to confirm they fail on violations.
- **A3 — Tenancy / RLS / audit / PII spine (in progress).** Consolidated baseline migration
  (`20260529090000_phase_a3_*`, per ADR-001) for the table-independent foundation: `companies`,
  `staff`, `user_roles`, `role_permissions`, `role_special_permissions`, `tenant_feature_flags`,
  `system_audit_log`; access helpers `can_access_company` / `has_role` / `get_user_company_id` /
  `is_feature_enabled`; central audit (`log_audit_event` + `audit_trigger_fn`, attached to
  `staff` / `user_roles`); vault-backed `encrypt_pii`. Forward-only with inline rollback SQL.
  Added a `db-verify` CI job (boots local Supabase, applies migrations, runs the SQL
  tenant-isolation / PII / audit tests in `tests/db/rls_isolation.test.sql`) — verification runs
  in CI because the dev sandbox cannot pull container images (open_questions B-A1). Added the
  Supabase CLI + full local `config.toml`.
- **A4 — Auth + app shell + Google SSO.** `AuthProvider`/`useAuth` context (email-password +
  **Google OAuth** sign-in, sign-up, password reset, `updatePassword`, role state, and admin
  view-only role impersonation that never affects RLS); `ProtectedRoute` guard (loading →
  redirect-to-`/auth`); `AppLayout` shell (top bar with impersonation lens + sign-out, inactivity
  timeout mounted); `useInactivityTimeout` (30-min idle, 2-min warning, cross-tab sync, fires
  once) + `InactivityTimeoutDialog`; Auth / Forgot-password / Reset-password pages; TOTP `MfaCard`
  - Settings; Dashboard/NotFound; the shadcn primitives they need (button, input, label, card,
    alert-dialog, sonner). Unit tests for the route guard and inactivity timer; E2E smoke updated
    for the auth gate. Live Google SSO requires the Google provider configured in Supabase Auth
    (environment config, not code).
- **A5 — Core CRM domain.** Consolidated baseline migration (`20260529100000_phase_a5_*`, ADR-001)
  curated from the authoritative reference: **20 tables** — `clients` (+addresses/phones/
  communications/documents), `client_services` (+`client_service_clients`/`client_service_types`/
  `service_status_history`), `services`, `leads` (+`lead_activities`/`lead_banking`), `liabilities`
  (+`liability_actions`), `creditors` (+`creditor_contacts`/`creditor_responses`), `settlements`,
  `transactions` — with 27 enums, indexes, RLS policies, triggers, and explicit grants. Lands the
  ADR-001-deferred `decrypt_client_ssn`/`decrypt_lead_banking`/`can_view_leads` (now their tables
  exist) and audit-trigger attachments. **Schema-diff verified** against the reference (only the
  intentional deferrals differ). Deferred to owning phases: FKs to `lead_scoring_profiles` (A9) and
  `payment_processors`/`payment_schedules` (A6), and the `leads` lead-engine triggers (A9). Hardened
  `pgp_sym_decrypt` calls with the `extensions.` schema qualifier. Expanded `tests/db/` isolation
  suite: clients/leads cross-tenant + `can_view_leads` paralegal gating (12 groups pass locally on
  the A3+A5 schema).
- **A5 (frontend) — core-CRM data layer.** Hand-authored row types (`src/lib/db-types.ts`) for the
  five core entities; TanStack Query read hooks (`useClients`/`useLeads`/`useLiabilities`/
  `useClientServices`/`useTransactions`) over RLS-scoped queries; Clients and Leads list pages with
  shared loading/error/empty (`QueryState`); top-bar nav. Hook unit tests (success/error/empty,
  mocked Supabase). Full generated `Database` types are deferred to a Docker-capable environment/CI
  (`supabase gen types` needs Docker — B-A1); the row projections keep the data layer strictly
  typed meanwhile. Remaining list pages (liabilities/engagements/transactions) follow the same
  pattern as a fast follow.
- **A6 — PLSA / payments schema.** Consolidated baseline (`20260529110000_phase_a6_*`, ADR-001):
  7 tables — `payment_processors`, `payment_schedules`, `company_processor_configs`
  (per-tenant processor creds; `api_key_encrypted` column — encryption enforced in the forth
  adapter edge functions, Q-A4), `plsa_sync_log`, `reconciliation_findings`, `nsf_retry_policies`,
  `transaction_retry_attempts` — plus 2 enums and the explicit grants. **Re-adds the two
  A5-deferred `transactions` FKs** (`processor_id` → `payment_processors`, `schedule_id` →
  `payment_schedules`). Schema-diff vs reference clean (structure exact; least-privilege grants on
  the append-mostly audit tables). Expanded `tests/db/` to 14 groups: adds `company_processor_configs`
  admin-only + company-scoped isolation. Edge functions (`plsa-routing` + mock/forth adapters)
  land in the A6 edge-function increment.
- **A6 (edge functions, core) — PLSA routing + mock adapter.** `plsa-routing` (the canonical
  ADR-009 12-operation dispatcher: Zod-validated input, provider resolution
  override→service→transaction→client→`forth`, downstream dispatch forwarding the caller's auth)
  and `plsa-adapter-mock` (realistic ADR-009-shaped responses for every operation). Shared
  `_shared/cors.ts` (restricted origin allowlist — **no wildcard**, Q-A4) and hardened
  `_shared/requireAuth.ts` (constant-time service-role compare). First real exercise of the
  `check:zod` / `check:cors` gates on edge functions (negative-tested). New CI **edge-fn-test**
  job runs Deno tests; pure logic (schema, provider resolution, route mapping, mock shapes) is
  unit-tested (server guarded by `import.meta.main` so imports don't boot it). The 12 `forth-*`
  adapters + `forthAuth` (with `company_processor_configs` credential encryption) + reconciliation
  functions land in the next A6 increment.
- **A6 (Forth auth + credential encryption).** `decrypt_processor_credentials(company_id)` —
  SECURITY DEFINER, **service-role-only** — returns `{client_id, api_key}` with the api_key decrypted
  from `company_processor_configs.api_key_encrypted` (Q-A4: encrypted per-tenant creds, vs Lovable's
  plaintext `config`). `_shared/forth.ts` pure helpers (secret normalize, OAuth-token extraction
  across Forth's response shapes, 429 backoff) with Deno tests; `_shared/forthAuth.ts` credential-aware
  OAuth/token-cache/`forthFetch` (reads creds via the RPC; env fallback). db-verify expanded to 15
  groups (encrypt→decrypt roundtrip + service-role-only gating). The 12 `forth-*` adapters consume
  this next.
