# klynt-domain Migration Plan: Complete Elimination

**Goal**: Migrate all shared types from klynt-domain to their proper homes, flatten gateway structure, and completely remove the klynt-domain crate.

**Date**: 2025-06-21

**Status**: Ready to execute

---

## Current State Analysis

### klynt-domain Structure

```
backend/crates/klynt-domain/src/
├── audit.rs              # AuditEvent, AuditAction, ResourceType
├── config/               # Configuration types
│   ├── mod.rs
│   ├── api.rs           # ApiConfig
│   ├── app.rs           # AppConfig
│   └── rate_limiter.rs  # RateLimiterConfig
├── ctx.rs               # Ctx (request context)
├── email_content.rs     # EmailContent trait, VerificationEmail, PasswordResetEmail
├── errors.rs            # DomainError, EmailError, RoleError, TokenError, NameError
├── lib.rs
├── models.rs            # UserId, Email, Role, GlobalRole, UserStatus, User, UserDto
├── password_policy.rs  # PasswordPolicy, PasswordPolicyError
├── ports/               # Port interfaces
│   ├── email.rs         # EmailService trait
│   └── password_hasher.rs  # PasswordHasher trait, HashedPassword
├── ports.rs             # HealthCheck, IdempotencyStore, RateLimiter
├── repositories.rs      # UserRepository, TokenStore, AuditEventRepository
├── session.rs           # SessionToken, Session, SessionStore trait
└── tokens.rs            # TokenKind, Token
```

### Current Dependencies

**Heavy users of klynt-domain**:
- `klynt-infrastructure` - Uses config, errors, models, ports, repositories, session
- `api_gateway` - Uses session, models
- Tests in various crates

### Existing Shared Crates

```
backend/crates/shared/
├── klynt_contracts/     # DTOs for service boundaries
├── klynt_domain/        # ALREADY HAS: Email (different), UserRole, UserStatus, PaginationRequest, Timestamp
└── klynt_utils/         # Has Id<T>, UserId (different type)
```

---

## Destination Mapping

| klynt-domain Module | Destination | Rationale |
|-------------------|------------|------------|
| `models.rs` (UserId, Email, Role, GlobalRole, UserStatus) | `klynt_utils/src/` | Truly shared primitive types |
| `models.rs` (User, UserDto) | DELETE | No longer used - services own their user types |
| `session.rs` | `klynt_storage/src/session.rs` | Session is storage concern |
| `tokens.rs` | `klynt_storage/src/tokens.rs` | Token is storage concern |
| `ports.rs` (HealthCheck, IdempotencyStore, RateLimiter) | `klynt_storage/src/ports.rs` | Storage ports belong with storage |
| `ports/` (EmailService, PasswordHasher) | `klynt_storage/src/ports/` | Infrastructure ports |
| `repositories.rs` | DELETE | Obsolete with new architecture |
| `config/` | `klynt_infrastructure/src/config/` | Config loading is infrastructure |
| `ctx.rs` | `klynt_core/src/ctx.rs` | Context is core abstraction |
| `errors.rs` | `klynt_shared_domain/src/error.rs` | Domain errors belong in shared domain |
| `audit.rs` | `klynt_audit/src/types.rs` | Audit types already in audit crate |
| `email_content.rs` | `klynt_infrastructure/src/email/content.rs` | Email templates are infrastructure |
| `password_policy.rs` | `klynt_infrastructure/src/password_policy.rs` | Password policy is infrastructure |

---

## Gateway Flattening

### Current Structure
```
backend/crates/gateways/
└── api_gateway/         # Subfolder - needs flattening
    ├── Cargo.toml
    ├── src/
    └── tests/
```

### Target Structure
```
backend/crates/gateways/
├── Cargo.toml          # Moved from api_gateway/Cargo.toml
├── src/                # Moved from api_gateway/src/
└── tests/              # Moved from api_gateway/tests/
```

**Changes Required**:
1. Move `api_gateway/Cargo.toml` → `gateways/Cargo.toml`
2. Move `api_gateway/src/*` → `gateways/src/*`
3. Move `api_gateway/tests/*` → `gateways/tests/*`
4. Update package name in Cargo.toml: `api_gateway` → `gateways`
5. Update workspace Cargo.toml references
6. Update all imports: `api_gateway::` → `gateways::`

---

## Migration Phases

### Phase 1: Flatten Gateway Structure (1-2 hours)

