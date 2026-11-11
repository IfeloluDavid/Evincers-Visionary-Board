# Weekly check-in emails to every member. Everything here is skipped unless reminder_from_email is set.
#
#   EventBridge Scheduler --(cron)--> Lambda --> reads Cognito users + DynamoDB --> Amazon SES --> inbox
#
# Members can switch to monthly or off in the app (Settings); that choice is stored in DynamoDB.

locals {
  reminders_on = var.reminder_from_email != ""
}

data "aws_caller_identity" "current" {}

# AWS emails a verification link to this address; the sender is unusable until someone clicks it.
resource "aws_sesv2_email_identity" "sender" {
  count          = local.reminders_on && var.create_ses_identity ? 1 : 0
  email_identity = var.reminder_from_email
}

resource "aws_cloudwatch_log_group" "reminders" {
  count             = local.reminders_on ? 1 : 0
  name              = "/aws/lambda/${local.name}-reminders"
  retention_in_days = var.log_retention_days
}

resource "aws_iam_role" "reminders" {
  count              = local.reminders_on ? 1 : 0
  name               = "${local.name}-reminders"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "reminders_logs" {
  count      = local.reminders_on ? 1 : 0
  role       = aws_iam_role.reminders[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Read-only on the data, read-only on the user list, and permission to send mail. Nothing else.
data "aws_iam_policy_document" "reminders" {
  count = local.reminders_on ? 1 : 0

  statement {
    actions   = ["dynamodb:GetItem", "dynamodb:Query"]
    resources = [aws_dynamodb_table.main.arn]
  }
  statement {
    actions   = ["cognito-idp:ListUsers"]
    resources = [aws_cognito_user_pool.main.arn]
  }
  statement {
    actions   = ["ses:SendEmail"]
    resources = ["arn:aws:ses:${var.region}:${data.aws_caller_identity.current.account_id}:identity/*"]
  }
}

resource "aws_iam_role_policy" "reminders" {
  count  = local.reminders_on ? 1 : 0
  name   = "reminders"
  role   = aws_iam_role.reminders[0].id
  policy = data.aws_iam_policy_document.reminders[0].json
}

resource "aws_lambda_function" "reminders" {
  count         = local.reminders_on ? 1 : 0
  function_name = "${local.name}-reminders"
  role          = aws_iam_role.reminders[0].arn
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  handler       = "reminders.handler"
  memory_size   = 256
  timeout       = 300

  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256

  environment {
    variables = {
      TABLE_NAME   = aws_dynamodb_table.main.name
      USER_POOL_ID = aws_cognito_user_pool.main.id
      FROM_EMAIL   = var.reminder_from_email
      SITE_URL     = local.site_url
    }
  }

  depends_on = [aws_cloudwatch_log_group.reminders, aws_iam_role_policy_attachment.reminders_logs]
}

data "aws_iam_policy_document" "scheduler_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "scheduler" {
  count              = local.reminders_on ? 1 : 0
  name               = "${local.name}-scheduler"
  assume_role_policy = data.aws_iam_policy_document.scheduler_assume.json
}

resource "aws_iam_role_policy" "scheduler" {
  count = local.reminders_on ? 1 : 0
  name  = "invoke-reminders"
  role  = aws_iam_role.scheduler[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "lambda:InvokeFunction"
      Resource = aws_lambda_function.reminders[0].arn
    }]
  })
}

resource "aws_scheduler_schedule" "reminders" {
  count                        = local.reminders_on ? 1 : 0
  name                         = "${local.name}-reminders"
  schedule_expression          = var.reminder_schedule
  schedule_expression_timezone = var.reminder_timezone

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_lambda_function.reminders[0].arn
    role_arn = aws_iam_role.scheduler[0].arn

    # A retry could email people twice, so a failed run is not retried.
    retry_policy {
      maximum_retry_attempts = 0
    }
  }
}

# ------------------------------------------------------------ cost safety net

resource "aws_budgets_budget" "monthly" {
  count        = var.budget_email != "" ? 1 : 0
  name         = "${local.name}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.budget_email]
  }
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_email]
  }
}
