# Runbook — Deployment (AWS frontend + Supabase backend)

> **Phase F.** How Cornerstone deploys to `dev` / `staging` / `production`. Frontend = static
> build to S3 + CloudFront (AWS); backend = Supabase Cloud (managed). See
> `docs/phases/phase_F_execution_plan.md` for the architecture.

---

## Pipelines at a glance

| Trigger                      | Workflow                | Target              | Approval                                   |
| ---------------------------- | ----------------------- | ------------------- | ------------------------------------------ |
| Merge to `main`              | `deploy-staging.yml`    | staging frontend    | none (auto)                                |
| Push tag `v*`                | `deploy-production.yml` | production frontend | **required reviewer** (GitHub Environment) |
| (manual) `workflow_dispatch` | either                  | that env            | per the env's rules                        |
| Backend migrate              | `db-deploy.yml` (F4)    | per-env Supabase    | prod gated (post-backup)                   |

All AWS access is via **GitHub OIDC** → the per-env IAM role from F1
(`cornerstone-deploy-<env>`). There are **no long-lived AWS keys** in GitHub. Each deploy job is
`if: vars.AWS_DEPLOY_ROLE_ARN != ''`, so the workflows are **inert until the env is provisioned**
(Q-F1) and the GitHub Environment is configured.

---

## One-time setup per environment (after F2 `apply`)

Create a **GitHub Environment** (`dev` / `staging` / `production`) under repo Settings →
Environments, and set:

**Variables** (non-secret):

| Variable                     | Value (from `terraform output`)       |
| ---------------------------- | ------------------------------------- |
| `AWS_DEPLOY_ROLE_ARN`        | `deploy_role_arns[<env>]` (F1 output) |
| `AWS_REGION`                 | e.g. `us-east-1`                      |
| `SITE_BUCKET`                | `bucket_name` (F2 module output)      |
| `CLOUDFRONT_DISTRIBUTION_ID` | `distribution_id` (F2 output)         |
| `VITE_SUPABASE_URL`          | the env's Supabase project URL        |

**Secrets**:

| Secret                          | Value                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | the env's Supabase anon/publishable key (publishable, but kept as a secret to avoid log/diff exposure) |

**Protection rule (production only):** add **required reviewers** so a prod deploy pauses for
approval before any AWS action.

---

## Deploy flows

### Staging (automatic)

Merge to `main` → `deploy-staging.yml`:

1. `npm ci` + `npm run build` with staging's `VITE_*`.
2. Assume the staging OIDC role.
3. `aws s3 sync dist/` to the staging bucket — hashed assets cached `immutable`, `index.html`
   set `no-cache` so the new build is visible immediately.
4. CloudFront invalidation (`/*`).

### Production (tag + approval)

1. Cut a release tag: `git tag v1.4.0 && git push origin v1.4.0`.
2. `deploy-production.yml` starts and **waits on the `production` environment's required reviewer**.
3. On approval: same build → sync → invalidate, against prod, via the prod-scoped OIDC role
   (its trust is restricted to the `production` GitHub Environment).

> Backend changes (migrations / edge functions) deploy via `db-deploy.yml` (F4), with a
> pre-migration backup and a separate prod approval — they are **not** coupled to the frontend
> deploy.

---

## Verify a deploy

```bash
curl -I https://staging.<domain>        # 200, served by CloudFront
curl -I https://<tenant>.<domain>       # tenant subdomain resolves to the same dist (Phase E)
```

Then a smoke check: load the app, sign in, confirm the expected build (e.g. a visible version or
a known recent change).

---

## Rollback

See `docs/runbooks/rollback.md` (F5). In short: frontend rollback = re-deploy the previous tag
(or restore the prior S3 object version) + invalidate; backend rollback = restore from the
pre-migration backup.

---

## Notes / failure modes

| Symptom                        | Cause / action                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Deploy job skipped             | `AWS_DEPLOY_ROLE_ARN` not set in the env yet — expected pre-provisioning.                                     |
| `Could not assume role` (OIDC) | Role ARN wrong, or the OIDC trust subject doesn't match (prod role trusts only the `production` environment). |
| New build not visible          | Invalidation didn't run / `index.html` was cached — confirm the `no-cache` upload + invalidation steps.       |
| `AccessDenied` on S3           | Bucket name mismatch with the F1 role's `<prefix>-<env>-*` scope.                                             |