**Goal**: Remove api_gateway subfolder

#### Step 1.1: Create new flat structure
```bash
# Create directory structure
mkdir -p /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/gateways/src
mkdir -p /Users/jayden/Projects/Klynt/klynt-edu/backend/crates/gateways/tests
```

#### Step 1.2: Move files
```bash
# Move source files
mv backend/crates/gateways/api_gateway/src/* backend/crates/gateways/src/
mv backend/crates/gateways/api_gateway/tests/* backend/crates/gateways/tests/
```

#### Step 1.3: Update gateways/Cargo.toml
```toml
[package]
name = "gateways"  # Changed from "api_gateway"
version = "0.1.0"
edition = "2021"

[dependencies]
# ... existing dependencies ...
```

#### Step 1.4: Update workspace Cargo.toml
```toml
# Change from:
"crates/gateways/api_gateway",
api_gateway = { path = "crates/gateways/api_gateway" }

# To:
"crates/gateways",
gateways = { path = "crates/gateways" }
```

#### Step 1.5: Update klynt-server
**File**: `backend/crates/klynt-server/src/main.rs`
```rust
// Change from:
use api_gateway::{run, Config, Services};

// To:
use gateways::{run, Config, Services};
```

#### Step 1.6: Delete old directory
```bash
rm -rf backend/crates/gateways/api_gateway
```

#### Step 1.7: Verify
```bash
cargo build --workspace
cargo test -p gateways
```

---

### Phase 2: Migrate Primitive Types to klynt_utils (2-3 hours)

**Goal**: Move UserId, Email, Role, GlobalRole, UserStatus to klynt_utils

#### Step 2.1: Merge UserId types

**Current state**:
- `klynt-domain/src/models.rs` has `UserId(pub Uuid)` with methods
- `klynt_utils/src/id.rs` has `UserId = Id<UserIdMarker>`

**Decision**: Use the simpler `UserId(pub Uuid)` from klynt-domain

**Action**: Replace `klynt_utils/src/id.rs` UserId with the domain version

**File**: `backend/crates/shared/klynt_utils/src/id.rs`
```rust
//! ID generation and utilities.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Generate a new UUID v4
pub fn uuid_v4() -> Uuid {
    Uuid::new_v4()
}

/// Generate a new ULID
pub fn ulid() -> String {
    ulid::Ulid::new().to_string()
}

/// Parse ID from string
pub fn parse_id(s: &str) -> Result<Uuid, uuid::Error> {
    Uuid::parse_str(s)
}

/// User ID wrapper - stable, globally unique identifier.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct UserId(pub Uuid);

impl UserId {
    /// Create a new random user ID.
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    /// Create from UUID.
    pub fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid)
    }

    /// Get the inner UUID.
    pub fn inner(&self) -> Uuid {
        self.0
    }
}

impl Default for UserId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for UserId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::str::FromStr for UserId {
    type Err = uuid::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self(Uuid::parse_str(s)?))
    }
}

// Generic ID wrapper for other typed IDs
#[derive(Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Id<T>(pub Uuid, std::marker::PhantomData<T>);

impl<T> Id<T> {
    pub fn new() -> Self {
        Self(Uuid::new_v4(), std::marker::PhantomData)
    }

    pub fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid, std::marker::PhantomData)
    }

    pub fn inner(&self) -> Uuid {
        self.0
    }
}

impl<T> Default for Id<T> {
    fn default() -> Self {
        Self::new()
    }
}

impl<T> std::str::FromStr for Id<T> {
    type Err = uuid::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self(Uuid::parse_str(s)?, std::marker::PhantomData))
    }
}

impl<T> std::fmt::Display for Id<T> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl<T> std::fmt::Debug for Id<T> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

// Type aliases for common IDs
pub type SessionId = Id<SessionIdMarker>;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct SessionIdMarker;
```

#### Step 2.2: Add Email type to klynt_utils

