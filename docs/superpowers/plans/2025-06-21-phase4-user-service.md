# Phase 4: Extract user_service and Final Cleanup

**Goal**: Extract `user_service` following the `auth_service` pattern, then remove old monolithic crates.

**Prerequisites**: Phase 1 (foundation), Phase 2 (auth_service), Phase 3 (gateway) complete.

**Estimated Time**: 1-2 weeks

---

## Overview

This phase has two parts:

### Part 1: Extract `user_service` (Week 1)

Following the proven `auth_service` pattern to create a deep module for user management.

### Part 2: Cleanup Old Crates (Week 2)

Remove monolithic crates that have been superseded by the service-oriented architecture.

---

## Part 1: Extract user_service

### Current State

User-related logic is scattered across:
- `klynt-application/src/users.rs` — Application layer
- `klynt-domain/src/models.rs` — User domain model
- `klynt-infrastructure/src/repositories/pg_user.rs` — Persistence

### Target State

```
services/
└── user_service/          # Self-contained user service (deep module)
    ├── domain/
    │   ├── user.rs        # User domain logic
    │   └── profile.rs     # Profile domain (future)
    ├── application/
    │   ├── ports.rs       # Dependency interfaces
    │   └── use_cases/
    │       ├── get_user.rs
    │       ├── update_user.rs
    │       ├── delete_user.rs
    │       └── list_users.rs
    ├── infrastructure/
    │   └── repositories/
    │       └── user_repository_adapter.rs
    ├── models/
    │   └── user.rs        # User DTOs
    ├── error.rs
    └── lib.rs            # Small public interface
```

---

## Step 1: Design the Public Interface

**File**: `backend/crates/services/user_service/src/lib.rs`

Following the `auth_service` pattern:

```rust
//! # User Service
//!
//! User profile and account management service for Klynt platform.
//!
//! ## Design
//!
//! This is a **deep module**: small interface, deep implementation.
//!
//! - **Interface**: 5 core methods covering user management
//! - **Implementation**: Profile management, validation, persistence hidden inside

pub mod application;
pub mod domain;
pub mod error;
pub mod infrastructure;
pub mod models;

use klynt_core::ctx::ExecutionContext;
use klynt_utils::UserId;

pub use error::{UserError, UserResult};
pub use models::{UserProfile, UserConfig};

/// User service — deep module with small interface.
///
/// ## Interface
///
/// Five core methods covering user management:
/// - `get_user()` - Fetch user by ID
/// - `update_profile()` - Update user profile
/// - `change_password()` - Change user password
/// - `delete_user()` - Soft delete user
/// - `list_users()` - List users with pagination
///
/// ## Deep Implementation
///
/// Behind each method:
/// - Validation and authorization checks
/// - Profile updates with domain rules
/// - Audit logging
/// - Persistence
///
/// ## Tests
///
/// Tests cross the same interface as production code.
pub struct UserService {
    config: UserConfig,
    internal_state: InternalState,
}

impl UserService {
    /// Create a new user service.
    pub fn new(config: UserConfig, dependencies: Dependencies) -> Result<Self, UserError> {
        Ok(Self {
            config,
            internal_state: InternalState { /* ... */ },
        })
    }

    /// Get a user by ID.
    pub async fn get_user(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<UserProfile, UserError> {
        application::use_cases::get_user::execute(self, ctx, user_id).await
    }

    /// Update user profile.
    pub async fn update_profile(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        updates: ProfileUpdate,
    ) -> Result<UserProfile, UserError> {
        application::use_cases::update_profile::execute(self, ctx, user_id, updates).await
    }

    /// Change user password.
    pub async fn change_password(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        current_password: &str,
        new_password: &str,
    ) -> Result<(), UserError> {
        application::use_cases::change_password::execute(self, ctx, user_id, current_password, new_password).await
    }

    /// Delete (soft delete) a user.
    pub async fn delete_user(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), UserError> {
        application::use_cases::delete_user::execute(self, ctx, user_id).await
    }

    /// List users with pagination.
    pub async fn list_users(
        &self,
        ctx: &ExecutionContext,
        pagination: PaginationRequest,
    ) -> Result<PaginatedResponse<UserProfile>, UserError> {
        application::use_cases::list_users::execute(self, ctx, pagination).await
    }
}

/// Service configuration.
#[derive(Clone, Debug)]
pub struct UserConfig {
    /// Whether users can self-delete
    pub allow_self_delete: bool,
}

impl Default for UserConfig {
    fn default() -> Self {
        Self {
            allow_self_delete: false,
        }
    }
}

/// Dependencies wired into the user service.
#[derive(Clone)]
pub struct Dependencies {
    pub user_repository: Arc<dyn UserRepository>,
    pub audit_logger: Arc<dyn AuditLogger>,
    pub password_hasher: Arc<dyn PasswordHasher>,
    pub clock: Arc<dyn Clock>,
}

/// Internal state — not part of the public interface.
struct InternalState {
    pub user_repository: Arc<dyn UserRepository>,
    pub audit_logger: Arc<dyn AuditLogger>,
    pub password_hasher: Arc<dyn PasswordHasher>,
    pub clock: Arc<dyn Clock>,
}
```

