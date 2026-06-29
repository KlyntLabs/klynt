#!/usr/bin/env bash
set -euo pipefail

# Klynt 3-environment deployment helper for Coolify Cloud.
# Fill in the variables below, then run:
#   ./scripts/coolify-klynt-deploy.sh

# -----------------------------------------------------------------------------
# 1. Required identifiers
# -----------------------------------------------------------------------------

# Coolify Cloud server UUID (the InterServer VPS).
SERVER_UUID="${SERVER_UUID:-}"

# GitHub App UUID from `coolify github list`.
GITHUB_APP_UUID="${GITHUB_APP_UUID:-}"

# Set to a strong random secret. Only used if you recreate the GitHub App.
WEBHOOK_SECRET="${WEBHOOK_SECRET:-}"

# -----------------------------------------------------------------------------
# 2. Optional: create Coolify resources from scratch
# -----------------------------------------------------------------------------

CREATE_PROJECTS="${CREATE_PROJECTS:-true}"
CREATE_DATABASES="${CREATE_DATABASES:-true}"
CREATE_APPS="${CREATE_APPS:-true}"
SET_ENV_VARS="${SET_ENV_VARS:-true}"
DEPLOY_APPS="${DEPLOY_APPS:-false}"

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

coolify_context="cloud"

ensure_context() {
  if ! coolify context verify >/dev/null 2>&1; then
    echo "ERROR: Coolify CLI is not authenticated or the 'cloud' context is missing."
    echo "Run: coolify context use cloud"
    exit 1
  fi
}

require_uuid() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "ERROR: $name is empty. Set it at the top of this script."
    exit 1
  fi
}

project_uuid() {
  local name="$1"
  coolify project list --format json \
    | jq -r --arg name "$name" '.[] | select(.name == $name) | .uuid'
}

app_uuid() {
  local name="$1"
  coolify app list --format json \
    | jq -r --arg name "$name" '.[] | select(.name == $name) | .uuid'
}

db_uuid() {
  local name="$1"
  coolify database list --format json \
    | jq -r --arg name "$name" '.[] | select(.name == $name) | .uuid'
}

# -----------------------------------------------------------------------------
# 3. Projects
# -----------------------------------------------------------------------------

create_projects() {
  echo "==> Ensuring projects exist..."
  for env in dev staging production; do
    local name="klynt-${env}"
    if [[ -z "$(project_uuid "$name")" ]]; then
      coolify project create --name "$name" --description "Klynt ${env} environment"
    else
      echo "    Project '$name' already exists."
    fi
  done
}

# -----------------------------------------------------------------------------
# 4. Databases
# -----------------------------------------------------------------------------

create_databases() {
  echo "==> Ensuring databases exist..."

  declare -A pg_user=(
    [dev]=klynt_dev
    [staging]=klynt_staging
    [production]=klynt_production
  )

  # Database passwords are read from environment variables so they are never
  # committed to source control. Generate strong values and export them before
  # running this script, e.g.:
  #   source /tmp/klynt-db-passwords.env
  declare -A pg_pass=(
    [dev]="${KLYNT_DEV_PG_PASSWORD:?set KLYNT_DEV_PG_PASSWORD}"
    [staging]="${KLYNT_STAGING_PG_PASSWORD:?set KLYNT_STAGING_PG_PASSWORD}"
    [production]="${KLYNT_PRODUCTION_PG_PASSWORD:?set KLYNT_PRODUCTION_PG_PASSWORD}"
  )
  declare -A redis_pass=(
    [dev]="${KLYNT_DEV_REDIS_PASSWORD:?set KLYNT_DEV_REDIS_PASSWORD}"
    [staging]="${KLYNT_STAGING_REDIS_PASSWORD:?set KLYNT_STAGING_REDIS_PASSWORD}"
    [production]="${KLYNT_PRODUCTION_REDIS_PASSWORD:?set KLYNT_PRODUCTION_REDIS_PASSWORD}"
  )

  for env in dev staging production; do
    local project_uuid
    project_uuid="$(project_uuid "klynt-${env}")"

    local pg_name="klynt-${env}-postgres"
    local redis_name="klynt-${env}-redis"

    if [[ -z "$(db_uuid "$pg_name")" ]]; then
      coolify database create postgresql \
        --server-uuid "$SERVER_UUID" \
        --project-uuid "$project_uuid" \
        --environment-name production \
        --name "$pg_name" \
        --postgres-user "${pg_user[$env]}" \
        --postgres-password "${pg_pass[$env]}" \
        --postgres-db "${pg_user[$env]}" \
        --instant-deploy
    else
      echo "    Postgres '$pg_name' already exists."
    fi

    if [[ -z "$(db_uuid "$redis_name")" ]]; then
      coolify database create redis \
        --server-uuid "$SERVER_UUID" \
        --project-uuid "$project_uuid" \
        --environment-name production \
        --name "$redis_name" \
        --redis-password "${redis_pass[$env]}" \
        --instant-deploy
    else
      echo "    Redis '$redis_name' already exists."
    fi
  done
}

# -----------------------------------------------------------------------------
# 5. Applications
# -----------------------------------------------------------------------------

