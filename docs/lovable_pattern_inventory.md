# Lovable Pattern Inventory

> **Purpose:** Section 8.2 deliverable. A production-engineering inventory of the Lovable
> design/demo codebase (`johng-glg/guardian-case-craft@lovable`, mirrored read-only into
> this repo as branch `lovable-source`) so it can be replicated at production quality here.
>
> **Method:** Static read of the `lovable-source` tree — `supabase/migrations/` (78 files,
> 7,579 lines of SQL), `supabase/functions/` (34 functions), `src/integrations/supabase/types.ts`
> (6,369 generated lines), `supabase/config.toml`, `src/` (routes, libs, hooks, components),
> and `package.json`. Counts are mechanical (grep/awk) and reproducible.
>
> **Author:** Cornerstone standalone build · **Date:** 2026-05-29 · **Status:** Living document.

---

## 0. Headline numbers

| Surface                          |   Count | Source of truth            |
| -------------------------------- | ------: | -------------------------- |
| Database tables                  |  **94** | `types.ts` `Tables` block  |
| Enums                            | **~70** | `types.ts` `Enums` block   |
| DB functions (`Functions` block) | **~30** | `types.ts` + migrations    |
| `SECURITY DEFINER` functions     |  **40** | migration grep             |
| RLS policies (`CREATE POLICY`)   | **275** | migration grep             |
| Tables with RLS enabled          |  **96** | migration grep             |
| DB triggers                      |  **69** | migration grep             |
| Migrations (forward-only)        |  **78** | `supabase/migrations/`     |
| Edge functions                   |  **34** | `supabase/functions/`      |
| Frontend routes (app + docs)     | **~40** | `src/App.tsx`              |
| React hooks                      |  **89** | `src/hooks/`               |
| React components                 | **242** | `src/components/`          |
| Automated tests                  |   **1** | `src/test/example.test.ts` |
| pg_cron jobs (in-repo)           |   **3** | migration grep             |

---

## 1. The most important structural finding

**The v4 system spec PDF is a partial digest, not a full map of the system.**

The spec (`GLG_System_Specification_v4.pdf`) documents only the _hardening and integration_
phases — Operation Cornerstone Phases 1–7, plus 11–12. The actual Lovable codebase is roughly
**2–3× larger** than the spec describes. An entire base CRM + litigation + lead-engine +
email-infrastructure layer exists in the source that the spec never mentions, because it
predates (or post-dates) the documented phase window:

- **Lead engine:** `lead_scoring_profiles`, `lead_assignment_rules`, `lead_assignment_pool`,
  `lead_assignment_queue`, `lead_assignment_log`, `assign_lead()`, `calculate_lead_score()`,
  `process_assignment_queue()`.
- **Litigation module:** `litigation_matters`, `litigation_hearings`, `litigation_activities`,
  `litigation_documents`, `litigation_teams`, `litigation_team_members`, court calendar route.
- **Workflow engine:** `workflow_rules`, `workflow_groups`, `workflow_executions`,
  `evaluate_workflow_conditions()`, `check_trigger_match()`, `validate_status_transition()`.
- **Email infrastructure (pgmq-backed):** `email_send_log`, `email_send_state`,
  `email_unsubscribe_tokens`, `suppressed_emails`, `deadline_reminders`, plus
  `enqueue_email()`/`read_email_batch()`/`move_to_dlq()`/`delete_email()` and a `pgmq` queue.
- **Domain events / outbound webhooks:** `domain_events`, `emit_domain_event()`,
  `outbound_webhook_log`, `webhook_endpoints`.
- **Billing, tasks, notifications, templates, signatures, eligibility, feature-requests** —
  all present, none in the v4 spec.

**Implication for the plan:** scoping Phase A against the spec alone would under-build by a
wide margin. The `lovable-source` branch — specifically `types.ts` (full schema) and the
migration set — is the real replication target. The spec is context for _intent and rationale_;
the source is the _contract_. Phase A scope in the execution plan is sized against the source.

---

## 2. Schema inventory (94 tables, grouped by module)

