# Klynt Deployment Guide (Coolify Cloud)

This guide documents the 3-environment (dev / staging / production) deployment setup on Coolify Cloud using the InterServer VPS at `153.75.250.29`.

## Architecture

- **Control plane**: Coolify Cloud (`https://app.coolify.io`)
- **Compute**: InterServer VPS, Ubuntu 24.04, Docker 29.6.1
- **Git source**: GitHub App `klynt-coolify` installed on `KlyntLabs/klynt`
- **Projects** (one per environment):
  - `klynt-dev` → branch `dev`
  - `klynt-staging` → branch `staging`
  - `klynt-production` → branch `main`
- **Databases per environment**: PostgreSQL 16 + Redis 7
- **Apps per environment**: backend (Axum/Rust) + frontend (Vite/React)

## What Was Provisioned

| Component | Dev | Staging | Production |
|---|---|---|---|
| Project | `klynt-dev` | `klynt-staging` | `klynt-production` |
| Postgres | `klynt-dev-postgres` | `klynt-staging-postgres` | `klynt-production-postgres` |
| Redis | `klynt-dev-redis` | `klynt-staging-redis` | `klynt-production-redis` |
| Backend | `klynt-dev-backend` | `klynt-staging-backend` | `klynt-production-backend` |
| Frontend | `klynt-dev-frontend` | `klynt-staging-frontend` | `klynt-production-frontend` |

## VPS Sizing

The InterServer VPS was upgraded to the **5-slice Ubuntu instance** ($15/month). This provides enough RAM and CPU for the Rust backend Docker builds to complete. Smaller sizes (1–2 slices) will cause the backend build to fail or make the VPS unresponsive.

## Re-create Everything

1. Ensure the Coolify CLI is authenticated and using the `cloud` context:

   ```bash
   coolify context verify
   ```

2. Generate and export strong database passwords (never commit them):

   ```bash
   cat > /tmp/klynt-db-passwords.env <<EOF
   KLYNT_DEV_PG_PASSWORD=$(openssl rand -base64 32 | tr -d '=+/')
   KLYNT_DEV_REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '=+/')
   KLYNT_STAGING_PG_PASSWORD=$(openssl rand -base64 32 | tr -d '=+/')
   KLYNT_STAGING_REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '=+/')
   KLYNT_PRODUCTION_PG_PASSWORD=$(openssl rand -base64 32 | tr -d '=+/')
   KLYNT_PRODUCTION_REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '=+/')
   EOF
   chmod 600 /tmp/klynt-db-passwords.env
   set -a
   source /tmp/klynt-db-passwords.env
   set +a
   ```

3. Run the helper script. The script uses associative arrays, so it requires **bash 4+** (macOS: `brew install bash`):

   ```bash
   export SERVER_UUID="toflj7qapme53gw5n67bm6un"
   export GITHUB_APP_UUID="p12avcp3j63qm1gdmknsep5w"
   /opt/homebrew/bin/bash ./scripts/coolify-klynt-deploy.sh
   ```

## Manual Steps

### 1. Server

The VPS is registered as `klynt-vps` in Coolify Cloud.

### 2. GitHub App

A GitHub App named `klynt-coolify` is installed on the `KlyntLabs` organization. If it needs to be recreated:

1. Go to **Coolify → Sources → + Add → New GitHub App**.
2. Name it `klynt-coolify` and install it on `KlyntLabs`.
3. Note the **App ID**, **Installation ID**, **Client ID**, **Client Secret**, and download the **private key**.
4. Add the private key to Coolify and run:

   ```bash
   coolify github create \
     --name "klynt-coolify" \
     --api-url "https://api.github.com" \
     --html-url "https://github.com" \
     --app-id <APP_ID> \
     --installation-id <INSTALLATION_ID> \
     --client-id <CLIENT_ID> \
     --client-secret <CLIENT_SECRET> \
     --private-key-uuid <PRIVATE_KEY_UUID> \
     --webhook-secret <RANDOM_SECRET>
   ```

