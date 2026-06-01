variable "aws_region" {
  description = "AWS region for bootstrap resources (state bucket, lock table). CloudFront ACM certs must be us-east-1; keeping state here too keeps things simple."
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = "Target AWS account id. Empty disables the account guard (e.g. for CI validate/plan with no real account). Set per environment at apply time (Q-F1)."
  type        = string
  default     = ""
}

variable "github_org" {
  description = "GitHub organization/owner that hosts the repo (the OIDC subject)."
  type        = string
  default     = "johng-glg"
}

variable "github_repo" {
  description = "GitHub repository name. Combined with github_org to scope the OIDC trust to this repo only."
  type        = string
  default     = "cornerstone"
}

variable "state_bucket_name" {
  description = "S3 bucket for Terraform remote state."
  type        = string
  default     = "cornerstone-tfstate"
}

variable "state_lock_table_name" {
  description = "DynamoDB table for Terraform state locking."
  type        = string
  default     = "cornerstone-tfstate-lock"
}

variable "environments" {
  description = "Deployment environments that get a CI deploy role. Each maps to a Supabase project + AWS frontend (see docs/phases/phase_F_execution_plan.md)."
  type        = list(string)
  default     = ["dev", "staging", "production"]
}

variable "site_bucket_prefix" {
  description = "Prefix for the per-env static-site S3 buckets the deploy role may write to (actual buckets are created in the F2 module). The deploy role is scoped to <prefix>-<env>-*."
  type        = string
  default     = "cornerstone-site"
}