| Module                        | Tables                                                                                                                                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tenancy & access**          | `companies`, `staff`, `user_roles`, `role_permissions`, `role_special_permissions`, `job_titles`, `tenant_feature_flags`, `terminology_presets`                                                                                          |
| **Clients**                   | `clients`, `client_addresses`, `client_phones`, `client_communications`, `client_documents`, `client_service_clients`, `client_service_types`, `client_services`, `services`, `service_status_history`                                   |
| **Leads**                     | `leads`, `lead_activities`, `lead_banking`, `lead_budgets`, `lead_debts`, `lead_disclosures`, `lead_documents`, `lead_scoring_profiles`, `lead_assignment_rules`, `lead_assignment_pool`, `lead_assignment_queue`, `lead_assignment_log` |
| **Liabilities / settlements** | `liabilities`, `liability_actions`, `creditors`, `creditor_contacts`, `creditor_responses`, `settlements`                                                                                                                                |
| **PLSA / payments**           | `transactions`, `transaction_retry_attempts`, `nsf_retry_policies`, `payment_schedules`, `payment_processors`, `company_processor_configs`, `plsa_sync_log`, `reconciliation_findings`                                                   |
| **Litigation**                | `litigation_matters`, `litigation_hearings`, `litigation_activities`, `litigation_documents`, `litigation_teams`, `litigation_team_members`, `appearance_requests`, `filing_fees`, `law_firms`, `law_firm_contacts`                      |
| **Servicing automation**      | `graduation_automation_config`, `graduation_events`, `eligibility_reviews`                                                                                                                                                               |
| **Workflow engine**           | `workflow_rules`, `workflow_groups`, `workflow_executions`                                                                                                                                                                               |
| **Templates & signatures**    | `templates`, `template_categories`, `template_versions`, `template_usage`, `template_usages`, `report_templates`, `task_templates`, `docuseal_templates`, `signature_requests`, `signature_signers`, `signature_events`                  |
| **Email infra**               | `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails`, `deadline_reminders`, `reminder_settings`, `notification_preferences`, `notifications`                                                            |
| **Integrations hub**          | `integration_providers`, `company_integrations`, `integration_event_log`, `dialpad_calls`, `outbound_webhook_log`, `webhook_endpoints`, `domain_events`                                                                                  |
| **Tasks / billing / comms**   | `tasks`, `assignments`, `billing_entries`, `entity_communications`, `notes`, `note_mentions`, `feature_requests`                                                                                                                         |

> ⚠️ **Duplication smell to resolve, not blindly replicate:** `services` vs `client_services`;
> `template_usage` vs `template_usages`. Both pairs exist. Phase A must determine which is live
> (FK references, RLS, code reads) and document the other as deprecated rather than carrying a
> confusing duplicate into production. Flagged as a divergence candidate (see §9).

### Two communication-log tables (canonical pattern — preserve)

- `client_communications` — client-surface activity (legacy, client-only).
- `entity_communications` — polymorphic (`entity_type`/`entity_id`/`related_record_id`) for
  leads, liabilities, litigation matters, creditor contacts. Dialpad writes to whichever
  matches the surface; `dialpad_calls` is always the source-of-truth row.

---

## 3. RLS & access-control substrate (preserve exactly)

The multi-tenant isolation model is the single highest-risk thing to replicate faithfully.
275 policies across 96 tables, all resolving through a small set of `SECURITY DEFINER` helpers:

| Helper                                                            | Role                                                                    |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `can_access_company(_user_id, _company_id)`                       | Core tenant gate; called by most table policies.                        |
| `has_role(_user_id, _role)`                                       | Role check against `user_roles` (enum `app_role`).                      |
| `get_user_company_id(_user_id)`                                   | Resolves caller's company.                                              |
| `can_view_leads(_user_id, _company_id)`                           | Leads gated; pure paralegals require `leads.paralegal_visibility` flag. |
| `is_feature_enabled(_company_id, _flag_key)`                      | `tenant_feature_flags` resolver with built-in default registry.         |
| `can_access_storage_object(_bucket, _first_folder)`               | Storage RLS: resolves owning company from first path segment.           |
| `resolve_entity_company_id(...)`                                  | Polymorphic company resolution for `entity_communications` etc.         |
| `log_audit_event(...)` + `audit_trigger_fn()`                     | Central audit trail → `system_audit_log` on 11+ sensitive tables.       |
| `encrypt_pii()`, `decrypt_client_ssn()`, `decrypt_lead_banking()` | Vault-backed PII crypto, admin-gated, self-logging.                     |

**Production requirement (per seed §Testing):** every one of these gets explicit cross-tenant
access tests — 100% coverage on the isolation path. Lovable has zero such tests today.

---

## 4. Edge functions (34, grouped)

