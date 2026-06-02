# Runbook — Deploy & Rollback (GLG staging)

How the live app ships and how to roll back. This documents the **hand-provisioned GLG staging
environment** (single Supabase project + S3/CloudFront). The Terraform 3-env path
(`deploy-staging.yml` / `deploy-production.yml`) is separate and activates once Q-F1/Q-F2 land.

## The three deploy pipelines (all on `claude/vibrant-bardeen-nwrt8`)

| What                    | Workflow                    | Trigger                                    | Gate                                                                          |
| ----------------------- | --------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------- |
| **Frontend**            | `deploy-glg-staging.yml`    | push (auto)                                | `AWS_ACCESS_KEY_ID` secret + `CLOUDFRONT_DISTRIBUTION_ID` var                 |
| **Edge functions**      | `deploy-edge-functions.yml` | push to `supabase/functions/**`, or manual | `SUPABASE_PROJECT_REF` var + `SUPABASE_ACCESS_TOKEN` secret                   |
| **Database migrations** | `deploy-database.yml`       | manual (`workflow_dispatch`)               | `SUPABASE_PROJECT_REF` var + `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` |

Frontend deploys are automatic and live today. Edge-function + DB deploys are inert until you add
the Supabase token (see `edge-functions-deploy.md`).

## Secrets & variables inventory

**GitHub → Settings → Secrets and variables → Actions**

| Name                                          | Kind     | Used by         | Value                                 |
| --------------------------------------------- | -------- | --------------- | ------------------------------------- |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Secret   | frontend deploy | IAM `cornerstone-deployer` access key |
| `CLOUDFRONT_DISTRIBUTION_ID`                  | Variable | frontend deploy | `E…` from CloudFront                  |
| `SUPABASE_PROJECT_REF`                        | Variable | fn + db deploy  | `ppefwolueksddgabvseh`                |
| `SUPABASE_ACCESS_TOKEN`                       | Secret   | fn + db deploy  | supabase.com/dashboard/account/tokens |
| `SUPABASE_DB_PASSWORD`                        | Secret   | db deploy       | the DB password from project creation |

**Supabase function secrets** (Project Settings → Edge Functions → Secrets) — vendor keys only;
see `edge-functions-deploy.md`. Never commit any of these (the `check:secrets` CI gate enforces it).

## Rollback

### Frontend (fastest — re-deploy a known-good commit)

1. Find the last-good commit SHA (git log / a green Actions run).
2. Either revert the bad commit (`git revert <sha>` → push, which auto-deploys), **or**
3. Actions → **Deploy — GLG staging** → **Run workflow** from the good ref.
4. CloudFront is invalidated by the workflow; hard-refresh to confirm.

(S3 keeps prior hashed asset chunks, so an old `index.html` re-point also works in a pinch.)

### Database

Migrations are forward-only with inline rollback SQL in each file. To undo the latest:

1. Open the migration in `supabase/migrations/` and run its `-- Rollback:` block in the SQL editor.
2. For data loss, restore from a Supabase backup (Dashboard → Database → Backups → restore), then
   re-apply migrations up to the desired point.
   **Take a manual backup before any destructive migration.**

### Edge functions

`supabase functions deploy <name>` from a prior commit, or `supabase functions delete <name>`.

## Pre-deploy checklist (what CI already enforces)

`npm run build` (typecheck + bundle), `npm test` (Vitest), ESLint, `check:zod`, `check:secrets`.
A red CI run blocks nothing automatically on this branch yet — review the Actions tab before
relying on a deploy.
