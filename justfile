set shell := ["bash", "-uc"]

# Show available commands
default:
    @just --list

# One-time setup for new contributors
setup: env
    rustup component add rustfmt clippy llvm-tools-preview
    cargo install cargo-watch cargo-nextest cargo-llvm-cov cargo-audit cargo-machete --locked
    cargo install sqlx-cli --no-default-features --features postgres,rustls --locked
    cd frontend && bun install
    @echo "Optional security tools (CI also runs these): brew install gitleaks semgrep trivy"
    @echo ""
    @echo "Next: just infra && just dev, then just seed-dev. Open http://lvh.me:5174"

# Copy both environment templates. Vite reads frontend/.env, NOT the root one — without it
# VITE_APP_DOMAIN is unset and every tenant subdomain silently renders the marketing page.
env:
    @[ -f .env ] || cp .env.example .env
    @[ -f frontend/.env ] || cp frontend/.env.example frontend/.env
    @echo "Env files ready: .env, frontend/.env"

# Start Postgres + Redis only. The app itself runs natively via `just dev`.
infra:
    docker compose -f docker-compose.dev.yml up -d postgres redis

# Stop the local infrastructure
infra-down:
    docker compose -f docker-compose.dev.yml down

# Create a verified user and a tenant to log in with.
#
# Email verification is enforced at login, and the dev mailer deliberately redacts the token
# while the database stores only its SHA-256 — so the verification link is unobtainable
# locally. This activates the account directly, which is the only way in.
#
#   just seed-dev                      -> dev@klynt.test / Passw0rd!dev, tenant "acme"
#   just seed-dev me@x.test Secret1! t -> custom email, password and tenant slug
seed-dev email="dev@klynt.test" password="Passw0rd!dev" slug="acme":
    #!/usr/bin/env bash
    set -euo pipefail
    api="http://lvh.me:${KLYNT_BACKEND_PORT:-3001}/api/v1"
    curl -sf -o /dev/null "http://lvh.me:${KLYNT_BACKEND_PORT:-3001}/health/live" \
      || { echo "Backend is not up on :${KLYNT_BACKEND_PORT:-3001}. Run 'just infra && just dev' first."; exit 1; }

    curl -s -X POST "$api/auth/register" -H 'Content-Type: application/json' \
      -d '{"email":"{{email}}","username":"seeded","password":"{{password}}","full_name":"Seed User"}' >/dev/null

    docker exec -i klynt-postgres-dev psql -U klynt -d klynt -qtc \
      "UPDATE users SET status='active', email_verified_at=NOW() WHERE email='{{email}}';"

    token=$(curl -s -X POST "$api/auth/login" -H 'Content-Type: application/json' \
      -d '{"email":"{{email}}","password":"{{password}}"}' \
      | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
    [ -n "$token" ] || { echo "Login failed — is the password policy satisfied?"; exit 1; }

    curl -s -X POST "$api/tenants" -H "Authorization: Bearer $token" \
      -H 'Content-Type: application/json' \
      -d '{"slug":"{{slug}}","name":"Seeded Tenant"}' >/dev/null

    echo "Seeded {{email}} / {{password}} (owner of '{{slug}}')"
    echo "  Log in:  http://login.lvh.me:5174/"
    echo "  Tenant:  http://{{slug}}.lvh.me:5174/"

# Run backend + frontend together
dev:
    cd frontend && npx concurrently --names "api,web" --prefix-colors "cyan,yellow" \
        "cd ../backend && cargo watch -x 'run --bin server'" \
        "bun run dev"

# Run backend only (hot reload)
dev-backend:
    cd backend && cargo watch -x 'run --bin server'

# Run frontend only
dev-frontend:
    cd frontend && bun run dev

# Run all tests (requires Postgres and Redis)
test:
    cd backend && DATABASE_URL=${DATABASE_URL:-postgresql://klynt:klynt@localhost:5432/test} REDIS_URL=${REDIS_URL:-redis://localhost:6379/0} cargo nextest run --workspace --all-features
    cd frontend && bun run test

# Run all tests with coverage gates
# Thresholds are ratchets: raise them only when current coverage improves.
test-coverage:
    cd backend && DATABASE_URL=${DATABASE_URL:-postgresql://klynt:klynt@localhost:5432/test} REDIS_URL=${REDIS_URL:-redis://localhost:6379/0} cargo llvm-cov --workspace --all-features --fail-under-lines 84 -- --include-ignored
    cd frontend && bun run test:coverage

# Run secret scan on the whole repo (requires gitleaks)
secret-scan:
    gitleaks detect --source . --verbose

# Run lightweight SAST locally (requires semgrep and trivy)
security-scan:
    semgrep --config=p/default --error
    trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL .

# Audit Rust dependencies for known vulnerabilities (requires cargo-audit)
backend-audit:
    cd backend && cargo audit

# Find unused Rust dependencies (requires cargo-machete)
backend-machete:
    cd backend && cargo machete

# Regenerate the committed backend/.sqlx offline cache (run after changing any query or migration).
# Requires a migrated local Postgres at DATABASE_URL.
sqlx-prepare:
    cd backend && DATABASE_URL=${DATABASE_URL:-postgresql://klynt:klynt@localhost:5432/klynt} cargo sqlx prepare --workspace -- --all-targets

# Format everything (mutating)
fmt:
    cd backend && cargo fmt --all
    cd frontend && bun run format

# Check formatting without mutating
fmt-check:
    cd backend && cargo fmt --all -- --check
    cd frontend && bun run format:check

# Run all linters
lint:
    cd backend && cargo clippy --all-targets --all-features -- -D warnings
    cd frontend && bun run lint

# Type-check frontend
typecheck:
    cd frontend && bun run typecheck

# Build production artifacts
build:
    cd frontend && bun run build
    cd backend && cargo build --release --bin server

# Run all fast checks (useful before pushing)
check:
    just fmt-check
    just lint
    just typecheck
