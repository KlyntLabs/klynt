#!/usr/bin/env bash
# Prints the UUID of the most recently finished deployment for a Coolify app.
# Usage: get-current-deployment.sh <app-uuid>
set -euo pipefail

app_uuid="$1"

deployment=$(coolify app deployments list "$app_uuid" --format json 2>/dev/null | jq -r '[.[] | select(.status == "finished")] | sort_by(.created_at // .started_at // .id) | last | .uuid // empty' || true)

if [[ -n "$deployment" ]]; then
  echo "$deployment"
else
  echo ""
fi
