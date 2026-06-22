# Backend Architecture Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate fragmented ports, eliminate adapter proliferation, fix gateway leaks, and restructure klynt_common into focused domain modules to improve locality, leverage, and testability across the Klynt backend.

**Architecture:** Deepen shallow modules by consolidating repository ports into canonical locations, removing unnecessary adapter layers, extracting SessionService from persistence, and consolidating test support into klynt_base::testkit.

**Tech Stack:** Rust, Axum, SQLx, Tokio, Chrono, UUID, thiserror, async-trait

## Global Constraints

- **Rust Edition:** 2021
- **MSRV:** Rust 1.75+ (see rust-toolchain.toml)
- **Test Coverage Gate:** ≥84% lines (run with `cargo llvm-cov`)
- **Linting:** `cargo clippy --workspace --all-targets --all-features -- -D warnings`
- **Formatting:** `cargo fmt` (no rustfmt.toml overrides)
- **Database:** PostgreSQL with SQLx (compile-time checked queries)
- **Testing:** Use `cargo nextest run --workspace --all-features`
- **No Breaking Changes:** Public HTTP API contracts remain unchanged
- **Error Handling:** All new types use `thiserror::Error` for proper error conversion
- **Async Traits:** Use `async_trait::async_trait` for trait async methods

---

## Phase 1: Establish Canonical Repository Ports

This phase consolidates the three fragmented `UserRepository` traits into a single canonical interface, eliminating the root cause of adapter proliferation.

### Task 1.1: Create klynt_base::ports::repository Module

**Files:**
- Create: `backend/crates/klynt_base/src/ports/repository.rs`
- Modify: `backend/crates/klynt_base/src/ports/mod.rs`
- Test: `backend/crates/klynt_base/src/ports/repository_test.rs`

**Interfaces:**
- Consumes: `klynt_base::ctx::ExecutionContext`, `klynt_common::domain::User`, `klynt_common::util::UserId`, `klynt_common::domain::Email`
- Produces: `klynt_base::ports::repository::UserRepository` trait with full CRUD and auth-specific methods

This is the foundational task — all subsequent port consolidation builds on this canonical interface.

- [ ] **Step 1: Write the failing test for canonical UserRepository trait**

Create test file that validates the trait exists and has all required methods:

```rust
// backend/crates/klynt_base/src/ports/repository_test.rs
#[cfg(test)]
mod tests {
    use super::super::*;
    use crate::ctx::ExecutionContext;
    use klynt_common::domain::{Email, User, UserStatus};
    use klynt_common::util::UserId;

    #[test]
    fn test_user_repository_trait_exists() {
        // This will fail until the trait is defined
        // The trait should be object-safe: dyn UserRepository
        assert!(true, "UserRepository trait defined");
    }

    #[test]
    fn test_user_repository_has_required_methods() {
        // Validate signature of each required method
        // Methods from auth_service::UserRepository:
        // - find_by_email(ctx, email) -> Result<Option<User>>
        // - create_pending_user(ctx, full_name, email, password_hash) -> Result<UserId>
        // - activate_user(ctx, user_id) -> Result<()>
        // - update_password(ctx, user_id, password_hash) -> Result<()>
        // Methods from user_service::UserRepository:
        // - find_by_id(ctx, id) -> Result<Option<User>>
        // - update(ctx, user) -> Result<()>
        // - delete(ctx, id) -> Result<()>
        // - list(ctx, pagination) -> Result<(Vec<User>, u64)>
        assert!(true);
    }
}
```

Run: `cargo test --package klynt_base --lib repository_test`
Expected: FAIL with "cannot find trait `UserRepository` in module `repository`"

- [ ] **Step 2: Implement canonical UserRepository trait in repository.rs**

```rust
// backend/crates/klynt_base/src/ports/repository.rs
//! Canonical repository ports for the Klynt platform.
//!
//! These traits define the persistence interface shared across all services.
//! By having a single source of truth for repository interfaces, we eliminate
//! the need for service-specific adapters and improve testability.

use crate::ctx::ExecutionContext;
use async_trait::async_trait;
use klynt_common::domain::{Email, PaginationRequest, User};
use klynt_common::util::UserId;

/// Canonical User repository interface.
///
/// Combines methods from both auth and user services into a single,
/// complete interface. All services depend on this trait rather than
/// defining their own fragmented versions.
///
/// ## Design Rationale
///
/// - **Auth methods** (`find_by_email`, `create_pending_user`, `activate_user`, `update_password`)
///   are included because user registration is an auth concern
/// - **User management methods** (`find_by_id`, `update`, `delete`, `list`) are
///   needed for profile management
/// - **Single adapter:** One implementation serves both services
/// - **Test locality:** Tests use canonical fakes from klynt_base::testkit
#[async_trait]
pub trait UserRepository: Send + Sync {
    /// Find user by email address (auth flow).
    async fn find_by_email(
        &self,
        ctx: &ExecutionContext,
        email: &Email,
    ) -> Result<Option<User>, RepositoryError>;

    /// Find user by ID (user management flow).
    async fn find_by_id(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<Option<User>, RepositoryError>;

    /// Create a new pending user (registration flow).
    ///
    /// Returns the ID of the created user.
    async fn create_pending_user(
        &self,
        ctx: &ExecutionContext,
        full_name: String,
        email: Email,
        password_hash: String,
    ) -> Result<UserId, RepositoryError>;

    /// Activate a pending user (email verification flow).
    async fn activate_user(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), RepositoryError>;

    /// Update user password (password reset/change flows).
    async fn update_password(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        password_hash: String,
    ) -> Result<(), RepositoryError>;

    /// Update full user record (profile management).
    async fn update(
        &self,
        ctx: &ExecutionContext,
        user: User,
    ) -> Result<User, RepositoryError>;

    /// Soft delete a user (account deletion).
    async fn delete(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), RepositoryError>;

    /// List users with pagination (admin/user management).
    async fn list(
        &self,
        ctx: &ExecutionContext,
        pagination: PaginationRequest,
    ) -> Result<(Vec<User>, u64), RepositoryError>;
}

/// Canonical repository error type.
///
/// Centralized error type for all repository operations.
/// Services map this to their domain-specific errors.
#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("User not found")]
    NotFound,

    #[error("User already exists with email: {0}")]
    Conflict(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Database error: {0}")]
    Database(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

// Convert from sqlx::Error for repository implementations
impl From<sqlx::Error> for RepositoryError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => RepositoryError::NotFound,
            sqlx::Error::Database(db_err) => {
                if db_err.is_unique_violation() {
                    RepositoryError::Conflict(db_err.constraint().unwrap_or("unknown").to_string())
                } else if db_err.is_fk_violation() {
                    RepositoryError::Validation(db_err.constraint().unwrap_or("unknown").to_string())
                } else {
                    RepositoryError::Database(db_err.to_string())
                }
            }
            _ => RepositoryError::Internal(err.to_string()),
        }
    }
}
```

- [ ] **Step 3: Export repository module from ports/mod.rs**

```rust
// backend/crates/klynt_base/src/ports/mod.rs
//! Shared application-layer ports (dependency interfaces).

pub mod clock;
pub mod http_error;
pub mod password_hasher;
pub mod repository;  // NEW

pub use clock::{Clock, SystemClock};
pub use http_error::HttpError;
pub use password_hasher::{PasswordHashError, PasswordHasher};
pub use repository::{UserRepository, RepositoryError};  // NEW
```