**File**: `backend/crates/shared/klynt_utils/src/email.rs` (NEW)
```rust
//! Email address type with validation.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error, PartialEq)]
pub enum EmailError {
    #[error("email is empty")]
    Empty,
    #[error("invalid email format")]
    InvalidFormat,
}

/// Email address wrapper.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Email(String);

impl Email {
    /// Parse and validate an email address.
    pub fn parse(raw: &str) -> Result<Self, EmailError> {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            return Err(EmailError::Empty);
        }

        let parts: Vec<&str> = trimmed.split('@').collect();
        if parts.len() != 2 {
            return Err(EmailError::InvalidFormat);
        }
        let local = parts[0];
        let domain = parts[1];
        if local.is_empty()
            || domain.is_empty()
            || !domain.contains('.')
            || domain.starts_with('.')
            || domain.ends_with('.')
        {
            return Err(EmailError::InvalidFormat);
        }

        Ok(Self(trimmed.to_lowercase()))
    }

    /// Get inner string.
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Create email without validation (for tests).
    pub fn unsafe_new(email: String) -> Self {
        Self(email.to_lowercase())
    }
}

impl std::fmt::Display for Email {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}
```

#### Step 2.3: Add Role types to klynt_utils

**File**: `backend/crates/shared/klynt_utils/src/role.rs` (NEW)
```rust
//! User role types.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error, PartialEq)]
pub enum RoleError {
    #[error("unknown role")]
    Unknown,
}

/// Platform-specific user role (education context).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    Student,
    Teacher,
    Admin,
    Parent,
}

impl Role {
    pub fn parse(raw: &str) -> Result<Self, RoleError> {
        match raw.to_lowercase().as_str() {
            "student" => Ok(Self::Student),
            "teacher" => Ok(Self::Teacher),
            "admin" => Ok(Self::Admin),
            "parent" => Ok(Self::Parent),
            _ => Err(RoleError::Unknown),
        }
    }

    pub fn requires_institution(self) -> bool {
        matches!(self, Role::Teacher | Role::Admin)
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Role::Student => "student",
            Role::Teacher => "teacher",
            Role::Admin => "admin",
            Role::Parent => "parent",
        }
    }
}

impl std::fmt::Display for Role {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

/// Platform-wide role (multi-tenant context).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum GlobalRole {
    Owner,
    Admin,
    #[default]
    User,
}

impl GlobalRole {
    pub fn parse(raw: &str) -> Result<Self, RoleError> {
        match raw.to_lowercase().as_str() {
            "owner" => Ok(Self::Owner),
            "admin" => Ok(Self::Admin),
            "user" => Ok(Self::User),
            _ => Err(RoleError::Unknown),
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            GlobalRole::Owner => "owner",
            GlobalRole::Admin => "admin",
            GlobalRole::User => "user",
        }
    }
}

impl std::fmt::Display for GlobalRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

/// User account status.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UserStatus {
    PendingVerification,
    Active,
    Suspended,
}

impl UserStatus {
    pub fn parse(raw: &str) -> Result<Self, RoleError> {
        match raw.to_lowercase().as_str() {
            "pending_verification" => Ok(Self::PendingVerification),
            "active" => Ok(Self::Active),
            "suspended" => Ok(Self::Suspended),
            _ => Err(RoleError::Unknown),
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            UserStatus::PendingVerification => "pending_verification",
            UserStatus::Active => "active",
            UserStatus::Suspended => "suspended",
        }
    }
}

impl std::fmt::Display for UserStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}
```

#### Step 2.4: Update klynt_utils lib.rs
```rust
//! # Klynt Utilities
//!
//! Common utilities for the Klynt platform.

pub mod crypto;
pub mod email;   // NEW
pub mod id;
pub mod role;   // NEW
pub mod time;

pub use crypto::*;
pub use email::*;
pub use id::*;
pub use role::*;
pub use time::*;
```

#### Step 2.5: Update imports across codebase
```bash
# Replace all imports
find . -name "*.rs" -type f -exec sed -i '' 's/klynt_domain::models::UserId/klynt_utils::UserId/g' {} +
find . -name "*.rs" -type f -exec sed -i '' 's/klynt_domain::models::Email/klynt_utils::Email/g' {} +
find . -name "*.rs" -type f -exec sed -i '' 's/klynt_domain::models::Role/klynt_utils::Role/g' {} +
find . -name "*.rs" -type f -exec sed -i '' 's/klynt_domain::models::GlobalRole/klynt_utils::GlobalRole/g' {} +
find . -name "*.rs" -type f -exec sed -i '' 's/klynt_domain::models::UserStatus/klynt_utils::UserStatus/g' {} +
```

---

### Phase 3: Migrate Storage Types to klynt_storage (2-3 hours)

**Goal**: Move session, tokens, and ports to klynt_storage

