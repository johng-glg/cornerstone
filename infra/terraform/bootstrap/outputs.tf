output "github_oidc_provider_arn" {
  description = "ARN of the GitHub Actions OIDC provider."
  value       = aws_iam_openid_connect_provider.github.arn
}

output "deploy_role_arns" {
  description = "Per-environment CI deploy role ARNs. Set each as the AWS_DEPLOY_ROLE_ARN secret in the matching GitHub Environment (F3)."
  value       = { for env, role in aws_iam_role.deploy : env => role.arn }
}

output "state_bucket" {
  description = "Terraform remote-state bucket name."
  value       = aws_s3_bucket.tfstate.bucket
}

output "state_lock_table" {
  description = "Terraform state-lock DynamoDB table name."
  value       = aws_dynamodb_table.tfstate_lock.name
}
