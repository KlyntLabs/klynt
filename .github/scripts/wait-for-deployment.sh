#!/usr/bin/env bash
set -euo pipefail

app_uuid="$1"
timeout_seconds="${2:-900}"
interval_seconds="${3:-10}"

elapsed=0
while [[ $elapsed -lt $timeout_seconds ]]; do
  status=$(coolify app deployments list "$app_uuid" --format json 2>/dev/null | jq -r '.[0].status // "unknown"')
  echo "[$elapsed s] Deployment status for $app_uuid: $status"

  if [[ "$status" == "finished" ]]; then
    echo "Deployment finished successfully"
    exit 0
  fi

  if [[ "$status" == "failed" ]]; then
    echo "Deployment failed"
    exit 1
  fi

  sleep "$interval_seconds"
  elapsed=$((elapsed + interval_seconds))
done

echo "Deployment wait timed out after ${timeout_seconds}s"
exit 1
