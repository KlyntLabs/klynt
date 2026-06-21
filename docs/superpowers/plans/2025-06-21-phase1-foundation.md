# Phase 1: Foundation Implementation Plan

**Goal**: Establish shared abstractions (core, shared, infrastructure) without breaking existing code.

**Approach**: Create new crates alongside existing ones — zero breaking changes.

**Estimated Time**: 3-5 days

---

## Overview

What we're creating:

```
backend/crates/
├── [existing - keep unchanged]
│   ├── klynt-domain/
│   ├── klynt-application/
│   ├── klynt-infrastructure/
│   ├── klynt-api/
│   └── klynt-server/
│
├── [NEW - Phase 1]
│   ├── core/
│   │   └── klynt_core/
│   ├── shared/
│   │   ├── klynt_contracts/
│   │   ├── klynt_domain/
│   │   ├── klynt_utils/
│   │   └── klynt_typedenum/
│   └── infrastructure/
│       ├── klynt_messaging/
│       ├── klynt_storage/
│       └── klynt_tracing/
```

---

## Step 1: Update Workspace Configuration

**File**: `backend/Cargo.toml`

**Action**: Add new members to workspace

```toml
[workspace]
resolver = "2"
members = [
    # === Existing (keep for Phase 1) ===
    "crates/klynt-domain",
    "crates/klynt-application",
    "crates/klynt-infrastructure",
    "crates/klynt-api",
    "crates/klynt-server",

    # === NEW - Phase 1 Foundation ===
    "crates/core/klynt_core",

    "crates/shared/klynt_contracts",
    "crates/shared/klynt_domain",
    "crates/shared/klynt_utils",
    "crates/shared/klynt_typedenum",

    "crates/infrastructure/klynt_messaging",
    "crates/infrastructure/klynt_storage",
    "crates/infrastructure/klynt_tracing",
]

[workspace.package]
version = "0.1.0"
edition = "2021"

[workspace.dependencies]
# ... existing dependencies ...

# === NEW - Internal crates ===
klynt_core = { path = "crates/core/klynt_core" }
klynt_contracts = { path = "crates/shared/klynt_contracts" }
klynt_shared_domain = { path = "crates/shared/klynt_domain" }
klynt_utils = { path = "crates/shared/klynt_utils" }
klynt_typedenum = { path = "crates/shared/klynt_typedenum" }
klynt_messaging = { path = "crates/infrastructure/klynt_messaging" }
klynt_storage = { path = "crates/infrastructure/klynt_storage" }
klynt_tracing = { path = "crates/infrastructure/klynt_tracing" }
```

**Verification**: `cargo build` should still succeed (no changes to existing code yet)

---

## Step 2: Create klynt_core (Base Abstractions)

**Purpose**: Core types, error handling, context structures shared across all services.

### 2.1 Create Directory Structure

```bash
mkdir -p backend/crates/core/klynt_core/src/{base,ctx}
```

### 2.2 Create Cargo.toml

**File**: `backend/crates/core/klynt_core/Cargo.toml`

```toml
[package]
name = "klynt_core"
version = "0.1.0"
edition = "2021"

[dependencies]
# Error handling
thiserror = { workspace = true }
anyhow = { workspace = true }

# Serialization
serde = { workspace = true }
serde_json = { workspace = true }

# Tracing
tracing = { workspace = true }

# Time
chrono = { workspace = true }
time = { workspace = true }

# IDs
uuid = { workspace = true }
ulid = { workspace = true }

# Validation
validator = { workspace = true }

# Async
async-trait = { workspace = true }
```

### 2.3 Create lib.rs

**File**: `backend/crates/core/klynt_core/src/lib.rs`

```rust
//! # Klynt Core
//!
//! Base types and abstractions for the Klynt platform.

pub mod base;
pub mod ctx;

pub use base::*;
pub use ctx::*;
```

### 2.4 Create Base Module

**File**: `backend/crates/core/klynt_core/src/base/mod.rs`

```rust
//! Base types and constants.

pub mod constants;
pub mod traits;

pub use constants::*;
pub use traits::*;
```

**File**: `backend/crates/core/klynt_core/src/base/constants.rs`

