set shell := ["bash", "-uc"]

# Show available commands
default:
    @just --list

# One-time setup for new contributors
setup:
    rustup component add rustfmt clippy
    cargo install cargo-watch cargo-nextest --locked
    cd frontend && npm install

# Copy environment template
env:
    cp .env.example .env

# Run backend + frontend together
dev:
    cd frontend && npx concurrently --names "api,web" --prefix-colors "cyan,yellow" \
        "cd ../backend && cargo watch -x 'run --bin klynt-server'" \
        "npm run dev"

# Run backend only (hot reload)
dev-backend:
    cd backend && cargo watch -x 'run --bin klynt-server'

# Run frontend only
dev-frontend:
    cd frontend && npm run dev

# Run all tests
test:
    cd backend && cargo nextest run --all-features
    cd frontend && npm run test

# Format everything (mutating)
fmt:
    cd backend && cargo fmt --all
    cd frontend && npm run format

# Check formatting without mutating
fmt-check:
    cd backend && cargo fmt --all -- --check
    cd frontend && npm run format:check

# Run all linters
lint:
    cd backend && cargo clippy --all-targets --all-features -- -D warnings
    cd frontend && npm run lint

# Type-check frontend
typecheck:
    cd frontend && npm run typecheck

# Build production artifacts
build:
    cd frontend && npm run build
    cd backend && cargo build --release --bin klynt-server

# Run all fast checks (useful before pushing)
check:
    just fmt-check
    just lint
    just typecheck
