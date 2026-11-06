#!/usr/bin/env bash
# Build the API and the web app, apply the infrastructure, then publish the site.
# Needs: node 20+, terraform, aws CLI configured for YOUR account (AWS_PROFILE / env vars).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Building API (Lambda bundle)"
(cd backend && npm ci && npm test && npm run build)

echo "==> terraform apply"
terraform -chdir=infra/terraform init -input=false
terraform -chdir=infra/terraform apply -input=false "$@"

BUCKET=$(terraform -chdir=infra/terraform output -raw web_bucket)
DIST_ID=$(terraform -chdir=infra/terraform output -raw cloudfront_distribution_id)
SITE_URL=$(terraform -chdir=infra/terraform output -raw site_url)

echo "==> Building web app"
(cd web && npm ci && npm run build)

echo "==> Uploading site to s3://$BUCKET"
# config.json is owned by Terraform (it holds the API URL + Cognito ids), so never delete it.
# Hashed assets are immutable and cached for a year; index.html is always revalidated.
aws s3 sync web/dist "s3://$BUCKET" --delete --exclude "config.json" --exclude "index.html" \
  --cache-control "public,max-age=31536000,immutable"
aws s3 cp web/dist/index.html "s3://$BUCKET/index.html" \
  --cache-control "no-cache" --content-type "text/html; charset=utf-8"

echo "==> Invalidating CloudFront"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/index.html" "/" >/dev/null

echo
echo "Done. Open: $SITE_URL"