```rust
//! Application-wide constants.

/// API version prefix
pub const API_VERSION: &str = "/v1";

/// Default page size for pagination
pub const DEFAULT_PAGE_SIZE: usize = 20;

/// Maximum page size for pagination
pub const MAX_PAGE_SIZE: usize = 100;

/// Session duration in seconds (default: 24 hours)
pub const DEFAULT_SESSION_DURATION_SECS: u64 = 86400;

/// Refresh token duration in seconds (default: 30 days)
pub const DEFAULT_REFRESH_TOKEN_DURATION_SECS: u64 = 2_592_000;
```

**File**: `backend/crates/core/klynt_core/src/base/traits.rs`

```rust
//! Core traits used across the application.

use std::fmt::Debug;
use std::hash::Hash;

/// Trait for entities that can be identified
pub trait Identifiable {
    type Id: Eq + Hash + Debug + Clone + Send + Sync;

    fn id(&self) -> &Self::Id;
}

/// Trait for entities that track creation and modification
pub trait Auditable {
    fn created_at(&self) -> chrono::DateTime<chrono::Utc>;
    fn updated_at(&self) -> Option<chrono::DateTime<chrono::Utc>>;
}

/// Trait for entities that can be soft-deleted
pub trait SoftDeletable {
    fn deleted_at(&self) -> Option<chrono::DateTime<chrono::Utc>>;
    fn is_deleted(&self) -> bool {
        self.deleted_at().is_some()
    }
}

/// Trait for paginated results
pub trait Paginated {
    type Item;

    fn items(&self) -> &[Self::Item];
    fn total_count(&self) -> u64;
    fn page(&self) -> u32;
    fn page_size(&self) -> u32;
    fn total_pages(&self) -> u32;
}

/// Trait for entities that can be validated
pub trait Validate {
    type Error;

    fn validate(&self) -> Result<(), Self::Error>;
}
```

### 2.5 Create Context Module

**File**: `backend/crates/core/klynt_core/src/ctx/mod.rs`

```rust
//! Request and execution context types.

pub mod request_context;

pub use request_context::*;
```

**File**: `backend/crates/core/klynt_core/src/ctx/request_context.rs`

```rust
//! Request context for tracking request-scoped data.

use std::fmt;

/// Unique request ID
#[derive(Clone, Copy, PartialEq, Eq, Hash)]
pub struct RequestId(pub uuid::Uuid);

impl RequestId {
    /// Generate a new request ID
    pub fn new() -> Self {
        Self(uuid::Uuid::new_v4())
    }

    /// Create from UUID string
    pub fn from_str(s: &str) -> Result<Self, uuid::Error> {
        Ok(Self(uuid::Uuid::parse_str(s)?))
    }
}

impl fmt::Display for RequestId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl Default for RequestId {
    fn default() -> Self {
        Self::new()
    }
}

/// Request context containing request-scoped data
#[derive(Clone, Debug)]
pub struct RequestContext {
    pub request_id: RequestId,
    pub trace_id: Option<String>,
    pub user_agent: Option<String>,
    pub client_ip: Option<String>,
    pub start_time: chrono::DateTime<chrono::Utc>,
}

impl RequestContext {
    /// Create a new request context
    pub fn new() -> Self {
        Self {
            request_id: RequestId::new(),
            trace_id: None,
            user_agent: None,
            client_ip: None,
            start_time: chrono::Utc::now(),
        }
    }

    /// Create with specific request ID
    pub fn with_request_id(request_id: RequestId) -> Self {
        Self {
            request_id,
            trace_id: None,
            user_agent: None,
            client_ip: None,
            start_time: chrono::Utc::now(),
        }
    }

    /// Set the trace ID (for distributed tracing)
    pub fn with_trace_id(mut self, trace_id: String) -> Self {
        self.trace_id = Some(trace_id);
        self
    }

    /// Set user agent
    pub fn with_user_agent(mut self, user_agent: String) -> Self {
        self.user_agent = Some(user_agent);
        self
    }

    /// Set client IP
    pub fn with_client_ip(mut self, client_ip: String) -> Self {
        self.client_ip = Some(client_ip);
        self
    }

    /// Get elapsed time since request start
    pub fn elapsed(&self) -> chrono::Duration {
        chrono::Utc::now() - self.start_time
    }
}

impl Default for RequestContext {
    fn default() -> Self {
        Self::new()
    }
}

/// Execution context for service operations
#[derive(Clone, Debug)]
pub struct ExecutionContext {
    pub request: RequestContext,
    pub actor_id: Option<uuid::Uuid>,
    pub actor_type: Option<ActorType>,
}

impl ExecutionContext {
    /// Create a new execution context
    pub fn new(request: RequestContext) -> Self {
        Self {
            request,
            actor_id: None,
            actor_type: None,
        }
    }

    /// Set the actor (authenticated user/system)
    pub fn with_actor(mut self, id: uuid::Uuid, actor_type: ActorType) -> Self {
        self.actor_id = Some(id);
        self.actor_type = Some(actor_type);
        self
    }

    /// Check if actor is a user
    pub fn is_user(&self) -> bool {
        matches!(self.actor_type, Some(ActorType::User))
    }

    /// Check if actor is a system
    pub fn is_system(&self) -> bool {
        matches!(self.actor_type, Some(ActorType::System))
    }
}

/// Type of actor performing an action
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ActorType {
    User,
    System,
    Service,
}
```