#### Step 3.1: Move session types

**File**: `backend/crates/infrastructure/klynt_storage/src/session.rs` (NEW)
```rust
//! Session types for authentication.

use async_trait::async_trait;
use chrono::{DateTime, Duration, Utc};
use klynt_utils::UserId;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Opaque bearer token used to authenticate requests.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct SessionToken(pub Uuid);

impl SessionToken {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    pub fn parse(raw: &str) -> Result<Self, crate::Error> {
        Uuid::parse_str(raw)
            .map(Self)
            .map_err(|_| crate::Error::InvalidSessionToken)
    }
}

impl Default for SessionToken {
    default!();
}

/// An authenticated session.
#[derive(Debug, Clone)]
pub struct Session {
    pub token: SessionToken,
    pub user_id: UserId,
    pub expires_at: DateTime<Utc>,
}

impl Session {
    /// Default session lifetime when none is specified.
    pub const DEFAULT_TTL: Duration = Duration::hours(24);

    pub fn new(user_id: UserId, ttl: Duration) -> Self {
        let token = SessionToken::new();
        let expires_at = Utc::now() + ttl;
        Self {
            token,
            user_id,
            expires_at,
        }
    }

    pub fn is_expired(&self) -> bool {
        Utc::now() >= self.expires_at
    }
}

/// Outbound port for session storage.
#[async_trait]
pub trait SessionStore: Send + Sync {
    /// Create a new session for `user_id` and return its bearer token.
    async fn create(
        &self,
        ctx: &klynt_core::ctx::Ctx,
        user_id: UserId,
        expires_at: DateTime<Utc>,
    ) -> Result<SessionToken, crate::Error>;

    /// Find a non-expired session by token.
    async fn find_valid(
        &self,
        ctx: &klynt_core::ctx::Ctx,
        token: &SessionToken,
    ) -> Result<Option<Session>, crate::Error>;

    /// Revoke a session by token.
    async fn revoke(
        &self,
        ctx: &klynt_core::ctx::Ctx,
        token: &SessionToken,
    ) -> Result<(), crate::Error>;
}
```

#### Step 3.2: Move token types

**File**: `backend/crates/infrastructure/klynt_storage/src/tokens.rs` (NEW)
```rust
//! Token types for email verification and password reset.

use chrono::{DateTime, Duration, Utc};
use klynt_utils::UserId;

/// Which kind of token — determines TTL and target table.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum TokenKind {
    EmailVerification,
    PasswordReset,
}

impl TokenKind {
    /// Token lifetime before expiry.
    pub const fn ttl(self) -> Duration {
        match self {
            Self::EmailVerification => Duration::hours(24),
            Self::PasswordReset => Duration::minutes(30),
        }
    }
}

/// A generated token — plaintext (for email) + hash (for storage).
///
/// Generated with a CSPRNG (≥256 bits), stored as a SHA-256 hash.
/// The plaintext is sent via email and never stored in the database.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Token {
    pub plaintext: String,
    pub hash: String,
    pub user_id: UserId,
    pub expires_at: DateTime<Utc>,
    pub kind: TokenKind,
}

impl Token {
    /// Generate a new token of the given kind for the given user.
    pub fn generate(kind: TokenKind, user_id: UserId) -> Self {
        let plaintext = generate_csprng_token();
        let hash = Self::sha256_hash(&plaintext);
        let expires_at = Utc::now() + kind.ttl();

        Self {
            plaintext,
            hash,
            user_id,
            expires_at,
            kind,
        }
    }

    /// Compute SHA-256 hash of a plaintext token (hex string).
    pub fn sha256_hash(token: &str) -> String {
        sha256_hash_inner(token)
    }

    /// Check if token has expired.
    pub fn is_expired(&self) -> bool {
        Utc::now() >= self.expires_at
    }
}

/// Generate a cryptographically secure random token (≥256 bits).
fn generate_csprng_token() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let mut bytes = [0u8; 43];
    for byte in bytes.iter_mut() {
        *byte = rng.gen();
    }
    base64_url_encode(&bytes)
}

/// Compute SHA-256 hash (hex string).
fn sha256_hash_inner(token: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Base64URL-encode without padding (URL-safe).
fn base64_url_encode(data: &[u8]) -> String {
    use base64::prelude::*;
    BASE64_URL_SAFE_NO_PAD.encode(data)
}
```

#### Step 3.3: Move ports

