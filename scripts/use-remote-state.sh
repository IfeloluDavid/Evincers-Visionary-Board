#!/usr/bin/env bash
# Point the main Terraform stack at the shared S3 state created by infra/bootstrap.
# Usage: scripts/use-remote-state.sh <state-bucket> <lock-table> <region>
set -euo pipefail
[[ $# -eq 3 ]] || { echo "usage: $0 <state-bucket> <lock-table> <region>" >&2; exit 1; }
cat > "$(dirname "$0")/../infra/terraform/backend.tf" <<TF
terraform {
  backend "s3" {
    bucket         = "$1"
    key            = "evincers-visionboard/terraform.tfstate"
    region         = "$3"
    dynamodb_table = "$2"
    encrypt        = true
  }
}
TF
echo "Wrote infra/terraform/backend.tf (git-ignored). Now run: terraform -chdir=infra/terraform init -migrate-state"
