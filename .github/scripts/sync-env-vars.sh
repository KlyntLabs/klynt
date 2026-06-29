#!/usr/bin/env bash
set -euo pipefail

app_uuid="$1"
component="$2"

backend_vars=(
  DATABASE_URL
  REDIS_URL
  KLYNT_DATABASE_URL
  KLYNT_REDIS_URL
  KLYNT_API__HOST
  KLYNT_API__PORT
  KLYNT_API__ALLOWED_ORIGINS
  KLYNT_API__TRUSTED_PROXIES
  KLYNT_COOKIE_DOMAIN
  KLYNT_COOKIE_SECURE
  KLYNT_COOKIE_SAMESITE
  KLYNT_HSTS_ENABLED
  KLYNT_CSP_REPORT_ONLY
  KLYNT_CSP_DIRECTIVE
  KLYNT_BASE_URL
  KLYNT_LOG_BODIES
  KLYNT_LOG_SUCCESS
  KLYNT_MAX_BODY_SIZE
  KLYNT_RATE_LIMITER__ENABLED
  KLYNT_RATE_LIMITER__MAX_REQUESTS
  KLYNT_RATE_LIMITER__WINDOW_SECONDS
  KLYNT_SESSION__SESSION_DURATION_SECS
  KLYNT_SESSION__LONG_SESSION_DURATION_SECS
  KLYNT_SESSION__REFRESH_DURATION_SECS
  KLYNT_SESSION_SYNC_ENABLED
  RUST_LOG
  SQLX_OFFLINE
)

frontend_vars=(
  VITE_API_BASE_URL
  VITE_APP_NAME
  VITE_APP_DOMAIN
  VITE_APP_PROTOCOL
)

vars=()
if [[ "$component" == "backend" ]]; then
  vars+=("${backend_vars[@]}")
elif [[ "$component" == "frontend" ]]; then
  vars+=("${frontend_vars[@]}")
else
  echo "Unknown component: $component"
  exit 1
fi

# Get current env keys so we can decide between create and update.
current_keys=$(coolify app env list "$app_uuid" --format json 2>/dev/null | jq -r '.[].key' || true)

for var in "${vars[@]}"; do
  value="${!var:-}"
  if [[ -z "$value" ]]; then
    echo "Skipping empty $var"
    continue
  fi

  extra_args=()
  # Some values may contain newlines (e.g., PEM-style strings); mark them multiline.
  if [[ "$value" == *$'\n'* ]]; then
    extra_args+=(--is-multiline)
  fi

  if echo "$current_keys" | grep -qx "$var"; then
    echo "Updating $var"
    coolify app env update "$app_uuid" "$var" --value "$value" "${extra_args[@]}"
  else
    echo "Creating $var"
    coolify app env create "$app_uuid" --key "$var" --value "$value" "${extra_args[@]}"
  fi
done
