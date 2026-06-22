# domain — Domain Types & Contracts

## Overview

Central crate for **domain types**, **contracts**, and **errors** shared across the backend. This crate contains the ubiquitous language of the Klynt platform.

**Rule:** No infrastructure or framework concerns — pure domain logic only.

## Structure

```
domain/
├── src/
│   ├── user.rs         # User, UserProfile, UserId types
│   ├── auth.rs         # Auth credentials, authentication types
│   ├── role.rs         # Role, permissions (Admin, Instructor, Student)
│   ├── error.rs        # Domain errors (not HTTP errors)
│   ├── contracts/      # Request/response DTOs for service boundaries
│   │   ├── auth.rs     # LoginRequest, LoginResponse, etc.
│   │   ├── user.rs     # UserUpdate, UserResponse, etc.
│   │   └── mod.rs
│   └── lib.rs
└── Cargo.toml
```

## Core Types

### User Types (`user.rs`)

| Type | Purpose |
|------|---------|
| `UserId` | Strongly-typed UUID wrapper for user identification |
| `User` | Core user entity (id, email, role, timestamps, metadata) |
| `UserProfile` | Extended profile information (name, bio, avatar) |
| `UserStatus` | User lifecycle states (Active, Pending, Suspended, Deleted) |

### Auth Types (`auth.rs`)

| Type | Purpose |
|------|---------|
| `AuthCredentials` | Email + password for authentication |
| `EmailVerification` | Verified email tracking |
| `PasswordReset` | Password reset flow state |

### Role Types (`role.rs`)

| Type | Purpose |
|------|---------|
| `Role` | User roles (Admin, Instructor, Student) |
| `Permission` | Granular permissions (future use) |

### Error Types (`error.rs`)

| Error | When Used |
|-------|-----------|
| `DomainError::NotFound` | Entity doesn't exist |
| `DomainError::Conflict` | Constraint violation (duplicate email, etc.) |
| `DomainError::Unauthorized` | Authentication/authorization failure |
| `DomainError::InvalidInput` | Validation failure |
| `DomainError::Internal` | Unexpected errors (logged, not exposed) |

## Contracts (`contracts/`)

Contracts are **data transfer objects** defining the shape of requests and responses at service boundaries.

### When to Add Contracts

Add to `contracts/` when:
- Multiple callers need the same request/response shape
- Defining the public API of a service
- Shape is used across service boundaries

**DO NOT** use contracts for:
- Internal service types (keep internal to service)
- Database entities (use domain types directly)
- One-off handler types (define inline)

### Existing Contracts

**`contracts/auth.rs`:**
- `LoginRequest` / `LoginResponse`
- `RegistrationRequest`
- `EmailVerificationRequest`
- `PasswordResetRequest` / `PasswordResetResponse`

**`contracts/user.rs`:**
- `UserResponse` — Public user representation
- `UserUpdateRequest` — Profile update fields

## Patterns

### 1. Strongly-Typed IDs

```rust
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct UserId(Uid);

impl UserId {
    pub fn new() -> Self { Self(Uuid::new_v4()) }
    pub fn from_uuid(id: Uuid) -> Self { Self(id) }
    pub fn as_uuid(&self) -> &Uuid { &self.0 }
}
```

### 2. Builder Pattern for Complex Types

```rust
impl User {
    pub fn builder() -> UserBuilder { /* ... */ }
}
```

### 3. Validation in Domain

Domain types enforce their own invariants:

```rust
impl User {
    pub fn new(email: String, role: Role) -> Result<Self, DomainError> {
        // Validate email format, etc.
    }
}
```

## Dependencies

**Zero infrastructure dependencies** — only:
- `chrono` — Time types
- `serde` — Serialization
- `uuid` — IDs
- `validator` — Validation derive macros
- `thiserror` — Error derive macros

## Rules

1. **No async** — Domain types are synchronous data structures
2. **No traits** (except `Error` derive) — Keep domain types simple
3. **No HTTP/Web types** — Those belong in gateway or contracts
4. **Immutable by default** — Use builder pattern for construction
5. **Validation at construction** — Fail fast, never invalid state

## Related Documentation

- [Backend AGENTS.md](../../../AGENTS.md) — Overall architecture
- [base AGENTS.md](../../base/AGENTS.md) — Canonical ports