---

## Step 2: Create Domain Layer

### domain/user.rs

```rust
//! User domain logic.

use chrono::{DateTime, Utc};
use klynt_shared_domain::{Email, UserRole, UserStatus};
use klynt_utils::UserId;
use serde::{Deserialize, Serialize};

/// User aggregate root.
#[derive(Debug, Clone)]
pub struct User {
    pub id: UserId,
    pub email: Email,
    pub full_name: Option<String>,
    pub password_hash: String,
    pub status: UserStatus,
    pub role: UserRole,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
    pub deleted_at: Option<DateTime<Utc>>,
}

impl User {
    /// Check if user is active.
    pub fn is_active(&self) -> bool {
        self.status == UserStatus::Active && self.deleted_at.is_none()
    }

    /// Check if user can be deleted.
    pub fn can_delete(&self) -> bool {
        !self.is_deleted() && self.role != UserRole::Admin
    }

    /// Check if user is deleted.
    pub fn is_deleted(&self) -> bool {
        self.deleted_at.is_some()
    }

    /// Soft delete the user.
    pub fn delete(&mut self) -> Result<(), UserError> {
        if !self.can_delete() {
            return Err(UserError::CannotDeleteAdmin);
        }
        self.deleted_at = Some(Utc::now());
        Ok(())
    }

    /// Update profile.
    pub fn update_profile(&mut self, full_name: Option<String>) -> Result<(), UserError> {
        if self.is_deleted() {
            return Err(UserError::UserDeleted);
        }
        self.full_name = full_name;
        self.updated_at = Some(Utc::now());
        Ok(())
    }
}
```

---

## Step 3: Create Application Layer

### application/ports.rs

```rust
//! Application-layer ports (dependency interfaces).

use async_trait::async_trait;
use klynt_core::ctx::ExecutionContext;
use klynt_utils::UserId;
use crate::error::UserError;
use crate::domain::User;
use crate::models::PaginationRequest;

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, ctx: &ExecutionContext, id: UserId) -> Result<Option<User>, UserError>;
    async fn update(&self, ctx: &ExecutionContext, user: &User) -> Result<(), UserError>;
    async fn delete(&self, ctx: &ExecutionContext, id: UserId) -> Result<(), UserError>;
    async fn list(&self, ctx: &ExecutionContext, pagination: PaginationRequest) -> Result<(Vec<User>, u64), UserError>;
}

#[async_trait]
pub trait PasswordHasher: Send + Sync {
    async fn verify(&self, password: &str, hash: &str) -> Result<bool, UserError>;
    async fn hash(&self, password: &str) -> Result<String, UserError>;
}

#[async_trait]
pub trait AuditLogger: Send + Sync {
    async fn log_profile_updated(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_password_changed(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_user_deleted(&self, ctx: &ExecutionContext, user_id: UserId);
}

pub trait Clock: Send + Sync {
    fn now(&self) -> DateTime<Utc>;
}
```