**File**: `backend/crates/infrastructure/klynt_storage/src/ports.rs` (NEW)
```rust
//! Storage port interfaces.

use std::net::IpAddr;
use uuid::Uuid;

/// Per-component health check result.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ComponentHealth {
    pub name: String,
    pub healthy: bool,
    pub latency_ms: f64,
    pub error: Option<String>,
}

/// Health-check port for readiness probes.
#[async_trait::async_trait]
pub trait HealthCheck: Send + Sync {
    /// Name of the component being checked (e.g. "postgres.user_repository").
    fn name(&self) -> &str;

    /// Check the component's health, returning timing + status.
    async fn check(&self) -> ComponentHealth;
}

/// A generic idempotency cache.
#[async_trait::async_trait]
pub trait IdempotencyStore<T>: Send + Sync
where
    T: Clone + Send + Sync + 'static,
{
    async fn get(&self, key: Uuid) -> Result<Option<T>, crate::Error>;
    async fn set(&self, key: Uuid, value: T) -> Result<(), crate::Error>;
    async fn get_or_insert(&self, key: Uuid, value: T) -> Result<Option<T>, crate::Error>;
}

/// Result of a rate-limit check.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RateLimitDecision {
    pub allowed: bool,
    pub retry_after_seconds: Option<u32>,
}

impl RateLimitDecision {
    pub fn allowed() -> Self {
        Self {
            allowed: true,
            retry_after_seconds: None,
        }
    }

    pub fn denied(retry_after: u32) -> Self {
        Self {
            allowed: false,
            retry_after_seconds: Some(retry_after),
        }
    }
}

#[async_trait::async_trait]
pub trait RateLimiter: Send + Sync {
    async fn check(&self, ip: IpAddr) -> RateLimitDecision;
}

pub mod email;
pub mod password_hasher;

pub use email::{EmailService, SharedEmailService};
pub use password_hasher::{HashedPassword, PasswordHasher};
```

#### Step 3.4: Move port submodules

**File**: `backend/crates/infrastructure/klynt_storage/src/ports/email.rs` (NEW)
```rust
//! Email service port.

use async_trait::async_trait;
use klynt_infrastructure::email::EmailContent;

/// Outbound port for sending transactional emails.
#[async_trait::async_trait]
pub trait EmailService: Send + Sync {
    async fn send(&self, content: Box<dyn EmailContent>) -> Result<(), crate::Error>;
}

/// Shared email service handle.
pub type SharedEmailService = std::sync::Arc<dyn EmailService>;
```

**File**: `backend/crates/infrastructure/klynt_storage/src/ports/password_hasher.rs` (NEW)
```rust
//! Password hasher port.

use async_trait::async_trait;

/// Opaque wrapper around a hashed password string.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HashedPassword(String);

impl HashedPassword {
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl From<String> for HashedPassword {
    fn from(value: String) -> Self {
        Self(value)
    }
}

/// Outbound port for hashing and verifying passwords.
#[async_trait::async_trait]
pub trait PasswordHasher: Send + Sync {
    async fn hash(&self, plaintext: &str) -> Result<HashedPassword, crate::Error>;
    async fn verify(&self, plaintext: &str, hash: &HashedPassword) -> Result<bool, crate::Error>;
}
```

#### Step 3.5: Update klynt_storage lib.rs
```rust
//! # Klynt Storage
//!
//! Storage abstractions and port interfaces.

pub mod ports;
pub mod session;
pub mod tokens;

pub use ports::*;
pub use session::*;
pub use tokens::*;
```

#### Step 3.6: Add dependencies to klynt_storage

**File**: `backend/crates/infrastructure/klynt_storage/Cargo.toml`
```toml
[dependencies]
klynt_core = { path = "../../../core/klynt_core" }
klynt_utils = { path = "../../../shared/klynt_utils" }
klynt_infrastructure = { path = "../klynt-infrastructure" }

# ... existing ...
```

---

### Phase 4: Migrate Context to klynt_core (1 hour)

**Goal**: Move Ctx to klynt_core

#### Step 4.1: Check if Ctx already exists in klynt_core

**If exists**: Ensure it has the same structure
**If not**: Create it

