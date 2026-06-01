output "bucket_name" {
  description = "Static-site S3 bucket name (the deploy pipeline syncs the build here)."
  value       = aws_s3_bucket.site.bucket
}

output "distribution_id" {
  description = "CloudFront distribution id (the deploy pipeline invalidates this after sync)."
  value       = aws_cloudfront_distribution.site.id
}

output "distribution_domain_name" {
  description = "CloudFront distribution domain (e.g. dxxxx.cloudfront.net) — the alias target."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "site_url" {
  description = "Primary site URL for this environment."
  value       = "https://${var.domain_name}"
}