### 3. Projects

```bash
coolify project create --name "klynt-dev"        --description "Klynt development environment"
coolify project create --name "klynt-staging"    --description "Klynt staging environment"
coolify project create --name "klynt-production" --description "Klynt production environment"
```

### 4. Databases

Create one Postgres and one Redis database in each project, all on the `production` environment (each project represents one environment).

### 5. Applications

Create backend and frontend applications from the `KlyntLabs/klynt` repo using the GitHub App source:

```bash
coolify app create github \
  --server-uuid <SERVER_UUID> \
  --project-uuid <PROJECT_UUID> \
  --environment-name production \
  --github-app-uuid <GITHUB_APP_UUID> \
  --git-repository "KlyntLabs/klynt" \
  --git-branch <dev|staging|main> \
  --build-pack dockerfile \
  --base-directory "/backend" \
  --ports-exposes 3001 \
  --name klynt-<env>-backend

coolify app create github \
  --server-uuid <SERVER_UUID> \
  --project-uuid <PROJECT_UUID> \
  --environment-name production \
  --github-app-uuid <GITHUB_APP_UUID> \
  --git-repository "KlyntLabs/klynt" \
  --git-branch <dev|staging|main> \
  --build-pack dockerfile \
  --base-directory "/frontend" \
  --ports-exposes 8080 \
  --name klynt-<env>-frontend
```

### 6. Environment Variables

Each backend needs:

```text
DATABASE_URL=postgres://<user>:<pass>@<postgres-container>:5432/<db>
REDIS_URL=redis://:<pass>@<redis-container>:6379/0
KLYNT_DATABASE_URL=$DATABASE_URL
KLYNT_REDIS_URL=$REDIS_URL
```

Each frontend needs:

```text
VITE_API_BASE_URL=http://<backend-fqdn>/api/v1
```

Use `coolify app env create <app-uuid> --key <KEY> --value <VALUE>`.

## CI/CD (GitHub Actions)

The repository now uses GitHub Actions for continuous integration and branch-based deployments to Coolify.

### Branch → Environment Mapping

| Branch | Environment | Deploy Trigger |
|---|---|---|
| `dev` | dev | Auto on push to `dev` |
| `staging` | staging | Auto on push to `staging`, requires reviewer approval |
| `main` | production | Auto on push to `main`, requires reviewer approval |

### Workflows

- `.github/workflows/ci.yml` — lint, typecheck, tests, build, security scans on PRs and pushes.
- `.github/workflows/deploy-dev.yml` — deploys the `dev` environment.
- `.github/workflows/deploy-staging.yml` — deploys the `staging` environment.
- `.github/workflows/deploy-production.yml` — deploys the `production` environment.
- `.github/workflows/reusable-deploy.yml` — shared deployment logic (env sync, restart, health checks, notifications).
- `.github/workflows/health-check.yml` — reusable HTTP polling health check.
- `.github/workflows/rollback.yml` — manual rollback to a previous commit for any environment.

### Required GitHub Setup

#### Environments

Create three GitHub Environments under **Settings → Environments**:

1. **dev**
   - Deployment branches: `dev`
   - No required reviewers.
2. **staging**
   - Deployment branches: `staging`
   - Required reviewers: at least 1.
3. **production**
   - Deployment branches: `main`
   - Required reviewers: at least 1 (ideally 2).
   - Optional: enable a 5-minute wait timer.

#### Repository Secrets (single-instance)

| Secret | Purpose |
|---|---|
| `COOLIFY_TOKEN` | Coolify Cloud API token |
| `COOLIFY_FQDN` | `https://app.coolify.io` |
| `SLACK_WEBHOOK_URL` | Optional deploy notification webhook |

#### Repository Variables (single-instance)

