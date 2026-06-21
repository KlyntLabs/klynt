# Phase 2: Extract auth_service Implementation Plan

**Goal**: Extract authentication logic into `auth_service` — a **deep module** with small interface and concentrated locality.

**Prerequisites**: Phase 1 foundation complete (without klynt_typedenum, merged into klynt_shared_domain).

**Estimated Time**: 1-2 weeks

---

## Overview

Transforming from monolithic layers to service-oriented architecture:

```
BEFORE (Monolithic):
├── klynt-domain/          # Mixed domain concepts
├── klynt-application/     # AuthService mixed with other app logic
└── klynt-infrastructure/  # Mixed infrastructure

AFTER (Service-Oriented):
└── services/
    └── auth_service/      # Self-contained auth service (deep module)
        ├── domain/        # Auth-specific domain
        ├── application/  # Auth use cases
        ├── infrastructure/ # Auth adapters
        └── lib.rs        # Small, clean interface
```

---

## Design Principles (from codebase-design)

### Deep Module Criteria

**auth_service** will be a **deep module**:

| Aspect | Implementation |
|--------|---------------|
| **Small Interface** | 6 core methods: `login()`, `register()`, `verify_email()`, `request_password_reset()`, `reset_password()`, `logout()` |
| **Deep Implementation** | Password policy, session management, token handling, email flows all hidden inside |
| **High Leverage** | Each method exercises lots of behavior (validation, persistence, audit, email) |
| **High Locality** | All auth knowledge in one place — changes don't spread across codebase |

### Deletion Test

Can we delete `auth_service` without breaking unrelated code?
- ✅ **Yes**: Other services won't depend on auth internals, only on its interface
- ✅ **Yes**: User concepts that aren't auth-specific stay in user_service (when extracted)

### Interface as Test Surface

Tests cross the **same seam** as callers:
```rust
// Service interface
auth_service.login(&ctx, &email, &password).await?;

// Test crosses same interface
let result = auth_service.login(&ctx, &test_email, &test_password).await?;
assert!(result.is_ok());
```

---

## Step 1: Create Service Structure

### 1.1 Create Directory Tree

```bash
mkdir -p backend/crates/services/auth_service/src/{domain,application,infrastructure/{repositories,Services},models}
```

**Target structure**:
```
auth_service/
├── Cargo.toml
├── README.md
└── src/
    ├── lib.rs                    # PUBLIC INTERFACE (small!)
    ├── domain/
    │   ├── mod.rs
    │   ├── password_policy.rs    # From klynt-domain
    │   ├── session.rs            # From klynt-domain
    │   └── tokens.rs             # From klynt-domain
    ├── application/
    │   ├── mod.rs
    │   ├── use_cases.rs          # Main orchestration
    │   ├── password_reset.rs     # Password reset flow
    │   └── registration.rs       # Registration flow
    ├── infrastructure/
    │   ├── mod.rs
    │   ├── repositories/
    │   │   ├── mod.rs
    │   │   ├── session_repository.rs    # Adapters for SessionStore
    │   │   └── token_repository.rs     # Adapters for TokenStore
    │   └── services/
    │       ├── mod.rs
    │       └── email_adapter.rs        # Email service adapter
    ├── models/
    │   ├── mod.rs
    │   └── auth.rs                # Auth-specific DTOs
    └── error.rs                   # Auth-specific errors
```

---

## Step 2: Create Cargo.toml

**File**: `backend/crates/services/auth_service/Cargo.toml`

```toml
[package]
name = "auth_service"
version = "0.1.0"
edition = "2021"

[dependencies]
# === Phase 1 Foundation ===
klynt_core = { path = "../../../core/klynt_core" }
klynt_shared_domain = { path = "../../../shared/klynt_domain" }
klynt_utils = { path = "../../../shared/klynt_utils" }
klynt_contracts = { path = "../../../shared/klynt_contracts" }
klynt_storage = { path = "../../../infrastructure/klynt_storage" }
klynt_messaging = { path = "../../../infrastructure/klynt_messaging" }
klynt_tracing = { path = "../../../infrastructure/klynt_tracing" }

# === Existing (will be removed after extraction) ===
klynt_domain = { path = "../../../klynt-domain" }
klynt_infrastructure = { path = "../../../klynt-infrastructure" }

# === Async Runtime ===
tokio = { workspace = true }
async-trait = { workspace = true }

# === Web Framework (for future API layer) ===
axum = { workspace = true }

# === Serialization ===
serde = { workspace = true }
serde_json = { workspace = true }

# === Time ===
chrono = { workspace = true }

# === Validation ===
validator = { workspace = true }

# === Error Handling ===
thiserror = { workspace = true }
anyhow = { workspace = true }

# === Tracing ===
tracing = { workspace = true }

[dev-dependencies]
tokio-test = { workspace = true }
```