create_apps() {
  echo "==> Ensuring applications exist..."

  declare -A branch=(
    [dev]=dev
    [staging]=staging
    [production]=main
  )

  for env in dev staging production; do
    local project_uuid
    project_uuid="$(project_uuid "klynt-${env}")"

    local backend_name="klynt-${env}-backend"
    local frontend_name="klynt-${env}-frontend"

    if [[ -z "$(app_uuid "$backend_name")" ]]; then
      coolify app create github \
        --server-uuid "$SERVER_UUID" \
        --project-uuid "$project_uuid" \
        --environment-name production \
        --github-app-uuid "$GITHUB_APP_UUID" \
        --git-repository "KlyntLabs/klynt" \
        --git-branch "${branch[$env]}" \
        --build-pack dockerfile \
        --base-directory "/backend" \
        --ports-exposes 3001 \
        --name "$backend_name" \
        --instant-deploy
    else
      echo "    Backend '$backend_name' already exists."
    fi

    if [[ -z "$(app_uuid "$frontend_name")" ]]; then
      coolify app create github \
        --server-uuid "$SERVER_UUID" \
        --project-uuid "$project_uuid" \
        --environment-name production \
        --github-app-uuid "$GITHUB_APP_UUID" \
        --git-repository "KlyntLabs/klynt" \
        --git-branch "${branch[$env]}" \
        --build-pack dockerfile \
        --base-directory "/frontend" \
        --ports-exposes 8080 \
        --name "$frontend_name" \
        --instant-deploy
    else
      echo "    Frontend '$frontend_name' already exists."
    fi
  done
}

# -----------------------------------------------------------------------------
# 6. Environment variables
# -----------------------------------------------------------------------------

set_env_vars() {
  echo "==> Setting environment variables..."

  # Database passwords are read from environment variables (see create_databases).
  declare -A pg_pass=(
    [dev]="${KLYNT_DEV_PG_PASSWORD:?set KLYNT_DEV_PG_PASSWORD}"
    [staging]="${KLYNT_STAGING_PG_PASSWORD:?set KLYNT_STAGING_PG_PASSWORD}"
    [production]="${KLYNT_PRODUCTION_PG_PASSWORD:?set KLYNT_PRODUCTION_PG_PASSWORD}"
  )
  declare -A redis_pass=(
    [dev]="${KLYNT_DEV_REDIS_PASSWORD:?set KLYNT_DEV_REDIS_PASSWORD}"
    [staging]="${KLYNT_STAGING_REDIS_PASSWORD:?set KLYNT_STAGING_REDIS_PASSWORD}"
    [production]="${KLYNT_PRODUCTION_REDIS_PASSWORD:?set KLYNT_PRODUCTION_REDIS_PASSWORD}"
  )
  declare -A pg_user=(
    [dev]=klynt_dev
    [staging]=klynt_staging
    [production]=klynt_production
  )

  for env in dev staging production; do
    local backend_uuid frontend_uuid pg_uuid redis_uuid
    backend_uuid="$(app_uuid "klynt-${env}-backend")"
    frontend_uuid="$(app_uuid "klynt-${env}-frontend")"
    pg_uuid="$(db_uuid "klynt-${env}-postgres")"
    redis_uuid="$(db_uuid "klynt-${env}-redis")"

    local db_url="postgres://${pg_user[$env]}:${pg_pass[$env]}@${pg_uuid}:5432/${pg_user[$env]}"
    local redis_url="redis://:${redis_pass[$env]}@${redis_uuid}:6379/0"

    # Backend env vars
    for key in DATABASE_URL REDIS_URL KLYNT_DATABASE_URL KLYNT_REDIS_URL; do
      local value
      case "$key" in
        DATABASE_URL|KLYNT_DATABASE_URL) value="$db_url" ;;
        REDIS_URL|KLYNT_REDIS_URL) value="$redis_url" ;;
      esac

      if ! coolify app env list "$backend_uuid" --format json 2>/dev/null \
           | jq -e --arg key "$key" '.[] | select(.key == $key)' >/dev/null 2>&1; then
        coolify app env create "$backend_uuid" --key "$key" --value "$value"
      else
        echo "    Env var '$key' already exists on klynt-${env}-backend."
      fi
    done

    # Frontend env var
    local backend_fqdn
    backend_fqdn="$(coolify app get "$backend_uuid" --format json 2>/dev/null | jq -r '.fqdn')"
    local api_url="${backend_fqdn}/api/v1"

    if ! coolify app env list "$frontend_uuid" --format json 2>/dev/null \
         | jq -e --arg key "VITE_API_BASE_URL" '.[] | select(.key == $key)' >/dev/null 2>&1; then
      coolify app env create "$frontend_uuid" --key "VITE_API_BASE_URL" --value "$api_url"
    else
      echo "    Env var 'VITE_API_BASE_URL' already exists on klynt-${env}-frontend."
    fi
  done
}

# -----------------------------------------------------------------------------
# 7. Deploy
# -----------------------------------------------------------------------------

deploy_apps() {
  echo "==> Restarting applications..."
  for env in dev staging production; do
    for component in backend frontend; do
      local uuid
      uuid="$(app_uuid "klynt-${env}-${component}")"
      if [[ -n "$uuid" ]]; then
        coolify app restart "$uuid" || true
      fi
    done
  done
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

main() {
  ensure_context
  require_uuid "SERVER_UUID" "$SERVER_UUID"
  require_uuid "GITHUB_APP_UUID" "$GITHUB_APP_UUID"

  if [[ "$CREATE_PROJECTS" == "true" ]]; then create_projects; fi
  if [[ "$CREATE_DATABASES" == "true" ]]; then create_databases; fi
  if [[ "$CREATE_APPS" == "true" ]]; then create_apps; fi
  if [[ "$SET_ENV_VARS" == "true" ]]; then set_env_vars; fi
  if [[ "$DEPLOY_APPS" == "true" ]]; then deploy_apps; fi

  echo "==> Done."
  echo "NOTE: If backend builds fail due to memory, upgrade the VPS before deploying."
}

main "$@"