**File**: `backend/crates/core/klynt_core/src/ctx.rs`
```rust
//! Request-scoped context passed into use cases and adapters.

use uuid::Uuid;

/// Request-scoped context.
#[derive(Debug, Clone, Copy)]
pub struct Ctx {
    pub request_id: Uuid,
    pub user_id: Option<klynt_utils::UserId>,
}

impl Ctx {
    /// Create a context for an unauthenticated (guest) request.
    pub fn guest(request_id: Uuid) -> Self {
        Self {
            request_id,
            user_id: None,
        }
    }

    /// Create a context for an authenticated request.
    pub fn authenticated(request_id: Uuid, user_id: klynt_utils::UserId) -> Self {
        Self {
            request_id,
            user_id: Some(user_id),
        }
    }

    pub fn is_authenticated(&self) -> bool {
        self.user_id.is_some()
    }
}
```

#### Step 4.2: Update klynt_core lib.rs
```rust
pub mod ctx;

pub use ctx::*;
```

---

### Phase 5: Migrate Errors to klynt_shared_domain (1-2 hours)

**Goal**: Move all error types to klynt_shared_domain

#### Step 5.1: Merge errors into klynt_shared_domain

**File**: `backend/crates/shared/klynt_domain/src/error.rs` (extend existing)
```rust
//! Shared domain errors.

use thiserror::Error;

// === Existing errors ===
#[derive(Debug, Error)]
pub enum DomainError {
    #[error("domain error: {0}")]
    Message(String),

    #[error("not found")]
    NotFound,

    #[error("validation failed: {0}")]
    Validation(String),

    // ... existing ...
}

// === New errors from klynt-domain ===

#[derive(Debug, Error, PartialEq)]
pub enum EmailError {
    #[error("email is empty")]
    Empty,
    #[error("invalid email format")]
    InvalidFormat,
}

#[derive(Debug, Error, PartialEq)]
pub enum NameError {
    #[error("name is empty")]
    Empty,
    #[error("name is too long")]
    TooLong,
}

#[derive(Debug, Error, PartialEq)]
pub enum RoleError {
    #[error("unknown role")]
    Unknown,
}

#[derive(Debug, Error, PartialEq)]
pub enum TokenError {
    #[error("token is expired")]
    Expired,
    #[error("invalid token")]
    Invalid,
    #[error("token not found")]
    NotFound,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorKind {
    Validation,
    Conflict,
    NotFound,
    RateLimited,
    AuthenticationRequired,
    Internal,
}

// Enhanced DomainError with all variants
#[derive(Debug, Error)]
pub enum EnhancedDomainError {
    #[error("email already registered: {email}")]
    AlreadyExists { email: String },
    #[error("{0}")]
    InvalidEmail(#[from] EmailError),
    #[error("{0}")]
    InvalidRole(#[from] RoleError),
    #[error("{0}")]
    InvalidToken(#[from] TokenError),
    #[error("{0}")]
    InvalidName(#[from] NameError),
    #[error("not found")]
    NotFound,
    #[error("institution_id is required for role {0:?}")]
    InstitutionRequired(klynt_utils::Role),
    #[error("terms must be accepted")]
    TermsNotAccepted,
    #[error("too many requests")]
    RateLimited,
    #[error("invalid session token")]
    InvalidSessionToken,
    #[error("authentication required")]
    AuthenticationRequired,
    #[error("internal domain error")]
    Internal(Box<dyn std::error::Error + Send + Sync>),
}

impl EnhancedDomainError {
    pub fn internal<E>(error: E) -> Self
    where
        E: std::error::Error + Send + Sync + 'static,
    {
        Self::Internal(Box::new(error))
    }

    pub fn kind(&self) -> ErrorKind {
        match self {
            EnhancedDomainError::NotFound => ErrorKind::NotFound,
            EnhancedDomainError::AlreadyExists { .. } => ErrorKind::Conflict,
            EnhancedDomainError::InvalidEmail(_)
            | EnhancedDomainError::InvalidRole(_)
            | EnhancedDomainError::InvalidToken(_)
            | EnhancedDomainError::InvalidName(_)
            | EnhancedDomainError::InstitutionRequired(_)
            | EnhancedDomainError::TermsNotAccepted
            | EnhancedDomainError::InvalidSessionToken => ErrorKind::Validation,
            EnhancedDomainError::RateLimited => ErrorKind::RateLimited,
            EnhancedDomainError::AuthenticationRequired => ErrorKind::AuthenticationRequired,
            EnhancedDomainError::Internal(_) => ErrorKind::Internal,
        }
    }
}
```

