set shell := ["bash", "-uc"]

# Show available commands
default:
    @just --list

# One-time setup for new contributors
setup:
    rustup component add rustfmt clippy llvm-tools-preview
    cargo install cargo-watch cargo-nextest cargo-llvm-cov cargo-audit cargo-machete --locked
    cd frontend && bun install
    @echo "Optional security tools (CI also runs these): brew install gitleaks semgrep trivy"

# Copy environment template
env:
    cp .env.example .env

# Run backend + frontend together
dev:
    cd frontend && npx concurrently --names "api,web" --prefix-colors "cyan,yellow" \
        "cd ../backend && cargo watch -x 'run --bin klynt-server'" \
        "bun run dev"

# Run backend only (hot reload)
dev-backend:
    cd backend && cargo watch -x 'run --bin klynt-server'

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
    cd backend && cargo build --release --bin klynt-server

# Run all fast checks (useful before pushing)
check:
    just fmt-check
    just lint
    just typecheck