### 2.6 Verify klynt_core

```bash
cargo build -p klynt_core
cargo test -p klynt_core
```

---

## Step 3: Create klynt_utils (Common Utilities)

**Purpose**: Reusable utilities for ID generation, crypto, validation, etc.

### 3.1 Create Directory Structure

```bash
mkdir -p backend/crates/shared/klynt_utils/src
```

### 3.2 Create Cargo.toml

**File**: `backend/crates/shared/klynt_utils/Cargo.toml`

```toml
[package]
name = "klynt_utils"
version = "0.1.0"
edition = "2021"

[dependencies]
# Core
klynt_core = { path = "../../core/klynt_core" }

# Crypto
rand = { workspace = true }
rand_core = { workspace = true }
sha2 = { workspace = true }
base64 = { workspace = true }
argon2 = { workspace = true }

# IDs
uuid = { workspace = true }
ulid = { workspace = true }

# Time
time = { workspace = true }
chrono = { workspace = true }

# Serialization
serde = { workspace = true }

# Tracing
tracing = { workspace = true }
```

### 3.3 Create lib.rs

**File**: `backend/crates/shared/klynt_utils/src/lib.rs`

```rust
//! # Klynt Utilities
//!
//! Common utilities for the Klynt platform.

pub mod crypto;
pub mod id;
pub mod time;

pub use crypto::*;
pub use id::*;
pub use time::*;
```

### 3.4 Create ID Module

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

/// Wrapper for strongly-typed IDs
#[derive(Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Id<T>(pub Uuid, std::marker::PhantomData<T>);

impl<T> Id<T> {
    /// Create a new ID
    pub fn new() -> Self {
        Self(Uuid::new_v4(), std::marker::PhantomData)
    }

