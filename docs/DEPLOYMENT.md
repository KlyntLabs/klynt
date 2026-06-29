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