---

## Step 3: Design the Public Interface

**File**: `backend/crates/services/auth_service/src/lib.rs`

This is the **most critical file** — the external seam.

```rust
//! # Auth Service
//!
//! Authentication and authorization service for Klynt platform.
//!
//! ## Design
//!
//! This is a **deep module**: small interface, deep implementation.
//!
//! - **Interface**: 6 core methods covering authentication flows
//! - **Implementation**: Password policy, sessions, tokens, email flows hidden inside
//! - **Tests**: Cross the same interface as callers

pub mod domain;
pub mod application;
pub mod infrastructure;
pub mod models;
pub mod error;

use klynt_core::ctx::ExecutionContext;
use klynt_utils::UserId;
use klynt_contracts::auth::{
    LoginRequest, LoginResponse, RegistrationRequest, UserSessionInfo,
};

// Public exports
pub use error::{AuthError, AuthResult};
pub use domain::session::SessionToken;
pub use models::AuthConfig;

/// Authentication service — deep module with small interface.
///
/// ## Interface
///
/// Six core methods covering all authentication flows:
/// - `login()` - Authenticate and create session
/// - `register()` - Register new user with email verification
/// - `verify_email()` - Verify email from token
/// - `request_password_reset()` - Initiate password reset
/// - `reset_password()` - Complete password reset
/// - `logout()` - End session
///
/// ## Deep Implementation
///
/// Behind each method:
/// - Password policy validation
/// - Session/token management
/// - Audit logging
/// - Email delivery
/// - Error handling
///
/// ## Tests
///
/// Tests cross the same interface as production code — no testing past the interface.
pub struct AuthService {
    // Internal state — not part of interface
    config: AuthConfig,
    // ... other fields
}

impl AuthService {
    /// Create a new auth service with given configuration.
    ///
    /// This is the **only** way to construct the service — all dependencies
    /// are wired here (composition root responsibility).
    pub fn new(config: AuthConfig) -> Result<Self, AuthError> {
        // Validate config, set up internal dependencies
        Ok(Self { config })
    }

    /// Authenticate a user and create a session.
    ///
    /// ## Arguments
    ///
    /// - `ctx` - Execution context with request tracking
    /// - `request` - Login credentials
    ///
    /// ## Returns
    ///
    /// - `Ok(LoginResponse)` with access token, refresh token, user info
    /// - `Err(AuthError)` for authentication failures
    ///
    /// ## Behavior
    ///
    /// - Validates credentials against stored hash
    /// - Creates new session (always new ID for security)
    /// - Logs successful/failed attempts
    /// - Returns JWT tokens and user info
    ///
    /// ## Security
    ///
    /// - Rate limited via infrastructure
    /// - Audit logged for all attempts
    /// - Session fixation protected (always new token)
    pub async fn login(
        &self,
        ctx: &ExecutionContext,
        request: LoginRequest,
    ) -> Result<LoginResponse, AuthError> {
        application::login::execute(self, ctx, request).await
    }

    /// Register a new user with email verification.
    ///
    /// ## Behavior
    ///
    /// - Validates password policy
    /// - Creates pending user
    /// - Sends verification email
    /// - Returns user ID
    ///
    /// ## Security
    ///
    /// - Password complexity enforced
    /// - Email required for activation
    /// - Terms acceptance tracked
    pub async fn register(
        &self,
        ctx: &ExecutionContext,
        request: RegistrationRequest,
    ) -> Result<UserId, AuthError> {
        application::registration::execute(self, ctx, request).await
    }

    /// Verify email address using token from email link.
    ///
    /// ## Behavior
    ///
    /// - Validates token signature and expiry
    /// - Consumes one-time token
    /// - Activates user account
    pub async fn verify_email(
        &self,
        ctx: &ExecutionContext,
        token: &str,
    ) -> Result<UserId, AuthError> {
        application::email_verification::execute(self, ctx, token).await
    }

    /// Request password reset (user-initiated).
    ///
    /// ## Behavior
    ///
    /// - Always returns Ok (prevents email enumeration)
    /// - Sends reset email if user exists
    /// - Token expires after configured duration
    ///
    /// ## Security
    ///
    /// - Doesn't reveal user existence
    /// - Swallows email errors
    pub async fn request_password_reset(
        &self,
        ctx: &ExecutionContext,
        email: &str,
    ) -> Result<(), AuthError> {
        application::password_reset::request(self, ctx, email).await
    }

    /// Reset password using token from email.
    ///
    /// ## Behavior
    ///
    /// - Validates token
    /// - Enforces password policy
    /// - Updates password hash
    /// - Invalidates existing sessions
    pub async fn reset_password(
        &self,
        ctx: &ExecutionContext,
        token: &str,
        new_password: &str,
    ) -> Result<(), AuthError> {
        application::password_reset::reset(self, ctx, token, new_password).await
    }

    /// Logout user by invalidating session.
    ///
    /// ## Behavior
    ///
    /// - Invalidates session token
    /// - Clears refresh token
    /// - Logs audit event
    pub async fn logout(
        &self,
        ctx: &ExecutionContext,
        session_token: &str,
    ) -> Result<(), AuthError> {
        application::logout::execute(self, ctx, session_token).await
    }

    // === Internal API (for tests only) ===

    #[cfg(test)]
    pub fn internal_state(&self) -> &InternalState {
        &self.internal_state
    }
}

/// Service configuration.
///
/// This struct encapsulates all configuration needed for auth service.
/// Created by composition root (gateway/server startup).
#[derive(Clone, Debug)]
pub struct AuthConfig {
    /// Base URL for email verification links
    pub base_url: String,

    /// Session duration in seconds
    pub session_duration_secs: u64,

    /// Token duration in seconds
    pub token_duration_secs: u64,

    /// Password policy (optional, uses default if None)
    pub password_policy: Option<domain::password_policy::PasswordPolicy>,
}

impl Default for AuthConfig {
    fn default() -> Self {
        Self {
            base_url: "https://klynt.edu".to_string(),
            session_duration_secs: 86400, // 24 hours
            token_duration_secs: 3600,    // 1 hour
            password_policy: None,
        }
    }
}

// Internal state (not exported)
#[derive(Clone)]
struct InternalState {
    // Dependencies wired internally
    session_store: Arc<dyn SessionStore>,
    token_store: Arc<dyn TokenStore>,
    // ...
}
```

