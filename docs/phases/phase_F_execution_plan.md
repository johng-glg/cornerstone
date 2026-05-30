# Phase F — Deployment Automation (AWS) — Execution Plan

> **Scoping deliverable.** The plan for Phase F: reliable, automated deployment to dev / staging /
> production on **AWS** (frontend) + **Supabase Cloud** (backend), with subdomain routing for the
> Phase E tenant layer. This document is the plan; it stands up no infrastructure itself.
>
> **Date:** 2026-05-29 · **Status:** Planned, pending execution. **Decisions locked:** AWS
> (Q-A6b), Terraform (IaC), local+staging previews (no ephemeral per-PR cloud previews).

---

## 1. Goal & exit criteria (from the seed §Phase F)

**Goal:** reliable, automated deployment to `dev` / `staging` / `production`.

**Exit criteria:**

- Three environments live (each its own Supabase project + AWS frontend deployment).
- Auto-deploy to `staging` on merge to `main` is reliable.
- Production deploys gated by manual approval.
- DB migrations applied per environment **with pre-migration backup**.
- Rollback procedure documented and tested via dry run.
- Secrets per environment, never in the repo.
- Production ready to receive the Phase 8 new-processor adapter.

## 2. Locked decisions

| Decision              | Choice                                                            | Rationale                                                                                           |
| --------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Frontend host (Q-A6b) | **AWS** — S3 (origin) + CloudFront (CDN)                          | Static React/Vite build; per the Q-A6 "hyperscaler static hosting, not Vercel" decision.            |
| Backend               | **Supabase Cloud** (managed), one project per env                 | Q-A6: backend ops stay managed; only the FE host is ours to run.                                    |
| IaC                   | **Terraform**                                                     | Cloud-agnostic, ecosystem, remote state in S3 + DynamoDB lock.                                      |
| CI→AWS auth           | **GitHub OIDC → IAM role** (no long-lived keys)                   | No static AWS creds in GitHub; short-lived STS per run.                                             |
| Preview envs          | **Local + staging only** (no ephemeral per-PR cloud)              | Cheapest/simplest; reviewers use the Phase B local stack; merge→staging. Revisit if demand appears. |
| TLS                   | **ACM certs** (us-east-1 for CloudFront) incl. `*.<env>` wildcard | Enables per-tenant subdomains without per-tenant cert churn.                                        |

## 3. Architecture

```
                    ┌─────────────── AWS (per environment) ───────────────┐
  Browser ──HTTPS──▶│  CloudFront (CDN, TLS via ACM, SPA rewrite to /)     │
   *.app host       │      │ origin                                        │
                    │      ▼                                               │
                    │  S3 bucket (private, OAC) ── built React/Vite assets │
                    └──────────────────────────────────────────────────────┘
                               │ Route53: <env> apex + *.<env> wildcard
                               ▼
  Browser ──HTTPS──▶ Supabase Cloud project (per env): Postgres + Auth + Storage + Edge fns
```

- **Frontend:** `npm run build` → static assets → S3 (private, CloudFront **Origin Access
  Control**) → CloudFront. SPA: 403/404 → `/index.html` (200) so client-side routing + tenant
  subdomains resolve.
- **Subdomain routing (Phase E hand-off):** a wildcard `*.<env-domain>` Route53 record + ACM
  wildcard cert point every tenant subdomain at the same CloudFront distribution. The SPA reads
  `window.location.host`, extracts the label, and resolves the tenant via
  `public.resolve_tenant_by_subdomain()` (shipped in Phase E). **No per-tenant infra** — adding a
  tenant stays a pure data operation (the Phase E runbook), which preserves the <15-min onboarding.
- **Backend:** three independent Supabase Cloud projects (`dev`/`staging`/`prod`). Migrations +
  edge functions deployed via the Supabase CLI. Backend remains managed (no AWS compute for it).

## 4. Environment matrix

|                  | dev                | staging                      | production                              |
| ---------------- | ------------------ | ---------------------------- | --------------------------------------- |
| Supabase project | `cornerstone-dev`  | `cornerstone-staging`        | `cornerstone-prod`                      |
| AWS frontend     | `dev.<domain>`     | `staging.<domain>`           | `app.<domain>` (+ `*.<domain>` tenants) |
| Deploy trigger   | manual / on-demand | **auto on merge to `main`**  | **tag release → manual approval**       |
| Migrations       | auto on deploy     | auto on deploy (post-backup) | manual-approval gate (post-backup)      |
| Data             | synthetic seed     | synthetic seed               | real (no seed)                          |

## 5. Work breakdown (proposed PRs)