### application/use_cases/get_user.rs

```rust
//! Get user use case.

use klynt_core::ctx::ExecutionContext;
use klynt_utils::UserId;

use crate::error::UserError;
use crate::models::UserProfile;
use crate::UserService;

pub(crate) async fn execute(
    service: &UserService,
    ctx: &ExecutionContext,
    user_id: UserId,
) -> Result<UserProfile, UserError> {
    let user = service
        .internal()
        .user_repository
        .find_by_id(ctx, user_id)
        .await?
        .ok_or(UserError::NotFound)?;

    if user.is_deleted() {
        return Err(UserError::UserDeleted);
    }

    Ok(UserProfile::from(user))
}
```

---

## Step 4: Create Infrastructure Layer

### infrastructure/repositories/user_repository_adapter.rs

```rust
//! User repository adapter — bridges domain and infrastructure.

use async_trait::async_trait;

use klynt_core::ctx::ExecutionContext;
use klynt_infrastructure::repositories::pg_user::PgUserRepository;
use klynt_utils::UserId;

use crate::application::ports::UserRepository;
use crate::domain::User;
use crate::error::UserError;
use crate::models::PaginationRequest;

pub struct UserRepositoryAdapter {
    inner: PgUserRepository,
}

impl UserRepositoryAdapter {
    pub fn new(inner: PgUserRepository) -> Self {
        Self { inner }
    }
}

#[async_trait]
impl UserRepository for UserRepositoryAdapter {
    async fn find_by_id(&self, ctx: &ExecutionContext, id: UserId) -> Result<Option<User>, UserError> {
        let user = self
            .inner
            .find_by_id(ctx, id)
            .await
            .map_err(UserError::internal)?;

        Ok(user.map(|u| User {
            id: u.id,
            email: u.email,
            full_name: u.full_name,
            password_hash: u.password_hash,
            status: u.status,
            role: u.role,
            created_at: u.created_at,
            updated_at: u.updated_at,
            deleted_at: u.deleted_at,
        }))
    }

    async fn update(&self, ctx: &ExecutionContext, user: &User) -> Result<(), UserError> {
        self.inner
            .update(ctx, user.into())
            .await
            .map_err(UserError::internal)
    }

    async fn delete(&self, ctx: &ExecutionContext, id: UserId) -> Result<(), UserError> {
        self.inner
            .delete(ctx, id)
            .await
            .map_err(UserError::internal)
    }

    async fn list(&self, ctx: &ExecutionContext, pagination: PaginationRequest) -> Result<(Vec<User>, u64), UserError> {
        let (users, total) = self
            .inner
            .list(ctx, pagination)
            .await
            .map_err(UserError::internal)?;

        let users = users
            .into_iter()
            .map(|u| User {
                id: u.id,
                email: u.email,
                full_name: u.full_name,
                password_hash: u.password_hash,
                status: u.status,
                role: u.role,
                created_at: u.created_at,
                updated_at: u.updated_at,
                deleted_at: u.deleted_at,
            })
            .collect();

        Ok((users, total))
    }
}
```

---

## Step 5: Create Models

### models/user.rs

```rust
//! User DTOs for API boundaries.

use serde::{Deserialize, Serialize};
use klynt_utils::UserId;
use klynt_shared_domain::{UserRole, UserStatus};

/// User profile (read-only).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: UserId,
    pub email: String,
    pub full_name: Option<String>,
    pub role: UserRole,
    pub status: UserStatus,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl From<crate::domain::User> for UserProfile {
    fn from(user: crate::domain::User) -> Self {
        Self {
            id: user.id,
            email: user.email.0,
            full_name: user.full_name,
            role: user.role,
            status: user.status,
            created_at: user.created_at,
        }
    }
}

/// Profile update request.
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct ProfileUpdate {
    #[validate(length(max = 100))]
    pub full_name: Option<String>,
}
```

---

## Step 6: Create Error Module

### error.rs

