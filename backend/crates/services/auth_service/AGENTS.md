# auth_service — Authentication & Authorization

## Overview

Service handling all **authentication flows**: registration, login, email verification, password reset, and logout. A **deep module** with a small interface hiding complex implementation.

## Structure

```
auth_service/
├── src/
│   ├── application/              # Use cases (orchestration)
│   │   ├── ports.rs             # Local port definitions (layer-specific)
│   │   └── use_cases/
│   │       ├── login.rs
│   │       ├── register.rs
│   │       ├── verify_email.rs
│   │       ├── password_reset.rs
│   │       └── logout.rs
│   ├── domain/                   # Domain logic (business rules)
│   │   ├── password_policy.rs   # Password validation
│   │   ├── session_token.rs     # Session token generation
│   │   └── token_store.rs      # Token management
│   ├── infrastructure/          # External integrations
│   │   └── email_renderer.rs    # Email content generation
│   ├── models/                   # Request/response DTOs
│   ├── builder.rs               # Builder pattern
│   ├── error.rs                 # Service-specific errors
│   └── lib.rs
├── tests/                        # Integration tests
└── Cargo.toml
```

## Public Interface

Six core methods — all authentication flows:

| Method | Purpose | Returns |
|--------|---------|---------|
| `login()` | Authenticate and create session | `LoginResponse` |
| `register()` | Register with email verification | `RegistrationResponse` |
| `verify_email()` | Complete email verification | `EmailVerifyResponse` |
| `request_password_reset()` | Initiate password reset | `PasswordResetInitResponse` |
| `reset_password()` | Complete password reset | `PasswordResetResponse` |
| `logout()` | End session | `()` |

## Deep Implementation

Behind each method, the service orchestrates:

1. **Validation** — Password policy, email format
2. **Persistence** — User lookups/creates via `UserRepository`
3. **Tokens/Sessions** — Managed via `SessionStore` / `TokenStore`
4. **Security** — Password hashing via `PasswordHasher`
5. **Notifications** — Email sending via `EmailSender`
6. **Audit** — Event logging via `AuditLogger`

## Architecture Layers

### 1. Application Layer (`application/`)

**Use cases** orchestrate domain logic and infrastructure:

```rust
// application/use_cases/login.rs
pub async fn execute(
    service: &AuthService,
    ctx: &ExecutionContext,
    request: LoginRequest,
) -> Result<LoginResponse, AuthError> {
    // 1. Validate input
    // 2. Find user
    // 3. Verify password
    // 4. Create session
    // 5. Log audit event
}
```

### 2. Domain Layer (`domain/`)

Business rules independent of external concerns:

```rust
// domain/password_policy.rs
impl PasswordPolicy {
    pub fn validate(&self, password: &str) -> Result<(), PasswordPolicyError> {
        // Length, complexity, common password checks
    }
}
```

### 3. Infrastructure Layer (`infrastructure/`)

External integrations (email rendering, etc.):

```rust
// infrastructure/email_renderer.rs
impl EmailRenderer {
    pub fn render_verification_email(&self, token: &str) -> Email {
        // HTML generation
    }
}
```

## Builder Pattern

Construct the service with all dependencies:

```rust
let auth_service = AuthService::builder()
    .config(config)
    .user_repository(user_repo)
    .session_store(session_store)
    .token_store(token_store)
    .password_hasher(hasher)
    .email_sender(email_sender)
    .audit_logger(audit_logger)
    .clock(clock)
    .build()?;
```

## When to Use This Service

**DO** use when:
- Handling authentication-related HTTP endpoints
- Need to verify user credentials
- Need to manage user sessions
- Implementing password reset flow

**DON'T** use when:
- Managing user profiles (use `user_service`)
- Only validating sessions (use `session_service`)
- Purely authorization checks (future `authorization_service`)

## Password Policy

Default requirements (configurable):
- Minimum 8 characters
- At least one letter
- At least one number
- Not in common password list

## Testing

Unit tests use `base::testkit` fakes:

```rust
use base::testkit::{FakeUserRepository, FakeSessionStore, TestClock};

#[tokio::test]
async fn test_login_with_valid_credentials() {
    let user_repo = FakeUserRepository::new();
    let session_store = FakeSessionStore::new();
    let clock = TestClock::new();
    // ... test logic
}
```

## Dependencies

- `base` — Port interfaces
- `domain` — Domain types and contracts
- `chrono` — Time handling
- `uuid` — ID generation

## Related Documentation

- [Backend AGENTS.md](../../../AGENTS.md) — Overall architecture
- [base AGENTS.md](../../base/AGENTS.md) — Port definitions
- [user_service AGENTS.md](../user_service/AGENTS.md) — User profiles
- [session_service AGENTS.md](../session_service/AGENTS.md) — Session management
