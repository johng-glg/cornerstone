variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "aws_account_id" {
  description = "Target AWS account id. Empty disables the account guard (CI validate). Set in dev.tfvars at apply."
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "dev site domain, e.g. dev.example.com."
  type        = string
  default     = "dev.example.com"
}

variable "zone_name" {
  description = "Route53 hosted-zone apex, e.g. example.com (tenant wildcard is *.<zone_name>)."
  type        = string
  default     = "example.com"
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone id. Placeholder default lets `validate` run with no real account; set in dev.tfvars at apply."
  type        = string
  default     = "Z0000000000000000000"
}

variable "bucket_suffix" {
  description = "Unique suffix for the site bucket (e.g. account id). Set in dev.tfvars at apply."
  type        = string
  default     = "changeme"
}