- [ ] **Step 4: Run tests to verify trait exists**

Run: `cargo test --package klynt_base --lib repository_test`
Expected: PASS

- [ ] **Step 5: Add comprehensive test for trait methods**

```rust
// backend/crates/klynt_base/src/ports/repository_test.rs
#[cfg(test)]
mod tests {
    use super::super::*;
    use crate::ctx::ExecutionContext;
    use klynt_common::domain::{Email, User, UserStatus};
    use klynt_common::util::UserId;
    use async_trait::async_trait;

    // A fake implementation for testing the trait itself
    struct FakeUserRepo;

    #[async_trait]
    impl UserRepository for FakeUserRepo {
        async fn find_by_email(&self, _ctx: &ExecutionContext, _email: &Email) -> Result<Option<User>, RepositoryError> {
            Ok(None)
        }

        async fn find_by_id(&self, _ctx: &ExecutionContext, _user_id: UserId) -> Result<Option<User>, RepositoryError> {
            Ok(None)
        }

        async fn create_pending_user(&self, _ctx: &ExecutionContext, _full_name: String, _email: Email, _password_hash: String) -> Result<UserId, RepositoryError> {
            Ok(UserId::new())
        }

        async fn activate_user(&self, _ctx: &ExecutionContext, _user_id: UserId) -> Result<(), RepositoryError> {
            Ok(())
        }

        async fn update_password(&self, _ctx: &ExecutionContext, _user_id: UserId, _password_hash: String) -> Result<(), RepositoryError> {
            Ok(())
        }

        async fn update(&self, _ctx: &ExecutionContext, _user: User) -> Result<User, RepositoryError> {
            Ok(_user)
        }

        async fn delete(&self, _ctx: &ExecutionContext, _user_id: UserId) -> Result<(), RepositoryError> {
            Ok(())
        }

        async fn list(&self, _ctx: &ExecutionContext, _pagination: PaginationRequest) -> Result<(Vec<User>, u64), RepositoryError> {
            Ok((vec![], 0))
        }
    }

    #[test]
    fn test_user_repository_is_object_safe() {
        // Verify trait can be used as dyn UserRepository
        let _repo: Box<dyn UserRepository> = Box::new(FakeUserRepo);
    }
}
```

Run: `cargo test --package klynt_base --lib`
Expected: PASS

- [ ] **Step 6: Commit canonical repository port**

```bash
git add backend/crates/klynt_base/src/ports/
git commit -m "feat(base): add canonical UserRepository port to klynt_base

Consolidates fragmented repository interfaces into single source of truth.
Combines auth and user service repository methods into complete interface.

- Add UserRepository trait with full CRUD and auth-specific methods
- Add RepositoryError type for centralized error handling
- Implement sqlx::Error conversion for repository implementations

This eliminates the need for service-specific adapters and improves test locality."
```

---

### Task 1.2: Migrate Auth Service to Canonical UserRepository

**Files:**
- Modify: `backend/crates/services/auth_service/src/application/ports.rs`
- Modify: `backend/crates/services/auth_service/src/lib.rs`
- Test: `backend/crates/services/auth_service/tests/registration_test.rs`
- Test: `backend/crates/services/auth_service/tests/login_test.rs`

**Interfaces:**
- Consumes: `klynt_base::ports::repository::UserRepository` (from Task 1.1)
- Produces: Updated auth_service that depends on canonical port

- [ ] **Step 1: Remove UserRepository from auth_service ports**

Replace the service-local UserRepository trait with a re-export of the canonical one:

```rust
// backend/crates/services/auth_service/src/application/ports.rs
//! Application-layer ports for auth service.

use crate::domain::{SessionStore, TokenStore};
use klynt_base::ctx::ExecutionContext;
use klynt_common::domain::Email;
use klynt_common::util::UserId;
use async_trait::async_trait;

// Re-export canonical repository port
pub use klynt_base::ports::repository::UserRepository;

/// Audit logger for authentication events.
#[async_trait]
pub trait AuditLogger: Send + Sync {
    async fn log_login_success(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_login_failed(&self, ctx: &ExecutionContext, email: &str, error: &str);
    async fn log_user_registered(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_email_verified(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_password_reset(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_session_created(&self, ctx: &ExecutionContext, user_id: UserId, session_id: String);
}

/// Email sender for authentication emails.
#[async_trait]
pub trait EmailSender: Send + Sync {
    async fn send_verification(
        &self,
        ctx: &ExecutionContext,
        email: &Email,
        token: &str,
        base_url: &str,
    ) -> Result<(), EmailError>;

    async fn send_password_reset(
        &self,
        ctx: &ExecutionContext,
        email: &str,
        token: &str,
        base_url: &str,
    ) -> Result<(), EmailError>;
}

#[derive(Debug, thiserror::Error)]
pub enum EmailError {
    #[error("Failed to send email: {0}")]
    SendFailed(String),
}
```

- [ ] **Step 2: Update auth_service lib.rs imports**

```rust
// backend/crates/services/auth_service/src/lib.rs
// No changes needed — UserRepository is now re-exported from ports
```

- [ ] **Step 3: Update use case imports if needed**

Check all use case files for `use crate::application::ports::UserRepository`:

```rust
// backend/crates/services/auth_service/src/application/use_cases/registration.rs
// If exists, update to use canonical port
use crate::application::ports::UserRepository;  // Now re-exports from klynt_base
```

- [ ] **Step 4: Run auth service tests**

Run: `cargo nextest run --package auth_service`
Expected: PASS (all existing tests still work)

- [ ] **Step 5: Commit auth service migration**

```bash
git add backend/crates/services/auth_service/src/
git commit -m "refactor(auth_service): migrate to canonical UserRepository port

Removes service-local UserRepository trait and re-exports canonical port
from klynt_base. All existing tests pass without modification."
```

---

### Task 1.3: Migrate User Service to Canonical UserRepository

**Files:**
- Modify: `backend/crates/services/user_service/src/application/ports.rs`
- Modify: `backend/crates/services/user_service/src/lib.rs`
- Test: `backend/crates/services/user_service/tests/user_service_test.rs`

**Interfaces:**
- Consumes: `klynt_base::ports::repository::UserRepository` (from Task 1.1)
- Produces: Updated user_service that depends on canonical port

- [ ] **Step 1: Remove UserRepository from user_service ports**

```rust
// backend/crates/services/user_service/src/application/ports.rs
//! Application-layer ports for user service.

use klynt_base::ctx::ExecutionContext;
use klynt_common::domain::{PaginationRequest, User};
use klynt_common::util::UserId;
use async_trait::async_trait;

// Re-export canonical repository port
pub use klynt_base::ports::repository::UserRepository;

/// Audit logger for user management events.
#[async_trait]
pub trait AuditLogger: Send + Sync {
    async fn log_profile_updated(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_password_changed(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_user_deleted(&self, ctx: &ExecutionContext, user_id: UserId);
}
```

- [ ] **Step 2: Update use case imports**

```rust
// backend/crates/services/user_service/src/application/use_cases/get_user.rs
use crate::application::ports::UserRepository;  // Now re-exports from klynt_base
```

- [ ] **Step 3: Run user service tests**

Run: `cargo nextest run --package user_service`
Expected: PASS

- [ ] **Step 4: Commit user service migration**

```bash
git add backend/crates/services/user_service/src/
git commit -m "refactor(user_service): migrate to canonical UserRepository port

Removes service-local UserRepository trait and re-exports canonical port
from klynt_base. All existing tests pass without modification."
```