---

### Phase 6: Migrate Config to klynt_infrastructure (1-2 hours)

**Goal**: Move all config types to klynt_infrastructure

#### Step 6.1: Create config directory in klynt_infrastructure

**File**: `backend/crates/klynt-infrastructure/src/config/mod.rs` (NEW)
```rust
//! Configuration types.

pub mod api;
pub mod app;
pub mod rate_limiter;

pub use api::ApiConfig;
pub use app::AppConfig;
pub use rate_limiter::RateLimiterConfig;

use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("invalid host: {0}")]
    InvalidHost(String),

    #[error("invalid port: {0}")]
    InvalidPort(String),

    #[error("invalid origin URL: {0}")]
    InvalidOrigin(String),

    #[error("rate limiter max_requests must be at least 1")]
    InvalidMaxRequests,

    #[error("rate limiter window must be at least 1 second")]
    InvalidWindow,
}

pub trait Validated {
    fn validated(&self) -> Result<(), ConfigError>;
}
```

#### Step 6.2: Copy config files

Copy content from:
- `klynt-domain/src/config/api.rs` → `klynt-infrastructure/src/config/api.rs`
- `klynt-domain/src/config/app.rs` → `klynt-infrastructure/src/config/app.rs`
- `klynt-domain/src/config/rate_limiter.rs` → `klynt-infrastructure/src/config/rate_limiter.rs`

#### Step 6.3: Update klynt_infrastructure lib.rs
```rust
pub mod config;
// ... existing ...
```

---

### Phase 7: Move Remaining Types (2-3 hours)

**Goal**: Move audit, email_content, password_policy

#### Step 7.1: Move audit to klynt_audit

**File**: `backend/crates/infrastructure/klynt_audit/src/types.rs` (extend)
```rust
//! Audit event types.

// Add AuditEvent, AuditAction, ResourceType from klynt-domain/src/audit.rs
```

#### Step 7.2: Move email_content to klynt_infrastructure

**File**: `backend/crates/klynt-infrastructure/src/email/content.rs` (NEW)
```rust
//! Email content templates.

// Copy EmailContent trait and implementations from klynt-domain/src/email_content.rs
```

#### Step 7.3: Move password_policy to klynt_infrastructure

**File**: `backend/crates/klynt-infrastructure/src/password_policy.rs` (NEW)
```rust
//! Password validation policy.

// Copy PasswordPolicy from klynt-domain/src/password_policy.rs
```

---

### Phase 8: Update All Imports (2-3 hours)

**Goal**: Systematic import replacement across all crates

#### Step 8.1: Find all uses
```bash
grep -r "klynt_domain::" backend/crates/*/src --include="*.rs"
```

#### Step 8.2: Replace patterns
```bash
# Session and tokens
klynt_domain::session → klynt_storage::session
klynt_domain::tokens → klynt_storage::tokens

# Ports
klynt_domain::ports:: → klynt_storage::ports::
klynt_domain::ports::HealthCheck → klynt_storage::ports::HealthCheck
klynt_domain::ports::EmailService → klynt_storage::ports::EmailService
klynt_domain::ports::PasswordHasher → klynt_storage::ports::PasswordHasher

# Context
klynt_domain::ctx → klynt_core::ctx
klynt_domain::ctx::Ctx → klynt_core::Ctx

# Config
klynt_domain::config → klynt_infrastructure::config

# Errors
klynt_domain::errors → klynt_shared_domain::error
klynt_domain::errors::DomainError → klynt_shared_domain::EnhancedDomainError

# Audit
klynt_domain::audit → klynt_audit::types

# Email content
klynt_domain::email_content → klynt_infrastructure::email::content

# Repositories (delete these, they're obsolete)
klynt_domain::repositories → DELETE (use service-specific repositories)
```

#### Step 8.3: Update Cargo.toml files

Remove `klynt-domain` dependency from all crates:
```bash
# Find all Cargo.toml files that depend on klynt-domain
grep -r "klynt-domain" backend/crates/*/Cargo.toml

# Remove the dependency line from each
```

---

### Phase 9: Remove klynt-domain (1 hour)

**Goal**: Complete elimination

#### Step 9.1: Remove from workspace

**File**: `backend/Cargo.toml`
```toml
# Remove from members:
"crates/klynt-domain",

# Remove from dependencies:
klynt-domain = { path = "crates/klynt-domain" },
```