    /// Create from UUID
    pub fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid, std::marker::PhantomData)
    }

    /// Get the inner UUID
    pub fn inner(&self) -> Uuid {
        self.0
    }

    /// Parse from string
    pub fn from_str(s: &str) -> Result<Self, uuid::Error> {
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
pub type UserId = Id<UserIdMarker>;
pub type SessionId = Id<SessionIdMarker>;

#[derive(Debug, Clone, Copy)]
pub struct UserIdMarker;
#[derive(Debug, Clone, Copy)]
pub struct SessionIdMarker;
```

### 3.5 Create Crypto Module

**File**: `backend/crates/shared/klynt_utils/src/crypto.rs`

```rust
//! Cryptographic utilities.

use rand::Rng;

const ALPHANUMERIC: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/// Generate a random alphanumeric string of specified length
pub fn random_alphanumeric(length: usize) -> String {
    let mut rng = rand::thread_rng();
    (0..length)
        .map(|_| {
            let idx = rng.gen_range(0..ALPHANUMERIC.len());
            ALPHANUMERIC[idx] as char
        })
        .collect()
}

/// Generate a random token (URL-safe base64)
pub fn random_token(bytes: usize) -> String {
    let mut buf = vec![0u8; bytes];
    rand::thread_rng().fill(&mut buf[..]);
    base64::encode_config(&buf, base64::URL_SAFE_NO_PAD)
}

/// Hash data with SHA-256
pub fn sha256_hash(data: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(data);
    format!("{:x}", hasher.finalize())
}
```

### 3.6 Create Time Module

**File**: `backend/crates/shared/klynt_utils/src/time.rs`

```rust
//! Time utilities.

use chrono::{DateTime, Utc};
use time::Duration;

/// Get current UTC time
pub fn now_utc() -> DateTime<Utc> {
    Utc::now()
}

/// Add duration to datetime
pub fn add_duration(dt: DateTime<Utc>, duration: Duration) -> DateTime<Utc> {
    dt + chrono::Duration::seconds(duration.whole_seconds() as i64)
}

/// Check if datetime is in the past
pub fn is_past(dt: DateTime<Utc>) -> bool {
    dt < Utc::now()
}

/// Check if datetime is in the future
pub fn is_future(dt: DateTime<Utc>) -> bool {
    dt > Utc::now()
}
```

### 3.7 Verify klynt_utils

```bash
cargo build -p klynt_utils
cargo test -p klynt_utils
```

---

## Step 4: Create klynt_shared_domain (Shared Domain Types)

**Purpose**: Shared domain types used across multiple services.

### 4.1 Create Directory Structure

```bash
mkdir -p backend/crates/shared/klynt_domain/src
```

### 4.2 Create Cargo.toml

**File**: `backend/crates/shared/klynt_domain/Cargo.toml`

```toml
[package]
name = "klynt_shared_domain"
version = "0.1.0"
edition = "2021"

[dependencies]
# Core
klynt_core = { path = "../../core/klynt_core" }
klynt_utils = { path = "../klynt_utils" }

# Error handling
thiserror = { workspace = true }

# Serialization
serde = { workspace = true }

# Time
chrono = { workspace = true }
```

### 4.3 Create lib.rs

**File**: `backend/crates/shared/klynt_domain/src/lib.rs`

```rust
//! # Klynt Shared Domain
//!
//! Shared domain types used across services.

pub mod error;
pub mod types;

pub use error::*;
pub use types::*;
```

### 4.4 Create Error Module

**File**: `backend/crates/shared/klynt_domain/src/error.rs`

```rust
//! Shared domain errors.

use thiserror::Error;

/// Base error type for domain operations
#[derive(Error, Debug)]
pub enum DomainError {
    #[error("Entity not found: {0}")]
    NotFound(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Validation failed: {0}")]
    Validation(String),

    #[error("Operation not permitted: {0}")]
    NotPermitted(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl DomainError {
    /// Create not found error
    pub fn not_found(entity: &str) -> Self {
        Self::NotFound(entity.to_string())
    }

    /// Create conflict error
    pub fn conflict(msg: &str) -> Self {
        Self::Conflict(msg.to_string())
    }

    /// Create validation error
    pub fn validation(msg: &str) -> Self {
        Self::Validation(msg.to_string())
    }
}

/// Result type for domain operations
pub type DomainResult<T> = Result<T, DomainError>;
```

### 4.5 Create Types Module

**File**: `backend/crates/shared/klynt_domain/src/types.rs`

```rust
//! Shared domain types.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use klynt_utils::Id;

/// Email address wrapper
#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Email(String);

impl Email {
    /// Create new email (does not validate)
    pub fn new(email: String) -> Self {
        Self(email.to_lowercase())
    }

    /// Get inner value
    pub fn inner(&self) -> &str {
        &self.0
    }

    /// Validate email format
    pub fn validate(&self) -> bool {
        // Simple email validation
        self.0.contains('@') && self.0.contains('.')
    }
}

impl std::fmt::Display for Email {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Timestamp wrapper
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Timestamp(DateTime<Utc>);

impl Timestamp {
    /// Create from UTC datetime
    pub fn new(dt: DateTime<Utc>) -> Self {
        Self(dt)
    }

    /// Get current timestamp
    pub fn now() -> Self {
        Self(Utc::now())
    }

    /// Get inner datetime
    pub fn inner(&self) -> DateTime<Utc> {
        self.0
    }

    /// Check if in the past
    pub fn is_past(&self) -> bool {
        self.0 < Utc::now()
    }
}

impl Default for Timestamp {
    fn default() -> Self {
        Self::now()
    }
}

/// Pagination request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationRequest {
    pub page: u32,
    pub page_size: u32,
}

impl PaginationRequest {
    /// Create new pagination request
    pub fn new(page: u32, page_size: u32) -> Self {
        Self {
            page: page.max(1),
            page_size: page_size.clamp(1, 100),
        }
    }

    /// Get default (first page)
    pub fn first() -> Self {
        Self::new(1, 20)
    }

    /// Calculate offset
    pub fn offset(&self) -> u32 {
        (self.page - 1) * self.page_size
    }
}

/// Paginated response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total_count: u64,
    pub page: u32,
    pub page_size: u32,
    pub total_pages: u32,
}

impl<T> PaginatedResponse<T> {
    /// Create new paginated response
    pub fn new(items: Vec<T>, total_count: u64, page: u32, page_size: u32) -> Self {
        let total_pages = ((total_count as f64) / (page_size as f64)).ceil() as u32;
        Self {
            items,
            total_count,
            page,
            page_size,
            total_pages: total_pages.max(1),
        }
    }

    /// Create empty response
    pub fn empty(page: u32, page_size: u32) -> Self {
        Self::new(vec![], 0, page, page_size)
    }
}
```

### 4.6 Verify klynt_shared_domain

```bash
cargo build -p klynt_shared_domain
```

---

## Step 5: Create klynt_contracts (Shared DTOs)

**Purpose**: Data transfer objects for service boundaries.

### 5.1 Create Directory Structure

```bash
mkdir -p backend/crates/shared/klynt_contracts/src
```

### 5.2 Create Cargo.toml

**File**: `backend/crates/shared/klynt_contracts/Cargo.toml`

```toml
[package]
name = "klynt_contracts"
version = "0.1.0"
edition = "2021"

[dependencies]
# Core
klynt_core = { path = "../../core/klynt_core" }
klynt_shared_domain = { path = "../klynt_domain" }
klynt_utils = { path = "../klynt_utils" }

# Serialization
serde = { workspace = true }
serde_json = { workspace = true }

# Validation
validator = { workspace = true }

# Time
chrono = { workspace = true }
```

### 5.3 Create lib.rs

**File**: `backend/crates/shared/klynt_contracts/src/lib.rs`

```rust
//! # Klynt Contracts
//!
//! Data transfer objects for service boundaries.

pub mod auth;
pub mod user;
pub mod common;

pub use auth::*;
pub use user::*;
pub use common::*;
```

### 5.4 Create Common Contracts

**File**: `backend/crates/shared/klynt_contracts/src/common.rs`

```rust
//! Common contract types.

use serde::{Deserialize, Serialize};

/// Standard success response
#[derive(Debug, Serialize, Deserialize)]
pub struct SuccessResponse {
    pub success: bool,
    pub message: Option<String>,
}

impl SuccessResponse {
    /// Create success response
    pub fn new() -> Self {
        Self {
            success: true,
            message: None,
        }
    }

    /// With message
    pub fn with_message(message: String) -> Self {
        Self {
            success: true,
            message: Some(message),
        }
    }
}

/// Standard error response
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub code: Option<String>,
    pub details: Option<serde_json::Value>,
}

impl ErrorResponse {
    /// Create error response
    pub fn new(error: String) -> Self {
        Self {
            error,
            code: None,
            details: None,
        }
    }

    /// With code
    pub fn with_code(mut self, code: String) -> Self {
        self.code = Some(code);
        self
    }

    /// With details
    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details);
        self
    }
}
```

### 5.5 Create Auth Contracts

**File**: `backend/crates/shared/klynt_contracts/src/auth.rs`

```rust
//! Authentication-related contracts.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use validator::Validate;
use klynt_utils::UserId;