---

## Step 4: Migrate Domain Layer

### 4.1 Move Password Policy

**From**: `backend/crates/klynt-domain/src/password_policy.rs`
**To**: `backend/crates/services/auth_service/src/domain/password_policy.rs`

**Action**: Copy file, update imports:

```rust
// Old imports
use klynt_domain::password_policy::PasswordPolicy;

// New imports  
use auth_service::domain::password_policy::PasswordPolicy;

// Or from other services
use auth_service::domain::PasswordPolicy;  // Re-export in domain/mod.rs
```

### 4.2 Move Session Types

**From**: `backend/crates/klynt-domain/src/session.rs`
**To**: `backend/crates/services/auth_service/src/domain/session.rs`

### 4.3 Move Token Types

**From**: `backend/crates/klynt-domain/src/tokens.rs`
**To**: `backend/crates/services/auth_service/src/domain/tokens.rs`

### 4.4 Create domain/mod.rs

**File**: `backend/crates/services/auth_service/src/domain/mod.rs`

```rust
//! Auth-specific domain logic.

pub mod password_policy;
pub mod session;
pub mod tokens;

// Re-exports for cleaner internal imports
pub use password_policy::{PasswordPolicy, PasswordPolicyError};
pub use session::{Session, SessionStore, SessionToken};
pub use tokens::{Token, TokenKind};
```

