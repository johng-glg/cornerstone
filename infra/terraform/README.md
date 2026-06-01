# Infrastructure (Terraform) — Phase F

> AWS frontend infrastructure for Cornerstone, per `docs/phases/phase_F_execution_plan.md`.
> Backend is Supabase Cloud (managed) — not provisioned here.

## Layout

```
infra/terraform/
  bootstrap/   # F1: remote state (S3+DynamoDB) + GitHub OIDC provider + per-env CI deploy roles
  modules/     # F2: reusable frontend infra module (S3 + CloudFront + ACM + Route53)  [pending]
  envs/        # F2: dev / staging / production instantiations of the module           [pending]
```

This directory currently contains **F1 only** (the CI→AWS trust + remote-state backing store).
It provisions **no application infrastructure** — the static-site buckets, CloudFront
distributions, certs, and DNS land in `modules/` + `envs/` in F2.

## What F1 sets up

- **Remote state:** a versioned, encrypted, private S3 bucket + a DynamoDB lock table
  (`remote_state.tf`).
- **GitHub OIDC → IAM:** an OIDC identity provider + one **least-privilege deploy role per
  environment** (`cornerstone-deploy-{dev,staging,production}`). CI assumes these via OIDC — there
  are **no long-lived AWS keys** in GitHub. `production` is restricted to the `production` GitHub
  Environment; `dev`/`staging` trust any ref in the repo.
- The deploy roles can write their env's static-site S3 bucket (`cornerstone-site-<env>-*`) and
  create CloudFront invalidations — nothing else.

## CI

`.github/workflows/terraform.yml` runs `fmt` + `init -backend=false` + `validate` on every PR that
touches `infra/`. It runs `plan` **only** when the repo variable `AWS_BOOTSTRAP_ROLE_ARN` is set
(i.e. after the account exists). It **never** applies.

## First-time bootstrap (account owner, after Q-F1 is decided)

Requires a real AWS account (see Q-F1 in `docs/open_questions.md`). One-time:

```bash
cd infra/terraform/bootstrap

# 1. Create the state bucket + lock table with local state (backend block in main.tf still commented).
terraform init -backend=false
terraform apply -var "aws_account_id=<ACCOUNT_ID>"

# 2. Uncomment the backend "s3" block in main.tf, then migrate state:
terraform init -migrate-state

# 3. Capture the outputs:
terraform output deploy_role_arns        # → set AWS_DEPLOY_ROLE_ARN per GitHub Environment (F3)
terraform output github_oidc_provider_arn
```

Per-account/env values (`aws_account_id`, `github_org/repo`, bucket names) are variables — see
`variables.tf`. Nothing here is environment-specific until applied with those set.

## Not yet here (later F PRs)

- **F2:** `modules/frontend` (S3+CloudFront+ACM+Route53) + `envs/{dev,staging,production}`.
- **F3:** deploy pipelines (`deploy-staging.yml`, `deploy-production.yml`).
- **F4/F5:** Supabase per-env migrate + backup; rollback runbooks.