| Group                             | Functions                                                                                                                                                                                                                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Forth adapter (12)**            | `forth-auth`, `forth-register-client`, `forth-sync-client`, `forth-create-draft`, `forth-update-draft`, `forth-cancel-draft`, `forth-poll-transactions`, `forth-pause-resume`, `forth-fetch-balance`, `forth-contact-update`, `forth-contact-close`, `forth-payment-to-creditor` |
| **PLSA routing/adapters (5)**     | `plsa-routing`, `plsa-adapter-mock`, `plsa-nsf-retry`, `plsa-escrow-sync`, `plsa-reconciliation`                                                                                                                                                                                 |
| **DocuSeal (3)**                  | `docuseal-send`, `docuseal-webhook`, `docuseal-test`                                                                                                                                                                                                                             |
| **Dialpad (5)**                   | `dialpad-initiate`, `dialpad-webhook`, `dialpad-backfill-user`, `dialpad-register-webhook`, `dialpad-test-connection`                                                                                                                                                            |
| **Integrations / connection (1)** | `forth-test-connection`                                                                                                                                                                                                                                                          |
| **Servicing / workflow (2)**      | `service-graduation-check`, `simulate-underwriting`                                                                                                                                                                                                                              |
| **Email / reminders (3)**         | `process-email-queue`, `process-deadline-reminders`, `render-template`                                                                                                                                                                                                           |
| **Staff admin (2)**               | `create-staff-user`, `reset-staff-password`                                                                                                                                                                                                                                      |
| **Shared (`_shared/`, 4)**        | `forthAuth.ts`, `integrations.ts`, `markIntegrationConnected.ts`, `requireAuth.ts`                                                                                                                                                                                               |

**Conventions observed:**

- All functions except `process-email-queue` run `verify_jwt = false` and validate auth in code
  via `requireAuth()` (accepts user JWT **or** service-role key for scheduler calls).
- Imports from `https://esm.sh/@supabase/supabase-js@2` (version pin inconsistent: some `@2`,
  some `@2.45.0`).
- CORS is `Access-Control-Allow-Origin: *` everywhere.
- `plsa-routing` holds the canonical `PROVIDER_REGISTRY` mapping 12 operations → provider fns
  with per-op `buildBody` payload normalization. **This is the ADR-009 chokepoint — preserve.**

---

## 5. Frontend surface

- **~28 app routes** (`/`, `/clients`, `/leads`, `/liabilities`, `/litigation` + `/calendar`
  - `/teams`, `/services`, `/payments`, `/settlements` via liabilities, `/billing`, `/tasks`,
    `/creditors`, `/companies`, `/staff`, `/eligibility-reviews`, `/integrations`, `/reports`
  - `/reports/reconciliation`, `/settings`, `/feature-requests`, auth routes) plus a **12-route
    in-app docs center** (`/docs/{schema,erd,enums,functions,edge-functions,rls-policies,
permissions,roles,features,storage,integrations,security-concerns,future-builds}`).
- **`src/lib/plsaApi.ts`** is the canonical client adapter (every helper invokes `plsa-routing`);
  `src/lib/forthApi.ts` is a one-line re-export shim for back-compat.
- **89 hooks**, **242 components**, **shadcn/ui** primitives, **TanStack Query**, **Recharts**.
- **`src/lib/docs/*`** (`schemaData.ts`, `roleGuides.ts`, `featureGuides.ts`, `rolePermissions.ts`,
  `roadmapData.ts`) are hand-maintained structured data powering the docs center — useful as a
  secondary cross-check on schema/role intent.

---

## 6. Infrastructure & extensions

| Extension        | Used for                                                                                            | Port note                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `supabase_vault` | `pii_encryption_key`, `service_role_key`, integration credential refs                               | Supabase-native; enable per environment. 11 references.                  |
| `pg_cron`        | 3 scheduled jobs: `plsa-escrow-sync-nightly`, `plsa-nsf-retry-hourly`, `plsa-reconciliation-hourly` | Native; requires cron privilege at migrate time or manual dashboard add. |
| `pg_net`         | `net.http_post` from cron → edge functions (4 calls)                                                | Native; URLs/service key read from vault.                                |
| `pgmq`           | Email queue (enqueue/read/DLQ)                                                                      | Native; the email infra depends on it.                                   |

> The Forth integration audit notes the in-repo poller cron may also live only in the Supabase
> dashboard (outside source control). Phase A/C must reconcile actual scheduled jobs against
> what's in migrations.

---

## 7. Production gaps vs Lovable (what we build _beyond_ replication)

Per seed §"What You're Building Beyond Lovable", confirmed against the source:

1. **Tests.** 1 test file exists. We need: Vitest unit (80% business logic), edge-function
   integration tests (Deno + Supabase local), Playwright E2E, and **100% coverage on auth,
   tenant isolation, money flow, PII, RLS** — none of which exist today.