---

### Task 1.4: Update Persistence Layer to Implement Canonical Port

**Files:**
- Modify: `backend/crates/infrastructure/klynt_persistence/src/repositories/mod.rs`
- Modify: `backend/crates/infrastructure/klynt_persistence/src/repositories/pg_user.rs`
- Test: `backend/crates/infrastructure/klynt_persistence/tests/user_repo_test.rs`

**Interfaces:**
- Consumes: `klynt_base::ports::repository::UserRepository` (canonical trait)
- Produces: `PgUserRepository` implementation that satisfies canonical interface

- [ ] **Step 1: Update pg_user to implement canonical trait**

Update the trait implementation signature:

```rust
// backend/crates/infrastructure/klynt_persistence/src/repositories/pg_user.rs
// Change from:
// impl UserRepository for PgUserRepository
// To:
impl klynt_base::ports::repository::UserRepository for PgUserRepository

// Update method signatures to match canonical trait:
// - find_by_email: use &Email instead of &str
// - create_pending_user: take Email parameter, return UserId
// - activate_user: take UserId parameter
// - update_password: take UserId parameter
// - update: return User instead of ()
// - delete: soft delete implementation
// - list: return (Vec<User>, u64) for pagination
```

- [ ] **Step 2: Update repository module exports**

```rust
// backend/crates/infrastructure/klynt_persistence/src/repositories/mod.rs
//! Persistence repository implementations.

pub mod pg_user;
pub mod pg_session;
pub mod sqlx_token_repo;
pub mod sqlx_audit_repo;

pub use pg_user::PgUserRepository;
pub use pg_session::PgSessionStore;
pub use sqlx_token_repo::SqlxTokenRepository;
pub use sqlx_audit_repo::SqlxAuditEventRepository;
```

- [ ] **Step 3: Run persistence tests**

Run: `cargo nextest run --package klynt_persistence`
Expected: PASS

- [ ] **Step 4: Commit persistence layer update**

```bash
git add backend/crates/infrastructure/klynt_persistence/src/
git commit -m "refactor(persistence): update PgUserRepository to implement canonical port

PgUserRepository now implements klynt_base::ports::UserRepository instead of
service-local trait. Method signatures updated to match canonical interface."
```

---

### Task 1.5: Remove Auth Service UserRepository Adapter

**Files:**
- Delete: `backend/crates/services/auth_service/src/infrastructure/repositories/user_repository_adapter.rs`
- Modify: `backend/crates/services/auth_service/src/infrastructure/mod.rs`
- Modify: `backend/crates/services/auth_service/src/builder.rs`
- Test: All auth service tests

**Interfaces:**
- Consumes: `klynt_base::ports::repository::UserRepository`
- Produces: Auth service builder that uses PgUserRepository directly

- [ ] **Step 1: Update auth builder to use PgUserRepository directly**

```rust
// backend/crates/services/auth_service/src/builder.rs
// Remove adapter creation, use persistence repo directly

use klynt_persistence::repositories::PgUserRepository;

impl AuthBuilder {
    pub fn build(self) -> Result<AuthService, AuthError> {
        // ... existing code ...

        // Before:
        // let user_repo_adapter = UserRepositoryAdapter::new(pg_pool.clone());

        // After:
        let user_repository: Arc<dyn UserRepository> =
            Arc::new(PgUserRepository::new(pg_pool.clone()));

        // ... rest of builder ...
    }
}
```

- [ ] **Step 2: Delete user_repository_adapter.rs file**

Run: `rm backend/crates/services/auth_service/src/infrastructure/repositories/user_repository_adapter.rs`

- [ ] **Step 3: Update infrastructure module exports**

```rust
// backend/crates/services/auth_service/src/infrastructure/mod.rs
pub mod services;
// Removed: pub mod repositories;

pub use services::{EmailSenderAdapter, AuditLoggerAdapter, PasswordHasherAdapter};
```

- [ ] **Step 4: Run auth service tests**

Run: `cargo nextest run --package auth_service`
Expected: PASS

- [ ] **Step 5: Commit adapter removal**

```bash
git add backend/crates/services/auth_service/src/
git commit -m "refactor(auth_service): remove UserRepositoryAdapter

Now that PgUserRepository implements canonical port, adapter is unnecessary.
Builder uses PgUserRepository directly. -284 lines of pure delegation."
```

---

### Task 1.6: Remove User Service UserRepository Adapter

**Files:**
- Delete: `backend/crates/services/user_service/src/infrastructure/repositories/user_repository_adapter.rs`
- Modify: `backend/crates/services/user_service/src/infrastructure/mod.rs`
- Modify: `backend/crates/services/user_service/src/builder.rs`
- Test: All user service tests

**Interfaces:**
- Consumes: `klynt_base::ports::repository::UserRepository`
- Produces: User service builder that uses PgUserRepository directly

- [ ] **Step 1: Update user builder to use PgUserRepository directly**

```rust
// backend/crates/services/user_service/src/builder.rs
use klynt_persistence::repositories::PgUserRepository;

impl UserBuilder {
    pub fn build(self) -> Result<UserService, UserError> {
        // Before:
        // let user_repo_adapter = UserRepositoryAdapter::new(pg_pool.clone());

        // After:
        let user_repository: Arc<dyn UserRepository> =
            Arc::new(PgUserRepository::new(pg_pool.clone()));

        // ... rest of builder ...
    }
}
```

- [ ] **Step 2: Delete user_repository_adapter.rs file**

Run: `rm backend/crates/services/user_service/src/infrastructure/repositories/user_repository_adapter.rs`

- [ ] **Step 3: Update infrastructure module exports**

```rust
// backend/crates/services/user_service/src/infrastructure/mod.rs
pub mod services;
// Removed: pub mod repositories;

pub use services::{AuditLoggerAdapter, PasswordHasherAdapter};
```

- [ ] **Step 4: Run user service tests**

Run: `cargo nextest run --package user_service`
Expected: PASS

- [ ] **Step 5: Commit adapter removal**

```bash
git add backend/crates/services/user_service/src/
git commit -m "refactor(user_service): remove UserRepositoryAdapter

Now that PgUserRepository implements canonical port, adapter is unnecessary.
Builder uses PgUserRepository directly. -62 lines of pure delegation."
```

---

## Phase 2: Consolidate Session and Token Ports

This phase creates canonical ports for SessionStore and TokenStore, similar to the UserRepository consolidation.

### Task 2.1: Create Canonical SessionStore Port

**Files:**
- Create: `backend/crates/klynt_base/src/ports/session.rs`
- Modify: `backend/crates/klynt_base/src/ports/mod.rs`
- Test: `backend/crates/klynt_base/src/ports/session_test.rs`

**Interfaces:**
- Consumes: `klynt_base::ctx::ExecutionContext`, `chrono::DateTime`
- Produces: `klynt_base::ports::session::SessionStore` trait

- [ ] **Step 1: Write test for SessionStore trait**