```rust
//! User service errors.

use klynt_shared_domain::DomainError;

#[derive(thiserror::Error, Debug)]
pub enum UserError {
    #[error("User not found")]
    NotFound,

    #[error("User is deleted")]
    UserDeleted,

    #[error("Cannot delete admin user")]
    CannotDeleteAdmin,

    #[error("Invalid password")]
    InvalidPassword,

    #[error("Validation failed: {0}")]
    Validation(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Domain error: {0}")]
    Domain(#[from] DomainError),
}

impl UserError {
    pub fn internal(msg: impl Into<String>) -> Self {
        Self::Internal(msg.into())
    }
}

pub type UserResult<T> = Result<T, UserError>;
```

---

## Step 7: Wire into Gateway

### Update gateway state/services.rs

```rust
use user_service::{UserService, UserConfig, UserDependencies};

pub struct Services {
    pub auth: Arc<AuthService>,
    pub user: Arc<UserService>,
    pub session_store: Arc<dyn klynt_domain::session::SessionStore>,
}

impl Services {
    pub async fn from_config(config: &Config) -> Result<Self, crate::GatewayError> {
        // ... existing auth setup ...

        let user_service = Self::create_user_service(config, pool).await?;

        Ok(Self {
            auth: Arc::new(auth_service),
            user: Arc::new(user_service),
            session_store,
        })
    }

    async fn create_user_service(config: &Config, pool: sqlx::PgPool) -> Result<UserService, crate::GatewayError> {
        let user_repository = Arc::new(UserRepositoryAdapter::new(
            PgUserRepository::new(pool.clone()),
        ));

        let password_hasher = Arc::new(PasswordHasherAdapter::new(
            Argon2PasswordHasher::new(),
        ));

        let audit_logger = Arc::new(AuditLoggerAdapter::new(audit_service));

        UserService::new(
            UserConfig::default(),
            UserDependencies {
                user_repository,
                password_hasher,
                audit_logger,
                clock: Arc::new(user_service::application::ports::SystemClock),
            },
        )
        .map_err(|e| crate::GatewayError::configuration(format!("User service: {e}")))
    }
}
```

### Create gateway routes/users.rs

```rust
//! User HTTP handlers.

use axum::{extract::State, response::IntoResponse, Json};

use klynt_core::ctx::{ExecutionContext, RequestContext};
use klynt_utils::UserId;

use crate::response::SuccessResponse;
use crate::state::Services;

pub fn routes() -> axum::Router<Services> {
    axum::Router::new()
        .route("/me", axum::routing::get(get_current_user))
        .route("/me", axum::routing::patch(update_profile))
        .route("/me/password", axum::routing::post(change_password))
        // Admin routes
        .route("/users/:id", axum::routing::get(get_user))
        .route("/users", axum::routing::get(list_users))
        .route("/users/:id", axum::routing::delete(delete_user))
}

async fn get_current_user(
    State(services): State<Services>,
    // TODO: Extract authenticated user from middleware
) -> Result<impl IntoResponse, crate::GatewayError> {
    let user_id = todo!("Extract from JWT");
    let ctx = ExecutionContext::new(RequestContext::new());

    let profile = services
        .user
        .get_user(&ctx, user_id)
        .await
        .map_err(crate::GatewayError::from)?;

    Ok(Json(SuccessResponse::ok(profile)))
}

async fn update_profile(
    State(services): State<Services>,
    Json(request): Json<ProfileUpdate>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let user_id = todo!("Extract from JWT");
    let ctx = ExecutionContext::new(RequestContext::new());

    let profile = services
        .user
        .update_profile(&ctx, user_id, request)
        .await
        .map_err(crate::GatewayError::from)?;

    Ok(Json(SuccessResponse::ok(profile)))
}
```

---

## Step 8: Create Tests

### tests/integration.rs

