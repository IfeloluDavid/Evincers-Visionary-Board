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

variable "reminder_from_email" {
  description = "Sender address for reminder emails, e.g. visionboard@yourchurch.org. Leave empty to deploy without reminders. Amazon SES must verify it (see README)."
  type        = string
  default     = ""
}

variable "create_ses_identity" {
  description = "Create the SES identity for reminder_from_email (AWS emails it a verification link). Set false if you already verified it or its whole domain in SES."
  type        = bool
  default     = true
}

variable "reminder_schedule" {
  description = "When reminders go out (EventBridge cron). Default: every Monday 07:00."
  type        = string
  default     = "cron(0 7 ? * MON *)"
}

variable "reminder_timezone" {
  description = "IANA timezone the reminder_schedule is evaluated in, e.g. Africa/Lagos or Europe/London."
  type        = string
  default     = "UTC"
}

variable "budget_email" {
  description = "Optional: email an AWS Budgets alert here if your account's monthly spend is forecast to pass monthly_budget_usd."
  type        = string
  default     = ""
}

variable "monthly_budget_usd" {
  description = "Monthly spend (whole AWS account) that triggers the budget alert."
  type        = number
  default     = 10
}
