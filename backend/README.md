# Klynt Backend

Service-oriented Rust backend for the Klynt Education Platform. Built with Axum, Tokio, and SQLx.

## Architecture

```
backend/crates/
├── base                    # Canonical ports and testkit
│   ├── src/ports           # Repository, session, token, audit, email, password-hasher, clock, HTTP-error ports
│   └── src/testkit         # In-memory fakes for unit and integration tests
├── shared/
│   └── domain              # Domain types, contracts, and errors (user, auth, role, error)
├── infra/
│   ├── persistence         # PostgreSQL repositories, Redis rate limiting/idempotency, Argon2 hashing, email
│   ├── telemetry           # Tracing, audit logging, metrics, health-check ports
│   └── config              # Configuration loading and validation
├── services/
│   ├── auth_service        # Registration, login, email verification, password reset
│   ├── session_service     # Session creation, validation, and invalidation
│   └── user_service        # Profiles, password changes, user listing, soft delete
├── gateways/               # HTTP API gateway + composition root
└── server                  # Minimal binary entrypoint
```

## Base Abstractions

- `base::ports` — Canonical ports consumed by all services:
  - `UserRepository` — User CRUD and listing
  - `SessionStore` — Session persistence
  - `TokenStore` — Verification-token storage
  - `AuditLogger` — Audit-event logging
  - `EmailSender` — Transactional email
  - `PasswordHasher` — Password hashing/verification
  - `Clock` — Time abstraction
  - `HttpError` — Gateway-facing error mapping
- `base::testkit` — Reusable in-memory test doubles:
  - `FakeUserRepository`
  - `FakeSessionStore`
  - `FakeTokenStore`
  - `TestClock`
  - `TestPasswordHasher`

## Services

- `auth_service` — Authentication and authorization (register, login, email verification, password reset)
- `session_service` — Session lifecycle (create, validate, invalidate)
- `user_service` — User profile management (profiles, password changes, user listing, soft delete)

## Gateway

- `gateways` — HTTP API gateway; routes requests to services and provides middleware (auth, CORS, security headers, request IDs, error handling)

## Shared Infrastructure

- `persistence` — PostgreSQL repositories, Redis rate limiting/idempotency, Argon2 password hashing, mock email service, session/token stores
- `telemetry` — Tracing setup, audit logging service, health-check ports, and metrics
- `config` — Application configuration loading from files and environment

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
cargo run --bin server
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

See `crates/gateways/src/openapi.yaml` for the full request/response schemas.

## Environment Variables

Copy the root `.env.example` to `.env` and adjust as needed. Key backend variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Postgres connection string | `postgresql://klynt:klynt@localhost:5432/klynt` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `KLYNT_API__HOST` | API bind host | `127.0.0.1` |
| `KLYNT_API__PORT` | API bind port | `3000` |

See `crates/infra/config/src/lib.rs` for the full configuration shape.
