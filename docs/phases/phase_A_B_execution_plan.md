# Phase A + B — Execution Plan

> **Section 8.5/8.6 deliverable.** Execution plan for Phase A (Repository Standup + Pattern
> Extraction) and Phase B (Local Dev + Engineer Onboarding), sized against the actual
> `lovable-source` tree (94 tables, 78 migrations, 34 edge functions, 275 RLS policies — see
> `lovable_pattern_inventory.md`).
>
> **Date:** 2026-05-29 · **Branch convention:** `feature/{phase}-{slug}` → PR → `main`.

---

## Decisions locked (PM, 2026-05-29)

- **Q-A1 — Phase A scope = ENTIRE SURFACE.** Replicate the full 94-table / 34-function /
  all-frontend-module system at production + test quality within Phase A. This absorbs most of
  what the seed framed as Phase C (integration replication); Phase C/D narrow to *hardening*.
- **Q-A4 — All four divergences approved** and applied during Phase A: encrypt per-tenant Forth
  credentials, pin a single `supabase-js` version, restrict CORS per environment, Zod on every
  edge-function input/webhook. Each gets a `lovable_sync_log.md` entry or short ADR.
- **Q1 — Deployment target = "Other"** (not Vercel + Supabase Cloud); specifics pending
  (`open_questions.md` Q-A6). Phase A/B build host-agnostically against **local Supabase**;
  Phase F is re-scoped once the target is known. Seed §2A still locks **Supabase** as the backend
  technology (self-host permitted).

### Sizing reality
Full-surface replication at production quality — *with the test coverage Lovable never had*
(275 RLS policies each cross-tenant tested; 100% on auth/isolation/money/PII) — is a **~6–9 week**
effort, not 3. The trade is favorable: by doing full replication in Phase A, the original Phase C
(replication) collapses into hardening only, so the overall arc to the **Phase 8 cutover
(~2026-10-14)** stays intact. Phase B runs in parallel from week 1.

---

## Phase A — Repository Standup + Full-Surface Replication

**Goal:** clean production-grade repo with the entire Lovable system replicated, tested, and
isolation-verified.

| PR | Title | Scope | Acceptance criteria |
|---|---|---|---|
| **A1** | `[Phase A] Repo scaffold + tooling` | Dir structure; Vite+React+TS **strict**; ESLint+Prettier; Husky+lint-staged; Vitest; Playwright; Zod; `.env.example`; strip `lovable-tagger`; **pin supabase-js** baseline. | `npm install` clean; typecheck/lint/build pass; pre-commit runs lint-staged; no secrets in tree. |
| **A2** | `[Phase A] CI pipeline + secret scan` | `.github/workflows/ci.yml`: typecheck+lint+test+build on PR; coverage gate; `npm audit` (high/critical block); secret scan; **CI rule: new edge fn without Zod fails**; **CI rule: CORS `*` fails**. | CI green on no-op PR; failing test/secret/Zod-missing blocks merge. |
| **A3** | `[Phase A] Tenancy + RLS + audit + PII spine` | `companies`, `staff`, `user_roles`, `role_permissions`, `tenant_feature_flags`; helpers `can_access_company`, `has_role`, `get_user_company_id`, `is_feature_enabled`, `log_audit_event`, `audit_trigger_fn`, `resolve_entity_company_id`; `system_audit_log`; vault key + `encrypt_pii`/`decrypt_*`. Forward-only **with inline rollback SQL**. | `supabase db reset` clean; types regenerate; **cross-tenant isolation tests 100%**; PII reveal admin-gated + self-logging tested. |
| **A4** | `[Phase A] Auth + app shell + Google SSO` | Auth, forgot/reset, MFA opt-in, inactivity timeout, app layout, routing skeleton, role impersonation (view-only), Supabase client. | Google SSO login vs local Supabase; protected routes gated; smoke E2E green. |
| **A5** | `[Phase A] Core CRM domain` | `clients` (+addresses/phones/communications/documents), `leads` (+activities/banking/budgets/debts/disclosures/documents), `liabilities`/`liability_actions`, `creditors`/`creditor_contacts`/`creditor_responses`, `services`/`client_services`, `transactions`, `settlements`; RLS + hooks + pages; `plsaApi.ts`. **Resolve duplicate tables (Q-A2).** | RLS test per table; happy/failure unit tests on business hooks; pages render vs seed; duplicate-table decision documented. |
| **A6** | `[Phase A] PLSA layer + Forth adapter` | `plsa-routing` + `plsa-adapter-mock` + 12 `forth-*` fns + `plsa-nsf-retry`/`plsa-escrow-sync`/`plsa-reconciliation`; `company_processor_configs` (**creds encrypted**); `plsa_sync_log`, `reconciliation_findings`, `nsf_retry_policies`, `transaction_retry_attempts`; 3 crons; `_shared/{requireAuth,forthAuth}`. | All 12 ADR-009 ops dispatch to mock; **edge-fn integration tests**: happy + auth-fail + webhook-sig-mismatch + downstream-timeout; ADR-009 conformance green. |
| **A7** | `[Phase A] Integrations hub + DocuSeal + Dialpad` | `integration_providers`/`company_integrations`/`integration_event_log`; `_shared/{integrations,markIntegrationConnected}`; `docuseal-*` (3) incl. signed-doc archival; `dialpad-*` (5) incl. HMAC webhook, `dialpad_calls`, screen-pop; `client_communications` + polymorphic `entity_communications`. | Per-integration tests (happy/auth-fail/sig-mismatch/timeout); disabled-provider short-circuits; integration health visible. |
| **A8** | `[Phase A] Litigation module` | `litigation_matters`/`hearings`/`activities`/`documents`/`teams`/`team_members`, `appearance_requests`, `filing_fees`, `law_firms`/`law_firm_contacts`; pages incl. court calendar; storage hardening (private buckets + `can_access_storage_object` + signed URLs). | RLS + storage isolation tests; calendar renders; signed-URL doc access tested. |
| **A9** | `[Phase A] Lead engine + workflow engine` | `lead_scoring_profiles`, `lead_assignment_*` (rules/pool/queue/log) + `assign_lead`/`calculate_lead_score`/`process_assignment_queue`; `workflow_rules`/`groups`/`executions` + `evaluate_workflow_conditions`/`check_trigger_match`/`validate_status_transition`. | Scoring + assignment unit tests (happy/edge); workflow rule evaluation tests; idempotency on re-run. |
| **A10** | `[Phase A] Email infra + templates + signatures + notifications` | `pgmq` email queue + `enqueue_email`/`read_email_batch`/`move_to_dlq`/`delete_email`; `email_send_log`/`state`/`unsubscribe_tokens`/`suppressed_emails`; `process-email-queue`/`process-deadline-reminders`/`render-template`; `templates`/`template_*`/`report_templates`; `signature_requests`/`signers`/`events`; `notifications`/`notification_preferences`/`deadline_reminders`/`reminder_settings`; `domain_events`+`emit_domain_event`; `outbound_webhook_log`/`webhook_endpoints`. | Queue enqueue→process→DLQ tested; template render tests; signature lifecycle tested; webhook signing tested. |
| **A11** | `[Phase A] Billing, tasks, eligibility, remaining tables + docs center` | `billing_entries`, `tasks`/`assignments`/`task_templates`, `eligibility_reviews`, `feature_requests`, `notes`/`note_mentions`, `simulate-underwriting`, `create-staff-user`/`reset-staff-password`; any residual tables; in-app docs center routes. | Remaining-table RLS tests; staff-admin fn tests; full table parity vs `types.ts` confirmed. |
| **A12** | `[Phase A] ADR-009 ratification + inventory finalize + phase summary` | ADR-009 → ratified `docs/adrs/ADR-009-*.md`; finalize inventory; `lovable_sync_log.md` divergence entries; coverage report; `docs/phases/phase_A_summary.md`; CHANGELOG. | ADR-009 ratified; coverage gates met system-wide; all 4 divergences logged; CI green. |