/// Login request
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email(message = "Must be a valid email"))]
    pub email: String,
    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,
    pub remember_me: Option<bool>,
}

/// Login response
#[derive(Debug, Clone, Serialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: DateTime<Utc>,
    pub user: UserSessionInfo,
}

/// User session info
#[derive(Debug, Clone, Serialize)]
pub struct UserSessionInfo {
    pub id: UserId,
    pub email: String,
    pub full_name: Option<String>,
}

/// Registration request
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct RegistrationRequest {
    #[validate(email(message = "Must be a valid email"))]
    pub email: String,
    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,
    pub full_name: Option<String>,
}

/// Refresh token request
#[derive(Debug, Clone, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}
```

### 5.6 Create User Contracts

**File**: `backend/crates/shared/klynt_contracts/src/user.rs`

```rust
//! User-related contracts.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use klynt_utils::UserId;

/// User DTO
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserDto {
    pub id: UserId,
    pub email: String,
    pub full_name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// Create user request
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct CreateUserRequest {
    #[validate(email(message = "Must be a valid email"))]
    pub email: String,
    pub full_name: Option<String>,
}

/// Update user request
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct UpdateUserRequest {
    pub full_name: Option<String>,
}
```

### 5.7 Verify klynt_contracts

```bash
cargo build -p klynt_contracts
```

---

## Step 6: Create klynt_storage (Storage Abstractions)

**Purpose**: Database and storage abstractions used across services.

### 6.1 Create Directory Structure

```bash
mkdir -p backend/crates/infrastructure/klynt_storage/src
```

### 6.2 Create Cargo.toml

**File**: `backend/crates/infrastructure/klynt_storage/Cargo.toml`

```toml
[package]
name = "klynt_storage"
version = "0.1.0"
edition = "2021"

[dependencies]
# Core
klynt_core = { path = "../../core/klynt_core" }

# Database
sqlx = { workspace = true }

# Redis
redis = { workspace = true }

# Async
async-trait = { workspace = true }
tokio = { workspace = true }

# Error handling
thiserror = { workspace = true }

# Tracing
tracing = { workspace = true }
```

### 6.3 Create lib.rs

**File**: `backend/crates/infrastructure/klynt_storage/src/lib.rs`

```rust
//! # Klynt Storage
//!
//! Storage abstractions and database client.

pub mod db;
pub mod repository;
pub mod error;

pub use db::*;
pub use repository::*;
pub use error::*;
```

### 6.4 Create Error Module

**File**: `backend/crates/infrastructure/klynt_storage/src/error.rs`

```rust
//! Storage-related errors.

use thiserror::Error;

/// Storage error type
#[derive(Error, Debug)]
pub enum StorageError {
    #[error("Database connection failed: {0}")]
    Connection(String),

    #[error("Query failed: {0}")]
    Query(String),

    #[error("Transaction failed: {0}")]
    Transaction(String),

    #[error("Migration failed: {0}")]
    Migration(String),

    #[error("Redis error: {0}")]
    Redis(String),

    #[error("Not found")]
    NotFound,

    #[error("Conflict: {0}")]
    Conflict(String),
}

/// Result type for storage operations
pub type StorageResult<T> = Result<T, StorageError>;
```

### 6.5 Create DB Module

**File**: `backend/crates/infrastructure/klynt_storage/src/db.rs`

```rust
//! Database client and connection management.

use sqlx::{postgres::PgPoolOptions, Pool, Postgres};
use tracing::info;

/// Database connection pool
pub type DbPool = Pool<Postgres>;

/// Create database connection pool
pub async fn create_pool(database_url: &str) -> Result<DbPool, StorageError> {
    info!("Creating database connection pool");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await
        .map_err(|e| StorageError::Connection(e.to_string()))?;

    info!("Database connection pool created");

    Ok(pool)
}

/// Health check for database
pub async fn health_check(pool: &DbPool) -> bool {
    sqlx::query("SELECT 1")
        .fetch_one(pool)
        .await
        .is_ok()
}
```

### 6.6 Create Repository Module

**File**: `backend/crates/infrastructure/klynt_storage/src/repository.rs`

```rust
//! Repository base trait and utilities.

use async_trait::async_trait;

/// Base repository trait
#[async_trait]
pub trait Repository: Send + Sync {
    /// Check if repository is healthy
    async fn health_check(&self) -> bool;
}

/// Transactional operations trait
#[async_trait]
pub trait Transactional: Repository {
    type Transaction;

    /// Begin a transaction
    async fn begin_transaction(&self) -> Result<Self::Transaction, StorageError>;

    /// Commit a transaction
    async fn commit(&self, transaction: Self::Transaction) -> Result<(), StorageError>;

    /// Rollback a transaction
    async fn rollback(&self, transaction: Self::Transaction) -> Result<(), StorageError>;
}
```

### 6.7 Verify klynt_storage

```bash
cargo build -p klynt_storage
```

---

## Step 7: Create klynt_messaging (Messaging Abstractions)

**Purpose**: Event messaging and pub/sub infrastructure.

### 7.1 Create Directory Structure

```bash
mkdir -p backend/crates/infrastructure/klynt_messaging/src
```

### 7.2 Create Cargo.toml

**File**: `backend/crates/infrastructure/klynt_messaging/Cargo.toml`

```toml
[package]
name = "klynt_messaging"
version = "0.1.0"
edition = "2021"

[dependencies]
# Core
klynt_core = { path = "../../core/klynt_core" }

# Serialization
serde = { workspace = true }
serde_json = { workspace = true }

# Async
async-trait = { workspace = true }
tokio = { workspace = true }

# Error handling
thiserror = { workspace = true }

# Redis (for pub/sub)
redis = { workspace = true }

# Tracing
tracing = { workspace = true }
```

### 7.3 Create lib.rs

**File**: `backend/crates/infrastructure/klynt_messaging/src/lib.rs`

```rust
//! # Klynt Messaging
//!
//! Event messaging and pub/sub infrastructure.

pub mod event;
pub mod bus;
pub mod error;

pub use event::*;
pub use bus::*;
pub use error::*;
```

### 7.4 Create Event Module

**File**: `backend/crates/infrastructure/klynt_messaging/src/event.rs`

```rust
//! Event types.

use serde::{Deserialize, Serialize};
use std::any::Any;

/// Domain event
pub trait Event: Any + Send + Sync {
    /// Event type name
    fn event_type(&self) -> &'static str;

    /// Event version
    fn version(&self) -> &'static str {
        "1.0"
    }

    /// Convert to any
    fn as_any(&self) -> &dyn Any;
}

