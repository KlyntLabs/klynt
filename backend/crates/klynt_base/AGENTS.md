# klynt_base — Canonical Ports & Testkit

## Overview

Foundation crate defining **canonical trait interfaces** (ports) and **in-memory test doubles** (testkit) for the entire backend. This is where dependency inversion is enforced.

## Structure

```
klynt_base/
├── src/
│   ├── ports/          # Canonical trait definitions
│   │   ├── repository.rs      # UserRepository
│   │   ├── session.rs         # SessionStore, SessionToken
│   │   ├── token.rs           # TokenStore, TokenKind
│   │   ├── audit.rs           # AuditLogger
│   │   ├── email.rs           # EmailSender, EmailError
│   │   ├── password_hasher.rs # PasswordHasher, PasswordHashError
│   │   ├── clock.rs           # Clock, SystemClock
│   │   └── http_error.rs      # HttpError (gateway-facing error mapping)
│   ├── testkit/        # In-memory fakes for testing
│   │   ├── repository.rs      # FakeUserRepository
│   │   ├── session.rs         # FakeSessionStore
│   │   ├── token.rs           # FakeTokenStore
│   │   ├── clock.rs           # TestClock
│   │   ├── crypto.rs          # TestPasswordHasher
│   │   ├── domain.rs          # Test domain helpers
│   │   └── context.rs         # ExecutionContext helpers
│   ├── base/           # Base type definitions
│   ├── ctx/            # ExecutionContext types
│   └── lib.rs
└── Cargo.toml
```

## Canonical Ports

### When to Add a New Port

Add a port to `klynt_base::ports` when:

1. **Multiple services** need the same capability
2. **Infrastructure dependency** needs abstraction for testing
3. **Cross-cutting concern** that services shouldn't implement directly

**DO NOT** add ports for:
- One-off concerns used by a single service
- Pure business logic (belongs in domain)
- HTTP-specific types (belongs in gateway)

### Existing Ports

| Port | Purpose | Methods |
|------|---------|---------|
| `UserRepository` | User persistence | `create`, `by_id`, `by_email`, `update`, `list`, `delete` |
| `SessionStore` | Session lifecycle | `create`, `validate`, `invalidate`, `by_token` |
| `TokenStore` | Verification tokens | `create`, `consume`, `by_token` |
| `AuditLogger` | Audit trail | `log_event` |
| `EmailSender` | Transactional email | `send_email` |
| `PasswordHasher` | Password security | `hash`, `verify` |
| `Clock` | Time abstraction | `now` |
| `HttpError` | Error mapping for gateway | `to_http_status`, `safe_error_code` |

## Testkit

### Purpose

Provides **in-memory implementations** of all ports for fast, reliable unit testing without external services (Postgres, Redis).

### When to Use

**ALWAYS** prefer testkit fakes for:
- Service unit tests
- Testing business logic in isolation
- CI/CD pipelines requiring speed

Use real implementations only for:
- Integration tests verifying actual database behavior
- Adapter testing (e.g., testing `PgUserRepository` against real Postgres)

### TestKit Components

| Fake | Real Implementation |
|------|---------------------|
| `FakeUserRepository` | `PgUserRepository` |
| `FakeSessionStore` | `RedisSessionStore` |
| `FakeTokenStore` | `RedisTokenStore` |
| `TestClock` | `SystemClock` |
| `TestPasswordHasher` | `Argon2PasswordHasher` |

### Example Usage

```rust
use klynt_base::testkit::{FakeUserRepository, TestClock};

#[tokio::test]
async fn test_user_registration() {
    let user_repo = FakeUserRepository::new();
    let clock = TestClock::new();
    // ... test logic using only fakes
}
```

## Patterns

### 1. Port Definition Pattern

```rust
// ports/my_port.rs
use async_trait::async_trait;
use klynt_domain::SomeType;

#[async_trait]
pub trait MyPort: Send + Sync {
    async fn do_something(&self, input: &SomeType) -> Result<(), PortError>;
}
```

### 2. Error Pattern

All ports should define a dedicated error type:
- Derive from `thiserror::Error`
- Include variants for not-found, conflict, and infra errors
- Map domain errors appropriately

### 3. TestKit Pattern

```rust
// testkit/my_port_fake.rs
use klynt_base::ports::MyPort;

pub struct FakeMyPort {
    // In-memory storage
}

impl FakeMyPort {
    pub fn new() -> Self { /* ... */ }
}

#[async_trait]
impl MyPort for FakeMyPort {
    async fn do_something(&self, input: &SomeType) -> Result<(), PortError> {
        // In-memory implementation
    }
}
```

## Dependencies

- **klynt_domain** — Domain types used in port signatures
- **async-trait** — Async trait support
- **chrono** — Time types
- **uuid** — ID types
- **axum** — HTTP status codes (for `HttpError` only)

## Build Features

- `testkit` — Exposes testkit module (enabled by default for dev, disabled for production)

## Related Documentation

- [Backend AGENTS.md](../../AGENTS.md) — Overall architecture
- [klynt_domain AGENTS.md](../shared/klynt_domain/AGENTS.md) — Domain types