---

## Step 5: Create Application Layer

### 5.1 Structure

The application layer orchestrates domain and infrastructure:

```rust
application/
├── mod.rs                 # Public exports
├── use_cases/
│   ├── mod.rs
│   ├── login.rs           # Login use case
│   ├── registration.rs    # Registration use case
│   ├── password_reset.rs  # Password reset flows
│   └── logout.rs          # Logout use case
└── ports.rs               # Traits for dependencies (if needed)
```

### 5.2 Example: login.rs

**File**: `backend/crates/services/auth_service/src/application/use_cases/login.rs`

```rust
//! Login use case - authenticate user and create session.

use crate::domain::{Session, SessionStore};
use crate::error::AuthError;
use klynt_core::ctx::ExecutionContext;
use klynt_contracts::auth::{LoginRequest, LoginResponse};

/// Execute login use case.
pub(crate) async fn execute(
    service: &super::super::AuthService,
    ctx: &ExecutionContext,
    request: LoginRequest,
) -> Result<LoginResponse, AuthError> {
    // 1. Validate request format
    request.validate()
        .map_err(|e| AuthError::validation(e.to_string()))?;

    // 2. Look up user
    let user = service
        .internal_state()
        .user_repository
        .find_by_email(&request.email)
        .await?
        .ok_or(AuthError::invalid_credentials())?;

    // 3. Verify password
    service
        .internal_state()
        .password_hasher
        .verify(&request.password, &user.password_hash)
        .await?;

    // 4. Check account status
    if !user.is_active() {
        return Err(AuthError::account_inactive());
    }

    // 5. Create session
    let expires_at = utc_now() + service.config.session_duration();
    let session_token = service
        .internal_state()
        .session_store
        .create(ctx, user.id, expires_at)
        .await?;

    // 6. Log audit event
    service
        .internal_state()
        .audit_service
        .log_login_success(ctx, user.id)
        .await;

    // 7. Build response
    let access_token = service
        .internal_state()
        .token_factory
        .create_access_token(user.id)?;

    Ok(LoginResponse {
        access_token,
        refresh_token: session_token.0,
        expires_at,
        user: user.into(),
    })
}
```

### 5.3 Create application/mod.rs

```rust
//! Application layer - use case orchestration.

pub mod use_cases;

// No public exports — all use cases are private
```

---

## Step 6: Create Infrastructure Layer

### 6.1 Structure

```rust
infrastructure/
├── mod.rs
├── repositories/
│   ├── mod.rs
│   ├── session_repository.rs    # Implements SessionStore from domain
│   ├── token_repository.rs      # Implements TokenStore from domain
│   └── user_lookup_adapter.rs   # Adapter for user lookup
└── services/
    ├── mod.rs
    ├── email_adapter.rs         # Wraps existing email service
    └── audit_adapter.rs         # Wraps existing audit service
```

### 6.2 Pattern: Adapters over Traits

Each adapter implements a domain trait:

```rust
// Domain trait (in domain/session.rs)
#[async_trait]
pub trait SessionStore: Send + Sync {
    async fn create(&self, ctx: &ExecutionContext, user_id: UserId, expires_at: DateTime<Utc>) -> Result<SessionToken, Error>;
    async fn validate(&self, token: &SessionToken) -> Result<Session, Error>;
    async fn revoke(&self, token: &SessionToken) -> Result<(), Error>;
}

// Infrastructure adapter (in infrastructure/repositories/session_repository.rs)
pub struct PgSessionStore {
    pool: PgPool,
}

#[async_trait]
impl SessionStore for PgSessionStore {
    async fn create(&self, ctx: &ExecutionContext, user_id: UserId, expires_at: DateTime<Utc>) -> Result<SessionToken, Error> {
        // Implementation using existing pg_session.rs
    }
    // ... other methods
}
```

---

## Step 7: Create Error Module

**File**: `backend/crates/services/auth_service/src/error.rs`