2. **Security deferrals to resolve (Phase D):** SSN encryption is _foundation-only_ (plaintext-
   capable column, no backfill); rate limiting deferred; per-tenant Forth credentials stored
   **plaintext** in `company_processor_configs` (the `api_key_encrypted` column is unused);
   virus scanning / content sniffing deferred; branded auth emails deferred.
3. **Zod everywhere:** Zod is a dependency but not enforced on every edge-function input /
   webhook. We add a CI rule.
4. **Observability:** no Sentry/Datadog, no structured logging strategy, no alerting, no uptime
   checks. (Phase G.)
5. **CI/CD & environments:** no `.github/workflows`, no dev/staging/prod separation, no
   migration-with-backup automation. (Phase A initial CI; Phase F full.)
6. **Tooling not present:** no Prettier, Husky, lint-staged, Playwright; ESLint is flat-config
   v9 only. We add the rest in Phase A.

---

## 8. Lovable-Cloud-specific vs Supabase-native (Section 8.3 porting matrix)

The good news: the stack is overwhelmingly **Supabase-native and ports cleanly**. The
Lovable-Cloud-specific surface is small and well-contained.

| Item                                                                   | Classification                  | Action                                                                                                                        |
| ---------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `lovable-tagger` / `componentTagger()` in `vite.config.ts`             | **Lovable-specific** (dev-only) | Remove; replace with clean Vite config.                                                                                       |
| `.env` committed with live project URL + keys (`scswhhmwmbjdffplwnsf`) | **Lovable-specific / risk**     | **Do not propagate.** Replace with `.env.example`; move secrets to env/secret-manager. Scrub from any history we create here. |
| `src/integrations/supabase/client.ts` ("auto-generated, do not edit")  | **Portable**                    | Standard `createClient` on `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`. Keep; regenerate types via CLI, not Lovable.  |
| `types.ts` (generated by Lovable)                                      | **Portable**                    | Regenerate via `supabase gen types typescript` per seed; same shape.                                                          |
| Edge fn imports `https://esm.sh/@supabase/supabase-js@2[.45.0]`        | **Portable, needs hardening**   | Pin versions consistently; consider Deno import map.                                                                          |
| `requireAuth()` accepts service-role key as bearer                     | **Portable, hardening note**    | Works for scheduler→fn calls; document + constant-time compare.                                                               |
| CORS `*` on all functions                                              | **Portable, hardening note**    | Restrict allowed origins per environment (Phase D).                                                                           |
| `supabase_vault`, `pg_cron`, `pg_net`, `pgmq`                          | **Supabase-native**             | Enable explicitly per environment; no Lovable lock-in.                                                                        |
| Supabase Auth (Google SSO, HIBP, MFA/TOTP), Storage buckets, Realtime  | **Supabase-native**             | Ports directly.                                                                                                               |
| Lovable hosting / "Share → Publish" deploy                             | **Lovable-specific**            | Replace with Vercel + Supabase Cloud CI/CD (Phase F).                                                                         |

**Conclusion:** there is **no deep Lovable-Cloud coupling** in application logic. Migration risk
is concentrated in (a) secret hygiene, (b) re-creating the cron/vault/pgmq infra explicitly per
environment, and (c) building the test/observability/CI layers that Lovable never had — not in
rewriting business code.

---

## 9. Divergences from Lovable we expect to make (require documented justification)

Per seed §Working Model, each gets a sync-log entry or a short ADR:

1. **Resolve `services` vs `client_services` and `template_usage` vs `template_usages`** —
   carry only the live table; mark the other deprecated. (Needs source confirmation of which is
   referenced — flagged, not yet decided.)
2. **Encrypt per-tenant Forth credentials** in `company_processor_configs` (Lovable stores
   plaintext) before any multi-tenant credential is entered.
3. **Pin a single `supabase-js` version** across all edge functions (Lovable mixes `@2`/`@2.45.0`).
4. **Restrict CORS origins** (Lovable uses `*`).
5. **Zod on every edge-function input** (Lovable is inconsistent).

---

## 10. Open items needing source confirmation before Phase A code

- Exact live table among the duplicate pairs (§2, §9.1).
- Whether the Forth poller cron exists only in the Supabase dashboard vs in a migration
  (Forth audit §3 ambiguity).
- The 4 `net.http_post` targets and how the service-role key is sourced for cron.
- Whether any RLS policy uses `USING (true)` that survived the Phase 1 remediation.

These are tracked in `docs/open_questions.md` and the Phase A acceptance criteria.
