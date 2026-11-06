locals {
  name = "${var.project_name}-${var.environment}"

  site_origin = "https://${aws_cloudfront_distribution.web.domain_name}"

  cors_origins = distinct(concat(
    [local.site_origin],
    var.custom_domain != "" ? ["https://${var.custom_domain}"] : [],
    var.extra_cors_origins,
  ))
}
