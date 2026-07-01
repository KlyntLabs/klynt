#!/usr/bin/env bash
# Roll a Coolify app back to a previous deployment UUID.
# Usage: rollback-to-deployment.sh <app-uuid> <deployment-uuid>
set -euo pipefail

app_uuid="$1"
deployment_uuid="$2"

if [[ -z "$deployment_uuid" ]]; then
  echo "No previous deployment UUID provided; cannot roll back."
  exit 1
fi

echo "Rolling back ${app_uuid} to deployment ${deployment_uuid}"
coolify deployments redeploy --applicationUuid "$app_uuid" --deploymentUuid "$deployment_uuid"
