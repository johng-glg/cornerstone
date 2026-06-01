# Infrastructure (Terraform) — Phase F

> AWS frontend infrastructure for Cornerstone, per `docs/phases/phase_F_execution_plan.md`.
> Backend is Supabase Cloud (managed) — not provisioned here.

## Layout

```
infra/terraform/
  bootstrap/         # F1: remote state (S3+DynamoDB) + GitHub OIDC provider + per-env CI deploy roles
  modules/frontend/  # F2: reusable frontend module (private S3 + CloudFront/OAC + ACM + Route53)
  envs/{dev,staging,production}/  # F2: per-env instantiations of the frontend module
```

Contains **F1 + F2**. F1 is the CI→AWS trust + remote-state store. F2 is the frontend
infrastructure (static-site bucket, CloudFront, TLS, DNS) as a reusable module instantiated per
environment. **Still provisions nothing until `terraform apply`** is run against a real account
(Q-F1) — everything here `validate`s with placeholder variables.

### F2 — frontend module (`modules/frontend`)

Per environment: a **private S3 bucket** (versioned for rollback, encrypted, no public access),
a **CloudFront distribution** reaching it via **Origin Access Control**, an **ACM cert**
(us-east-1) covering the env apex **and the `*.<zone>` wildcard** so Phase E tenant subdomains
resolve with no per-tenant infra, **security response headers** (HSTS/no-sniff/DENY/referrer),
**SPA error mapping** (403/404 → `/index.html` 200), and **Route53 alias records** (apex +
wildcard). The bucket policy admits only this distribution. Outputs `bucket_name` +
`distribution_id` for the F3 deploy pipeline.

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