**Phase A exit (seed):** repo clones cleanly · `npm install && npm run dev` vs local Supabase ·
CI green · Google SSO login · **tenant isolation verified by automated tests** · *(extended by
Q-A1)* full-surface parity with `lovable-source` confirmed against `types.ts`.

**Estimated landing:** A1–A2 ~3–4 days; A3–A4 ~1 week; A5–A11 (full replication + tests) the
bulk, ~5–7 weeks; A12 ~few days. **Phase A complete ≈ late July 2026 (2026-07-24 ± 1 wk).**
Caveats: Supabase-local fidelity for `pgmq`/`pg_cron`/`pg_net`/`vault`; resourcing (solo vs +hire,
Q3); ADR-009 final shape (ratify 2026-06-17).

---

## Phase B — Local Development + Engineer Onboarding (parallel from week 1)

| PR | Title | Scope | Acceptance criteria |
|---|---|---|---|
| **B1** | `[Phase B] Local stack + seed data` | `supabase start` full stack; idempotent seed: synthetic tenants/users/engagements, **no real PII**; cross-tenant test fixtures. | `supabase db reset && seed` → 2+ synthetic tenants, login-ready users. |
| **B2** | `[Phase B] Dev docs + env` | `docs/dev-setup.md`, `docs/contributor-guide.md`, complete `.env.example`, VS Code workspace + extensions. | Clean follow-through reaches running app <60 min. |
| **B3** | `[Phase B] Docker Compose option` | Compose path for native-container engineers. | `docker compose up` brings up stack; documented. |
| **B4** | `[Phase B] Onboarding validation` | Throwaway test PR exercising full CI; evidence in summary. | Test PR full CI green; `phase_B_summary.md` + CHANGELOG. |

**Phase B exit:** fresh clone → working dev env <60 min; test PR completes full CI.

---

## Cross-cutting quality gates (every PR, from A1)

Typecheck · ESLint+Prettier · Vitest (no unjustified skips) · production build · `npm audit`
(high/critical block) · coverage thresholds (100% on auth/isolation/money/PII/RLS) · migrations
forward-only with inline rollback SQL · **Zod present on every edge-fn input (CI-enforced)** ·
**no CORS `*` (CI-enforced)** · docs + CHANGELOG in the same PR.

## Dependencies & risks

- **Supabase local fidelity** for `pgmq`/`pg_cron`/`pg_net`/`supabase_vault` — verify in B1;
  document stub/seam if any is cloud-only so tests don't gate on it.
- **Secret hygiene** — Lovable `.env` has live keys; never propagate. Secret scan in A2.
- **Deployment target (Q-A6)** unknown — Phase A/B stay host-agnostic; Phase F awaits the answer.
- **ADR-009 ratification (2026-06-17)** lands mid-Phase-A; A6/A12 align to the final contract.
- **Resourcing (Q3)** materially affects the late-July estimate.
