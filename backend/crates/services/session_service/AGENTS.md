# session_service — Session Lifecycle Management

## Overview

Service responsible for **session lifecycle**: creation, validation, and invalidation. Extracted from the gateway to provide a dedicated business service for session management.

## Structure

```
session_service/
├── src/
│   ├── lib.rs              # Service definition
│   └── error.rs           # Service-specific errors
└── Cargo.toml
```

## Public Interface

Three core methods for session management:

| Method | Purpose | Returns |
|--------|---------|---------|
| `create_session()` | Create session for user | `Session` |
| `validate_session()` | Validate session token | `Session` |
| `invalidate_session()` | End a session | `()` |

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
    session_store: Arc<dyn SessionStore>,
    clock: Arc<dyn Clock>,
}
```

| Dependency | Purpose |
|------------|---------|
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

// Create session
let session = session_service
    .create_session(user_id, session_duration)
    .await?;

// Validate session
let session = session_service
    .validate_session(&token)
    .await?;

// Invalidate session
session_service
    .invalidate_session(&token)
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

#[tokio::test]
async fn test_create_and_validate_session() {
    let session_store = FakeSessionStore::new();
    let clock = TestClock::new();
    let service = SessionService::new(session_store, clock);
    // ... test logic
}
```

## Error Handling

| Error | When Returned |
|-------|---------------|
| `SessionError::NotFound` | Session doesn't exist or already invalidated |
| `SessionError::Expired` | Session exists but past expiry |
| `SessionError::InvalidInput` | Invalid token format |
| `SessionError::Internal` | Unexpected storage error |

## Dependencies

- `base` — `SessionStore`, `Clock` ports
- `domain` — `UserId`, `Session` types
- `chrono` — Time/duration handling
- `thiserror` — Error derive

## Related Documentation

- [Backend AGENTS.md](../../../AGENTS.md) — Overall architecture
- [base AGENTS.md](../../base/AGENTS.md) — Port definitions
- [auth_service AGENTS.md](../auth_service/AGENTS.md) — Authentication flows
