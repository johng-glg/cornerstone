# Cornerstone — Build Status & Outstanding Items

> Audit of what's built vs. the `lovable-source` reference and the dev roadmap (phase docs +
> `open_questions.md`). Date: 2026-06-02.

## Built (live via CI on `claude/vibrant-bardeen-nwrt8`)

Full left-sidebar app, all module list + detail pages, the 8-step Consumer Defense enrollment
(`convert_lead_to_client`), interactive create/edit across leads, clients, engagements, litigation
(hearings/activity/appearances/filing fees/docs), billing, creditors, eligibility (approve/decline),
signatures, templates (editor), integrations (toggles + test), feature flags, lead assignment rules,
litigation teams, court calendar, reports (charts), realtime notifications. Plus: GLG branding,
demo seed, frontend CI/CD (S3+CloudFront), edge-function deploy pipeline, code-split bundle, 61 tests.

## Outstanding vs. `lovable-source` (frontend)

| Item                                                                                                                                                                                                              | Notes                                                                                                                                                                 | Effort |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **Reconciliation dashboard** (`/reports/reconciliation`)                                                                                                                                                          | PLSA `reconciliation_findings` view. Not built.                                                                                                                       | Small  |
| **In-app developer/docs portal** (`/docs/*`, ~14 pages: ERD, Schema, Enums, Functions, Edge Functions, RLS Policies, Permissions, Role guide, Storage, Security, Future builds, Integration docs, Feature guides) | We shipped a `Documentation` stub instead. Internal reference UI — low end-user priority.                                                                             | Large  |
| **Services catalog** (`/services`)                                                                                                                                                                                | The 3-row program catalog (Debt Resolution / Consumer Defense / Hybrid). We built **Engagements** (`client_services`, the per-client table) but not the catalog page. | Small  |
| `template_usage` vs `template_usages` dedup (Q-A2)                                                                                                                                                                | Cosmetic schema dup; pick one, deprecate the other.                                                                                                                   | Small  |

> We also built things the reference handles differently or not at all: dedicated **Lead/Client/
> Engagement detail pages**, **Lead Rules**, **Notifications**, **Templates**, **Signatures**,
> **Transactions** pages, and the **enrollment→convert** server function.

## Outstanding — dev roadmap (Phase F + open questions)

| Item                                                                                             | Status                                                                 | Gate                                                   |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| **Edge functions deployed** (25) + vendor API keys live                                          | Pipeline + runbook ready; not deployed                                 | **You** (Supabase token + Forth/Dialpad/DocuSeal keys) |
| **Phase F4** — per-env `db-deploy.yml` (migrate + pre-migration backup) + formal function deploy | Not built (we have a scrappy single-env deploy)                        | After Q-F2                                             |
| **Phase F5** — rollback runbook (tested dry-run) + secrets inventory + `phase_F_summary.md`      | Not built                                                              | —                                                      |
| **Q-F1** — AWS account + apex domain per env (recommend separate `prod` account)                 | Open                                                                   | **PM decision**                                        |
| **Q-F2** — 3 Supabase Cloud projects (dev/staging/prod)                                          | Open (we run one scrappy staging)                                      | **PM/owner console step**                              |
| **Terraform infra apply** (F1/F2 landed in code: S3+CloudFront+Route53+ACM+OIDC, 3 envs)         | Validated, **not applied**                                             | Q-F1                                                   |
| **Subdomain DNS/CDN host mapping** (per-tenant)                                                  | Data layer ready (Phase E); host mapping deferred to F                 | Q-F1                                                   |
| **Staff invite** (create auth user)                                                              | Needs `provision-tenant` edge function deployed                        | Edge-function track                                    |
| **Q-A8** — restore edge-function type-checking in CI                                             | Open (deno/esm.sh resolution issue)                                    | —                                                      |
| **Q-A5** — compliance attestation (TSR/DFPI/bar)                                                 | Scaffolds ready; **named-reviewer sign-off** pending (Kimberly Uptain) | Non-engineering                                        |
| **100% test coverage** on auth / RLS / money / PII paths (seed quality bar)                      | 61 tests; not at target                                                | —                                                      |

## Deliberately deferred (by the Phase F plan)

Ephemeral per-PR previews · WAF/Shield/advanced edge security (Phase G/H) · multi-region/DR ·
silo-tier per-tenant infra.

## Honest summary

The **end-user application surface is essentially complete** (only the reconciliation dashboard,
services catalog, and the internal docs portal remain from `lovable-source`). The bulk of what's
left is **ops/infra** (formal 3-env Terraform apply + per-env DB deploy/backup/rollback) and
**integration go-live**, both gated on owner decisions + external credentials — plus non-engineering
**compliance attestation**.
