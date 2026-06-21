# Klynt Backend

Service-oriented Rust backend for the Klynt Education Platform. Built with Axum, Tokio, and SQLx.

## Architecture

```
backend/crates/
├── core/                   # Base abstractions
│   └── klynt_core
├── shared/                 # Shared libraries
│   ├── klynt_contracts     # DTOs for service boundaries
│   ├── klynt_domain        # Legacy shared domain types (minimized)
│   └── klynt_utils         # ID generation, crypto, time utilities
├── infrastructure/         # Shared infrastructure
│   ├── klynt_audit         # Audit logging service
│   ├── klynt_messaging     # Event messaging abstractions
│   ├── klynt_storage       # Storage abstractions
│   ├── klynt_tracing       # Observability
│   └── klynt-infrastructure # Repositories, email, hashing, rate limiting
├── services/               # Business services
│   ├── auth_service        # Authentication and authorization
│   └── user_service        # User profile management
├── gateways/               # HTTP entry points
│   └── api_gateway         # HTTP API gateway
└── klynt-server            # Minimal binary entrypoint
```

## Services

- `auth_service` — Authentication and authorization (register, login, email verification, password reset)
- `user_service` — User profile management (profiles, password changes, user listing)

## Gateway

- `api_gateway` — HTTP API gateway; routes requests to services and provides middleware (auth, CORS, security headers, request IDs, error handling)

## Shared Infrastructure

- `klynt-infrastructure` — PostgreSQL repositories, Redis rate limiting/idempotency, Argon2 password hashing, mock email service
- `klynt_audit` — Audit logging service used by both services through adapters

## Local Development

### Prerequisites

- Rust toolchain (see `../rust-toolchain.toml`)
- `cargo-nextest` for tests: `cargo install cargo-nextest`
- `cargo-llvm-cov` for coverage: `cargo install cargo-llvm-cov`
- `sqlx-cli` for migrations: `cargo install sqlx-cli`
- Docker (for Postgres/Redis)

### Start backing services

```bash
cd ..
docker compose -f docker-compose.dev.yml up -d postgres redis
```

### Run database migrations

```bash
export DATABASE_URL=postgresql://klynt:klynt@localhost:5432/klynt
sqlx migrate run --source migrations
```

Expected tables after migrations:

- `users`
- `sessions`
- `email_verification_tokens`
- `password_reset_tokens`
- `audit_events`

### Run the server

```bash
cargo run --bin klynt-server
```

The API is available at `http://localhost:3000/api/v1` by default.

## Testing

### Run all tests

Tests require a running Postgres and Redis instance. Defaults point at the Docker Compose services:

```bash
export DATABASE_URL=postgresql://klynt:klynt@localhost:5432/test
export REDIS_URL=redis://localhost:6379/0
cargo nextest run --workspace --all-features
```

### Run tests with coverage

```bash
export DATABASE_URL=postgresql://klynt:klynt@localhost:5432/test
export REDIS_URL=redis://localhost:6379/0
cargo llvm-cov --workspace --all-features --no-clean --fail-under-lines 84
```

Backend coverage gate: **≥ 84% lines**.

### Run linting and formatting checks

```bash
cargo fmt --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
```

## Auth Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/register` | Register a new user |
| `POST` | `/api/v1/auth/verify-email` | Verify email with token |
| `POST` | `/api/v1/auth/request-password-reset` | Request a password reset email |
| `POST` | `/api/v1/auth/reset-password` | Reset password with token |
| `POST` | `/api/v1/auth/login` | Create a session (login) |

See `crates/gateways/api_gateway/src/openapi.yaml` for the full request/response schemas.

## Environment Variables

Copy the root `.env.example` to `.env` and adjust as needed. Key backend variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Postgres connection string | `postgresql://klynt:klynt@localhost:5432/klynt` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `KLYNT_API__HOST` | API bind host | `127.0.0.1` |
| `KLYNT_API__PORT` | API bind port | `3000` |

See `crates/klynt-domain/src/config.rs` for the full configuration shape.