```rust
//! User service integration tests.

#[tokio::test]
async fn get_user_returns_profile() {
    let (service, user_repo) = support::build_test_service();
    let ctx = support::test_ctx();

    let user_id = UserId::new();
    user_repo.insert(User {
        id: user_id,
        email: Email::new("test@example.com".to_string()),
        full_name: Some("Test User".to_string()),
        // ... other fields
    });

    let profile = service
        .get_user(&ctx, user_id)
        .await
        .unwrap();

    assert_eq!(profile.id, user_id);
    assert_eq!(profile.email, "test@example.com");
}

#[tokio::test]
async fn update_profile_modifies_user() {
    let (service, user_repo) = support::build_test_service();
    let ctx = support::test_ctx();

    let user_id = UserId::new();
    user_repo.insert(User {
        id: user_id,
        email: Email::new("test@example.com".to_string()),
        full_name: Some("Old Name".to_string()),
        // ...
    });

    let updates = ProfileUpdate {
        full_name: Some("New Name".to_string()),
    };

    service
        .update_profile(&ctx, user_id, updates)
        .await
        .unwrap();

    let profile = service.get_user(&ctx, user_id).await.unwrap();
    assert_eq!(profile.full_name, Some("New Name".to_string()));
}

#[tokio::test]
async fn delete_user_soft_deletes() {
    let (service, user_repo) = support::build_test_service();
    let ctx = support::test_ctx();

    let user_id = UserId::new();
    user_repo.insert(User {
        id: user_id,
        // ...
    });

    service.delete_user(&ctx, user_id).await.unwrap();

    let result = service.get_user(&ctx, user_id).await;
    assert!(matches!(result, Err(UserError::UserDeleted)));
}
```

---

## Part 2: Cleanup Old Crates

After `user_service` is extracted and working, remove the old monolithic crates.

---

## Step 9: Remove klynt-application

### What to Remove

```
backend/crates/klynt-application/
├── src/
│   ├── audit.rs        # Move to klynt-infrastructure or delete
│   ├── auth.rs         # Replaced by auth_service
│   ├── users.rs        # Replaced by user_service
│   └── lib.rs
└── tests/
    ├── password_reset.rs  # Tests moved to auth_service
    ├── registration.rs    # Tests moved to auth_service
    └── user_service.rs    # Tests moved to user_service
```

### Action

1. **Migrate audit service** to infrastructure (if still needed)
2. **Remove klynt-application** from workspace
3. **Delete directory**

```bash
# Remove from workspace members in Cargo.toml
# "crates/klynt-application",

# Remove from workspace dependencies
# klynt-application = { path = "crates/klynt-application" },

# Delete directory
rm -rf backend/crates/klynt-application
```

---

## Step 10: Remove klynt-api

### What to Remove

```
backend/crates/klynt-api/
├── src/
│   ├── error/          # Moved to api_gateway
│   ├── middleware/     # Moved to api_gateway
│   ├── v1/             # Moved to api_gateway/routes
│   ├── openapi.rs      # Moved to api_gateway
│   └── state.rs        # Moved to api_gateway
```

### Action

```bash
# Remove from workspace
# "crates/klynt-api",

# Remove from dependencies
# klynt-api = { path = "crates/klynt-api" },

# Delete directory
rm -rf backend/crates/klynt-api
```

---

## Step 11: Simplify klynt-server

### Options

**Option A**: Keep minimal server entry point

```rust
// klynt-server/src/main.rs
use api_gateway::{run, Config, Services};

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    dotenvy::dotenv().ok();

    let config = Config::from_env()?;
    let services = Services::from_config(&config).await?;

    run(config, services).await
}
```

**Option B**: Move to api_gateway as binary

```toml
# api_gateway/Cargo.toml
[[bin]]
name = "api-gateway"
path = "src/main.rs"
```

```bash
# Remove klynt-server entirely
# "crates/klynt-server",
rm -rf backend/crates/klynt-server
```

**Recommendation**: Option A (keep minimal server) for now, can move to Option B later.

---

## Step 12: Update klynt-domain

### What to Keep vs Remove

**Keep** (truly shared domain):
- `config.rs` — App configuration
- `errors.rs` — Shared domain errors
- `audit.rs` — Audit types (if used by multiple services)

