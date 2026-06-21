# Klynt Backend

Rust HTTP API for the Klynt Education Platform. Built with Axum, Tokio, and SQLx.

## Phase 1 Status — Core Auth Foundation

Phase 1 delivers the foundational authentication and audit infrastructure:

- **User registration** with email verification tokens
- **Password reset** flow with single-use tokens
- **Session-based login** with session-fixation protection (new session ID on every login)
- **Audit logging** for security-relevant events (registration, verification, login, password reset)
- **OpenAPI 3.1.0** specification for auth endpoints (`crates/klynt-api/src/openapi.yaml`)

Adapters are production-backed: PostgreSQL/SQLx repositories for users, sessions, tokens and audit events, Redis for rate limiting and idempotency, and Argon2 for password hashing.

## Crate Layout

### Existing Crates

| Crate | Responsibility |
|-------|----------------|
| `klynt-domain` | Entities, errors, ports/traits, config types. No framework dependencies. |
| `klynt-application` | Use cases (`AuthService`, `UserService`, `AuditService`). Depends only on domain. |
| `klynt-infrastructure` | Concrete adapters (Postgres/SQLx repos, Redis rate limiter/idempotency, Argon2 hasher, mock email). |
| `klynt-api` | HTTP handlers, DTOs, routing, middleware, error mapping, OpenAPI spec. |
| `klynt-server` | Binary entrypoint, telemetry, and the single composition root. |

### Phase 1 Foundation Crates

These crates are introduced alongside the existing ones and are not yet wired
into the application layer. They provide the shared abstractions future
services will depend on.

```
crates/
├── core/
│   └── klynt_core          # Base types, traits, request/execution context
├── shared/
│   ├── klynt_contracts     # DTOs for service boundaries
│   ├── klynt_domain        # Shared domain types and errors
│   ├── klynt_utils         # ID generation, crypto, time utilities
│   └── klynt_typedenum     # Shared enums (roles, statuses)
└── infrastructure/
    ├── klynt_messaging     # Event messaging / pub-sub abstractions
    ├── klynt_storage       # Database and repository abstractions
    └── klynt_tracing       # Tracing subscriber and field constants
```

| Crate | Responsibility |
|-------|----------------|
| `klynt_core` | Base types, constants, core traits, request and execution context. |
| `klynt_utils` | ID generation, cryptographic helpers, and time utilities. |
| `klynt_shared_domain` | Shared domain errors and types (`Email`, `Timestamp`, pagination). |
| `klynt_contracts` | Request/response DTOs for auth, users, and common envelopes. |
| `klynt_typedenum` | Shared enums such as `UserRole` and `UserStatus`. |
| `klynt_storage` | SQLx/Postgres pool helpers and repository traits. |
| `klynt_messaging` | Domain event envelope and message bus abstraction. |
| `klynt_tracing` | Tracing initialization and standard field names. |

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

The API is available at `http://localhost:3001/api/v1`.

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

Phase 1 coverage gate: **≥ 84% lines**.

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
| `POST` | `/api/v1/sessions` | Create a session (login) |

See `crates/klynt-api/src/openapi.yaml` for the full request/response schemas.

## Environment Variables

Copy the root `.env.example` to `.env` and adjust as needed. Key backend variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Postgres connection string | `postgresql://klynt:klynt@localhost:5432/klynt` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `KLYNT_API__HOST` | API bind host | `127.0.0.1` |
| `KLYNT_API__PORT` | API bind port | `3001` |

See `crates/klynt-domain/src/config.rs` for the full configuration shape.