```rust
//! Auth service errors.

use klynt_shared_domain::DomainError;

/// Auth service-specific error type.
#[derive(thiserror::Error, Debug)]
pub enum AuthError {
    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Account inactive")]
    AccountInactive,

    #[error("Account locked")]
    AccountLocked,

    #[error("Password reset required")]
    PasswordResetRequired,

    #[error("Token expired or invalid")]
    InvalidToken,

    #[error("Password policy violation: {0}")]
    PasswordPolicy(String),

    #[error("User not found")]
    UserNotFound,

    #[error("Too many attempts")]
    RateLimited,

    #[error("Internal error: {0}")]
    Internal(String),

    // Domain errors wrapped
    #[error("Domain error: {0}")]
    Domain(#[from] DomainError),
}

impl AuthError {
    // Constructor helpers
    pub fn invalid_credentials() -> Self {
        Self::InvalidCredentials
    }

    pub fn account_inactive() -> Self {
        Self::AccountInactive
    }

    pub fn validation(msg: String) -> Self {
        Self::PasswordPolicy(msg)
    }

    pub fn internal(msg: String) -> Self {
        Self::Internal(msg)
    }
}

/// Result type for auth operations.
pub type AuthResult<T> = Result<T, AuthError>;
```

---

## Step 8: Create Models

**File**: `backend/crates/services/auth_service/src/models/auth.rs`

```rust
//! Auth-specific models and DTOs.

use serde::{Deserialize, Serialize};

/// User session info (minimal).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSessionInfo {
    pub id: String,
    pub email: String,
    pub full_name: Option<String>,
    pub role: String,  // From klynt_shared_domain
}

/// Internal user representation (from repository).
#[derive(Debug, Clone)]
pub struct User {
    pub id: klynt_utils::UserId,
    pub email: String,
    pub password_hash: String,
    pub full_name: Option<String>,
    pub status: klynt_shared_domain::UserStatus,
    pub role: klynt_shared_domain::UserRole,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl User {
    pub fn is_active(&self) -> bool {
        matches!(self.status, klynt_shared_domain::UserStatus::Active)
    }
}

impl From<User> for UserSessionInfo {
    fn from(user: User) -> Self {
        Self {
            id: user.id.to_string(),
            email: user.email,
            full_name: user.full_name,
            role: format!("{:?}", user.role),
        }
    }
}
```

---

## Step 9: Migrate Tests

### 9.1 Move Test Files

**From**: `backend/crates/klynt-application/tests/`
**To**: `backend/crates/services/auth_service/tests/`

```bash
# Move auth-specific tests
mv klynt-application/tests/registration.rs \
   auth_service/tests/registration.rs

# Move password reset tests
mv klynt-application/tests/password_reset.rs \
   auth_service/tests/password_reset.rs
```

### 9.2 Update Test Imports

```rust
// Old
use klynt_application::auth::AuthService;

// New
use auth_service::AuthService;
```

### 9.3 Test Structure

Each test file tests the **public interface only**:

```rust
#[tokio::test]
async fn test_login_success() {
    // Arrange: Set up service with test dependencies
    let service = AuthService::new(test_config()).unwrap();

    // Act: Call through public interface
    let result = service
        .login(&ctx, LoginRequest { email: "...", password: "..." })
        .await;

    // Assert: Verify result
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(!response.access_token.is_empty());
}
```

---

## Step 10: Update Workspace

**File**: `backend/Cargo.toml`

```toml
[workspace]
members = [
    # === Existing ===
    "crates/klynt-domain",
    "crates/klynt-application",
    "crates/klynt-infrastructure",
    "crates/klynt-api",
    "crates/klynt-server",

    # === Phase 1 Foundation ===
    "crates/core/klynt_core",
    "crates/shared/klynt_contracts",
    "crates/shared/klynt_domain",
    "crates/shared/klynt_utils",
    "crates/infrastructure/klynt_messaging",
    "crates/infrastructure/klynt_storage",
    "crates/infrastructure/klynt_tracing",

    # === NEW - Phase 2 ===
    "crates/services/auth_service",
]

[workspace.dependencies]
# ... existing ...

# === Add auth_service ===
auth_service = { path = "crates/services/auth_service" }
```

---

## Step 11: Verification Steps

### 11.1 Build Checks

```bash
# Build the service
cargo build -p auth_service

# Build workspace
cargo build --workspace

# Check dependencies
cargo tree -p auth_service
```

### 11.2 Test Verification