**Remove** (moved to services):
- `models.rs` — User model (now in services)
- `session.rs` — Session types (now in auth_service)
- `tokens.rs` — Token types (now in auth_service)
- `password_policy/` — Moved to auth_service
- `repositories.rs` — Repository traits (now in services)
- `ports.rs` — Ports (now in services)

### Action

```rust
// klynt-domain/src/lib.rs
pub mod audit;
pub mod config;
pub mod errors;
pub mod ctx;  // Keep if used by multiple services

// Remove:
// pub mod models;
// pub mod session;
// pub mod tokens;
// pub mod password_policy;
// pub mod repositories;
// pub mod ports;
```

---

## Step 13: Update klynt-infrastructure

### What to Keep

**Keep** (shared infrastructure):
- `config.rs` — Configuration loading
- `email.rs` — Email service
- `health.rs` — Health checks
- `password_hasher.rs` — Password hashing
- `repositories/` — Repository implementations
- `rate_limiter_redis.rs` — Rate limiting

**Remove**:
- Any service-specific implementations that were moved

---

## Step 14: Final Verification

### Build Checks

```bash
# Build all services
cargo build --workspace

# Run all tests
cargo test --workspace

# Run clippy
cargo clippy --workspace --all-targets

# Check for unused dependencies
cargo +nightly udeps
```

### Architecture Verification

```
backend/crates/
├── core/
│   └── klynt_core/              ✅ Base abstractions
├── shared/
│   ├── klynt_contracts/         ✅ DTOs
│   ├── klynt_domain/            ✅ Shared types (UserRole, etc.)
│   └── klynt_utils/             ✅ Utilities
├── infrastructure/
│   ├── klynt_messaging/         ✅ Event/messaging
│   ├── klynt_storage/           ✅ Storage abstractions
│   └── klynt_tracing/           ✅ Observability
├── services/
│   ├── auth_service/            ✅ Auth business logic
│   └── user_service/            ✅ User business logic
├── gateways/
│   └── api_gateway/             ✅ HTTP entry point
├── klynt-domain/                ⚠️ Minimized (only shared types)
├── klynt-infrastructure/        ⚠️ Shared infrastructure only
└── klynt-server/                ✅ Minimal entry point
```

---

## Phase 4 Completion Checklist

### Part 1: user_service Extraction
- [ ] Service structure created
- [ ] Domain layer (User entity)
- [ ] Application layer (ports, use cases)
- [ ] Infrastructure layer (adapters)
- [ ] Models (DTOs)
- [ ] Error module
- [ ] Tests (unit + integration)
- [ ] Wired into gateway
- [ ] Gateway routes created

### Part 2: Cleanup
- [ ] klynt-application removed
- [ ] klynt-api removed
- [ ] klynt-server minimized
- [ ] klynt-domain minimized
- [ ] klynt-infrastructure reviewed
- [ ] Workspace updated
- [ ] All tests pass
- [ ] Build clean

---

## What's Next

After Phase 4 completes:

1. **Add more services** following the pattern:
   - `courses_service` — Course management
   - `lessons_service` — Lesson content
   - `enrollments_service` — Student enrollments
   - `payments_service` — Payment processing

2. **Advanced features**:
   - Event-driven communication between services
   - Distributed tracing
   - API versioning
   - Rate limiting per service

3. **Microservices ready**:
   - Each service can be deployed independently
   - Gateway becomes API mesh entry point
   - Services communicate via events

---

## Notes

- **Deep modules achieved**: Both auth_service and user_service follow the pattern
- **Composition root**: Gateway wires all services together
- **No business logic in HTTP layer**: Gateway only handles HTTP concerns
- **Services remain pure**: No HTTP/framework knowledge in services
- **Deletion test passes**: Can delete any service without breaking others
- **Locality maximized**: Each service owns its domain completely

---

## Design Decision Log

| Decision | Rationale |
|----------|-----------|
| Follow auth_service pattern | Proven to work, consistent architecture |
| Keep user service separate | Different domain, independent evolution |
| Minimize old crates | Reduce cognitive load, clear ownership |
| Keep minimal server | Allows easy local development |
| Audit service in infrastructure | Used by multiple services |
