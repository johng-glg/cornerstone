# Phase F1 — Terraform bootstrap: remote state + GitHub OIDC + per-env deploy roles.
#
# This root stands up the *CI→AWS trust* and documents the remote-state backend. It provisions
# no application infrastructure (S3 site buckets / CloudFront / Route53 live in the F2 module).
# It is safe to `validate`/`plan` without a real AWS account; `apply` is a one-time bootstrap the
# account owner runs after creating the account (see Q-F1).

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40.0"
    }
  }

  # Remote state in S3 with a DynamoDB lock table. These resources must exist before
  # `terraform init` can use them — they are created out-of-band (see remote_state.tf, which
  # defines them so they are codified) on first bootstrap, then this backend block is enabled.
  #
  # Left commented until the state bucket + lock table exist (chicken-and-egg on first apply):
  #   1. apply once with local state to create the bucket + table (remote_state.tf),
  #   2. uncomment this block + `terraform init -migrate-state`.
  #
  # backend "s3" {
  #   bucket         = "cornerstone-tfstate"
  #   key            = "bootstrap/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "cornerstone-tfstate-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  # Guard: only operate against the intended account, so a misconfigured credential can't
  # accidentally apply here.
  allowed_account_ids = var.aws_account_id == "" ? null : [var.aws_account_id]

  default_tags {
    tags = {
      Project   = "cornerstone"
      ManagedBy = "terraform"
      Component = "bootstrap"
    }
  }
}
