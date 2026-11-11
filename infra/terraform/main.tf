locals {
  name = "${var.project_name}-${var.environment}"

  site_origin = "https://${aws_cloudfront_distribution.web.domain_name}"

  site_url = var.custom_domain != "" ? "https://${var.custom_domain}" : local.site_origin

  cors_origins = distinct(concat(
    [local.site_origin],
    var.custom_domain != "" ? ["https://${var.custom_domain}"] : [],
    var.extra_cors_origins,
  ))
}