| PR     | Title                             | Scope                                                                                                                                                                                                                                                                                                               | Acceptance                                                                                                                                            |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F1** | Terraform skeleton + remote state | `infra/terraform/` layout; S3+DynamoDB backend; AWS provider; GitHub OIDC provider + per-env deploy IAM role (least privilege: S3 put, CloudFront create-invalidation). `terraform validate` + `plan` in CI (no apply).                                                                                             | `terraform validate` green in CI; plan reviewed; zero static AWS keys.                                                                                |
| **F2** | Frontend infra module (per env)   | Reusable module: private S3 bucket, CloudFront dist (OAC, SPA error mapping, security headers), ACM cert (us-east-1) incl. `*.<domain>` wildcard, Route53 records (apex + wildcard). Instantiated for dev/staging/prod.                                                                                             | `terraform plan` clean per env; manual `apply` of `dev` succeeds; `dev.<domain>` serves the SPA over TLS; a test subdomain resolves to the same dist. |
| **F3** | Frontend deploy pipeline          | `deploy-staging.yml` (on merge to `main`): build → sync to S3 → CloudFront invalidation, via OIDC role. `deploy-production.yml` (on `v*` tag): same, **gated by a GitHub Environment manual approval**. Per-env `VITE_*` build args from GitHub Environment secrets.                                                | Merge to `main` auto-deploys staging; tag→approval deploys prod; no secrets in logs.                                                                  |
| **F4** | Supabase per-env migrate + backup | `db-deploy.yml`: `supabase db push` per env via the CLI, **preceded by a pre-migration backup** (Supabase scheduled backup confirmation / `pg_dump` snapshot to a private S3 bucket). Prod gated by manual approval. Edge-function deploy (`supabase functions deploy`) for all 25 functions.                       | Staging migrate runs post-backup on merge; prod requires approval; functions deploy; rollback (restore-from-backup) dry-run documented + tested.      |
| **F5** | Rollback + runbooks + secrets     | `docs/runbooks/deploy.md` (deploy, promote, rollback) + `docs/runbooks/rollback.md` (frontend = re-point to previous S3 version/prefix or redeploy prior tag; backend = restore from pre-migration backup) with a **tested dry run**. Per-env secret inventory in `docs/runbooks/secrets.md`. `phase_F_summary.md`. | Rollback dry-run executed + evidenced; secret inventory complete; three envs live; exit criteria met.                                                 |

## 6. Secrets & config (per environment, never in repo)

- **GitHub Environment secrets** (`dev`/`staging`/`production`): `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY` (build-time, publishable only), `SUPABASE_PROJECT_REF`,
  `SUPABASE_ACCESS_TOKEN`/`SUPABASE_DB_PASSWORD` (CLI deploy), AWS via **OIDC role ARN** (no keys).
- **Supabase function secrets** (set per project, not in GitHub): `SUPABASE_SERVICE_ROLE_KEY`,
  `FORTH_*`, `DOCUSEAL_*`, `DIALPAD_*`, `CORS_ALLOWED_ORIGINS` (per-env allowlist — ties into the
  Q-A4 CORS gate), `pii_encryption_key` (Vault).
- The `check:secrets` gate continues to block anything that slips into the tree.

## 7. CI/CD shape (additions to the existing `ci.yml`)

The current `ci.yml` (verify / e2e / db-verify / edge-fn-test) stays the **gate**. Phase F adds
**deploy** workflows that run only after merge/tag, never blocking PRs:

- `deploy-staging.yml` — trigger `push: main`; needs CI green; OIDC → build → S3 sync → CF
  invalidate → `supabase db push` (post-backup) → `supabase functions deploy`.
- `deploy-production.yml` — trigger `push: tags: v*`; GitHub Environment `production` requires a
  reviewer approval before any step; same steps against prod.
- `terraform.yml` — `validate` + `plan` on PRs touching `infra/`; `apply` is manual (workflow
  dispatch) with approval.

## 8. Dependencies, risks, open items

- **AWS account + domain (Q-F1, new):** which AWS account(s) and what apex domain per env? Needed
  before F2 apply. _One account with env separation by stack, or separate accounts per env?_ —
  recommend separate `prod` account; **PM input needed.**
- **Supabase projects (Q-F2, new):** three Cloud projects must be created (org/billing) — a
  console step the PM/owner does; F4 consumes their refs.
- **Migration parity:** the squashed-baseline migrations (ADR-001) + `supabase db push` must apply
  cleanly on a fresh Cloud project — already verified locally; F4 confirms on real Supabase.
- **`db.seed` in production:** `config.toml` has `[db.seed] enabled = true`. **Prod must not seed.**
  F4 disables seed for prod (CLI flag / per-env config) — explicit acceptance check.
- **B-A1 unaffected:** Phase F runs in CI/cloud, not the sandbox; no local container dependency.
- **Cutover readiness:** prod must be live + exercised before the Phase 8 sandbox (2026-08-19) and
  the 2026-10-14 cutover. F is on the critical path; suggest executing right after Phase G or in
  parallel.

## 9. What this plan deliberately defers

- **Ephemeral per-PR previews** — decided out for now; can be added as an F-follow if reviewers want them.
- **WAF / Shield / advanced edge security** — Phase G/H hardening, not core deploy.
- **Multi-region / DR** — single region to start; DR posture is a later concern.
- **Silo-tier per-tenant infra** — the Phase E routing layer allows it; not in F's shared-pool scope.

---

**Next step:** resolve Q-F1 (AWS account/domain layout) and Q-F2 (create the three Supabase Cloud
projects), then execute F1→F5. F1 (Terraform skeleton + OIDC, CI `validate`/`plan` only) is safe to
start before the account details are final, since it stands up no real resources.
