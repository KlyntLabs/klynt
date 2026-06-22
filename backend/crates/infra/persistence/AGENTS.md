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
│   │   └── session.rs        # PgSessionStore
│   ├── stores/                # Redis implementations
│   │   ├── mod.rs
│   │   ├── session.rs         # RedisSessionStore
│   │   └── token.rs           # RedisTokenStore
│   ├── rate_limiter.rs        # Redis-based rate limiting
│   ├── idempotency.rs         # Redis-based idempotency
│   ├── crypto.rs              # Argon2PasswordHasher
│   ├── email.rs               # MockEmailSender (logs to stdout)
│   └── lib.rs
├── tests/                     # Integration tests with real DB
└── Cargo.toml
```

## Responsibilities

### 1. Repository Implementations

| Port | Implementation | Store |
|------|----------------|-------|
| `UserRepository` | `PgUserRepository` | Postgres |
| `SessionStore` | `PgSessionStore` | Postgres |
| `SessionStore` | `RedisSessionStore` | Redis (preferred) |
| `TokenStore` | `RedisTokenStore` | Redis |

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

### Session Store

```rust
use redis::AsyncCommands;

impl SessionStore for RedisSessionStore {
    async fn create(&self, session: &Session) -> Result<(), SessionError> {
        let key = format!("session:{}", session.token());
        let ttl = session.expires_in().num_seconds() as usize;
        self.conn
            .set_ex(key, serde_json::to_vec(session)?, ttl)
            .await?;
    }
}
```

### Token Store

```rust
impl TokenStore for RedisTokenStore {
    async fn create(&self, token: &str, kind: TokenKind, ttl: i64) -> Result<(), TokenError> {
        // Store with expiration
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