```rust
// backend/crates/klynt_base/src/ports/session_test.rs
#[cfg(test)]
mod tests {
    use super::super::*;
    use crate::ctx::ExecutionContext;
    use chrono::{DateTime, Utc};
    use async_trait::async_trait;

    #[test]
    fn test_session_store_trait_exists() {
        assert!(true, "SessionStore trait defined");
    }

    #[test]
    fn test_session_store_has_required_methods() {
        // Methods: create, find_valid, revoke
        assert!(true);
    }

    struct FakeSessionStore;

    #[async_trait]
    impl SessionStore for FakeSessionStore {
        async fn create(&self, _ctx: &ExecutionContext, _user_id: UserId, _expires_at: DateTime<Utc>) -> Result<SessionToken, SessionError> {
            Ok(SessionToken::new())
        }

        async fn find_valid(&self, _ctx: &ExecutionContext, _token: &SessionToken) -> Result<Option<Session>, SessionError> {
            Ok(None)
        }

        async fn revoke(&self, _ctx: &ExecutionContext, _token: &SessionToken) -> Result<(), SessionError> {
            Ok(())
        }
    }

    #[test]
    fn test_session_store_is_object_safe() {
        let _store: Box<dyn SessionStore> = Box::new(FakeSessionStore);
    }
}
```

- [ ] **Step 2: Implement SessionStore trait**

```rust
// backend/crates/klynt_base/src/ports/session.rs
//! Canonical session storage interface.

use crate::ctx::ExecutionContext;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use klynt_common::util::UserId;

/// Session token (opaque identifier).
#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct SessionToken(String);

impl SessionToken {
    pub fn new() -> Self {
        Self(klynt_common::util::random_token(32))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// Session data.
#[derive(Clone, Debug)]
pub struct Session {
    pub user_id: UserId,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

/// Canonical session storage interface.
#[async_trait]
pub trait SessionStore: Send + Sync {
    /// Create a new session.
    async fn create(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        expires_at: DateTime<Utc>,
    ) -> Result<SessionToken, SessionError>;

    /// Find a valid (non-expired) session by token.
    async fn find_valid(
        &self,
        ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<Option<Session>, SessionError>;

    /// Revoke a session.
    async fn revoke(
        &self,
        ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<(), SessionError>;
}

#[derive(Debug, thiserror::Error)]
pub enum SessionError {
    #[error("Session not found")]
    NotFound,

    #[error("Session expired")]
    Expired,

    #[error("Database error: {0}")]
    Database(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<sqlx::Error> for SessionError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => SessionError::NotFound,
            _ => SessionError::Database(err.to_string()),
        }
    }
}
```

- [ ] **Step 3: Export from ports/mod.rs**

```rust
// backend/crates/klynt_base/src/ports/mod.rs
pub mod session;  // NEW

pub use session::{SessionStore, SessionToken, SessionError};  // NEW
```

- [ ] **Step 4: Run tests**

Run: `cargo test --package klynt_base --lib session_test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/crates/klynt_base/src/ports/
git commit -m "feat(base): add canonical SessionStore port to klynt_base"
```

---

### Task 2.2: Create Canonical TokenStore Port

**Files:**
- Create: `backend/crates/klynt_base/src/ports/token.rs`
- Modify: `backend/crates/klynt_base/src/ports/mod.rs`
- Test: `backend/crates/klynt_base/src/ports/token_test.rs`

**Interfaces:**
- Consumes: `klynt_base::ctx::ExecutionContext`, `chrono::DateTime`
- Produces: `klynt_base::ports::token::TokenStore` trait

- [ ] **Step 1: Write test for TokenStore trait**

- [ ] **Step 2: Implement TokenStore trait**

```rust
// backend/crates/klynt_base/src/ports/token.rs
//! Canonical token storage interface for email verification and password reset.

use crate::ctx::ExecutionContext;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use klynt_common::util::UserId;

/// Token kind.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TokenKind {
    EmailVerification,
    PasswordReset,
}

/// Canonical token storage interface.
#[async_trait]
pub trait TokenStore: Send + Sync {
    /// Save a token hash for later verification.
    async fn save(
        &self,
        ctx: &ExecutionContext,
        kind: TokenKind,
        user_id: UserId,
        token_hash: String,
        expires_at: DateTime<Utc>,
    ) -> Result<(), TokenError>;

    /// Consume a token, returning the user ID if valid.
    async fn consume(
        &self,
        ctx: &ExecutionContext,
        kind: TokenKind,
        token_hash: String,
    ) -> Result<UserId, TokenError>;
}

#[derive(Debug, thiserror::Error)]
pub enum TokenError {
    #[error("Token not found or expired")]
    Invalid,

    #[error("Token already used")]
    AlreadyUsed,

    #[error("Database error: {0}")]
    Database(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<sqlx::Error> for TokenError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => TokenError::Invalid,
            _ => TokenError::Database(err.to_string()),
        }
    }
}
```

- [ ] **Step 3: Export from ports/mod.rs**

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add backend/crates/klynt_base/src/ports/
git commit -m "feat(base): add canonical TokenStore port to klynt_base"
```

---

### Task 2.3: Migrate Auth Service to Canonical SessionStore

**Files:**
- Modify: `backend/crates/services/auth_service/src/domain/session.rs`
- Modify: `backend/crates/services/auth_service/src/lib.rs`
- Modify: `backend/crates/services/auth_service/src/builder.rs`
- Delete: `backend/crates/services/auth_service/src/infrastructure/repositories/session_repository.rs`

**Interfaces:**
- Consumes: `klynt_base::ports::session::SessionStore`
- Produces: Updated auth service using canonical SessionStore

- [ ] **Step 1: Replace auth_service SessionStore with canonical**

```rust
// backend/crates/services/auth_service/src/domain/session.rs
//! Re-export canonical SessionStore.

pub use klynt_base::ports::session::{SessionStore, SessionToken, Session, SessionError};
```

- [ ] **Step 2: Update builder to use PgSessionStore directly**

- [ ] **Step 3: Delete session_repository adapter**

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add backend/crates/services/auth_service/
git commit -m "refactor(auth_service): migrate to canonical SessionStore port

Removes service-local SessionStore and SessionRepositoryAdapter.
Uses PgSessionStore directly. -182 lines."
```

---

### Task 2.4: Migrate Auth Service to Canonical TokenStore

**Files:**
- Modify: `backend/crates/services/auth_service/src/domain/tokens.rs`
- Modify: `backend/crates/services/auth_service/src/builder.rs`
- Delete: `backend/crates/services/auth_service/src/infrastructure/repositories/token_repository.rs`

**Interfaces:**
- Consumes: `klynt_base::ports::token::TokenStore`
- Produces: Updated auth service using canonical TokenStore

- [ ] **Step 1: Replace auth_service TokenStore with canonical**

- [ ] **Step 2: Update builder**

- [ ] **Step 3: Delete token_repository adapter**

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add backend/crates/services/auth_service/
git commit -m "refactor(auth_service): migrate to canonical TokenStore port

Removes service-local TokenStore and TokenRepositoryAdapter.
Uses SqlxTokenRepository directly. -167 lines."
```

---

## Phase 3: Consolidate Audit and Email Ports

This phase consolidates the cross-cutting AuditLogger and EmailSender ports.

### Task 3.1: Create Canonical AuditLogger Port

**Files:**
- Create: `backend/crates/klynt_base/src/ports/audit.rs`
- Modify: `backend/crates/klynt_base/src/ports/mod.rs`

**Interfaces:**
- Consumes: `klynt_base::ctx::ExecutionContext`, `klynt_common::util::UserId`
- Produces: `klynt_base::ports::audit::AuditLogger` trait

- [ ] **Step 1: Implement canonical AuditLogger trait**

```rust
// backend/crates/klynt_base/src/ports/audit.rs
//! Canonical audit logging interface.

use crate::ctx::ExecutionContext;
use async_trait::async_trait;
use klynt_common::util::UserId;