/// Event metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventMetadata {
    pub event_id: String,
    pub event_type: String,
    pub version: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub source: String,
}

/// Envelope for events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventEnvelope {
    pub metadata: EventMetadata,
    pub payload: serde_json::Value,
}
```

### 7.5 Create Bus Module

**File**: `backend/crates/infrastructure/klynt_messaging/src/bus.rs`

```rust
//! Message bus abstraction.

use async_trait::async_trait;
use crate::event::EventEnvelope;
use crate::error::MessagingError;

/// Message bus trait
#[async_trait]
pub trait MessageBus: Send + Sync {
    /// Publish an event
    async fn publish(&self, event: EventEnvelope) -> Result<(), MessagingError>;

    /// Subscribe to events
    async fn subscribe<F>(&self, pattern: &str, handler: F) -> Result<(), MessagingError>
    where
        F: Fn(EventEnvelope) + Send + Sync + 'static;
}
```

### 7.6 Create Error Module

**File**: `backend/crates/infrastructure/klynt_messaging/src/error.rs`

```rust
//! Messaging-related errors.

use thiserror::Error;

/// Messaging error type
#[derive(Error, Debug)]
pub enum MessagingError {
    #[error("Connection failed: {0}")]
    Connection(String),

    #[error("Publish failed: {0}")]
    Publish(String),

