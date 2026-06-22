# session_service — Session Lifecycle Management

## Overview

Service responsible for **session lifecycle**: creation, validation, and invalidation. Extracted from the gateway to provide a dedicated business service for session management.

## Structure

```
session_service/
├── src/
│   ├── lib.rs              # Service definition
│   ├── config.rs           # Session configuration (durations)
│   └── error.rs            # Service-specific errors
└── Cargo.toml
```

## Public Interface

Core methods for session management:

| Method | Purpose | Returns |
|--------|---------|---------|
| `create()` | Create a default access session for user | `CreatedSession` |
| `create_access()` | Create access session, optionally extended for "remember me" | `CreatedSession` |
| `create_refresh()` | Create refresh session for user | `CreatedSession` |
| `create_with_kind()` | Create session of a specific kind | `CreatedSession` |
| `validate()` | Validate any session token | `Session` |
| `validate_access()` | Validate token and reject refresh tokens | `Session` |
| `invalidate()` | End a session | `()` |
| `invalidate_pair()` | End a session and its paired session | `()` |

## Design Philosophy

### Why a Dedicated Service?

Session management is **business logic**, not infrastructure concern:
- Session creation has business rules (TTL, limits, etc.)
- Validation crosses multiple concerns (token, expiry, user status)
- Invalidiation may have side effects (audit logging)

By extracting from gateway, we:
- Can test session logic independently
- Share session management across multiple gateways
- Keep HTTP concerns separate from session concerns

## Dependencies

The service depends on **only two ports**:

```rust
pub struct SessionService {
    config: SessionConfig,
    session_store: Arc<dyn SessionStore>,
    clock: Arc<dyn Clock>,
}
```

| Dependency | Purpose |
|------------|---------|
| `SessionConfig` | Session lifetime configuration |
| `SessionStore` | Session persistence |
| `Clock` | Time for expiry calculations |

## When to Use This Service

**DO** use when:
- Creating a session after authentication
- Validating a session token in middleware
- Logging out a user
- Checking session validity for protected routes

**DON'T** use when:
- Authenticating credentials (use `auth_service`)
- Managing user profiles (use `user_service`)
- Pure persistence testing (use `base::testkit`)

## Example Usage

```rust
use session_service::SessionService;
use base::ports::{SessionStore, Clock};
use domain::UserId;
use uuid::Uuid;

let pair_id = Uuid::new_v4();

// Create access session (default TTL)
let access = session_service
    .create_access(ctx, user_id, false, Some(pair_id))
    .await?;

// Create refresh session (long TTL)
let refresh = session_service
    .create_refresh(ctx, user_id, Some(pair_id))
    .await?;

// Validate access token for API authorization
let session = session_service
    .validate_access(&token)
    .await?;

// Invalidate a session and its paired session
session_service
    .invalidate_pair(&token)
    .await?;
```

## Session Behavior

### Creation

- Generates unique session token
- Sets expiry based on current time + duration
- Stores in configured `SessionStore`

### Validation

- Retrieves session by token
- Checks expiry against current time
- Returns error if not found or expired

### Invalidaton

- Removes session from store
- Idempotent (no error if already invalid)

## Testing

Unit tests use `FakeSessionStore` from `base::testkit`:

```rust
use base::testkit::{FakeSessionStore, TestClock};
use domain::UserId;
use std::sync::Arc;

#[tokio::test]
async fn test_create_and_validate_session() {
    let session_store = Arc::new(FakeSessionStore::new());
    let clock = Arc::new(TestClock::new());
    let service = SessionService::with_clock(
        SessionConfig::default(),
        session_store,
        clock,
    );
    // ... test logic
}
```

## Error Handling

| Error | When Returned |
|-------|---------------|
| `SessionError::InvalidToken` | Session doesn't exist, expired, or wrong kind (e.g., refresh token used as access) |
| `SessionError::StoreError` | Underlying storage error |

## Dependencies

- `base` — `SessionStore`, `Clock` ports
- `domain` — `UserId`, `Session` types
- `chrono` — Time/duration handling
- `thiserror` — Error derive

## Related Documentation

- [Backend AGENTS.md](../../../AGENTS.md) — Overall architecture
- [base AGENTS.md](../../base/AGENTS.md) — Port definitions
- [auth_service AGENTS.md](../auth_service/AGENTS.md) — Authentication flows
