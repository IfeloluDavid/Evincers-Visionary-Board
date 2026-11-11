# One-time setup, run by you with your own AWS credentials. Creates what GitHub Actions needs to deploy:
#   * an S3 bucket + DynamoDB lock table for Terraform state (so CI and you share one state)
#   * GitHub's OIDC identity provider (skipped if your account already has it)
#   * an IAM role that ONLY this repo's main branch can assume (short-lived credentials, no stored keys)

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
  }
}

provider "aws" {
  region = var.region
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "github_repo" {
  description = "owner/name exactly as GitHub shows it."
  type        = string
  default     = "IfeloluDavid/Evincers-Visionary-Board"
}

variable "github_owner_id" {
  description = "Numeric GitHub id of the repo owner. GitHub now puts ids in the OIDC subject (repo:OWNER@ID/NAME@ID:...). Find it in the 'sub' claim of a failed run or at https://api.github.com/users/<owner>."
  type        = string
  default     = "48281015"
}

variable "github_repo_id" {
  description = "Numeric GitHub id of the repository (https://api.github.com/repos/<owner>/<name> -> id). Leave empty to trust only the classic name-based subject."
  type        = string
  default     = "1447210248"
}

variable "branch" {
  description = "Only pushes to this branch may deploy."
  type        = string
  default     = "main"
}

variable "create_oidc_provider" {
  description = "Set false if your AWS account already has the token.actions.githubusercontent.com OIDC provider."
  type        = bool
  default     = true
}

data "aws_caller_identity" "current" {}

locals {
  repo_owner = split("/", var.github_repo)[0]
  repo_name  = split("/", var.github_repo)[1]

  # GitHub issues OIDC subjects in the id-based form for this repo; the classic name-based form is kept as a fallback.
  allowed_subjects = compact([
    "repo:${var.github_repo}:ref:refs/heads/${var.branch}",
    var.github_repo_id != "" ? "repo:${local.repo_owner}@${var.github_owner_id}/${local.repo_name}@${var.github_repo_id}:ref:refs/heads/${var.branch}" : "",
  ])
}

# ---------------------------------------------------------------- Terraform state

resource "aws_s3_bucket" "state" {
  bucket = "evincers-visionboard-tfstate-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "lock" {
  name         = "evincers-visionboard-tflock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}

# ---------------------------------------------------------------- GitHub OIDC

resource "aws_iam_openid_connect_provider" "github" {
  count           = var.create_oidc_provider ? 1 : 0
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 0 : 1
  url   = "https://token.actions.githubusercontent.com"
}

locals {
  oidc_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn
}

data "aws_iam_policy_document" "trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    # Exactly this repo and branch (case-insensitive, as GitHub repo names are).
    condition {
      test     = "StringEqualsIgnoreCase"
      variable = "token.actions.githubusercontent.com:sub"
      values   = local.allowed_subjects
    }
  }
}

resource "aws_iam_role" "deploy" {
  name                 = "evincers-visionboard-github-deploy"
  assume_role_policy   = data.aws_iam_policy_document.trust.json
  max_session_duration = 3600
}

# Terraform creates IAM roles, Lambda, API Gateway, Cognito, DynamoDB, S3 and CloudFront, so the deploy role needs
# broad rights. It is still locked to this repo + branch. Once things are stable you can replace this with a
# custom policy limited to those services.
resource "aws_iam_role_policy_attachment" "deploy_admin" {
  role       = aws_iam_role.deploy.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

output "tf_state_bucket" {
  value = aws_s3_bucket.state.id
}
output "tf_lock_table" {
  value = aws_dynamodb_table.lock.name
}
output "deploy_role_arn" {
  value = aws_iam_role.deploy.arn
}
output "region" {
  value = var.region
}
