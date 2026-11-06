#!/usr/bin/env bash
# Write web/public/config.json so `npm run dev` talks to a real deployed backend.
#   scripts/dev-config.sh          -> use the deployed AWS stack (needs a prior `terraform apply`)
#   scripts/dev-config.sh local    -> use the local mock API (`npm run dev:api` in backend/), no AWS needed
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "${1:-}" == "local" ]]; then
  cp web/public/config.example.json web/public/config.json
  echo "Wrote web/public/config.json (local dev mode). Run: (cd backend && npm run dev:api) and (cd web && npm run dev)"
else
  terraform -chdir=infra/terraform output -json web_config > web/public/config.json
  echo "Wrote web/public/config.json from Terraform outputs. Run: (cd web && npm run dev)"
fi
