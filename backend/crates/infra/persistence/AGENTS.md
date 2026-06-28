# persistence — Postgres & Redis Adapters

## Overview

Infrastructure crate providing **concrete implementations** of `base` ports using PostgreSQL and Redis.

## Structure

```
persistence/
├── src/
│   ├── repositories/          # Postgres implementations
│   │   ├── mod.rs
│   │   ├── user.rs            # PgUserRepository
│   │   ├── session.rs         # PgSessionStore
│   │   ├── cached_session_store.rs # Redis-backed cache over PgSessionStore
│   │   ├── token.rs           # PgTokenStore
│   │   ├── audit_event.rs     # PgAuditLogger
│   │   └── idempotency.rs     # RedisIdempotencyStore
│   ├── rate_limiter.rs        # Redis-based rate limiting
│   ├── password_hasher.rs     # Argon2PasswordHasher
│   ├── email.rs               # MockEmailSender (logs to stdout)
│   ├── health.rs              # DB/Redis health checks
│   └── lib.rs
├── tests/                     # Integration tests with real DB
└── Cargo.toml
```

## Responsibilities

### 1. Repository Implementations

| Port | Implementation | Store |
|------|----------------|-------|
| `UserRepository` | `PgUserRepository` | Postgres |
| `SessionStore` | `CachedSessionStore` | Postgres + Redis cache |
| `TokenStore` | `PgTokenStore` | Postgres |
| `AuditLogger` | `PgAuditLogger` | Postgres |
| `IdempotencyStore` | `RedisIdempotencyStore` | Redis |

### 2. Cross-Cutting Features

| Feature | Implementation |
|---------|----------------|
| Password hashing | `Argon2PasswordHasher` |
| Email sending | `MockEmailSender` (logs, no SMTP) |
| Rate limiting | `RedisRateLimiter` (Redis), `NoOpRateLimiter` (always allows) |
| Idempotency | `RedisIdempotencyStore` |

## When to Use This Crate

**DO** use when:
- Wiring dependencies in the gateway composition root
- Writing integration tests against real Postgres/Redis
- Adding new storage implementations of ports

**DON'T** use when:
- Writing service unit tests (use `base::testkit` instead)
- Need domain types (use `domain` directly)

## Repository Pattern

All repositories follow this pattern:

```rust
pub struct PgUserRepository {
    pool: PgPool,
}

impl PgUserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl UserRepository for PgUserRepository {
    async fn create(&self, user: &User) -> Result<User, RepositoryError> {
        // SQLx query implementation
    }
    // ... other UserRepository methods
}
```

## Error Handling

All implementations convert to their port's error type:

```rust
impl From<sqlx::Error> for RepositoryError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            // Map specific SQL errors to domain errors
        }
    }
}
```

## Redis Usage

### Cached Session Store

`CachedSessionStore` wraps `PgSessionStore` with a Redis cache for hot lookups. It stores session records as serialized JSON and falls back to Postgres on cache misses.

### Token Store

Tokens are persisted in Postgres via `PgTokenStore`.

```rust
impl TokenStore for PgTokenStore {
    async fn save(&self, ctx: &ExecutionContext, token: &Token) -> Result<(), TokenError> {
        // Insert token hash with kind and expiry
    }
}
```

## Testing

Integration tests require real Postgres/Redis:

```bash
export DATABASE_URL=postgresql://klynt:klynt@localhost:5432/test
export REDIS_URL=redis://localhost:6379/0
cargo nextest run --package persistence
```

## Dependencies

- `base` — Port interfaces to implement
- `config` — Configuration
- `domain` — Domain types
- `observability` — Tracing/instrumentation
- `sqlx` — Postgres client
- `redis` — Redis client
- `argon2` — Password hashing

## Related Documentation

- [Backend AGENTS.md](../../../AGENTS.md) — Overall architecture
- [base AGENTS.md](../../base/AGENTS.md) — Port definitions
- [domain AGENTS.md](../../shared/domain/AGENTS.md) — Domain types
- [observability AGENTS.md](../observability/AGENTS.md) — Observability
