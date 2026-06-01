# Phase F2 — dev environment frontend.
# Thin composition: providers (default region + us-east-1 for CloudFront ACM) + the frontend
# module. Real values (account id, domain, zone, bucket suffix) come from dev.tfvars at apply
# time (Q-F1); none are committed.

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40.0"
    }
  }

  # Remote state — enable after the F1 bootstrap state bucket exists.
  # backend "s3" {
  #   bucket         = "cornerstone-tfstate"
  #   key            = "envs/dev/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "cornerstone-tfstate-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region              = var.aws_region
  allowed_account_ids = var.aws_account_id == "" ? null : [var.aws_account_id]
  default_tags {
    tags = {
      Project     = "cornerstone"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

# CloudFront ACM certs must live in us-east-1.
provider "aws" {
  alias               = "us_east_1"
  region              = "us-east-1"
  allowed_account_ids = var.aws_account_id == "" ? null : [var.aws_account_id]
  default_tags {
    tags = {
      Project     = "cornerstone"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

module "frontend" {
  source = "../../modules/frontend"
  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  environment    = "dev"
  domain_name    = var.domain_name
  zone_name      = var.zone_name
  hosted_zone_id = var.hosted_zone_id
  bucket_suffix  = var.bucket_suffix
}

output "site_url" {
  value = module.frontend.site_url
}
output "bucket_name" {
  value = module.frontend.bucket_name
}
output "distribution_id" {
  value = module.frontend.distribution_id
}
