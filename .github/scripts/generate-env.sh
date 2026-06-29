#!/usr/bin/env bash
# Generates a .env file from currently-set environment variables for Coolify sync.
# Usage: generate-env.sh <output-file> [backend|frontend]
set -euo pipefail

output_file="${1:-.env}"
component="${2:-all}"

# Variables consumed by the backend container.
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

# Variables consumed by the frontend build / runtime.
frontend_vars=(
  VITE_API_BASE_URL
  VITE_APP_NAME
  VITE_APP_DOMAIN
  VITE_APP_PROTOCOL
)

vars=()
if [[ "$component" == "backend" || "$component" == "all" ]]; then
  vars+=("${backend_vars[@]}")
fi
if [[ "$component" == "frontend" || "$component" == "all" ]]; then
  vars+=("${frontend_vars[@]}")
fi

: > "$output_file"
for var in "${vars[@]}"; do
  value="${!var:-}"
  if [[ -n "$value" ]]; then
    # Escape double quotes so the .env file remains valid.
    escaped="${value//\"/\\\"}"
    printf '%s="%s"\n' "$var" "$escaped" >> "$output_file"
  fi
done

echo "Generated $output_file with $(grep -c '^' "$output_file" || true) entries"
