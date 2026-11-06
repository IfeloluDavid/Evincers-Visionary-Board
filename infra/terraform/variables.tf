variable "region" {
  description = "AWS region for everything except CloudFront (which is global)."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefix used to name every resource."
  type        = string
  default     = "evincers-visionboard"
}

variable "environment" {
  description = "Environment name, e.g. dev or prod. Lets you run several copies in one account."
  type        = string
  default     = "prod"
}

variable "allow_self_signup" {
  description = "true = anyone with the URL can create an account. false = only an admin can create users in the Cognito console."
  type        = bool
  default     = true
}

variable "custom_domain" {
  description = "Optional custom domain for the site, e.g. vision.example.org. Leave empty to use the *.cloudfront.net URL."
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ARN of an ACM certificate for custom_domain. Must be issued in us-east-1 (a CloudFront requirement)."
  type        = string
  default     = ""
}

variable "extra_cors_origins" {
  description = "Extra browser origins allowed to call the API. The default allows the local Vite dev server."
  type        = list(string)
  default     = ["http://localhost:5173"]
}

variable "log_retention_days" {
  description = "How long Lambda and API Gateway logs are kept."
  type        = number
  default     = 30
}

variable "table_deletion_protection" {
  description = "Block deletion of the DynamoDB table. Set to true once real members' data lives there."
  type        = bool
  default     = false
}
