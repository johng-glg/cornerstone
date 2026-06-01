variable "environment" {
  description = "Environment name (dev / staging / production). Used in resource names + tags."
  type        = string
}

variable "domain_name" {
  description = "Fully-qualified site domain for this environment (e.g. app.example.com, staging.example.com)."
  type        = string
}

variable "zone_name" {
  description = "The Route53 hosted-zone apex (e.g. example.com). The tenant wildcard is *.<zone_name>."
  type        = string
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone id that owns domain_name + the wildcard."
  type        = string
}

variable "site_bucket_prefix" {
  description = "Prefix for the static-site bucket; must match the F1 deploy-role scope (<prefix>-<env>-*)."
  type        = string
  default     = "cornerstone-site"
}

variable "bucket_suffix" {
  description = "Suffix to make the bucket name globally unique (e.g. account id or a short random). Final bucket: <prefix>-<env>-<suffix>."
  type        = string
}

variable "cloudfront_price_class" {
  description = "CloudFront price class. PriceClass_100 (NA+EU) is the cheapest; widen if global latency matters."
  type        = string
  default     = "PriceClass_100"
}
