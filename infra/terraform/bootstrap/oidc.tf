# GitHub Actions OIDC → IAM. CI assumes a short-lived role via OIDC; there are NO long-lived AWS
# keys in GitHub. One deploy role per environment, each trusting only this repo and (for
# production) only the production GitHub Environment.

# The GitHub OIDC identity provider. thumbprint_list is GitHub's well-known root CA thumbprint;
# AWS now validates the cert chain natively, but the field is still required.
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

locals {
  github_repo_path = "${var.github_org}/${var.github_repo}"

  # Per-env trust subject. dev/staging trust any ref in the repo; production is restricted to the
  # `production` GitHub Environment so only an approved prod deploy can assume the prod role.
  env_oidc_subjects = {
    for env in var.environments : env => (
      env == "production"
      ? "repo:${local.github_repo_path}:environment:production"
      : "repo:${local.github_repo_path}:*"
    )
  }
}

data "aws_iam_policy_document" "github_assume" {
  for_each = toset(var.environments)

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [local.env_oidc_subjects[each.key]]
    }
  }
}

resource "aws_iam_role" "deploy" {
  for_each = toset(var.environments)

  name                 = "cornerstone-deploy-${each.key}"
  assume_role_policy   = data.aws_iam_policy_document.github_assume[each.key].json
  max_session_duration = 3600

  tags = {
    Environment = each.key
  }
}

# Least-privilege deploy policy: write the env's static-site S3 bucket(s) and invalidate
# CloudFront. The site buckets themselves are created in the F2 module; the role is scoped by
# name prefix (<site_bucket_prefix>-<env>-*) so it cannot touch other buckets or the state bucket.
data "aws_iam_policy_document" "deploy" {
  for_each = toset(var.environments)

  statement {
    sid    = "SiteBucketObjects"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:GetObject",
    ]
    resources = ["arn:aws:s3:::${var.site_bucket_prefix}-${each.key}-*/*"]
  }

  statement {
    sid    = "SiteBucketList"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
    ]
    resources = ["arn:aws:s3:::${var.site_bucket_prefix}-${each.key}-*"]
  }

  statement {
    sid    = "CloudFrontInvalidate"
    effect = "Allow"
    actions = [
      "cloudfront:CreateInvalidation",
      "cloudfront:GetInvalidation",
      "cloudfront:ListDistributions",
    ]
    # CloudFront invalidation does not support resource-level scoping by distribution for
    # CreateInvalidation in all cases; restrict to the account's distributions via "*" with the
    # action set kept minimal. (Tightened to specific distribution ARNs in F2 once they exist.)
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "deploy" {
  for_each = toset(var.environments)

  name   = "cornerstone-deploy-${each.key}"
  role   = aws_iam_role.deploy[each.key].id
  policy = data.aws_iam_policy_document.deploy[each.key].json
}
