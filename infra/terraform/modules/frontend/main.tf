# Phase F2 — frontend infrastructure module.
#
# One static-site frontend per environment: a private S3 origin behind CloudFront (Origin Access
# Control), TLS via an ACM cert that includes a wildcard so per-tenant subdomains (Phase E) work
# without per-tenant infra, security response headers, and SPA error mapping (403/404 → index.html
# so client-side routing + tenant subdomain resolution work). Route53 A/AAAA alias records for the
# env apex + the `*.<domain>` wildcard.
#
# This module declares two providers: the default (regional, for S3/Route53 data) and an aliased
# `aws.us_east_1` (CloudFront requires its ACM cert in us-east-1). The caller passes both.

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = ">= 5.40.0"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

locals {
  # Site domain for this env, e.g. "app.example.com" (prod) or "staging.example.com".
  site_domain = var.domain_name
  # Tenant wildcard, e.g. "*.example.com" — every tenant subdomain resolves to this same dist.
  wildcard_domain = "*.${var.zone_name}"
  # Bucket name must match the F1 deploy-role scope: <site_bucket_prefix>-<env>-<suffix>.
  bucket_name = "${var.site_bucket_prefix}-${var.environment}-${var.bucket_suffix}"
}

# ---------------------------------------------------------------------------
# Origin: private S3 bucket (no public access; CloudFront reaches it via OAC)
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "site" {
  bucket = local.bucket_name
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "site" {
  bucket = aws_s3_bucket.site.id
  versioning_configuration {
    status = "Enabled" # keeps prior builds for fast frontend rollback (F5)
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ---------------------------------------------------------------------------
# TLS: ACM cert in us-east-1 (required by CloudFront), DNS-validated, covering
# the env apex + the tenant wildcard.
# ---------------------------------------------------------------------------
resource "aws_acm_certificate" "site" {
  provider                  = aws.us_east_1
  domain_name               = local.site_domain
  subject_alternative_names = [local.wildcard_domain]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.site.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id         = var.hosted_zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "site" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# ---------------------------------------------------------------------------
# CloudFront: OAC to the private bucket, SPA error mapping, security headers.
# ---------------------------------------------------------------------------
resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${local.bucket_name}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Security response headers (HSTS, no-sniff, framing, referrer). Applied to all responses.
resource "aws_cloudfront_response_headers_policy" "security" {
  name = "${local.bucket_name}-security-headers"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 63072000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "cornerstone ${var.environment}"
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class
  aliases             = [local.site_domain, local.wildcard_domain]

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-${local.bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id           = "s3-${local.bucket_name}"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
    # AWS managed "CachingOptimized" policy.
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # SPA: client-side routing + tenant subdomains mean unknown paths must serve index.html (200),
  # not S3's 403/404. CloudFront rewrites both to the app entry point.
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Environment = var.environment
  }
}

# Bucket policy: only this CloudFront distribution (via OAC) may read the bucket.
data "aws_iam_policy_document" "site_bucket" {
  statement {
    sid       = "AllowCloudFrontOAC"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.site_bucket.json
}

# ---------------------------------------------------------------------------
# DNS: apex + wildcard alias records → the distribution.
# ---------------------------------------------------------------------------
resource "aws_route53_record" "apex" {
  for_each = toset(["A", "AAAA"])
  zone_id  = var.hosted_zone_id
  name     = local.site_domain
  type     = each.value

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "wildcard" {
  for_each = toset(["A", "AAAA"])
  zone_id  = var.hosted_zone_id
  name     = local.wildcard_domain
  type     = each.value

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