    #[error("Subscription failed: {0}")]
    Subscription(String),

    #[error("Serialization failed: {0}")]
    Serialization(String),
}
```

### 7.7 Verify klynt_messaging

```bash
cargo build -p klynt_messaging
```

---

## Step 8: Create klynt_tracing (Tracing Infrastructure)

**Purpose**: Observability and tracing utilities.

### 8.1 Create Directory Structure

```bash
mkdir -p backend/crates/infrastructure/klynt_tracing/src
```

### 8.2 Create Cargo.toml

**File**: `backend/crates/infrastructure/klynt_tracing/Cargo.toml`

```toml
[package]
name = "klynt_tracing"
version = "0.1.0"
edition = "2021"

[dependencies]
# Core
klynt_core = { path = "../../core/klynt_core" }

# Tracing
tracing = { workspace = true }
tracing-subscriber = { workspace = true }
tracing-error = { workspace = true }

# Error handling
thiserror = { workspace = true }
color-eyre = { workspace = true }
```

### 8.3 Create lib.rs

**File**: `backend/crates/infrastructure/klynt_tracing/src/lib.rs`

```rust
//! # Klynt Tracing
//!
//! Observability and tracing utilities.

pub mod subscriber;
pub mod fields;
pub mod middleware;

pub use subscriber::*;
pub use fields::*;
pub use middleware::*;
```

### 8.4 Create Subscriber Module

**File**: `backend/crates/infrastructure/klynt_tracing/src/subscriber.rs`

```rust
//! Tracing subscriber setup.

