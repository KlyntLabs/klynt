#!/usr/bin/env bash
# Setup GitHub Secrets/Variables for Coolify branch-based deployments.
# Run from the repo root after authenticating `gh` and `coolify`.
#
# Required environment variables:
#   COOLIFY_TOKEN          Coolify API token
#
# Optional environment variables:
#   COOLIFY_FQDN           Coolify instance FQDN (default: https://app.coolify.io)
#   SLACK_WEBHOOK_URL      Slack webhook for deploy notifications
#   DEV_COOKIE_DOMAIN      Cookie domain for dev (default: .153.75.250.29.sslip.io)
#   STAGING_COOKIE_DOMAIN  Cookie domain for staging (default: .153.75.250.29.sslip.io)
#   PROD_COOKIE_DOMAIN     Cookie domain for production (default: empty)
#   PROD_DOMAIN_HINT       Production app domain hint (default: empty)
#
# Example:
#   COOLIFY_TOKEN=... ./scripts/setup-github-env.sh
set -euo pipefail

REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
echo "Configuring GitHub Secrets/Variables for: $REPO"
echo ""

if [[ -z "${COOLIFY_TOKEN:-}" ]]; then
  echo "ERROR: COOLIFY_TOKEN is required." >&2
  exit 1
fi

COOLIFY_FQDN=${COOLIFY_FQDN:-https://app.coolify.io}

# -----------------------------------------------------------------------------
# 1. Repository-level secrets/variables
# -----------------------------------------------------------------------------
echo "==> Creating GitHub Environments..."
for env in dev staging production; do
  gh api --method PUT "repos/$REPO/environments/$env" --silent
done

echo "==> Setting repository secrets..."
gh secret set COOLIFY_TOKEN --body "$COOLIFY_TOKEN"
gh secret set COOLIFY_FQDN --body "$COOLIFY_FQDN"
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
  gh secret set SLACK_WEBHOOK_URL --body "$SLACK_WEBHOOK_URL"
fi

echo "==> Setting repository variables..."
gh variable set COOLIFY_SERVER_UUID --body "toflj7qapme53gw5n67bm6un"
gh variable set COOLIFY_GITHUB_APP_UUID --body "p12avcp3j63qm1gdmknsep5w"

# -----------------------------------------------------------------------------
# 2. Environment-level secrets/variables
# -----------------------------------------------------------------------------
for env in dev staging production; do
  upper=$(echo "$env" | tr '[:lower:]' '[:upper:]')
  echo ""
  echo "==> Configuring environment: $env"

  backend_name="klynt-${env}-backend"
  frontend_name="klynt-${env}-frontend"

  backend_uuid=$(coolify app list --format json | BACKEND_NAME="$backend_name" python3 -c "
import json, sys, os
data = json.load(sys.stdin)
name = os.environ['BACKEND_NAME']
for app in data:
    if app.get('name') == name:
        print(app['uuid'])
        sys.exit(0)
print(f'Backend app not found: {name}', file=sys.stderr)
sys.exit(1)")

  frontend_uuid=$(coolify app list --format json | FRONTEND_NAME="$frontend_name" python3 -c "
import json, sys, os
data = json.load(sys.stdin)
name = os.environ['FRONTEND_NAME']
for app in data:
    if app.get('name') == name:
        print(app['uuid'])
        sys.exit(0)
print(f'Frontend app not found: {name}', file=sys.stderr)
sys.exit(1)")

  backend_fqdn=$(coolify app get "$backend_uuid" --format json | python3 -c "import json,sys; print(json.load(sys.stdin)['fqdn'])")
  frontend_fqdn=$(coolify app get "$frontend_uuid" --format json | python3 -c "import json,sys; print(json.load(sys.stdin)['fqdn'])")

  echo "   backend: $backend_uuid -> $backend_fqdn"
  echo "   frontend: $frontend_uuid -> $frontend_fqdn"

  # Variables (non-sensitive)
  gh variable set "${upper}_BACKEND_APP_UUID" --env "$env" --body "$backend_uuid"
  gh variable set "${upper}_FRONTEND_APP_UUID" --env "$env" --body "$frontend_uuid"
  gh variable set "${upper}_BACKEND_HEALTH_URL" --env "$env" --body "${backend_fqdn}/health/ready"
  gh variable set "${upper}_FRONTEND_URL" --env "$env" --body "$frontend_fqdn"

  # Environment-specific config defaults
  case "$env" in
    dev)
      default_cookie_domain=".153.75.250.29.sslip.io"
      default_vite_domain="153.75.250.29.sslip.io"
      default_vite_protocol="http"
      ;;
    staging)
      default_cookie_domain=".153.75.250.29.sslip.io"
      default_vite_domain="153.75.250.29.sslip.io"
      default_vite_protocol="http"
      ;;
    production)
      default_cookie_domain="${PROD_COOKIE_DOMAIN:-}"
      default_vite_domain="${PROD_DOMAIN_HINT:-}"
      default_vite_protocol="https"
      ;;
  esac

  cookie_domain_var="${upper}_COOKIE_DOMAIN"
  cookie_domain="${!cookie_domain_var:-$default_cookie_domain}"

  echo "   Using cookie domain: ${cookie_domain:-<empty>}"

  # Copy existing database connection secrets from Coolify
  echo "   Copying database credentials from Coolify..."
  coolify app env list "$backend_uuid" --format json --show-sensitive | TARGET_ENV="$env" python3 -c "
import json, sys, os, subprocess
env = os.environ['TARGET_ENV']
data = json.load(sys.stdin)
for item in data:
    key = item['key']
    value = item['value']
    if not isinstance(value, str) or not value:
        continue
    subprocess.run(
        ['gh', 'secret', 'set', key, '--env', env, '--body', value],
        check=True,
        capture_output=True,
        text=True,
    )
    print(f'     Set {key}')
" TARGET_ENV="$env"

  # Set derived/remaining secrets
  gh secret set KLYNT_COOKIE_DOMAIN --env "$env" --body "$cookie_domain"
  gh secret set KLYNT_COOKIE_SECURE --env "$env" --body "${cookie_secure:-true}"
  gh secret set KLYNT_BASE_URL --env "$env" --body "$frontend_fqdn"
  gh secret set KLYNT_API__ALLOWED_ORIGINS --env "$env" --body "[\"$frontend_fqdn\"]"
  gh secret set VITE_API_BASE_URL --env "$env" --body "${backend_fqdn}/api/v1"
  gh secret set VITE_APP_DOMAIN --env "$env" --body "${vite_domain:-$default_vite_domain}"
  gh secret set VITE_APP_PROTOCOL --env "$env" --body "${vite_protocol:-$default_vite_protocol}"
done

echo ""
echo "Done. GitHub Actions now has all required Secrets and Variables."
echo "Next steps:"
echo "  1. Review required reviewers in GitHub UI for staging/production environments."
echo "  2. If production domain is not set, update KLYNT_COOKIE_DOMAIN, VITE_APP_DOMAIN secrets."