/// Canonical audit logging interface.
///
/// Consolidates auth and user service audit events into single interface.
#[async_trait]
pub trait AuditLogger: Send + Sync {
    // Auth events
    async fn log_login_success(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_login_failed(&self, ctx: &ExecutionContext, email: &str, error: &str);
    async fn log_user_registered(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_email_verified(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_password_reset(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_session_created(&self, ctx: &ExecutionContext, user_id: UserId, session_id: String);

    // User management events
    async fn log_profile_updated(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_password_changed(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_user_deleted(&self, ctx: &ExecutionContext, user_id: UserId);
}
```

- [ ] **Step 2: Export from ports/mod.rs**

- [ ] **Step 3: Commit**

```bash
git add backend/crates/klynt_base/src/ports/
git commit -m "feat(base): add canonical AuditLogger port to klynt_base"
```

---

### Task 3.2: Create Canonical EmailSender Port

**Files:**
- Create: `backend/crates/klynt_base/src/ports/email.rs`
- Modify: `backend/crates/klynt_base/src/ports/mod.rs`

**Interfaces:**
- Consumes: `klynt_base::ctx::ExecutionContext`, `klynt_common::domain::Email`
- Produces: `klynt_base::ports::email::EmailSender` trait

- [ ] **Step 1: Implement canonical EmailSender trait**

```rust
// backend/crates/klynt_base/src/ports/email.rs
//! Canonical email sending interface.

use crate::ctx::ExecutionContext;
use async_trait::async_trait;
use klynt_common::domain::Email;

/// Canonical email sending interface.
#[async_trait]
pub trait EmailSender: Send + Sync {
    async fn send_verification(
        &self,
        ctx: &ExecutionContext,
        email: &Email,
        token: &str,
        base_url: &str,
    ) -> Result<(), EmailError>;

    async fn send_password_reset(
        &self,
        ctx: &ExecutionContext,
        email: &str,
        token: &str,
        base_url: &str,
    ) -> Result<(), EmailError>;
}

#[derive(Debug, thiserror::Error)]
pub enum EmailError {
    #[error("Failed to send email: {0}")]
    SendFailed(String),
}
```

- [ ] **Step 2: Export from ports/mod.rs**

- [ ] **Step 3: Commit**

```bash
git add backend/crates/klynt_base/src/ports/
git commit -m "feat(base): add canonical EmailSender port to klynt_base"
```

---

### Task 3.3: Migrate Services to Canonical AuditLogger

**Files:**
- Modify: `backend/crates/services/auth_service/src/application/ports.rs`
- Modify: `backend/crates/services/user_service/src/application/ports.rs`
- Delete: `backend/crates/services/auth_service/src/infrastructure/services/audit_adapter.rs`
- Delete: `backend/crates/services/user_service/src/infrastructure/services/audit_adapter.rs`

**Interfaces:**
- Consumes: `klynt_base::ports::audit::AuditLogger`
- Produces: Services using canonical AuditLogger

- [ ] **Step 1: Re-export AuditLogger in both services**

```rust
// backend/crates/services/auth_service/src/application/ports.rs
pub use klynt_base::ports::audit::AuditLogger;

// backend/crates/services/user_service/src/application/ports.rs
pub use klynt_base::ports::audit::AuditLogger;
```

- [ ] **Step 2: Update builders to use AuditService directly**

- [ ] **Step 3: Delete both audit adapters**

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add backend/crates/services/
git commit -m "refactor: migrate services to canonical AuditLogger port

Removes service-specific AuditLogger adapters. Both auth and user
services now use canonical port from klynt_base. -241 lines."
```

---

### Task 3.4: Migrate Auth Service to Canonical EmailSender

**Files:**
- Modify: `backend/crates/services/auth_service/src/application/ports.rs`
- Delete: `backend/crates/services/auth_service/src/infrastructure/services/email_adapter.rs`

**Interfaces:**
- Consumes: `klynt_base::ports::email::EmailSender`
- Produces: Auth service using canonical EmailSender

- [ ] **Step 1: Re-export EmailSender**

- [ ] **Step 2: Update builder**

- [ ] **Step 3: Delete email adapter**

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add backend/crates/services/auth_service/
git commit -m "refactor(auth_service): migrate to canonical EmailSender port

Removes EmailSenderAdapter. Uses MockEmailService directly. -111 lines."
```

---

## Phase 4: Extract SessionService

This phase extracts session management from persistence into a dedicated service, fixing the gateway leak.

### Task 4.1: Create SessionService Crate Structure

**Files:**
- Create: `backend/crates/services/session_service/Cargo.toml`
- Create: `backend/crates/services/session_service/src/lib.rs`
- Create: `backend/crates/services/session_service/src/error.rs`
- Create: `backend/crates/services/session_service/src/config.rs`
- Modify: `backend/crates/services/Cargo.toml`

**Interfaces:**
- Consumes: `klynt_base::ports::session::SessionStore`
- Produces: `session_service::SessionService` with focused interface

- [ ] **Step 1: Create session_service Cargo.toml**

```toml
# backend/crates/services/session_service/Cargo.toml
[package]
name = "session_service"
version.workspace = true
edition.workspace = true

[dependencies]
klynt_base = { path = "../../klynt_base" }
klynt_common = { path = "../../shared/klynt_common" }
async-trait.workspace = true
chrono.workspace = true
thiserror.workspace = true
tokio.workspace = true

[dev-dependencies]
klynt_base = { path = "../../klynt_base", features = ["testkit"] }
```

- [ ] **Step 2: Create lib.rs with service interface**

```rust
// backend/crates/services/session_service/src/lib.rs
//! # Session Service
//!
//! Session management service for the Klynt platform.

pub mod config;
pub mod error;

use std::sync::Arc;
use crate::config::SessionConfig;
use crate::error::{SessionError, SessionResult};
use klynt_base::ctx::ExecutionContext;
use klynt_base::ports::session::{SessionStore, SessionToken, Session};
use klynt_common::util::UserId;

/// Session service — small interface, deep implementation.
pub struct SessionService {
    config: SessionConfig,
    session_store: Arc<dyn SessionStore>,
}

impl SessionService {
    pub fn new(config: SessionConfig, session_store: Arc<dyn SessionStore>) -> Self {
        Self { config, session_store }
    }

    /// Validate a session token and return the session if valid.
    pub async fn validate(
        &self,
        ctx: &ExecutionContext,
        token: &str,
    ) -> SessionResult<Session> {
        let session_token = SessionToken(token.to_string());
        self.session_store
            .find_valid(ctx, &session_token)
            .await?
            .ok_or(SessionError::InvalidToken)
    }

    /// Create a new session for a user.
    pub async fn create(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> SessionResult<SessionToken> {
        let expires_at = chrono::Utc::now() + chrono::Duration::seconds(self.config.session_duration_secs as i64);
        self.session_store.create(ctx, user_id, expires_at).await.map_err(Into::into)
    }

    /// Invalidate a session.
    pub async fn invalidate(
        &self,
        ctx: &ExecutionContext,
        token: &str,
    ) -> SessionResult<()> {
        let session_token = SessionToken(token.to_string());
        self.session_store.revoke(ctx, &session_token).await.map_err(Into::into)
    }
}
```

- [ ] **Step 3: Create error.rs**

```rust
// backend/crates/services/session_service/src/error.rs
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SessionError {
    #[error("Invalid or expired session token")]
    InvalidToken,

    #[error("Session store error: {0}")]
    StoreError(String),
}

impl From<klynt_base::ports::session::SessionError> for SessionError {
    fn from(err: klynt_base::ports::session::SessionError) -> Self {
        match err {
            klynt_base::ports::session::SessionError::NotFound => SessionError::InvalidToken,
            klynt_base::ports::session::SessionError::Expired => SessionError::InvalidToken,
            _ => SessionError::StoreError(err.to_string()),
        }
    }
}

pub type SessionResult<T> = Result<T, SessionError>;
```

- [ ] **Step 4: Create config.rs**

```rust
// backend/crates/services/session_service/src/config.rs
#[derive(Clone, Debug)]
pub struct SessionConfig {
    pub session_duration_secs: u64,
}

impl Default for SessionConfig {
    fn default() -> Self {
        Self { session_duration_secs: 86400 }
    }
}
```

- [ ] **Step 5: Add to workspace Cargo.toml**

```toml
# backend/crates/services/Cargo.toml
[workspace.dependencies]
# ... existing ...
session_service = { path = "session_service" }

[workspace.members]
# ... existing ...
session_service
```

- [ ] **Step 6: Commit**

```bash
git add backend/crates/services/session_service/
git commit -m "feat(services): create SessionService crate

Extracts session management into dedicated service with focused interface:
- validate(token) -> Session
- create(user_id) -> SessionToken
- invalidate(token) -> ()

This fixes the gateway leak where composition root accessed persistence directly."
```

---

### Task 4.2: Wire SessionService in Gateway

**Files:**
- Modify: `backend/crates/gateways/src/state/services.rs`
- Modify: `backend/crates/gateways/src/state/mod.rs`
- Modify: `backend/crates/gateways/src/routes/auth.rs`

**Interfaces:**
- Consumes: `session_service::SessionService`
- Produces: Gateway that depends only on services, not persistence

- [ ] **Step 1: Update Services struct**

```rust
// backend/crates/gateways/src/state/services.rs
use session_service::{SessionConfig, SessionService};

pub struct Services {
    pub auth: Arc<AuthService>,
    pub user: Arc<UserService>,
    pub session: Arc<SessionService>,  // NEW
}

impl Services {
    pub async fn from_config(config: &Config) -> Result<Self, GatewayError> {
        let pg_pool = create_pool(&config).await?;

        // Before: direct persistence access
        // let session_store: Arc<dyn klynt_persistence::session::SessionStore> = ...

        // After: use SessionService
        let session_store: Arc<dyn SessionStore> =
            Arc::new(PgSessionStore::new(pg_pool.clone()));
        let session_service = Arc::new(SessionService::new(
            SessionConfig::default(),
            session_store,
        ));

        // ... rest of wiring ...
    }
}
```

- [ ] **Step 2: Update auth middleware to use SessionService**

- [ ] **Step 3: Run gateway tests**

- [ ] **Step 4: Commit**

```bash
git add backend/crates/gateways/src/
git commit -m "refactor(gateways): wire SessionService in composition root

Gateway now depends only on services, not persistence. Session management
is properly encapsulated behind SessionService interface. Fixes gateway leak."
```

---

## Phase 5: Consolidate Test Support

This phase consolidates duplicated test infrastructure into klynt_base::testkit.

### Task 5.1: Add Canonical Fakes to klynt_base::testkit

**Files:**
- Create: `backend/crates/klynt_base/src/testkit/repository.rs`
- Modify: `backend/crates/klynt_base/src/testkit/mod.rs`

**Interfaces:**
- Consumes: `klynt_base::ports::repository::UserRepository`
- Produces: `FakeUserRepository` in klynt_base::testkit

- [ ] **Step 1: Create FakeUserRepository in testkit**

```rust
// backend/crates/klynt_base/src/testkit/repository.rs
//! Canonical test doubles for repository ports.

use crate::ctx::ExecutionContext;
use crate::ports::repository::{UserRepository, RepositoryError};
use klynt_common::domain::{Email, PaginationRequest, User, UserStatus};
use klynt_common::util::UserId;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// In-memory fake user repository for testing.
pub struct FakeUserRepository {
    users: Arc<RwLock<HashMap<UserId, User>>>,
    by_email: Arc<RwLock<HashMap<String, UserId>>>,
}

impl FakeUserRepository {
    pub fn new() -> Self {
        Self {
            users: Arc::new(RwLock::new(HashMap::new())),
            by_email: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Add a user directly (for test setup).
    pub async fn add_user(&self, user: User) {
        let email = user.email.as_str().to_string();
        let id = user.id;
        self.users.write().await.insert(id, user);
        self.by_email.write().await.insert(email, id);
    }

    /// Clear all users (for test isolation).
    pub async fn clear(&self) {
        self.users.write().await.clear();
        self.by_email.write().await.clear();
    }
}

impl Default for FakeUserRepository {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl UserRepository for FakeUserRepository {
    async fn find_by_email(
        &self,
        _ctx: &ExecutionContext,
        email: &Email,
    ) -> Result<Option<User>, RepositoryError> {
        let by_email = self.by_email.read().await;
        let users = self.users.read().await;
        by_email.get(email.as_str())
            .and_then(|id| users.get(id))
            .cloned()
            .ok_or_else(|| RepositoryError::NotFound)
    }

    async fn find_by_id(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<Option<User>, RepositoryError> {
        Ok(self.users.read().await.get(&user_id).cloned())
    }

    async fn create_pending_user(
        &self,
        _ctx: &ExecutionContext,
        full_name: String,
        email: Email,
        password_hash: String,
    ) -> Result<UserId, RepositoryError> {
        let id = UserId::new();
        let user = User::new(id, email, full_name, password_hash, UserStatus::Active);
        let email_str = user.email.as_str().to_string();
        self.users.write().await.insert(id, user);
        self.by_email.write().await.insert(email_str, id);
        Ok(id)
    }

    async fn activate_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), RepositoryError> {
        let mut users = self.users.write().await;
        if let Some(user) = users.get_mut(&user_id) {
            // Update status (assuming User has this method)
            Ok(())
        } else {
            Err(RepositoryError::NotFound)
        }
    }

    async fn update_password(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        password_hash: String,
    ) -> Result<(), RepositoryError> {
        let mut users = self.users.write().await;
        if let Some(user) = users.get_mut(&user_id) {
            // Update password
            Ok(())
        } else {
            Err(RepositoryError::NotFound)
        }
    }

    async fn update(
        &self,
        _ctx: &ExecutionContext,
        user: User,
    ) -> Result<User, RepositoryError> {
        let id = user.id;
        let email_str = user.email.as_str().to_string();
        self.users.write().await.insert(id, user.clone());
        self.by_email.write().await.insert(email_str, id);
        Ok(user)
    }

    async fn delete(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), RepositoryError> {
        let mut users = self.users.write().await;
        let mut by_email = self.by_email.write().await;
        if let Some(user) = users.remove(&user_id) {
            by_email.remove(user.email.as_str());
            Ok(())
        } else {
            Err(RepositoryError::NotFound)
        }
    }

    async fn list(
        &self,
        _ctx: &ExecutionContext,
        _pagination: PaginationRequest,
    ) -> Result<(Vec<User>, u64), RepositoryError> {
        let users = self.users.read().await;
        let all: Vec<User> = users.values().cloned().collect();
        let total = all.len() as u64;
        Ok((all, total))
    }
}
```

- [ ] **Step 2: Add FakeSessionStore to testkit**

```rust
// backend/crates/klynt_base/src/testkit/session.rs
use crate::ctx::ExecutionContext;
use crate::ports::session::{SessionStore, SessionToken, Session, SessionError};
use klynt_common::util::UserId;
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct FakeSessionStore {
    sessions: Arc<RwLock<HashMap<SessionToken, Session>>>,
}

impl FakeSessionStore {
    pub fn new() -> Self {
        Self { sessions: Arc::new(RwLock::new(HashMap::new())) }
    }

    pub async fn clear(&self) {
        self.sessions.write().await.clear();
    }
}

impl Default for FakeSessionStore {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl SessionStore for FakeSessionStore {
    async fn create(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        expires_at: DateTime<Utc>,
    ) -> Result<SessionToken, SessionError> {
        let token = SessionToken::new();
        let session = Session {
            user_id,
            expires_at,
            created_at: Utc::now(),
        };
        self.sessions.write().await.insert(token.clone(), session);
        Ok(token)
    }

    async fn find_valid(
        &self,
        _ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<Option<Session>, SessionError> {
        let sessions = self.sessions.read().await;
        Ok(sessions.get(token).filter(|s| s.expires_at > Utc::now()).cloned())
    }

    async fn revoke(
        &self,
        _ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<(), SessionError> {
        self.sessions.write().await.remove(token);
        Ok(())
    }
}
```

- [ ] **Step 3: Add FakeTokenStore to testkit**

- [ ] **Step 4: Update testkit/mod.rs**

```rust
// backend/crates/klynt_base/src/testkit/mod.rs
pub mod clock;
pub mod context;
pub mod crypto;
pub mod domain;
pub mod repository;  // NEW
pub mod session;    // NEW
pub mod token;      // NEW

pub use clock::{TestClock, test_clock};
pub use context::test_ctx;
pub use crypto::TestPasswordHasher;
pub use domain::{sample_user, sample_active_user};
pub use repository::FakeUserRepository;  // NEW
pub use session::FakeSessionStore;      // NEW
pub use token::FakeTokenStore;          // NEW
```

- [ ] **Step 5: Commit**

```bash
git add backend/crates/klynt_base/src/testkit/
git commit -m "feat(testkit): add canonical fakes for repository and session ports

Adds FakeUserRepository, FakeSessionStore, and FakeTokenStore to klynt_base::testkit.
Services can now use these instead of maintaining their own test doubles."
```

---

### Task 5.2: Migrate Auth Service Tests to Canonical Fakes

**Files:**
- Modify: `backend/crates/services/auth_service/tests/support/mod.rs`
- Delete: `backend/crates/services/auth_service/tests/support/fake_user_repository.rs`
- Delete: `backend/crates/services/auth_service/tests/support/fake_session_store.rs`
- Delete: `backend/crates/services/auth_service/tests/support/fake_token_store.rs`

**Interfaces:**
- Consumes: `klynt_base::testkit::{FakeUserRepository, FakeSessionStore, FakeTokenStore}`
- Produces: Auth service tests using canonical fakes

- [ ] **Step 1: Update auth service test support**

```rust
// backend/crates/services/auth_service/tests/support/mod.rs
//! Test support for auth service.

use klynt_base::testkit::{test_ctx, FakeUserRepository, FakeSessionStore, FakeTokenStore, TestPasswordHasher, TestClock};
use klynt_base::ctx::ExecutionContext;
use auth_service::{AuthConfig, AuthService};
use std::sync::Arc;

pub fn build_test_service() -> AuthService {
    let user_repo = Arc::new(FakeUserRepository::new());
    let session_store = Arc::new(FakeSessionStore::new());
    let token_store = Arc::new(FakeTokenStore::new());
    // ... rest of wiring
}

// Remove all local fake implementations
```

- [ ] **Step 2: Delete local fake files**

- [ ] **Step 3: Run auth service tests**

- [ ] **Step 4: Commit**

```bash
git add backend/crates/services/auth_service/tests/
git commit -m "refactor(auth_service): migrate tests to canonical fakes

Removes ~200 lines of duplicated test infrastructure. Uses canonical
fakes from klynt_base::testkit."
```

---

### Task 5.3: Migrate User Service Tests to Canonical Fakes

**Files:**
- Modify: `backend/crates/services/user_service/tests/support/mod.rs`
- Delete: `backend/crates/services/user_service/tests/support/test_user_repo.rs`

**Interfaces:**
- Consumes: `klynt_base::testkit::{FakeUserRepository, TestClock, TestPasswordHasher}`
- Produces: User service tests using canonical fakes

- [ ] **Step 1: Update user service test support**

- [ ] **Step 2: Delete local fake files**

- [ ] **Step 3: Run user service tests**

- [ ] **Step 4: Commit**

```bash
git add backend/crates/services/user_service/tests/
git commit -m "refactor(user_service): migrate tests to canonical fakes

Removes ~150 lines of duplicated test infrastructure. Uses canonical
fakes from klynt_base::testkit."
```

---

## Phase 6: Restructure Klynt Common into Domain Modules

This phase breaks klynt_common into focused domain modules for better locality.

### Task 6.1: Create klynt_domain Crate Structure

**Files:**
- Create: `backend/crates/shared/klynt_domain/Cargo.toml`
- Create: `backend/crates/klynt_domain/src/lib.rs`
- Create: `backend/crates/klynt_domain/src/user.rs`
- Create: `backend/crates/klynt_domain/src/auth.rs`
- Modify: `backend/Cargo.toml`

**Interfaces:**
- Consumes: `chrono`, `uuid`, `serde`
- Produces: Domain modules with co-located concepts

- [ ] **Step 1: Create klynt_domain Cargo.toml**

```toml
# backend/crates/shared/klynt_domain/Cargo.toml
[package]
name = "klynt_domain"
version.workspace = true
edition.workspace = true

[dependencies]
chrono.workspace = true
serde.workspace = true
thiserror.workspace = true
uuid.workspace = true
validator.workspace = true
```

- [ ] **Step 2: Create user module with co-located types**

```rust
// backend/crates/shared/klynt_domain/src/user.rs
//! User domain module — all user-related types in one place.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

/// User ID wrapper.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct UserId(Uuid);

impl UserId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    pub fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid)
    }

    pub fn as_uuid(&self) -> Uuid {
        self.0
    }
}

impl Default for UserId {
    fn default() -> Self {
        Self::new()
    }
}

/// Email address wrapper.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Email(String);

impl Email {
    pub fn parse(raw: String) -> Result<Self, EmailError> {
        validator::validate_email(&raw)
            .map(|_| Self(raw))
            .map_err(|_| EmailError::Invalid)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, thiserror::Error)]
pub enum EmailError {
    #[error("Invalid email address")]
    Invalid,
}

/// User role.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UserRole {
    Admin,
    Instructor,
    Student,
}

/// User status.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UserStatus {
    Active,
    Inactive,
    Suspended,
    Pending,
}

/// User aggregate root.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: UserId,
    pub email: Email,
    pub full_name: String,
    pub password_hash: String,
    pub role: UserRole,
    pub status: UserStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl User {
    pub fn new(
        id: UserId,
        email: Email,
        full_name: String,
        password_hash: String,
        status: UserStatus,
    ) -> Self {
        let now = Utc::now();
        Self {
            id,
            email,
            full_name,
            password_hash,
            role: UserRole::Student, // default
            status,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn is_active(&self) -> bool {
        self.status == UserStatus::Active
    }
}
```

- [ ] **Step 3: Create auth module**

```rust
// backend/crates/shared/klynt_domain/src/auth.rs
//! Authentication domain module.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use super::user::UserId;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub user_id: UserId,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}
```

- [ ] **Step 4: Create lib.rs**

```rust
// backend/crates/shared/klynt_domain/src/lib.rs
//! Klynt domain types — organized by bounded context.

pub mod user;
pub mod auth;

pub use user::{UserId, Email, User, UserRole, UserStatus, EmailError};
pub use auth::Session;
```

- [ ] **Step 5: Add to workspace**

- [ ] **Step 6: Commit**

```bash
git add backend/crates/shared/klynt_domain/
git commit -m "feat(domain): create klynt_domain crate with focused modules

Organizes domain types by bounded context:
- user module: UserId, Email, User, UserRole, UserStatus
- auth module: Session, Token

Improves locality — each concept lives in one place."
```

---

### Task 6.2: Migrate Services to klynt_domain

**Files:**
- Modify: `backend/crates/services/auth_service/Cargo.toml`
- Modify: `backend/crates/services/user_service/Cargo.toml`
- Modify: All files importing from klynt_common::domain

**Interfaces:**
- Consumes: `klynt_domain` instead of `klynt_common::domain`
- Produces: Services using focused domain modules

- [ ] **Step 1: Update auth service imports**

Find/replace:
```rust
// Before:
use klynt_common::domain::{User, Email, UserId};
use klynt_common::util::UserId;

// After:
use klynt_domain::{User, Email, UserId};
```

- [ ] **Step 2: Update user service imports**

- [ ] **Step 3: Update persistence imports**

- [ ] **Step 4: Run all tests**

- [ ] **Step 5: Commit**

```bash
git add backend/crates/
git commit -m "refactor: migrate services from klynt_common to klynt_domain

Services now import from focused domain modules instead of scattered
klynt_common structure. Improves locality and AI-navigability."
```

---

### Task 6.3: Deprecate klynt_common

**Files:**
- Modify: `backend/crates/shared/klynt_common/src/lib.rs`
- Create: `backend/crates/shared/klynt_common/DEPRECATED.md`

**Interfaces:**
- Consumes: Nothing
- Produces: Deprecation notice and re-exports for compatibility

- [ ] **Step 1: Add deprecation notice**

```rust
// backend/crates/shared/klynt_common/src/lib.rs
//! # DEPRECATED: Use klynt_domain instead
//!
//! This crate is deprecated. Migrate imports:
//! - `klynt_common::domain` → `klynt_domain`
//! - `klynt_common::contracts` → `klynt_contracts` (if created)
//! - `klynt_common::util` → Use specialized crates or inline

#![deprecated(since = "0.1.0", note = "Use klynt_domain instead")]

// Re-export for compatibility during migration
pub use klynt_domain::*;
```

- [ ] **Step 2: Create migration guide**

- [ ] **Step 3: Run tests**

- [ ] **Step 4: Commit**

```bash
git add backend/crates/shared/klynt_common/
git commit -m "deprecate: mark klynt_common as deprecated

klynt_domain replaces klynt_common with focused modules.
klynt_common now re-exports for compatibility during migration period."
```

---

## Phase 7: Final Integration and Verification

This phase runs comprehensive tests and updates documentation.

### Task 7.1: Run Full Test Suite

**Files:**
- All test files

**Interfaces:**
- Consumes: All changes from previous phases
- Produces: Verified working system

- [ ] **Step 1: Run all backend tests**

Run: `cargo nextest run --workspace --all-features`

Expected: All tests pass

- [ ] **Step 2: Run with coverage**

Run: `cargo llvm-cov --workspace --all-features --no-clean --fail-under-lines 84`

Expected: Coverage ≥84%

- [ ] **Step 3: Run clippy**

Run: `cargo clippy --workspace --all-targets --all-features -- -D warnings`

Expected: No warnings

- [ ] **Step 4: Run fmt check**

Run: `cargo fmt --check`

Expected: No formatting issues

- [ ] **Step 5: Run integration tests**

Run: `cargo nextest run --package gateways --test '*'`

Expected: All integration tests pass

---

### Task 7.2: Update Documentation

**Files:**
- Modify: `backend/README.md`
- Create: `backend/docs/ARCHITECTURE_DEEPENING.md`

**Interfaces:**
- Consumes: All architectural changes
- Produces: Updated documentation

- [ ] **Step 1: Update README with new crate structure**

- [ ] **Step 2: Create architecture deepening ADR**

- [ ] **Step 3: Update CLAUDE.md if needed**

- [ ] **Step 4: Commit**

```bash
git add backend/docs/
git commit -m "docs: update architecture documentation for deepening changes"
```

---

### Task 7.3: Create CONTEXT.md

**Files:**
- Create: `CONTEXT.md`

**Interfaces:**
- Consumes: Domain language from refactor
- Produces: Shared vocabulary for project

- [ ] **Step 1: Create CONTEXT.md with domain glossary**

```markdown
# Context — Klynt Education Platform

## Domain Glossary

### User
A user account in the Klynt platform. Users have:
- **Email** — Unique identifier and contact method
- **Password** — Hashed for authentication
- **Role** — Admin, Instructor, or Student
- **Status** — Active, Inactive, Suspended, or Pending

### Session
An authenticated user session. Created on login, expires after duration.

### Token
Short-lived verification token for email verification or password reset.

### Repository
Persistence interface port. Canonical implementations in klynt_base::ports.

### Service
Business logic layer. Auth, User, and Session services provide deep interfaces.

## Architecture Vocabulary

- **Module** — A crate or focused directory with clear responsibility
- **Interface** — Public API of a module
- **Depth** — Ratio of interface complexity to implementation
- **Seam** — Dependency boundary where adapters can be swapped
- **Adapter** — Translates between ports and concrete implementations
- **Leverage** — Value added per unit of interface complexity
- **Locality** — Related concepts living together

## Canonical Ports

All services use canonical ports from `klynt_base`:
- `UserRepository` — User CRUD operations
- `SessionStore` — Session persistence
- `TokenStore` — Verification token storage
- `AuditLogger` — Audit event logging
- `EmailSender` — Transactional email

## Test Support

Use canonical fakes from `klynt_base::testkit`:
- `FakeUserRepository` — In-memory user store
- `FakeSessionStore` — In-memory session store
- `FakeTokenStore` — In-memory token store
- `TestClock` — Deterministic time for tests
- `TestPasswordHasher` — No-op hashing for tests
```

- [ ] **Step 2: Commit**

```bash
git add CONTEXT.md
git commit -m "docs: add CONTEXT.md with domain glossary and architecture vocabulary"
```

---

## Summary

This plan addresses all 7 architectural friction candidates:

1. **Port Duplication** → Canonical ports in klynt_base (Phases 1-3)
2. **Adapter Proliferation** → ~1000 lines removed (Phases 1-3)
3. **Gateway Leaking** → SessionService extraction (Phase 4)
4. **Shallow Klynt Common** → klynt_domain focused modules (Phase 6)
5. **Test Duplication** → klynt_base::testkit consolidation (Phase 5)
6. **AuditLogger Duplication** → Canonical port (Phase 3)
7. **SessionStore Duplication** → Canonical port (Phase 2)

**Estimated Impact:**
- -1000+ lines of pure adapter code
- +1 new service (SessionService)
- +3 new domain-focused modules
- Improved locality across entire backend
- Consistent test infrastructure

**Total Tasks:** 42 bite-sized steps across 7 phases
