# user_service — User Profile Management

## Overview

Service responsible for **user profile management**: viewing profiles, updating information, changing passwords, and soft-deleting users.

## Structure

```
user_service/
├── src/
│   ├── lib.rs              # Service definition
│   └── error.rs           # Service-specific errors
└── Cargo.toml
```

## Public Interface

Core methods for user profile operations:

| Method | Purpose | Returns |
|--------|---------|---------|
| `get_profile()` | Get user profile by ID | `UserProfile` |
| `update_profile()` | Update user profile fields | `UserProfile` |
| `change_password()` | Change user password | `()` |
| `list_users()` | List users with pagination | `Vec<User>` |
| `soft_delete_user()` | Soft delete a user | `()` |

## When to Use This Service

**DO** use when:
- Implementing user profile endpoints
- Handling user settings changes
- Admin user management features
- User account deletion

**DON'T** use when:
- Authenticating users (use `auth_service`)
- Managing sessions (use `session_service`)
- Pure persistence queries (use `UserRepository` directly)

## Dependencies

```rust
pub struct UserService {
    user_repository: Arc<dyn UserRepository>,
    password_hasher: Arc<dyn PasswordHasher>,
    audit_logger: Arc<dyn AuditLogger>,
    clock: Arc<dyn Clock>,
}
```

| Dependency | Purpose |
|------------|---------|
| `UserRepository` | User persistence |
| `PasswordHasher` | Password hashing for changes |
| `AuditLogger` | Audit logging for changes |
| `Clock` | Timestamps |

## Operation Details

### Get Profile

- Retrieves user by ID
- Returns error if not found or soft-deleted
- Returns public-safe profile (no internal fields)

### Update Profile

- Validates input data
- Updates only allowed fields
- Audits the change
- Returns updated profile

### Change Password

- Verifies old password
- Validates new password against policy
- Hashes new password
- Updates in repository
- Invalidates existing sessions (via session invalidation)
- Audits the change

### List Users

- Supports pagination (limit/offset)
- Filters out soft-deleted users
- Returns limited public fields

### Soft Delete

- Marks user as deleted (sets status)
- Does NOT remove data (preserves audit trail)
- Invalidates all user sessions
- Audits the deletion

## Builder Pattern

```rust
let user_service = UserService::builder()
    .user_repository(user_repo)
    .password_hasher(hasher)
    .audit_logger(audit_logger)
    .clock(clock)
    .build()?;
```

## Testing

Unit tests use `base::testkit` fakes:

```rust
use base::testkit::{FakeUserRepository, TestPasswordHasher};
use domain::UserId;

#[tokio::test]
async fn test_update_profile() {
    let user_repo = FakeUserRepository::new();
    let hasher = TestPasswordHasher::new();
    // ... test logic
}
```

## Error Handling

| Error | When Returned |
|-------|---------------|
| `UserError::NotFound` | User doesn't exist |
| `UserError::InvalidInput` | Validation failure |
| `UserError::Unauthorized` | Not authorized (future: role check) |
| `UserError::Conflict` | Constraint violation (email duplicate, etc.) |
| `UserError::Internal` | Unexpected error |

## Privacy & Security

### Profile Exposure

- Get/profile operations return **public-safe** subset of fields
- Internal fields (metadata, internal notes) never exposed
- Password hashes never included in responses

### Audit Trail

All mutations are logged:
- Profile updates
- Password changes
- Soft deletes

### Session Invalidation

Password changes invalidate existing sessions for security.

## Dependencies

- `base` — Port interfaces
- `domain` — Domain types and contracts
- `persistence` — Concrete implementations (only in wiring)
- `telemetry` — Audit logging
- `chrono` — Time handling
- `uuid` — ID handling
- `validator` — Input validation
- `thiserror` — Error derive

## Related Documentation

- [Backend AGENTS.md](../../../AGENTS.md) — Overall architecture
- [base AGENTS.md](../../base/AGENTS.md) — Port definitions
- [auth_service AGENTS.md](../auth_service/AGENTS.md) — Authentication flows