```bash
# Run auth service tests
cargo test -p auth_service

# Run all tests
cargo test --workspace

# Run clippy
cargo clippy -p auth_service
```

### 11.3 Interface Verification

Review the public interface:
```bash
# Show public API
cargo doc --no-deps -p auth_service --open
```

Check that:
- [ ] Only 6 core methods are public
- [ ] Internal implementation is private
- [ ] Tests use same interface as callers
- [ ] No leakage of internal dependencies

---

## Step 12: Integration (Pre-Gateway)

Before creating the gateway in Phase 3, verify integration:

### 12.1 Create Integration Test

**File**: `backend/crates/services/auth_service/tests/integration.rs`

```rust
//! Integration test for auth service.

#[tokio::test]
async fn test_full_registration_flow() {
    let service = setup_service().await;

    // 1. Register
    let user_id = service
        .register(&ctx, RegistrationRequest { ... })
        .await
        .unwrap();

    // 2. Verify email
    let verified_user_id = service
        .verify_email(&ctx, &verification_token)
        .await
        .unwrap();

    assert_eq!(user_id, verified_user_id);

    // 3. Login
    let login_response = service
        .login(&ctx, LoginRequest { ... })
        .await
        .unwrap();

    // 4. Logout
    service
        .logout(&ctx, &login_response.access_token)
        .await
        .unwrap();
}
```

### 12.2 Update Existing Code (Temporary)

Until gateway is created in Phase 3, update existing `klynt-application` to use new service:

```rust
// In klynt-application/src/auth.rs
// Old: monolithic implementation
// New: delegation to auth_service

use auth_service::AuthService;

pub struct ApplicationAuthService {
    auth_service: Arc<AuthService>,
}

impl ApplicationAuthService {
    pub async fn login(&self, ctx: &Ctx, email: &Email, password: &str) -> Result<SessionToken, DomainError> {
        self.auth_service
            .login(
                &ExecutionContext::from(ctx.clone()),
                LoginRequest { email: email.as_str(), password },
            )
            .await
            .map(|r| SessionToken(r.access_token))
            .map_err(|e| DomainError::Internal(e.to_string()))
    }
}
```

This is **temporary** until Phase 3 gateway removes `klynt-application` layer entirely.

---

## Phase 2 Completion Checklist

### Structure
- [ ] Service directory created
- [ ] Domain layer migrated (password_policy, session, tokens)
- [ ] Application layer created (use cases)
- [ ] Infrastructure layer created (adapters)
- [ ] Error module defined
- [ ] Models defined

### Interface
- [ ] Public interface has exactly 6 core methods
- [ ] Internal state is private
- [ ] Configuration struct defined
- [ ] Re-exports are minimal

### Tests
- [ ] Unit tests for each use case
- [ ] Integration tests for full flows
- [ ] Tests use public interface only
- [ ] All tests pass

### Build
- [ ] `cargo build -p auth_service` succeeds
- [ ] `cargo build --workspace` succeeds
- [ ] `cargo test -p auth_service` passes
- [ ] `cargo clippy -p auth_service` clean

### Documentation
- [ ] README.md created
- [ ] Public API documented
- [ ] Design decisions documented

---

## What's Next (Phase 3 Preview)

After Phase 2 completes:

1. **Create API Gateway** — `gateways/api_gateway/`
2. **Move HTTP layer** — from `klynt-api` to gateway
3. **Wire up services** — composition root in gateway
4. **Remove old crates** — klynt-application, klynt-api, klynt-server

---

## Notes

- **Deep module achieved**: Small interface (6 methods), deep implementation (all auth complexity hidden)
- **Deletion test passes**: Can delete auth_service without breaking other future services
- **Locality maximized**: All auth knowledge in one place
- **Test surface clean**: Tests and callers cross same seam

---

## Design Decision Log

| Decision | Rationale |
|----------|-----------|
| Keep dependencies on old crates | Temporary, allows incremental migration |
| Separate use case files | Each flow is independently understandable |
| Adapters over traits | Internal seams for testing, external seam for callers |
| Configuration struct | Single place for all auth config |
| Error type separate | Auth-specific errors, wraps domain errors |
| Tests in same crate | Test against interface, not internals |