#### Step 9.2: Delete directory
```bash
rm -rf backend/crates/klynt-domain
```

#### Step 9.3: Final verification
```bash
cargo clean
cargo build --workspace
cargo test --workspace
cargo clippy --workspace --all-targets
```

---

## Verification Checklist

After each phase:
- [ ] `cargo build --workspace` succeeds
- [ ] `cargo test --workspace` passes
- [ ] No clippy warnings in changed code
- [ ] All imports resolved

Final verification:
- [ ] klynt-domain crate removed
- [ ] Gateway structure flattened (`gateways/src` not `gateways/api_gateway/src`)
- [ ] All services compile
- [ ] All tests pass
- [ ] No broken imports

---

## Post-Migration Architecture

```
backend/crates/
├── core/
│   └── klynt_core/              # Base abstractions + Ctx
├── shared/
│   ├── klynt_contracts/         # DTOs
│   ├── klynt_domain/            # Shared types + Enhanced errors
│   └── klynt_utils/             # UserId, Email, Role, UserStatus, utilities
├── infrastructure/
│   ├── klynt_audit/             # Audit service + types
│   ├── klynt_messaging/         # Events
│   ├── klynt_storage/           # Storage + ports + sessions + tokens
│   ├── klynt_tracing/           # Observability
│   └── klynt-infrastructure/    # Config, email, password_policy, repositories
├── services/
│   ├── auth_service/
│   └── user_service/
├── gateways/                     # FLATTENED
│   ├── Cargo.toml
│   ├── src/
│   └── tests/
├── klynt-server/                # Entry point
└── klynt-application/           # TO BE REMOVED NEXT
```

---

## Dependency Risk Analysis

| Module | Dependents | Migration Risk | Mitigation |
|--------|-----------|----------------|------------|
| `models.rs` (UserId, Email) | HIGH - used everywhere | High | Migrate first, verify thoroughly |
| `session.rs` | gateway, middleware | Medium | Update middleware imports |
| `tokens.rs` | auth_service | Low | Service already has its own types |
| `ports.rs` | infrastructure | Medium | Already duplicated in services |
| `repositories.rs` | klynt-infrastructure | Low | Will be deleted (obsolete) |
| `config/` | klynt-infrastructure | Low | Already exists in infrastructure |
| `ctx.rs` | infrastructure, tests | Medium | Ensure compatibility |
| `errors.rs` | ALL | High | Merge carefully with existing errors |
| `audit.rs` | klynt_audit | Low | Already in audit crate |
| `email_content.rs` | klynt-infrastructure | Low | Move to infrastructure |
| `password_policy.rs` | auth_service | Low | Move to infrastructure |

---

## Rollback Plan

If migration fails:
```bash
# Git rollback
git reflog
git reset --hard HEAD@{N}

# Or restore from backup
cp -r backend/crates/klynt-domain.backup/* backend/crates/klynt-domain/
```

**Tag before starting**:
```bash
git tag pre-domain-migration
git push origin pre-domain-migration
```

---

## Implementation Sequence

| Day | Phase | Action | Deliverable |
|-----|-------|--------|-------------|
| 1 | Phase 1 | Flatten gateway | `gateways/` flat structure |
| 1 | Phase 2 | Migrate primitives to klynt_utils | UserId, Email, Role in utils |
| 2 | Phase 3 | Migrate storage types | Session, tokens, ports in klynt_storage |
| 2 | Phase 4 | Migrate context | Ctx in klynt_core |
| 3 | Phase 5 | Migrate errors | All errors in klynt_shared_domain |
| 3 | Phase 6 | Migrate config | Config in klynt_infrastructure |
| 4 | Phase 7 | Move remaining types | Audit, email, password_policy |
| 4 | Phase 8 | Update all imports | All imports resolved |
| 5 | Phase 9 | Remove klynt-domain | Crate eliminated, verified |

---

## Success Criteria

✅ **Migration complete when**:
- klynt-domain crate removed
- Gateway structure flattened
- All services compile
- All tests pass
- Build completes successfully
- No clippy warnings

---

## Notes

- **Take it phase by phase** — verify after each migration
- **Tag before major changes** — easy rollback
- **Test frequently** — catch issues early
- **Document changes** — help future developers
- **Delete User, UserDto from models** — services own their user types now
- **Delete repositories.rs** — obsolete with new architecture