use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use tracing_error::ErrorLayer;

/// Initialize tracing subscriber
pub fn init_tracing(service_name: &str) {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    tracing_subscriber::registry()
        .with(env_filter)
        .with(tracing_subscriber::fmt::layer())
        .with(ErrorLayer::default())
        .init();
}
```

### 8.5 Create Fields Module

**File**: `backend/crates/infrastructure/klynt_tracing/src/fields.rs`

```rust
//! Custom tracing fields.

pub const REQUEST_ID: &str = "request_id";
pub const USER_ID: &str = "user_id";
pub const SERVICE_NAME: &str = "service_name";
pub const TRACE_ID: &str = "trace_id";
```

### 8.6 Create Middleware Module

**File**: `backend/crates/infrastructure/klynt_tracing/src/middleware.rs`

```rust
//! Tracing middleware for HTTP requests.

pub fn make_span_azure(message: String) -> tracing::Span {
    tracing::info_span!("http_request", message)
}
```

### 8.7 Verify klynt_tracing

```bash
cargo build -p klynt_tracing
```

---

## Step 9: Create klynt_typedenum (Optional)

**Purpose**: Shared enums and constants (can be added later if needed).

### 9.1 Create Directory Structure

```bash
mkdir -p backend/crates/shared/klynt_typedenum/src
```

### 9.2 Create Cargo.toml

**File**: `backend/crates/shared/klynt_typedenum/Cargo.toml`

```toml
[package]
name = "klynt_typedenum"
version = "0.1.0"
edition = "2021"

[dependencies]
# Serialization
serde = { workspace = true }
```

### 9.3 Create lib.rs

**File**: `backend/crates/shared/klynt_typedenum/src/lib.rs`

```rust
//! # Klynt Typed Enums
//!
//! Shared enums and type-safe constants.

use serde::{Deserialize, Serialize};

/// User roles
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    Admin,
    Instructor,
    Student,
}

/// User status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UserStatus {
    Active,
    Inactive,
    Suspended,
    Pending,
}

impl Default for UserStatus {
    fn default() -> Self {
        Self::Pending
    }
}
```

### 9.4 Verify klynt_typedenum

```bash
cargo build -p klynt_typedenum
```

---

## Step 10: Full Verification

### 10.1 Build All New Crates

```bash
cargo build -p klynt_core
cargo build -p klynt_utils
cargo build -p klynt_shared_domain
cargo build -p klynt_contracts
cargo build -p klynt_storage
cargo build -p klynt_messaging
cargo build -p klynt_tracing
cargo build -p klynt_typedenum
```

### 10.2 Build Entire Workspace

```bash
cargo build
```

### 10.3 Run Tests

```bash
cargo test
```

### 10.4 Verify No Breaking Changes

```bash
# Ensure existing crates still build
cargo build -p klynt-domain
cargo build -p klynt-application
cargo build -p klynt-infrastructure
cargo build -p klynt-api
cargo build -p klynt-server
```

---

## Step 11: Documentation

### 11.1 Create README for Each Crate

Add a README.md to each crate explaining:
- Purpose
- Key types/traits
- When to use it
- Examples

### 11.2 Update Root Documentation

Update `backend/README.md` with new architecture diagram.

---

## Phase 1 Completion Checklist

- [ ] All new crates created
- [ ] All new crates compile successfully
- [ ] All new crates have basic documentation
- [ ] Workspace builds without errors
- [ ] Tests pass
- [ ] No existing functionality broken
- [ ] Git commit with Phase 1 changes

---

## What's Next (Phase 2 Preview)

After Phase 1 is complete and verified:

1. **Extract auth_service** following the deep module pattern
2. Each service will depend on Phase 1 crates
3. Service becomes independently testable
4. Services can be extracted one at a time

---

## Notes

- **No breaking changes to existing code** in Phase 1
- **All new crates are optional** — existing code continues to work
- **Tests pass** at each step
- **Clean git history** — one commit per crate or logical grouping
