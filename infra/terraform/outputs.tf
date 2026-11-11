output "site_url" {
  description = "Where members open the app."
  value       = local.site_url
}

output "cloudfront_domain" {
  description = "Point your custom domain's CNAME/ALIAS record here (only if custom_domain is set)."
  value       = aws_cloudfront_distribution.web.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.web.id
}

output "web_bucket" {
  value = aws_s3_bucket.web.id
}

output "api_url" {
  value = aws_apigatewayv2_api.http.api_endpoint
}

output "user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "dynamodb_table" {
  value = aws_dynamodb_table.main.name
}

# Handy for local development: scripts/dev-config.sh writes this into web/public/config.json.
output "web_config" {
  value = jsondecode(local.web_config)
}

output "reminders" {
  description = "Whether reminder emails are deployed, and what to do next."
  value       = local.reminders_on ? "Enabled. Check ${var.reminder_from_email}'s inbox and click the AWS verification link, then request SES production access (README -> Email reminders)." : "Not deployed. Set reminder_from_email to turn on reminders."
}
