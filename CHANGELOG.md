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