| Variable | Example |
|---|---|
| `COOLIFY_SERVER_UUID` | `toflj7qapme53gw5n67bm6un` |
| `COOLIFY_GITHUB_APP_UUID` | `p12avcp3j63qm1gdmknsep5w` |
| `DEV_BACKEND_APP_UUID` | Coolify backend app UUID for dev |
| `DEV_FRONTEND_APP_UUID` | Coolify frontend app UUID for dev |
| `DEV_BACKEND_HEALTH_URL` | `http://<dev-backend-fqdn>/health/ready` |
| `DEV_FRONTEND_URL` | `http://<dev-frontend-fqdn>` |
| `STAGING_BACKEND_APP_UUID` | ... |
| `STAGING_FRONTEND_APP_UUID` | ... |
| `STAGING_BACKEND_HEALTH_URL` | ... |
| `STAGING_FRONTEND_URL` | ... |
| `PRODUCTION_BACKEND_APP_UUID` | ... |
| `PRODUCTION_FRONTEND_APP_UUID` | ... |
| `PRODUCTION_BACKEND_HEALTH_URL` | ... |
| `PRODUCTION_FRONTEND_URL` | ... |

App UUIDs can be found with:

```bash
coolify app list --format json | jq -r '.[] | "\(.name) \(.uuid)"'
```

#### Environment Secrets (per environment)

Add these under each GitHub Environment:

- `DATABASE_URL`
- `REDIS_URL`
- `KLYNT_DATABASE_URL` (alias to `DATABASE_URL`)
- `KLYNT_REDIS_URL` (alias to `REDIS_URL`)
- `KLYNT_COOKIE_DOMAIN`
- `KLYNT_COOKIE_SECURE` (`true` for staging/production)
- `KLYNT_HSTS_ENABLED` (`true` once TLS is confirmed)
- `KLYNT_BASE_URL`
- `KLYNT_API__ALLOWED_ORIGINS`
- `VITE_API_BASE_URL`
- `VITE_APP_DOMAIN`
- `VITE_APP_PROTOCOL`

Environment-scoped secrets take precedence over repository secrets, so the same workflow can reference `${{ secrets.DATABASE_URL }}` and get the correct value for each environment.

### How Deployment Works

1. A push to `dev`, `staging`, or `main` triggers the matching deploy workflow.
2. The workflow calls `reusable-deploy.yml` with the environment-specific app UUIDs and URLs.
3. The reusable workflow:
   - Installs and authenticates the Coolify CLI.
   - Generates a `.env` file from the environment's secrets and variables.
   - Syncs the `.env` to the backend and frontend Coolify apps.
   - Restarts both apps.
   - Polls `/health/ready` (backend) and HTTP 200 (frontend) until healthy.
4. If health checks fail, the workflow fails and optionally posts to Slack.

### Rollback

Use **Actions → Rollback Deployment** and select the environment. It redeploys the previous successful commit by default, or a specific SHA if provided.

### Important Rules

- **Do not edit environment variables in the Coolify UI.** Always change them in GitHub Secrets/Variables and redeploy.
- **Do not store secrets in this repository.** `gitleaks` runs on every PR/push.
- **Branch protection**: require PR reviews and passing CI before merging to `dev`, `staging`, and `main`.

## Known Issues

- The current Coolify CLI (v1.6.2) has a UUID-vs-numeric-ID mismatch for some GitHub App endpoints (`repos`, `delete`). Creating apps and listing apps works; the duplicate GitHub App entries can be ignored or removed through the web UI.
- The `scripts/coolify-klynt-deploy.sh` helper requires **bash 4+** because it uses associative arrays. On macOS use `/opt/homebrew/bin/bash` after `brew install bash`.

## Useful Commands

```bash
# List resources
coolify project list
coolify server list
coolify database list
coolify app list

# Deploy an app
coolify app restart <APP_UUID>

# View logs
coolify app logs <APP_UUID>
coolify app deployments list <APP_UUID>
coolify app deployments logs <APP_UUID>
```
