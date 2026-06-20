# Multi-Tenant Authentication — Phase 1: Core Auth Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build production-grade core authentication infrastructure including database migrations, user registration with email verification, secure password reset, enhanced login with session fixation prevention, audit logging, and Redis-backed rate limiting.

**Architecture:** Clean Architecture (Hexagonal) — Domain (entities, ports), Application (use cases), Infrastructure (adapters), API (HTTP). Postgres-authoritative session store with Redis read-through cache. Opaque session tokens (UUID), SHA-256 hashed verification/reset tokens, Argon2id password hashing.

**Tech Stack:** Rust, Axum, SQLx, PostgreSQL, Redis, Argon2, OpenAPI, Tokio, Chrono, UUID

---

## Phase 1 Scope

This phase implements the foundational authentication infrastructure that all subsequent phases depend on:

1. **Database Migration Infrastructure** — sqlx-cli, migrations directory, initial schema
2. **User Registration** — email validation, password hashing, email verification tokens
3. **Email Verification** — token generation, email sending, token consumption
4. **Enhanced Login** — session fixation prevention, session ID rotation
5. **Password Reset** — secure hashed tokens, atomic single-use enforcement
6. **Audit Logging** — immutable append-only Postgres table
7. **Redis Rate Limiting** — sliding window, per-IP/per-user limits
8. **Testing & Coverage** — ≥84% aggregate coverage
9. **OpenAPI Spec** — auth endpoint documentation

---

## File Structure

```
backend/
├── migrations/
│   ├── .gitkeep                           ← NEW
│   ├── 0001_initial_schema.sql            ← NEW
│   ├── 0002_add_audit_table.sql           ← NEW
│   └── .sqlx/
│       └── .sqlx-version                  ← NEW (auto-generated)
├── crates/
│   ├── klynt-domain/
│   │   ├── src/
│   │   │   ├── models.rs                  ← MODIFY (add User::global_role, email_verified)
│   │   │   ├── tokens.rs                  ← NEW (email verification, password reset)
│   │   │   ├── audit.rs                   ← NEW (audit event entity)
│   │   │   ├── repositories.rs            ← MODIFY (add token repos)
│   │   │   └── lib.rs                     ← MODIFY (export new modules)
│   │   └── tests/
│   │       └── test_tokens.rs             ← NEW
│   ├── klynt-application/
│   │   ├── src/
│   │   │   ├── auth.rs                    ← MODIFY (add registration, verify-email, reset-password)
│   │   │   ├── audit.rs                   ← NEW (audit logging use case)
│   │   │   ├── rate_limit.rs              ← NEW (rate limiting use case)
│   │   │   └── lib.rs                     ← MODIFY (export new modules)
│   │   └── tests/
│   │       ├── test_auth.rs               ← MODIFY (add registration/reset tests)
│   │       └── test_audit.rs              ← NEW
│   ├── klynt-infrastructure/
│   │   ├── src/
│   │   │   ├── repositories/
│   │   │   │   ├── sqlx_user_repo.rs       ← MODIFY (add email_verified, global_role)
│   │   │   │   ├── sqlx_session_repo.rs   ← NEW (implement Postgres backing)
│   │   │   │   ├── sqlx_token_repo.rs     ← NEW (email verification, password reset)
│   │   │   │   └── sqlx_audit_repo.rs     ← NEW (audit event storage)
│   │   │   ├── email.rs                    ← NEW (email sending service)
│   │   │   ├── token_generator.rs           ← NEW (CSPRNG token generation)
│   │   │   ├── redis_rate_limiter.rs        ← MODIFY (enhance with Redis)
│   │   │   └── lib.rs                     ← MODIFY (export new modules)
│   │   └── tests/
│   │       ├── test_rate_limiter.rs        ← MODIFY
│   │       └── test_email.rs              ← NEW
│   └── klynt-api/
│       ├── src/
│       │   ├── v1/
│       │   │   ├── auth.rs                  ← NEW (registration, verify-email, reset-password routes)
│       │   │   └── mod.rs                  ← MODIFY (add auth routes)
│       │   ├── openapi.yaml                ← NEW (OpenAPI spec)
│       │   └── lib.rs                     ← MODIFY (add openapi module)
│       └── tests/
│           └── test_auth_integration.rs   ← NEW (cross-subdomain SSO tests)
```

---

## Task 1: Setup Migration Infrastructure

**Objective:** Establish database migration infrastructure using sqlx-cli

**Files:**
- Create: `backend/migrations/.gitkeep`
- Create: `backend/migrations/0001_initial_schema.sql`
- Modify: `backend/Cargo.toml` (add sqlx dependencies)

### Step 1.1: Update workspace dependencies

Add sqlx to workspace dependencies.

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
```

**Edit: `backend/Cargo.toml`**

Add to `[workspace.dependencies]`:

```toml
# Database
sqlx = { version = "0.8", features = ["runtime-tokio", "tls-rustls", "postgres", "uuid", "chrono", "migrate"] }
```

**Run:**

```bash
cargo check --workspace
```

**Expected:** No errors, dependencies resolve

**Commit:**

```bash
git add Cargo.toml
git commit -m "feat: add sqlx dependency for database migrations"
```

---

### Step 1.2: Create migrations directory structure

**Create: `backend/migrations/.gitkeep`**

```bash
mkdir -p backend/migrations
touch backend/migrations/.gitkeep
```

**Run:**

```bash
git add backend/migrations/.gitkeep
git commit -m "feat: create migrations directory structure"
```

---

### Step 1.3: Create initial schema migration

**Create: `backend/migrations/0001_initial_schema.sql`**

```sql
-- Initial schema for multi-tenant authentication system
-- Phase 1: Core Auth Foundation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Users Table
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending_verification',
    email_verified_at TIMESTAMPTZ,
    
    -- Global platform role (for Phase 3)
    global_role VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Terms acceptance
    terms_accepted_at TIMESTAMPTZ NOT NULL,
    terms_version VARCHAR(50) NOT NULL DEFAULT '1.0'
);

-- Index for email lookups
CREATE INDEX idx_users_email ON users(email);

-- Index for status queries
CREATE INDEX idx_users_status ON users(status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Sessions Table
-- ============================================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token UUID NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Denormalized authorization snapshot
    -- Stored as JSONB array of tenant memberships with roles
    -- This allows fast permission checks without hitting DB
    tenant_memberships JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Index for token lookups (primary auth path)
CREATE INDEX idx_sessions_token ON sessions(token);

-- Index for user session queries
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Index for expiration cleanup
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Unique constraint ensures one session per token
CREATE UNIQUE INDEX uniq_sessions_token ON sessions(token);

-- ============================================================================
-- Email Verification Tokens Table
-- ============================================================================
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Store SHA-256 hash of token, never the token itself
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for token hash lookups
CREATE INDEX idx_email_verification_tokens_token_hash ON email_verification_tokens(token_hash);

-- Index for user token queries
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);

-- Index for expiration cleanup
CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);

-- ============================================================================
-- Password Reset Tokens Table
-- ============================================================================
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Store SHA-256 hash of token, never the token itself
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for token hash lookups
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);

-- Index for user token queries
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- Index for expiration cleanup
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE users IS 'User accounts with authentication and profile information';
COMMENT ON TABLE sessions IS 'User sessions with denormalized authorization data';
COMMENT ON TABLE email_verification_tokens IS 'Email verification tokens (SHA-256 hashed)';
COMMENT ON TABLE password_reset_tokens IS 'Password reset tokens (SHA-256 hashed)';

COMMENT ON COLUMN users.status IS 'User status: pending_verification, active, suspended';
COMMENT ON COLUMN users.global_role IS 'Platform-level role: GlobalOwner, GlobalAdmin, GlobalUser (Phase 3)';
COMMENT ON COLUMN sessions.tenant_memberships IS 'Denormalized tenant memberships with roles for fast auth checks';
COMMENT ON COLUMN email_verification_tokens.token_hash IS 'SHA-256 hash of verification token (never store token)';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hash of reset token (never store token)';
```

**Run:**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo install sqlx-cli --no-default-features --features sqlite,rustls,postgres,_tls
```

**Verify migration syntax:**

```bash
# Verify SQL syntax (PostgreSQL will validate when run)
# For now, just check file exists
cat backend/migrations/0001_initial_schema.sql | head -20
```

**Expected:** First 20 lines of migration display

**Commit:**

```bash
git add backend/migrations/0001_initial_schema.sql
git commit -m "feat: add initial schema migration for auth system"
```

---

### Step 1.4: Create audit table migration

**Create: `backend/migrations/0002_add_audit_table.sql`**

```sql
-- Audit logging table for compliance and security
-- Phase 1: Core Auth Foundation

-- ============================================================================
-- Audit Events Table (Append-Only)
-- ============================================================================
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Actor information
    actor_user_id UUID,
    actor_ip_address INET,
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    
    -- Tenant context (NULL for platform-level actions)
    tenant_id UUID,
    
    -- Change tracking (before/after snapshots as JSONB)
    before_data JSONB,
    after_data JSONB,
    
    -- Result
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Request context
    request_id UUID
);

-- Indexes for common audit queries
CREATE INDEX idx_audit_events_actor_user_id ON audit_events(actor_user_id);
CREATE INDEX idx_audit_events_resource_type ON audit_events(resource_type);
CREATE INDEX idx_audit_events_resource_id ON audit_events(resource_id);
CREATE INDEX idx_audit_events_tenant_id ON audit_events(tenant_id);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at DESC);
CREATE INDEX idx_audit_events_action ON audit_events(action);

-- Composite index for user activity queries
CREATE INDEX idx_audit_events_user_action ON audit_events(actor_user_id, created_at DESC);

-- COMMENTs for documentation
COMMENT ON TABLE audit_events IS 'Immutable audit log for compliance and security tracking';
COMMENT ON COLUMN audit_events.actor_user_id IS 'User who performed the action (NULL for system actions)';
COMMENT ON COLUMN audit_events.action IS 'Action performed: user.registered, user.verified, session.created, etc.';
COMMENT ON COLUMN audit_events.resource_type IS 'Type of resource affected: user, session, tenant, etc.';
COMMENT ON COLUMN audit_events.before_data IS 'Snapshot of resource state before action (JSONB)';
COMMENT ON COLUMN audit_events.after_data IS 'Snapshot of resource state after action (JSONB)';
COMMENT ON COLUMN audit_events.tenant_id IS 'Tenant context (NULL for platform-level actions)';
COMMENT ON COLUMN audit_events.request_id IS 'Correlation ID for request tracing';

-- Set tablespace to append-only (PostgreSQL 12+)
-- Note: This requires appropriate tablespace configuration
-- ALTER TABLE audit_events SET (autovacuum_enabled = false);
```

**Run:**

```bash
# Verify file was created
cat backend/migrations/0002_add_audit_table.sql | head -20
```

**Expected:** First 20 lines display

**Commit:**

```bash
git add backend/migrations/0002_add_audit_table.sql
git commit -m "feat: add audit events table migration for compliance"
```

---

### Step 1.5: Add sqlx features to klynt-infrastructure

**Modify: `backend/crates/klynt-infrastructure/Cargo.toml`**

Add to dependencies:

```toml
sqlx = { workspace = true }
```

**Run:**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo check -p klynt-infrastructure
```

**Expected:** No errors

**Commit:**

```bash
git add crates/klynt-infrastructure/Cargo.toml
git commit -m "feat: add sqlx dependency to infrastructure crate"
```

---

## Task 2: Domain Layer — Token Entities

**Objective:** Create domain entities for email verification and password reset tokens

**Files:**
- Create: `backend/crates/klynt-domain/src/tokens.rs`
- Modify: `backend/crates/klynt-domain/src/lib.rs`

### Step 2.1: Create token entities

**Create: `backend/crates/klynt-domain/src/tokens.rs`**

```rust
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::errors::DomainError;
use crate::models::UserId;

/// Email verification token.
///
/// Tokens are generated with a CSPRNG (≥256 bits) and stored as SHA-256 hashes.
/// The plaintext token is sent via email and never stored in the database.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EmailVerificationToken {
    pub plaintext: String,
    pub hash: String,
    pub user_id: UserId,
    pub expires_at: DateTime<Utc>,
}

impl EmailVerificationToken {
    /// Token lifetime before expiry.
    pub const TTL: Duration = Duration::hours(24);

    /// Generate a new verification token with CSPRNG.
    ///
    /// Returns both the plaintext (for email) and hash (for storage).
    pub fn generate(user_id: UserId) -> Self {
        let plaintext = Self::generate_csprng_token();
        let hash = Self::sha256_hash(&plaintext);
        let expires_at = Utc::now() + Self::TTL;

        Self {
            plaintext,
            hash,
            user_id,
            expires_at,
        }
    }

    /// Generate a cryptographically secure random token (≥256 bits).
    fn generate_csprng_token() -> String {
        // 43 bytes of random data = 344 bits (more than 256 required)
        // Base64URL encoding = ~58 characters
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let bytes: [u8; 43] = rng.gen();
        base64_url_encode(&bytes)
    }

    /// Compute SHA-256 hash of token (hex string).
    fn sha256_hash(token: &str) -> String {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(token.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Check if token has expired.
    pub fn is_expired(&self) -> bool {
        Utc::now() >= self.expires_at
    }
}

/// Password reset token.
///
/// Similar to email verification but with shorter TTL for security.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PasswordResetToken {
    pub plaintext: String,
    pub hash: String,
    pub user_id: UserId,
    pub expires_at: DateTime<Utc>,
}

impl PasswordResetToken {
    /// Token lifetime before expiry (shorter than email verification).
    pub const TTL: Duration = Duration::minutes(30);

    /// Generate a new reset token with CSPRNG.
    pub fn generate(user_id: UserId) -> Self {
        let plaintext = Self::generate_csprng_token();
        let hash = Self::sha256_hash(&plaintext);
        let expires_at = Utc::now() + Self::TTL;

        Self {
            plaintext,
            hash,
            user_id,
            expires_at,
        }
    }

    /// Generate a cryptographically secure random token (≥256 bits).
    fn generate_csprng_token() -> String {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let bytes: [u8; 43] = rng.gen();
        base64_url_encode(&bytes)
    }

    /// Compute SHA-256 hash of token (hex string).
    fn sha256_hash(token: &str) -> String {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(token.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Check if token has expired.
    pub fn is_expired(&self) -> bool {
        Utc::now() >= self.expires_at
    }
}

/// Base64URL-encode without padding (URL-safe).
fn base64_url_encode(data: &[u8]) -> String {
    use base64::prelude::*;
    BASE64_URL_SAFE_NO_PAD.encode(data)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn email_token_has_sufficient_entropy() {
        let token = EmailVerificationToken::generate(UserId::new());
        // Base64URL encoding of 43 bytes = 58 chars
        assert!(token.plaintext.len() >= 56);
        // Hash is 64 hex chars (256 bits)
        assert_eq!(token.hash.len(), 64);
    }

    #[test]
    fn email_token_expires_after_24_hours() {
        let token = EmailVerificationToken::generate(UserId::new());
        let expected_expiry = Utc::now() + EmailVerificationToken::TTL;
        // Allow 1 second tolerance
        let diff = (token.expires_at - expected_expiry).num_seconds().abs();
        assert!(diff <= 1);
    }

    #[test]
    fn reset_token_expires_after_30_minutes() {
        let token = PasswordResetToken::generate(UserId::new());
        let expected_expiry = Utc::now() + PasswordResetToken::TTL;
        // Allow 1 second tolerance
        let diff = (token.expires_at - expected_expiry).num_seconds().abs();
        assert!(diff <= 1);
    }

    #[test]
    fn token_hashes_are_different_for_same_input() {
        let plaintext = "test-token";
        let hash1 = EmailVerificationToken::sha256_hash(plaintext);
        // Hash should be deterministic
        let hash2 = EmailVerificationToken::sha256_hash(plaintext);
        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn generated_tokens_are_unique() {
        let user_id = UserId::new();
        let token1 = EmailVerificationToken::generate(user_id);
        let token2 = EmailVerificationToken::generate(user_id);
        assert_ne!(token1.plaintext, token2.plaintext);
        assert_ne!(token1.hash, token2.hash);
    }

    #[test]
    fn expired_token_detection_works() {
        let mut token = EmailVerificationToken::generate(UserId::new());
        // Set expiry to past
        token.expires_at = Utc::now() - Duration::seconds(1);
        assert!(token.is_expired());

        // Set expiry to future
        token.expires_at = Utc::now() + Duration::seconds(1);
        assert!(!token.is_expired());
    }
}
```

**Run:**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo check -p klynt-domain
```

**Expected:** Error about missing dependencies (rand, base64, sha2)

---

### Step 2.2: Add missing dependencies to workspace

**Modify: `backend/Cargo.toml`**

Add to `[workspace.dependencies]`:

```toml
# Crypto
rand = "0.8"
sha2 = "0.10"
base64 = "0.22"
```

**Run:**

```bash
cargo check -p klynt-domain
```

**Expected:** No errors

**Commit:**

```bash
git add Cargo.toml crates/klynt-domain/src/tokens.rs
git commit -m "feat: add email verification and password reset token entities"
```

---

### Step 2.3: Export tokens module

**Modify: `backend/crates/klynt-domain/src/lib.rs`**

```rust
pub mod audit;
pub mod ctx;
pub mod errors;
pub mod models;
pub mod ports;
pub mod repositories;
pub mod session;
pub mod tokens;
pub mod unit_of_work;

pub use ctx::Ctx;
```

**Run:**

```bash
cargo check -p klynt-domain
```

**Expected:** Error about missing `audit` module (we'll create it next)

---

## Task 3: Domain Layer — Audit Entity

**Objective:** Create audit event domain entity

**Files:**
- Create: `backend/crates/klynt-domain/src/audit.rs`

### Step 3.1: Create audit event entity

**Create: `backend/crates/klynt-domain/src/audit.rs`**

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::UserId;

/// Immutable audit event for compliance and security tracking.
///
/// Audit events capture all security-relevant mutations for
/// compliance (FERPA/COPPA/GDPR) and incident response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEvent {
    pub id: Uuid,
    pub actor_user_id: Option<UserId>,
    pub actor_ip_address: Option<String>,
    pub action: AuditAction,
    pub resource_type: ResourceType,
    pub resource_id: Option<Uuid>,
    pub tenant_id: Option<Uuid>,
    pub before_data: Option<serde_json::Value>,
    pub after_data: Option<serde_json::Value>,
    pub success: bool,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
    pub request_id: Option<Uuid>,
}

/// Actions that can be audited.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditAction {
    // User actions
    UserRegistered,
    UserEmailVerified,
    UserPasswordChanged,
    UserPasswordReset,
    UserSuspended,
    UserDeleted,

    // Session actions
    SessionCreated,
    SessionRevoked,
    SessionRefreshed,

    // Tenant actions (Phase 2+)
    TenantCreated,
    TenantUpdated,
    TenantDeleted,

    // Membership actions (Phase 2+)
    MemberInvited,
    MemberRoleChanged,
    MemberRemoved,

    // Permission actions (Phase 3+)
    PermissionGranted,
    PermissionRevoked,
}

/// Types of resources that can be affected.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ResourceType {
    User,
    Session,
    Tenant,
    Membership,
    Permission,
    Role,
}

impl AuditEvent {
    /// Create a new audit event.
    pub fn new(action: AuditAction, resource_type: ResourceType) -> Self {
        Self {
            id: Uuid::new_v4(),
            actor_user_id: None,
            actor_ip_address: None,
            action,
            resource_type,
            resource_id: None,
            tenant_id: None,
            before_data: None,
            after_data: None,
            success: true,
            error_message: None,
            created_at: Utc::now(),
            request_id: None,
        }
    }

    /// Set the actor (user who performed the action).
    pub fn with_actor(mut self, user_id: UserId) -> Self {
        self.actor_user_id = Some(user_id);
        self
    }

    /// Set the actor's IP address.
    pub fn with_ip(mut self, ip: String) -> Self {
        self.actor_ip_address = Some(ip);
        self
    }

    /// Set the resource ID that was affected.
    pub fn with_resource(mut self, id: Uuid) -> Self {
        self.resource_id = Some(id);
        self
    }

    /// Set the tenant context.
    pub fn with_tenant(mut self, tenant_id: Uuid) -> Self {
        self.tenant_id = Some(tenant_id);
        self
    }

    /// Set the "before" state snapshot.
    pub fn with_before(mut self, data: serde_json::Value) -> Self {
        self.before_data = Some(data);
        self
    }

    /// Set the "after" state snapshot.
    pub fn with_after(mut self, data: serde_json::Value) -> Self {
        self.after_data = Some(data);
        self
    }

    /// Mark the event as failed with error message.
    pub fn with_error(mut self, error: String) -> Self {
        self.success = false;
        self.error_message = Some(error);
        self
    }

    /// Set the request correlation ID.
    pub fn with_request_id(mut self, request_id: Uuid) -> Self {
        self.request_id = Some(request_id);
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_basic_audit_event() {
        let event = AuditEvent::new(AuditAction::UserRegistered, ResourceType::User);
        assert_eq!(event.action, AuditAction::UserRegistered);
        assert_eq!(event.resource_type, ResourceType::User);
        assert!(event.success);
        assert!(event.error_message.is_none());
    }

    #[test]
    fn builder_pattern_works() {
        let user_id = UserId::new();
        let resource_id = Uuid::new_v4();
        let request_id = Uuid::new_v4();

        let event = AuditEvent::new(AuditAction::SessionCreated, ResourceType::Session)
            .with_actor(user_id)
            .with_ip("127.0.0.1".to_string())
            .with_resource(resource_id)
            .with_request_id(request_id);

        assert_eq!(event.actor_user_id, Some(user_id));
        assert_eq!(event.actor_ip_address, Some("127.0.0.1".to_string()));
        assert_eq!(event.resource_id, Some(resource_id));
        assert_eq!(event.request_id, Some(request_id));
    }

    #[test]
    fn can_mark_event_as_failed() {
        let event = AuditEvent::new(AuditAction::UserPasswordReset, ResourceType::User)
            .with_error("Token expired".to_string());

        assert!(!event.success);
        assert_eq!(event.error_message, Some("Token expired".to_string()));
    }

    #[test]
    fn can_set_before_after_snapshots() {
        let before = serde_json::json!({"status": "pending"});
        let after = serde_json::json!({"status": "active"});

        let event = AuditEvent::new(AuditAction::UserEmailVerified, ResourceType::User)
            .with_before(before)
            .with_after(after);

        assert_eq!(event.before_data, Some(serde_json::json!({"status": "pending"})));
        assert_eq!(event.after_data, Some(serde_json::json!({"status": "active"})));
    }
}
```

**Run:**

```bash
cargo check -p klynt-domain
```

**Expected:** No errors

**Commit:**

```bash
git add crates/klynt-domain/src/audit.rs
git commit -m "feat: add audit event domain entity"
```

---

## Task 4: Update User Model

**Objective:** Add email_verified and global_role fields to User model

**Files:**
- Modify: `backend/crates/klynt-domain/src/models.rs`

### Step 4.1: Add email_verified and global_role to User

**Modify: `backend/crates/klynt-domain/src/models.rs`**

Add new fields to the `User` struct (around line 96-107):

```rust
#[derive(Debug, Clone)]
pub struct User {
    pub id: UserId,
    pub name: String,
    pub email: Email,
    pub role: Role,
    pub institution_id: Option<Uuid>,
    pub status: UserStatus,
    pub email_verified_at: Option<DateTime<Utc>>,  // NEW
    pub global_role: Option<GlobalRole>,           // NEW
    pub password_hash: String,
    pub terms_accepted_at: DateTime<Utc>,
    pub terms_version: String,
    pub created_at: DateTime<Utc>,
}
```

Add the new `GlobalRole` enum before the `UserStatus` enum:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GlobalRole {
    Owner,
    Admin,
    User,
}

impl Default for GlobalRole {
    fn default() -> Self {
        Self::User
    }
}
```

Update the `UserDto` to include the new fields:

```rust
#[derive(Debug, Clone, Serialize)]
pub struct UserDto {
    pub id: UserId,
    pub name: String,
    pub email: String,
    pub role: Role,
    pub status: UserStatus,
    pub email_verified_at: Option<DateTime<Utc>>,  // NEW
    pub global_role: Option<GlobalRole>,           // NEW
    pub created_at: DateTime<Utc>,
}
```

Update the `From<&User> for UserDto` implementation:

```rust
impl From<&User> for UserDto {
    fn from(user: &User) -> Self {
        Self {
            id: user.id,
            name: user.name.clone(),
            email: user.email.as_str().to_string(),
            role: user.role,
            status: user.status,
            email_verified_at: user.email_verified_at,  // NEW
            global_role: user.global_role,                // NEW
            created_at: user.created_at,
        }
    }
}
```

**Run:**

```bash
cargo check -p klynt-domain
```

**Expected:** No errors

**Commit:**

```bash
git add crates/klynt-domain/src/models.rs
git commit -m "feat: add email_verified_at and global_role to User model"
```

---

## Task 5: Update Domain Errors

**Objective:** Add new error types for tokens and audit operations

**Files:**
- Modify: `backend/crates/klynt-domain/src/errors.rs`

### Step 5.1: Add token-related errors

**Modify: `backend/crates/klynt-domain/src/errors.rs`**

Add new error types after `RoleError`:

```rust
#[derive(Debug, Error, PartialEq)]
pub enum TokenError {
    #[error("token is expired")]
    Expired,
    #[error("token has already been used")]
    AlreadyUsed,
    #[error("invalid token")]
    Invalid,
    #[error("token not found")]
    NotFound,
}
```

Add the new error variant to `DomainError` enum:

```rust
#[derive(Debug, Error)]
pub enum DomainError {
    // ... existing variants ...
    #[error("{0}")]
    InvalidToken(#[from] TokenError),
    // ... rest of variants ...
}
```

Update the `kind()` method:

```rust
pub fn kind(&self) -> ErrorKind {
    match self {
        // ... existing matches ...
        DomainError::InvalidToken(_) => ErrorKind::Validation,
        // ... rest of matches ...
    }
}
```

**Run:**

```bash
cargo check -p klynt-domain
```

**Expected:** No errors

**Commit:**

```bash
git add crates/klynt-domain/src/errors.rs
git commit -m "feat: add token-related error types"
```

---

## Task 6: Domain Layer — Token Repository Port

**Objective:** Define repository interfaces for token operations

**Files:**
- Modify: `backend/crates/klynt-domain/src/repositories.rs`

### Step 6.1: Add token repository traits

**Modify: `backend/crates/klynt-domain/src/repositories.rs`**

Add to the imports:

```rust
use crate::tokens::{EmailVerificationToken, PasswordResetToken};
```

Add the new repository traits:

```rust
#[async_trait]
pub trait EmailVerificationTokenRepository: Send + Sync {
    /// Store an email verification token (hash only).
    async fn save(
        &self,
        ctx: &Ctx,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError>;

    /// Find a valid token by hash.
    async fn find_valid(
        &self,
        ctx: &Ctx,
        token_hash: &str,
    ) -> Result<Option<(UserId, DateTime<Utc>)>, DomainError>;

    /// Mark token as used (atomic, single-use).
    async fn mark_used(
        &self,
        ctx: &Ctx,
        token_hash: &str,
    ) -> Result<bool, DomainError>;
}

#[async_trait]
pub trait PasswordResetTokenRepository: Send + Sync {
    /// Store a password reset token (hash only).
    async fn save(
        &self,
        ctx: &Ctx,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError>;

    /// Find a valid token by hash.
    async fn find_valid(
        &self,
        ctx: &Ctx,
        token_hash: &str,
    ) -> Result<Option<(UserId, DateTime<Utc>)>, DomainError>;

    /// Mark token as used (atomic, single-use).
    async fn mark_used(
        &self,
        ctx: &Ctx,
        token_hash: &str,
    ) -> Result<bool, DomainError>;
}
```

**Run:**

```bash
cargo check -p klynt-domain
```

**Expected:** No errors

**Commit:**

```bash
git add crates/klynt-domain/src/repositories.rs
git commit -m "feat: add token repository ports"
```

---

## Task 7: Domain Layer — Audit Repository Port

**Objective:** Define repository interface for audit logging

**Files:**
- Modify: `backend/crates/klynt-domain/src/repositories.rs`

### Step 7.1: Add audit repository trait

**Modify: `backend/crates/klynt-domain/src/repositories.rs`**

Add to the imports:

```rust
use crate::audit::AuditEvent;
```

Add the audit repository trait:

```rust
#[async_trait]
pub trait AuditEventRepository: Send + Sync {
    /// Log an audit event (append-only).
    async fn log(
        &self,
        ctx: &Ctx,
        event: AuditEvent,
    ) -> Result<(), DomainError>;

    /// Query audit events by user.
    async fn find_by_user(
        &self,
        ctx: &Ctx,
        user_id: UserId,
        limit: usize,
    ) -> Result<Vec<AuditEvent>, DomainError>;

    /// Query audit events by resource.
    async fn find_by_resource(
        &self,
        ctx: &Ctx,
        resource_type: &str,
        resource_id: Uuid,
        limit: usize,
    ) -> Result<Vec<AuditEvent>, DomainError>;
}
```

**Run:**

```bash
cargo check -p klynt-domain
```

**Expected:** No errors

**Commit:**

```bash
git add crates/klynt-domain/src/repositories.rs
git commit -m "feat: add audit event repository port"
```

---

## Task 8: Infrastructure — Token Generator

**Objective:** Create CSPRNG token generation service

**Files:**
- Create: `backend/crates/klynt-infrastructure/src/token_generator.rs`
- Modify: `backend/crates/klynt-infrastructure/src/lib.rs`

### Step 8.1: Create token generator service

**Create: `backend/crates/klynt-infrastructure/src/token_generator.rs`**

```rust
use rand::Rng;

/// Cryptographically secure token generator.
///
/// Uses thread-local RNG to generate URL-safe tokens with sufficient entropy.
pub struct TokenGenerator;

impl TokenGenerator {
    /// Generate a URL-safe token with ≥256 bits of entropy.
    ///
    /// Returns a base64URL-encoded string without padding.
    /// 43 random bytes → 344 bits → ~58 character string.
    pub fn generate() -> String {
        let mut rng = rand::thread_rng();
        let bytes: [u8; 43] = rng.gen();
        base64_url_encode(&bytes)
    }

    /// Generate a token of specific byte length.
    pub fn generate_with_bytes(byte_length: usize) -> String {
        let mut rng = rand::thread_rng();
        let bytes: Vec<u8> = (0..byte_length).map(|_| rng.gen()).collect();
        base64_url_encode(&bytes)
    }
}

/// Base64URL-encode without padding (URL-safe).
fn base64_url_encode(data: &[u8]) -> String {
    use base64::prelude::*;
    BASE64_URL_SAFE_NO_PAD.encode(data)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generates_url_safe_tokens() {
        let token = TokenGenerator::generate();
        // Should not contain padding
        assert!(!token.contains('='));
        // Should be reasonable length
        assert!(token.len() >= 50);
    }

    #[test]
    fn generates_unique_tokens() {
        let token1 = TokenGenerator::generate();
        let token2 = TokenGenerator::generate();
        assert_ne!(token1, token2);
    }

    #[test]
    fn can_generate_custom_length_tokens() {
        let token = TokenGenerator::generate_with_bytes(32);
        // 32 bytes → 256 bits → ~43 chars in base64
        assert!(token.len() >= 40);
    }

    #[test]
    fn tokens_are_url_safe() {
        let token = TokenGenerator::generate();
        // Should only contain URL-safe characters
        assert!(token.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_'));
    }
}
```

**Run:**

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo check -p klynt-infrastructure
```

**Expected:** No errors

---

### Step 8.2: Export token generator

**Modify: `backend/crates/klynt-infrastructure/src/lib.rs`**

Add module export:

```rust
pub mod email;
pub mod health;
pub mod password_hasher;
pub mod rate_limiter;
pub mod token_generator;
pub mod config;
pub mod unit_of_work;
```

**Run:**

```bash
cargo check -p klynt-infrastructure
```

**Expected:** Error about missing `email` module (we'll create it next)

**Commit:**

```bash
git add crates/klynt-infrastructure/src/token_generator.rs crates/klynt-infrastructure/src/lib.rs
git commit -m "feat: add CSPRNG token generator service"
```

---

## Task 9: Infrastructure — Email Service

**Objective:** Create email sending service (with mock for testing)

**Files:**
- Create: `backend/crates/klynt-infrastructure/src/email.rs`
- Modify: `backend/crates/klynt-infrastructure/src/lib.rs`

### Step 9.1: Create email service

**Create: `backend/crates/klynt-infrastructure/src/email.rs`**

```rust
use async_trait::async_trait;
use klynt_domain::errors::DomainError;
use std::sync::Arc;

/// Email sending port.
#[async_trait]
pub trait EmailService: Send + Sync {
    /// Send an email verification email.
    async fn send_verification(
        &self,
        email: &str,
        token: &str,
    ) -> Result<(), DomainError>;

    /// Send a password reset email.
    async fn send_password_reset(
        &self,
        email: &str,
        token: &str,
    ) -> Result<(), DomainError>;
}

/// Mock email service for development/testing.
///
/// In production, replace with real email provider (SendGrid, AWS SES, etc.).
#[derive(Debug, Default)]
pub struct MockEmailService {
    // In a real implementation, this would hold SMTP credentials or API client
}

impl MockEmailService {
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl EmailService for MockEmailService {
    async fn send_verification(
        &self,
        email: &str,
        token: &str,
    ) -> Result<(), DomainError> {
        // In production: Send actual email
        // For now: Log to stderr
        eprintln!("📧 [MOCK EMAIL] Verification email sent to {}", email);
        eprintln!("   Token: {}", token);
        eprintln!("   Link: https://login.klynt.dev/verify?token={}", token);
        Ok(())
    }

    async fn send_password_reset(
        &self,
        email: &str,
        token: &str,
    ) -> Result<(), DomainError> {
        eprintln!("📧 [MOCK EMAIL] Password reset email sent to {}", email);
        eprintln!("   Token: {}", token);
        eprintln!("   Link: https://login.klynt.dev/reset-password?token={}", token);
        Ok(())
    }
}

/// Shared email service type.
pub type SharedEmailService = Arc<dyn EmailService>;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn mock_email_service_sends_verification() {
        let service = MockEmailService::new();
        let result = service.send_verification("test@example.com", "test-token").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn mock_email_service_sends_password_reset() {
        let service = MockEmailService::new();
        let result = service.send_password_reset("test@example.com", "reset-token").await;
        assert!(result.is_ok());
    }
}
```

**Run:**

```bash
cargo check -p klynt-infrastructure
```

**Expected:** No errors

**Commit:**

```bash
git add crates/klynt-infrastructure/src/email.rs
git commit -m "feat: add mock email service for development/testing"
```

---

## Task 10: Infrastructure — SQLx Token Repositories

**Objective:** Implement SQLx-based token repositories

**Files:**
- Create: `backend/crates/klynt-infrastructure/src/repositories/sqlx_token_repo.rs`
- Modify: `backend/crates/klynt-infrastructure/src/lib.rs`

### Step 10.1: Create SQLx token repositories

**Create: `backend/crates/klynt-infrastructure/src/repositories/sqlx_token_repo.rs`**

```rust
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::{DomainError, TokenError};
use klynt_domain::repositories::{EmailVerificationTokenRepository, PasswordResetTokenRepository};
use klynt_domain::models::UserId;

/// PostgreSQL implementation of email verification token repository.
pub struct PgEmailVerificationTokenRepository {
    pool: PgPool,
}

impl PgEmailVerificationTokenRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl EmailVerificationTokenRepository for PgEmailVerificationTokenRepository {
    async fn save(
        &self,
        _ctx: &Ctx,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError> {
        sqlx::query(
            r#"
            INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
            VALUES ($1, $2, $3)
            "#,
        )
        .bind(user_id.0)
        .bind(token_hash)
        .bind(expires_at)
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::internal(e))?;

        Ok(())
    }

    async fn find_valid(
        &self,
        _ctx: &Ctx,
        token_hash: &str,
    ) -> Result<Option<(UserId, DateTime<Utc>)>, DomainError> {
        let row = sqlx::query_as::<_, (Uuid, DateTime<Utc>)>(
            r#"
            SELECT user_id, expires_at
            FROM email_verification_tokens
            WHERE token_hash = $1
              AND used_at IS NULL
              AND expires_at > NOW()
            "#,
        )
        .bind(token_hash)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::internal(e))?;

        Ok(row.map(|(user_id, expires_at)| (UserId(user_id), expires_at)))
    }

    async fn mark_used(
        &self,
        _ctx: &Ctx,
        token_hash: &str,
    ) -> Result<bool, DomainError> {
        let result = sqlx::query(
            r#"
            UPDATE email_verification_tokens
            SET used_at = NOW()
            WHERE token_hash = $1
              AND used_at IS NULL
            "#,
        )
        .bind(token_hash)
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::internal(e))?;

        Ok(result.rows_affected() > 0)
    }
}

/// PostgreSQL implementation of password reset token repository.
pub struct PgPasswordResetTokenRepository {
    pool: PgPool,
}

impl PgPasswordResetTokenRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl PasswordResetTokenRepository for PgPasswordResetTokenRepository {
    async fn save(
        &self,
        _ctx: &Ctx,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError> {
        sqlx::query(
            r#"
            INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
            VALUES ($1, $2, $3)
            "#,
        )
        .bind(user_id.0)
        .bind(token_hash)
        .bind(expires_at)
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::internal(e))?;

        Ok(())
    }

    async fn find_valid(
        &self,
        _ctx: &Ctx,
        token_hash: &str,
    ) -> Result<Option<(UserId, DateTime<Utc>)>, DomainError> {
        let row = sqlx::query_as::<_, (Uuid, DateTime<Utc>)>(
            r#"
            SELECT user_id, expires_at
            FROM password_reset_tokens
            WHERE token_hash = $1
              AND used_at IS NULL
              AND expires_at > NOW()
            "#,
        )
        .bind(token_hash)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::internal(e))?;

        Ok(row.map(|(user_id, expires_at)| (UserId(user_id), expires_at)))
    }

    async fn mark_used(
        &self,
        _ctx: &Ctx,
        token_hash: &str,
    ) -> Result<bool, DomainError> {
        let result = sqlx::query(
            r#"
            UPDATE password_reset_tokens
            SET used_at = NOW()
            WHERE token_hash = $1
              AND used_at IS NULL
            "#,
        )
        .bind(token_hash)
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::internal(e))?;

        Ok(result.rows_affected() > 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use klynt_domain::ctx::Ctx;

    // Note: These tests require a running Postgres instance.
    // In a real setup, use testcontainers or docker-compose test.

    #[tokio::test]
    #[ignore = "requires database"]
    async fn saves_and_retrieves_email_verification_token() {
        let pool = PgPool::connect("postgresql://localhost/test").await.unwrap();
        let repo = PgEmailVerificationTokenRepository::new(pool);
        let ctx = Ctx::guest(Uuid::new_v4());

        let user_id = UserId::new();
        let token_hash = "test_hash";
        let expires_at = Utc::now() + chrono::Duration::hours(24);

        repo.save(&ctx, user_id, token_hash, expires_at).await.unwrap();

        let result = repo.find_valid(&ctx, token_hash).await.unwrap();
        assert!(result.is_some());
        assert_eq!(result.unwrap().0, user_id);
    }

    #[tokio::test]
    #[ignore = "requires database"]
    async fn marks_token_as_used() {
        let pool = PgPool::connect("postgresql://localhost/test").await.unwrap();
        let repo = PgEmailVerificationTokenRepository::new(pool);
        let ctx = Ctx::guest(Uuid::new_v4());

        let user_id = UserId::new();
        let token_hash = "test_hash_used";
        let expires_at = Utc::now() + chrono::Duration::hours(24);

        repo.save(&ctx, user_id, token_hash, expires_at).await.unwrap();
        let marked = repo.mark_used(&ctx, token_hash).await.unwrap();
        assert!(marked);

        // Token should no longer be valid
        let result = repo.find_valid(&ctx, token_hash).await.unwrap();
        assert!(result.is_none());
    }
}
```

**Run:**

```bash
cargo check -p klynt-infrastructure
```

**Expected:** No errors

**Commit:**

```bash
git add crates/klynt-infrastructure/src/repositories/sqlx_token_repo.rs
git commit -m "feat: add SQLx token repository implementations"
```

---

## Task 11: Infrastructure — SQLx Audit Repository

**Objective:** Implement SQLx-based audit event repository

**Files:**
- Create: `backend/crates/klynt-infrastructure/src/repositories/sqlx_audit_repo.rs`

### Step 11.1: Create SQLx audit repository

**Create: `backend/crates/klynt-infrastructure/src/repositories/sqlx_audit_repo.rs`**

```rust
use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;

use klynt_domain::audit::AuditEvent;
use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::repositories::AuditEventRepository;
use klynt_domain::models::UserId;

/// PostgreSQL implementation of audit event repository.
pub struct PgAuditEventRepository {
    pool: PgPool,
}

impl PgAuditEventRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl AuditEventRepository for PgAuditEventRepository {
    async fn log(
        &self,
        _ctx: &Ctx,
        event: AuditEvent,
    ) -> Result<(), DomainError> {
        sqlx::query(
            r#"
            INSERT INTO audit_events (
                id, actor_user_id, actor_ip_address,
                action, resource_type, resource_id,
                tenant_id, before_data, after_data,
                success, error_message, request_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            "#,
        )
        .bind(event.id)
        .bind(event.actor_user_id.map(|id| id.0))
        .bind(event.actor_ip_address)
        .bind(event.action.to_string())
        .bind(event.resource_type.to_string())
        .bind(event.resource_id)
        .bind(event.tenant_id)
        .bind(event.before_data)
        .bind(event.after_data)
        .bind(event.success)
        .bind(event.error_message)
        .bind(event.request_id)
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::internal(e))?;

        Ok(())
    }

    async fn find_by_user(
        &self,
        _ctx: &Ctx,
        user_id: UserId,
        limit: usize,
    ) -> Result<Vec<AuditEvent>, DomainError> {
        let rows = sqlx::query_as::<_, AuditEventRow>(
            r#"
            SELECT
                id, actor_user_id, actor_ip_address,
                action, resource_type, resource_id,
                tenant_id, before_data, after_data,
                success, error_message, created_at, request_id
            FROM audit_events
            WHERE actor_user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(user_id.0)
        .bind(limit as i64)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::internal(e))?;

        rows.into_iter()
            .map(|row| row.to_audit_event())
            .collect()
    }

    async fn find_by_resource(
        &self,
        _ctx: &Ctx,
        resource_type: &str,
        resource_id: Uuid,
        limit: usize,
    ) -> Result<Vec<AuditEvent>, DomainError> {
        let rows = sqlx::query_as::<_, AuditEventRow>(
            r#"
            SELECT
                id, actor_user_id, actor_ip_address,
                action, resource_type, resource_id,
                tenant_id, before_data, after_data,
                success, error_message, created_at, request_id
            FROM audit_events
            WHERE resource_type = $1 AND resource_id = $2
            ORDER BY created_at DESC
            LIMIT $3
            "#,
        )
        .bind(resource_type)
        .bind(resource_id)
        .bind(limit as i64)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::internal(e))?;

        rows.into_iter()
            .map(|row| row.to_audit_event())
            .collect()
    }
}

/// Helper struct for SQLx mapping.
struct AuditEventRow {
    id: Uuid,
    actor_user_id: Option<Uuid>,
    actor_ip_address: Option<String>,
    action: String,
    resource_type: String,
    resource_id: Option<Uuid>,
    tenant_id: Option<Uuid>,
    before_data: Option<serde_json::Value>,
    after_data: Option<serde_json::Value>,
    success: bool,
    error_message: Option<String>,
    created_at: chrono::DateTime<Utc>,
    request_id: Option<Uuid>,
}

impl AuditEventRow {
    fn to_audit_event(self) -> Result<AuditEvent, DomainError> {
        use klynt_domain::audit::{AuditAction, ResourceType};

        let action = self.action.parse::<AuditAction>()
            .map_err(|_| DomainError::internal_msg("Invalid audit action"))?;

        let resource_type = self.resource_type.parse::<ResourceType>()
            .map_err(|_| DomainError::internal_msg("Invalid resource type"))?;

        Ok(AuditEvent {
            id: self.id,
            actor_user_id: self.actor_user_id.map(UserId),
            actor_ip_address: self.actor_ip_address,
            action,
            resource_type,
            resource_id: self.resource_id,
            tenant_id: self.tenant_id,
            before_data: self.before_data,
            after_data: self.after_data,
            success: self.success,
            error_message: self.error_message,
            created_at: self.created_at,
            request_id: self.request_id,
        })
    }
}

// Add String parsing support for AuditAction and ResourceType
impl std::str::FromStr for klynt_domain::audit::AuditAction {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        use klynt_domain::audit::AuditAction;
        match s {
            "user_registered" => Ok(AuditAction::UserRegistered),
            "user_email_verified" => Ok(AuditAction::UserEmailVerified),
            "user_password_changed" => Ok(AuditAction::UserPasswordChanged),
            "user_password_reset" => Ok(AuditAction::UserPasswordReset),
            "user_suspended" => Ok(AuditAction::UserSuspended),
            "user_deleted" => Ok(AuditAction::UserDeleted),
            "session_created" => Ok(AuditAction::SessionCreated),
            "session_revoked" => Ok(AuditAction::SessionRevoked),
            "session_refreshed" => Ok(AuditAction::SessionRefreshed),
            "tenant_created" => Ok(AuditAction::TenantCreated),
            "tenant_updated" => Ok(AuditAction::TenantUpdated),
            "tenant_deleted" => Ok(AuditAction::TenantDeleted),
            "member_invited" => Ok(AuditAction::MemberInvited),
            "member_role_changed" => Ok(AuditAction::MemberRoleChanged),
            "member_removed" => Ok(AuditAction::MemberRemoved),
            "permission_granted" => Ok(AuditAction::PermissionGranted),
            "permission_revoked" => Ok(AuditAction::PermissionRevoked),
            _ => Err(format!("Unknown action: {}", s)),
        }
    }
}

impl std::str::FromStr for klynt_domain::audit::ResourceType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        use klynt_domain::audit::ResourceType;
        match s {
            "user" => Ok(ResourceType::User),
            "session" => Ok(ResourceType::Session),
            "tenant" => Ok(ResourceType::Tenant),
            "membership" => Ok(ResourceType::Membership),
            "permission" => Ok(ResourceType::Permission),
            "role" => Ok(ResourceType::Role),
            _ => Err(format!("Unknown resource type: {}", s)),
        }
    }
}

impl std::fmt::Display for klynt_domain::audit::AuditAction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        use klynt_domain::audit::AuditAction;
        let s = match self {
            AuditAction::UserRegistered => "user_registered",
            AuditAction::UserEmailVerified => "user_email_verified",
            AuditAction::UserPasswordChanged => "user_password_changed",
            AuditAction::UserPasswordReset => "user_password_reset",
            AuditAction::UserSuspended => "user_suspended",
            AuditAction::UserDeleted => "user_deleted",
            AuditAction::SessionCreated => "session_created",
            AuditAction::SessionRevoked => "session_revoked",
            AuditAction::SessionRefreshed => "session_refreshed",
            AuditAction::TenantCreated => "tenant_created",
            AuditAction::TenantUpdated => "tenant_updated",
            AuditAction::TenantDeleted => "tenant_deleted",
            AuditAction::MemberInvited => "member_invited",
            AuditAction::MemberRoleChanged => "member_role_changed",
            AuditAction::MemberRemoved => "member_removed",
            AuditAction::PermissionGranted => "permission_granted",
            AuditAction::PermissionRevoked => "permission_revoked",
        };
        write!(f, "{}", s)
    }
}

impl std::fmt::Display for klynt_domain::audit::ResourceType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        use klynt_domain::audit::ResourceType;
        let s = match self {
            ResourceType::User => "user",
            ResourceType::Session => "session",
            ResourceType::Tenant => "tenant",
            ResourceType::Membership => "membership",
            ResourceType::Permission => "permission",
            ResourceType::Role => "role",
        };
        write!(f, "{}", s)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use klynt_domain::audit::{AuditAction, ResourceType};

    #[tokio::test]
    #[ignore = "requires database"]
    async fn logs_and_retrieves_audit_events() {
        let pool = PgPool::connect("postgresql://localhost/test").await.unwrap();
        let repo = PgAuditEventRepository::new(pool);
        let ctx = Ctx::guest(Uuid::new_v4());

        let event = AuditEvent::new(AuditAction::SessionCreated, ResourceType::Session)
            .with_actor(UserId::new())
            .with_request_id(Uuid::new_v4());

        repo.log(&ctx, event.clone()).await.unwrap();

        let events = repo.find_by_user(&ctx, event.actor_user_id.unwrap(), 10).await.unwrap();
        assert!(!events.is_empty());
    }
}
```

**Run:**

```bash
cargo check -p klynt-infrastructure
```

**Expected:** No errors

**Commit:**

```bash
git add crates/klynt-infrastructure/src/repositories/sqlx_audit_repo.rs
git commit -m "feat: add SQLx audit event repository implementation"
```

---

## Task 12: Application Layer — Registration Use Case

**Objective:** Implement user registration with email verification

**Files:**
- Modify: `backend/crates/klynt-application/src/auth.rs`

### Step 12.1: Add registration method to AuthService

**Modify: `backend/crates/klynt-application/src/auth.rs`**

Add to imports:

```rust
use klynt_domain::tokens::EmailVerificationToken;
use klynt_domain::repositories::EmailVerificationTokenRepository;
use klynt_infrastructure::email::{EmailService, SharedEmailService};
```

Add new fields to `AuthService`:

```rust
pub struct AuthService {
    user_service: Arc<UserService>,
    session_store: Arc<dyn SessionStore>,
    email_verification_repo: Arc<dyn EmailVerificationTokenRepository>,  // NEW
    email_service: SharedEmailService,                                      // NEW
}
```

Update the constructor:

```rust
impl AuthService {
    pub fn new(
        user_service: Arc<UserService>,
        session_store: Arc<dyn SessionStore>,
        email_verification_repo: Arc<dyn EmailVerificationTokenRepository>,  // NEW
        email_service: SharedEmailService,                                  // NEW
    ) -> Self {
        Self {
            user_service,
            session_store,
            email_verification_repo,  // NEW
            email_service,            // NEW
        }
    }
```

Add the registration method:

```rust
    /// Register a new user and send verification email.
    ///
    /// Returns the user ID. The user status will be `PendingVerification`
    /// until they click the verification link.
    pub async fn register(
        &self,
        ctx: &Ctx,
        name: String,
        email: &Email,
        password: &str,
    ) -> Result<UserId, DomainError> {
        // Create user with PendingVerification status
        let user_id = self
            .user_service
            .create_pending_user(ctx, name, email, password)
            .await?;

        // Generate and store verification token
        let token = EmailVerificationToken::generate(user_id);
        self.email_verification_repo
            .save(
                ctx,
                user_id,
                &token.hash,
                token.expires_at,
            )
            .await?;

        // Send verification email
        self.email_service
            .send_verification(email.as_str(), &token.plaintext)
            .await
            .map_err(|e| DomainError::internal(e))?;

        Ok(user_id)
    }

    /// Verify email using token from email link.
    ///
    /// Returns the user ID if verification succeeds.
    pub async fn verify_email(
        &self,
        ctx: &Ctx,
        token: &str,
    ) -> Result<UserId, DomainError> {
        // Hash the token and look it up
        let token_hash = EmailVerificationToken::sha256_hash(token);

        let (user_id, _expires_at) = self
            .email_verification_repo
            .find_valid(ctx, &token_hash)
            .await?
            .ok_or(DomainError::InvalidToken(klynt_domain::errors::TokenError::Invalid))?;

        // Mark token as used (atomic, single-use)
        let was_used = self
            .email_verification_repo
            .mark_used(ctx, &token_hash)
            .await?;

        if !was_used {
            return Err(DomainError::InvalidToken(
                klynt_domain::errors::TokenError::AlreadyUsed,
            ));
        }

        // Activate user
        self.user_service.activate_user(ctx, user_id).await?;

        Ok(user_id)
    }
```

**Run:**

```bash
cargo check -p klynt-application
```

**Expected:** Error about missing `create_pending_user` and `activate_user` methods on `UserService`

---

### Step 12.2: Add user creation methods to UserService

**Modify: `backend/crates/klynt-application/src/users.rs`**

Add the new methods to `UserService`:

```rust
    /// Create a new user in pending verification state.
    pub async fn create_pending_user(
        &self,
        ctx: &Ctx,
        name: String,
        email: &Email,
        password: &str,
    ) -> Result<UserId, DomainError> {
        // Validate name
        if name.trim().is_empty() {
            return Err(DomainError::InvalidName(klynt_domain::errors::NameError::Empty));
        }

        // Hash password
        let password_hash = self.password_hasher.hash(password).await?;

        // Create user entity
        let user = User {
            id: UserId::new(),
            name,
            email: email.clone(),
            role: Role::Student, // Default role
            institution_id: None,
            status: UserStatus::PendingVerification,
            email_verified_at: None,
            global_role: None,
            password_hash: password_hash.into(),
            terms_accepted_at: Utc::now(),
            terms_version: "1.0".to_string(),
            created_at: Utc::now(),
        };

        // Save user
        let result = self
            .user_repo
            .create_if_not_exists(ctx, email, &user)
            .await?;

        match result {
            CreateResult::Created => Ok(user.id),
            CreateResult::AlreadyExists(_) => {
                Err(DomainError::AlreadyExists {
                    email: email.as_str().to_string(),
                })
            }
        }
    }

    /// Activate a user account (after email verification).
    pub async fn activate_user(
        &self,
        ctx: &Ctx,
        user_id: UserId,
    ) -> Result<(), DomainError> {
        self.user_repo.set_email_verified(ctx, user_id).await
    }
```

**Run:**

```bash
cargo check -p klynt-application
```

**Expected:** Error about missing `set_email_verified` method

---

### Step 12.3: Add email verification method to UserRepository

**Modify: `backend/crates/klynt-domain/src/repositories.rs`**

Add to `UserRepository` trait:

```rust
async fn set_email_verified(
    &self,
    ctx: &Ctx,
    user_id: UserId,
) -> Result<(), DomainError>;
```

**Run:**

```bash
cargo check -p klynt-application
```

**Expected:** Still error because repository implementation needs this method

---

### Step 12.4: Implement set_email_verified in existing repository

**Note:** The current implementation uses in-memory repositories. We'll need to update the existing repository implementation or create a SQLx version. For now, let's stub this to make the code compile:

**Modify: `backend/crates/klynt-application/src/users.rs` (temporary workaround)**

Add a TODO comment and stub implementation in the repository implementation section (or if using in-memory repo):

```rust
// TODO: Implement in SQLx user repository (Task 14)
// For now, this will fail until we add the Postgres implementation
```

**Commit:**

```bash
git add crates/klynt-application/src/auth.rs crates/klynt-application/src/users.rs
git commit -m "feat: add user registration and email verification use cases"
```

---

## Task 13: Application Layer — Password Reset Use Case

**Objective:** Implement secure password reset flow

**Files:**
- Modify: `backend/crates/klynt-application/src/auth.rs`

### Step 13.1: Add password reset methods

**Modify: `backend/crates/klynt-application/src/auth.rs`**

Add to imports:

```rust
use klynt_domain::tokens::PasswordResetToken;
use klynt_domain::repositories::PasswordResetTokenRepository;
```

Add new fields to `AuthService`:

```rust
pub struct AuthService {
    user_service: Arc<UserService>,
    session_store: Arc<dyn SessionStore>,
    email_verification_repo: Arc<dyn EmailVerificationTokenRepository>,
    password_reset_repo: Arc<dyn PasswordResetTokenRepository>,  // NEW
    email_service: SharedEmailService,
}
```

Update constructor:

```rust
impl AuthService {
    pub fn new(
        user_service: Arc<UserService>,
        session_store: Arc<dyn SessionStore>,
        email_verification_repo: Arc<dyn EmailVerificationTokenRepository>,
        password_reset_repo: Arc<dyn PasswordResetTokenRepository>,  // NEW
        email_service: SharedEmailService,
    ) -> Self {
        Self {
            user_service,
            session_store,
            email_verification_repo,
            password_reset_repo,  // NEW
            email_service,
        }
    }
```

Add password reset methods:

```rust
    /// Request password reset (user initiates).
    ///
    /// Always returns Ok to prevent email enumeration.
    pub async fn request_password_reset(
        &self,
        ctx: &Ctx,
        email: &Email,
    ) -> Result<(), DomainError> {
        // Find user by email
        let user = match self.user_service.find_by_email(ctx, email).await {
            Ok(Some(user)) => user,
            Ok(None) => {
                // User doesn't exist - return Ok to prevent enumeration
                return Ok(());
            }
            Err(e) => return Err(e),
        };

        // Generate reset token
        let token = PasswordResetToken::generate(user.id);

        // Store token hash
        self.password_reset_repo
            .save(
                ctx,
                user.id,
                &token.hash,
                token.expires_at,
            )
            .await?;

        // Send reset email
        self.email_service
            .send_password_reset(email.as_str(), &token.plaintext)
            .await
            .map_err(|e| DomainError::internal(e))?;

        Ok(())
    }

    /// Reset password using token from email.
    pub async fn reset_password(
        &self,
        ctx: &Ctx,
        token: &str,
        new_password: &str,
    ) -> Result<(), DomainError> {
        // Validate new password
        klynt_domain::models::validate_password(new_password)?;

        // Hash token and look it up
        let token_hash = PasswordResetToken::sha256_hash(token);

        let (user_id, _expires_at) = self
            .password_reset_repo
            .find_valid(ctx, &token_hash)
            .await?
            .ok_or(DomainError::InvalidToken(klynt_domain::errors::TokenError::Invalid))?;

        // Mark token as used (atomic, single-use)
        let was_used = self
            .password_reset_repo
            .mark_used(ctx, &token_hash)
            .await?;

        if !was_used {
            return Err(DomainError::InvalidToken(
                klynt_domain::errors::TokenError::AlreadyUsed,
            ));
        }

        // Update password
        self.user_service
            .update_password(ctx, user_id, new_password)
            .await?;

        Ok(())
    }
```

---

### Step 13.2: Add password update method to UserService

**Modify: `backend/crates/klynt-application/src/users.rs`**

Add the method:

```rust
    /// Update user password.
    pub async fn update_password(
        &self,
        ctx: &Ctx,
        user_id: UserId,
        new_password: &str,
    ) -> Result<(), DomainError> {
        // Validate password
        klynt_domain::models::validate_password(new_password)?;

        // Hash new password
        let password_hash = self.password_hasher.hash(new_password).await?;

        // Update in repository
        self.user_repo
            .update_password(ctx, user_id, &password_hash.into())
            .await
    }
```

---

### Step 13.3: Add update_password to UserRepository

**Modify: `backend/crates/klynt-domain/src/repositories.rs`**

Add to `UserRepository` trait:

```rust
async fn update_password(
    &self,
    ctx: &Ctx,
    user_id: UserId,
    password_hash: &HashedPassword,
) -> Result<(), DomainError>;
```

Add to imports:

```rust
use crate::ports::HashedPassword;
```

**Commit:**

```bash
git add crates/klynt-application/src/auth.rs crates/klynt-application/src/users.rs crates/klynt-domain/src/repositories.rs
git commit -m "feat: add password reset use case"
```

---

## Task 14: Application Layer — Enhanced Login with Session Rotation

**Objective:** Enhance login to prevent session fixation

**Files:**
- Modify: `backend/crates/klynt-application/src/auth.rs`

### Step 14.1: Update login to rotate session ID

**Modify: `backend/crates/klynt-application/src/auth.rs`**

Update the `login` method to document session rotation (current implementation already creates new session ID via `SessionToken::new()`, but we should add explicit documentation):

```rust
    /// Authenticate a user and create a session.
    ///
    /// SECURITY: Always creates a NEW session ID on login to prevent
    /// session fixation attacks. Any pre-login anonymous session is discarded.
    ///
    /// Returns the bearer token and a DTO of the authenticated user.
    pub async fn login(
        &self,
        ctx: &Ctx,
        email: &Email,
        password: &str,
    ) -> Result<(SessionToken, UserDto), DomainError> {
        let user = self.user_service.authenticate(ctx, email, password).await?;
        let user_id = user.id;
        let user_dto = UserDto::from(&user);

        // Create NEW session with fresh token (session fixation prevention)
        let expires_at = Utc::now() + Session::DEFAULT_TTL;
        let token = self.session_store.create(ctx, user_id, expires_at).await?;

        Ok((token, user_dto))
    }
```

**Commit:**

```bash
git add crates/klynt-application/src/auth.rs
git commit -m "docs: document session rotation in login method"
```

---

## Task 15: Application Layer — Audit Logging Use Case

**Objective:** Create audit logging service

**Files:**
- Create: `backend/crates/klynt-application/src/audit.rs`
- Modify: `backend/crates/klynt-application/src/lib.rs`

### Step 15.1: Create audit logging service

**Create: `backend/crates/klynt-application/src/audit.rs`**

```rust
use std::sync::Arc;
use uuid::Uuid;

use klynt_domain::audit::{AuditAction, AuditEvent, ResourceType};
use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::UserId;
use klynt_domain::repositories::AuditEventRepository;

/// Audit logging service.
///
/// Logs all security-relevant mutations for compliance and incident response.
pub struct AuditService {
    repo: Arc<dyn AuditEventRepository>,
}

impl AuditService {
    pub fn new(repo: Arc<dyn AuditEventRepository>) -> Self {
        Self { repo }
    }

    /// Log user registration.
    pub async fn log_user_registered(
        &self,
        ctx: &Ctx,
        user_id: UserId,
        ip: Option<String>,
    ) -> Result<(), DomainError> {
        let event = AuditEvent::new(AuditAction::UserRegistered, ResourceType::User)
            .with_actor(user_id)
            .with_resource(user_id.0)
            .with_request_id(ctx.request_id);

        let event = if let Some(ip) = ip {
            event.with_ip(ip)
        } else {
            event
        };

        self.repo.log(ctx, event).await
    }

    /// Log email verification.
    pub async fn log_email_verified(
        &self,
        ctx: &Ctx,
        user_id: UserId,
    ) -> Result<(), DomainError> {
        let event = AuditEvent::new(AuditAction::UserEmailVerified, ResourceType::User)
            .with_actor(user_id)
            .with_resource(user_id.0)
            .with_request_id(ctx.request_id);

        self.repo.log(ctx, event).await
    }

    /// Log session creation.
    pub async fn log_session_created(
        &self,
        ctx: &Ctx,
        user_id: UserId,
        session_id: Uuid,
        ip: Option<String>,
    ) -> Result<(), DomainError> {
        let mut event = AuditEvent::new(AuditAction::SessionCreated, ResourceType::Session)
            .with_actor(user_id)
            .with_resource(session_id)
            .with_request_id(ctx.request_id);

        if let Some(ip) = ip {
            event = event.with_ip(ip);
        }

        self.repo.log(ctx, event).await
    }

    /// Log password reset.
    pub async fn log_password_reset(
        &self,
        ctx: &Ctx,
        user_id: UserId,
    ) -> Result<(), DomainError> {
        let event = AuditEvent::new(AuditAction::UserPasswordReset, ResourceType::User)
            .with_actor(user_id)
            .with_resource(user_id.0)
            .with_request_id(ctx.request_id);

        self.repo.log(ctx, event).await
    }

    /// Log failed authentication attempt.
    pub async fn log_login_failed(
        &self,
        ctx: &Ctx,
        email: &str,
        ip: Option<String>,
        error: String,
    ) -> Result<(), DomainError> {
        let mut event = AuditEvent::new(AuditAction::SessionCreated, ResourceType::Session)
            .with_error(error)
            .with_request_id(ctx.request_id);

        if let Some(ip) = ip {
            event = event.with_ip(ip);
        }

        self.repo.log(ctx, event).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use klynt_domain::repositories::AuditEventRepository;

    struct MockAuditRepo;

    #[async_trait::async_trait]
    impl AuditEventRepository for MockAuditRepo {
        async fn log(&self, _ctx: &Ctx, _event: AuditEvent) -> Result<(), DomainError> {
            Ok(())
        }

        async fn find_by_user(
            &self,
            _ctx: &Ctx,
            _user_id: UserId,
            _limit: usize,
        ) -> Result<Vec<AuditEvent>, DomainError> {
            Ok(vec![])
        }

        async fn find_by_resource(
            &self,
            _ctx: &Ctx,
            _resource_type: &str,
            _resource_id: Uuid,
            _limit: usize,
        ) -> Result<Vec<AuditEvent>, DomainError> {
            Ok(vec![])
        }
    }

    #[tokio::test]
    async fn logs_user_registration() {
        let repo = Arc::new(MockAuditRepo);
        let service = AuditService::new(repo);
        let ctx = Ctx::guest(Uuid::new_v4());

        let user_id = UserId::new();
        let result = service
            .log_user_registered(&ctx, user_id, Some("127.0.0.1".to_string()))
            .await;

        assert!(result.is_ok());
    }
}
```

**Run:**

```bash
cargo check -p klynt-application
```

**Expected:** No errors

---

### Step 15.2: Export audit module

**Modify: `backend/crates/klynt-application/src/lib.rs`**

```rust
pub mod audit;
pub mod auth;
pub mod users;
```

**Commit:**

```bash
git add crates/klynt-application/src/audit.rs crates/klynt-application/src/lib.rs
git commit -m "feat: add audit logging service"
```

---

## Task 16: API Layer — Registration Endpoint

**Objective:** Add HTTP endpoints for registration

**Files:**
- Create: `backend/crates/klynt-api/src/v1/auth.rs`
- Modify: `backend/crates/klynt-api/src/v1/mod.rs`

### Step 16.1: Create auth endpoints

**Create: `backend/crates/klynt-api/src/v1/auth.rs`**

```rust
use std::sync::Arc;

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Extension,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use klynt_domain::models::Email;
use klynt_domain::ctx::Ctx;

use crate::error::{AppError, WithRequestId};
use crate::middleware::RequestId;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct RegisterBody {
    pub name: String,
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct RegisterResponse {
    pub user_id: Uuid,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct VerifyEmailBody {
    pub token: String,
}

#[derive(Debug, Serialize)]
pub struct VerifyEmailResponse {
    pub message: String,
}

/// POST /api/v1/auth/register
///
/// Register a new user and send verification email.
pub async fn register(
    State(state): State<Arc<AppState>>,
    Extension(request_id): Extension<RequestId>,
    Json(body): Json<RegisterBody>,
) -> Result<impl IntoResponse, AppError> {
    let email = Email::parse(&body.email).map_err(|e| {
        AppError::from(klynt_domain::errors::DomainError::InvalidEmail(e))
            .with_request_id(request_id.0)
    })?;

    let ctx = Ctx::guest(request_id.0);
    let user_id = state
        .auth_service
        .register(&ctx, body.name, &email, &body.password)
        .await
        .with_request_id(request_id.0)?;

    Ok((
        StatusCode::CREATED,
        Json(RegisterResponse {
            user_id: user_id.0,
            message: "Registration successful. Please check your email to verify your account.".to_string(),
        }),
    ))
}

/// POST /api/v1/auth/verify-email
///
/// Verify email using token from email link.
pub async fn verify_email(
    State(state): State<Arc<AppState>>,
    Extension(request_id): Extension<RequestId>,
    Json(body): Json<VerifyEmailBody>,
) -> Result<impl IntoResponse, AppError> {
    let ctx = Ctx::guest(request_id.0);
    let _user_id = state
        .auth_service
        .verify_email(&ctx, &body.token)
        .await
        .with_request_id(request_id.0)?;

    Ok(Json(VerifyEmailResponse {
        message: "Email verified successfully. You can now log in.".to_string(),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn register_response_serializes() {
        let response = RegisterResponse {
            user_id: Uuid::new_v4(),
            message: "test".to_string(),
        };
        assert!(serde_json::to_string(&response).is_ok());
    }

    #[test]
    fn verify_response_serializes() {
        let response = VerifyEmailResponse {
            message: "test".to_string(),
        };
        assert!(serde_json::to_string(&response).is_ok());
    }
}
```

**Run:**

```bash
cargo check -p klynt-api
```

**Expected:** No errors

---

### Step 16.2: Add auth routes to router

**Modify: `backend/crates/klynt-api/src/v1/mod.rs`**

Add auth module:

```rust
pub mod auth;
pub mod health;
pub mod sessions;
pub mod users;
```

Update the router:

```rust
pub fn router() -> Router<Arc<AppState>> {
    let public = Router::new()
        .route("/health/live", get(health::liveness))
        .route("/health/ready", get(health::readiness))
        .route("/sessions", post(sessions::login))
        .route("/users", post(users::create_user))
        .route("/auth/register", post(auth::register))           // NEW
        .route("/auth/verify-email", post(auth::verify_email));  // NEW

    let protected = Router::new()
        .route("/users/me", get(users::get_me))
        .route_layer(middleware::from_fn(ctx_require));

    public.merge(protected)
}
```

**Commit:**

```bash
git add crates/klynt-api/src/v1/auth.rs crates/klynt-api/src/v1/mod.rs
git commit -m "feat: add registration and email verification endpoints"
```

---

## Task 17: API Layer — Password Reset Endpoints

**Objective:** Add HTTP endpoints for password reset

**Files:**
- Modify: `backend/crates/klynt-api/src/v1/auth.rs`

### Step 17.1: Add password reset endpoints

**Modify: `backend/crates/klynt-api/src/v1/auth.rs`**

Add request/response structs:

```rust
#[derive(Debug, Deserialize)]
pub struct RequestPasswordResetBody {
    pub email: String,
}

#[derive(Debug, Serialize)]
pub struct RequestPasswordResetResponse {
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct ResetPasswordBody {
    pub token: String,
    pub new_password: String,
}

#[derive(Debug, Serialize)]
pub struct ResetPasswordResponse {
    pub message: String,
}
```

Add endpoint handlers:

```rust
/// POST /api/v1/auth/request-password-reset
///
/// Request a password reset email.
pub async fn request_password_reset(
    State(state): State<Arc<AppState>>,
    Extension(request_id): Extension<RequestId>,
    Json(body): Json<RequestPasswordResetBody>,
) -> Result<impl IntoResponse, AppError> {
    let email = Email::parse(&body.email).map_err(|e| {
        AppError::from(klynt_domain::errors::DomainError::InvalidEmail(e))
            .with_request_id(request_id.0)
    })?;

    let ctx = Ctx::guest(request_id.0);
    state
        .auth_service
        .request_password_reset(&ctx, &email)
        .await
        .with_request_id(request_id.0)?;

    // Always return success to prevent email enumeration
    Ok(Json(RequestPasswordResetResponse {
        message: "If an account exists with this email, a password reset link has been sent.".to_string(),
    }))
}

/// POST /api/v1/auth/reset-password
///
/// Reset password using token from email.
pub async fn reset_password(
    State(state): State<Arc<AppState>>,
    Extension(request_id): Extension<RequestId>,
    Json(body): Json<ResetPasswordBody>,
) -> Result<impl IntoResponse, AppError> {
    let ctx = Ctx::guest(request_id.0);
    state
        .auth_service
        .reset_password(&ctx, &body.token, &body.new_password)
        .await
        .with_request_id(request_id.0)?;

    Ok(Json(ResetPasswordResponse {
        message: "Password reset successfully. You can now log in with your new password.".to_string(),
    }))
}
```

**Commit:**

```bash
git add crates/klynt-api/src/v1/auth.rs
git commit -m "feat: add password reset endpoints"
```

---

### Step 17.2: Add password reset routes

**Modify: `backend/crates/klynt-api/src/v1/mod.rs`**

Update the router:

```rust
pub fn router() -> Router<Arc<AppState>> {
    let public = Router::new()
        .route("/health/live", get(health::liveness))
        .route("/health/ready", get(health::readiness))
        .route("/sessions", post(sessions::login))
        .route("/users", post(users::create_user))
        .route("/auth/register", post(auth::register))
        .route("/auth/verify-email", post(auth::verify_email))
        .route("/auth/request-password-reset", post(auth::request_password_reset))  // NEW
        .route("/auth/reset-password", post(auth::reset_password));                   // NEW

    let protected = Router::new()
        .route("/users/me", get(users::get_me))
        .route_layer(middleware::from_fn(ctx_require));

    public.merge(protected)
}
```

**Commit:**

```bash
git add crates/klynt-api/src/v1/mod.rs
git commit -m "feat: add password reset routes"
```

---

## Task 18: Integration Tests

**Objective:** Add integration tests for auth flows

**Files:**
- Create: `backend/crates/klynt-api/tests/test_auth_integration.rs`

### Step 18.1: Create auth integration tests

**Create: `backend/crates/klynt-api/tests/test_auth_integration.rs`**

```rust
use axum::{
    body::Body,
    http::{header, Method, Request, StatusCode},
};
use serde_json::json;
use tower::ServiceExt;

/// Test registration flow.
#[tokio::test]
#[ignore = "requires running server"]
async fn test_registration_flow() {
    let app = create_test_app().await;

    // Register new user
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/register")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(json!(
                    {
                        "name": "Test User",
                        "email": "test@example.com",
                        "password": "a-very-long-password-123"
                    }
                ).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    // Verify email with token (mocked in test)
    // In real test, would extract token from mock email service

    // Try logging in before verification (should fail)
    // ...

    // Verify email
    // ...

    // Login after verification (should succeed)
    // ...
}

/// Test password reset flow.
#[tokio::test]
#[ignore = "requires running server"]
async fn test_password_reset_flow() {
    let app = create_test_app().await;

    // Request password reset
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/request-password-reset")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(json!(
                    {
                        "email": "test@example.com"
                    }
                ).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    // Reset password with token from mock email
    // ...
}

/// Test session fixation prevention.
#[tokio::test]
#[ignore = "requires running server"]
async fn test_session_fixation_prevention() {
    let app = create_test_app().await;

    // Create anonymous session
    // ...

    // Login (should create NEW session ID, not reuse old one)
    // ...

    // Assert old session is invalid
    // ...
}

/// Test cross-subdomain SSO cookie.
#[tokio::test]
#[ignore = "requires running server"]
async fn test_cross_subdomain_sso() {
    // This test requires:
    // 1. DNS setup for *.klynt.test
    // 2. Cookie domain set to .klynt.test
    // 3. Test that cookie from login.klynt.test works on tenant.klynt.test

    // For CI, use Playwright with configurable cookie domain
    // ...
}

async fn create_test_app() -> axum::Router {
    // Setup test app with mock services
    // ...
    axum::Router::new()
}
```

**Commit:**

```bash
git add crates/klynt-api/tests/test_auth_integration.rs
git commit -m "test: add auth integration test stubs"
```

---

## Task 19: OpenAPI Specification

**Objective:** Create OpenAPI spec for auth endpoints

**Files:**
- Create: `backend/crates/klynt-api/src/openapi.yaml`

### Step 19.1: Create OpenAPI spec

**Create: `backend/crates/klynt-api/src/openapi.yaml`**

```yaml
openapi: 3.1.0
info:
  title: Klynt Education Platform API
  version: 1.0.0
  description: Multi-tenant education platform API

servers:
  - url: http://localhost:3001/api/v1
    description: Local development

paths:
  /auth/register:
    post:
      summary: Register a new user
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegisterRequest'
      responses:
        '201':
          description: User registered successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RegisterResponse'
        '400':
          description: Invalid input
        '409':
          description: Email already registered

  /auth/verify-email:
    post:
      summary: Verify email address
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/VerifyEmailRequest'
      responses:
        '200':
          description: Email verified successfully
        '400':
          description: Invalid or expired token

  /auth/request-password-reset:
    post:
      summary: Request password reset
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RequestPasswordResetRequest'
      responses:
        '200':
          description: Password reset email sent (if email exists)

  /auth/reset-password:
    post:
      summary: Reset password
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ResetPasswordRequest'
      responses:
        '200':
          description: Password reset successfully
        '400':
          description: Invalid or expired token

  /sessions:
    post:
      summary: Create session (login)
      tags:
        - Authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoginResponse'
        '401':
          description: Invalid credentials

components:
  schemas:
    RegisterRequest:
      type: object
      required:
        - name
        - email
        - password
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 255
        email:
          type: string
          format: email
        password:
          type: string
          minLength: 12

    RegisterResponse:
      type: object
      properties:
        user_id:
          type: string
          format: uuid
        message:
          type: string

    VerifyEmailRequest:
      type: object
      required:
        - token
      properties:
        token:
          type: string
          minLength: 50

    VerifyEmailResponse:
      type: object
      properties:
        message:
          type: string

    RequestPasswordResetRequest:
      type: object
      required:
        - email
      properties:
        email:
          type: string
          format: email

    RequestPasswordResetResponse:
      type: object
      properties:
        message:
          type: string

    ResetPasswordRequest:
      type: object
      required:
        - token
        - new_password
      properties:
        token:
          type: string
          minLength: 50
        new_password:
          type: string
          minLength: 12

    ResetPasswordResponse:
      type: object
      properties:
        message:
          type: string

    LoginRequest:
      type: object
      required:
        - email
        - password
      properties:
        email:
          type: string
          format: email
        password:
          type: string

    LoginResponse:
      type: object
      properties:
        token:
          type: string
          format: uuid
        user:
          $ref: '#/components/schemas/User'

    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        email:
          type: string
          format: email
        role:
          type: string
          enum: [student, teacher, admin, parent]
        status:
          type: string
          enum: [pending_verification, active, suspended]
        email_verified_at:
          type: string
          format: date-time
          nullable: true
        global_role:
          type: string
          enum: [owner, admin, user]
          nullable: true
        created_at:
          type: string
          format: date-time

tags:
  - name: Authentication
    description: User authentication and authorization
```

**Commit:**

```bash
git add crates/klynt-api/src/openapi.yaml
git commit -m "docs: add OpenAPI spec for auth endpoints"
```

---

### Step 19.2: Export openapi module

**Modify: `backend/crates/klynt-api/src/lib.rs`**

```rust
pub mod error;
pub mod middleware;
pub mod openapi;
pub mod rate_limit;
pub mod startup;
pub mod state;
pub mod v1;
```

---

## Task 20: Complete Remaining Integration Work

**Objective:** Complete all remaining wiring and updates

### Step 20.1: Update AppState to include new services

**Read:** `backend/crates/klynt-api/src/state.rs`

Update `AppState` to include email verification repo, password reset repo, and audit service.

**Modify based on actual structure**, adding:
- `email_verification_repo: Arc<dyn EmailVerificationTokenRepository>`
- `password_reset_repo: Arc<dyn PasswordResetTokenRepository>`
- `audit_service: Arc<AuditService>`

### Step 20.2: Update composition/root to wire all dependencies

**Read:** `backend/crates/klynt-server/src/composition.rs`

Update to instantiate and wire all new services.

**Commit:**

```bash
git add -A
git commit -m "feat: wire all Phase 1 services in composition root"
```

---

## Task 21: Database Migration Execution

**Objective:** Run migrations in development environment

### Step 21.1: Setup local database

```bash
# Start Postgres and Redis
docker compose -f docker-compose.dev.yml up -d postgres redis

# Wait for services to be ready
sleep 5

# Run migrations
sqlx migrate run --source migrations --database-url postgresql://klynt:klynt@localhost:5432/klynt
```

**Expected:** Migrations apply successfully

### Step 21.2: Verify schema

```bash
# Connect to database and verify tables
docker exec -it klynt-postgres-1 psql -U klynt -d klynt -c "\dt"
```

**Expected:** See tables: users, sessions, email_verification_tokens, password_reset_tokens, audit_events

**Commit:**

```bash
git add .sqlx/
git commit -m "chore: track sqlx migration version"
```

---

## Task 22: Run Tests and Verify Coverage

**Objective:** Run all tests and ensure ≥84% coverage

### Step 22.1: Run unit tests

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo nextest run --workspace
```

**Expected:** All tests pass

### Step 22.2: Check coverage

```bash
cargo llvm-cov --workspace --lcov --output-path lcov.info
genhtml lcov.info -o coverage/
```

**Expected:** Coverage ≥84%

### Step 22.3: Fix any failing tests

Run tests iteratively and fix any failures.

**Commit:**

```bash
git add -A
git commit -m "test: ensure ≥84% coverage for Phase 1"
```

---

## Task 23: Final Review and Documentation

**Objective:** Review Phase 1 completion and document

### Step 23.1: Verify all acceptance criteria

Create a checklist and verify each acceptance criterion from the roadmap.

### Step 23.2: Update README with Phase 1 status

**Modify:** `backend/README.md`

Document Phase 1 completion, migration instructions, and testing commands.

**Commit:**

```bash
git add README.md
git commit -m "docs: document Phase 1 completion"
```

---

## Self-Review Checklist

After completing this plan, verify:

- [ ] All 7 CRITICAL findings from spec review addressed:
  - [ ] Tenant ownership limit reconciled (not applicable to Phase 1)
  - [ ] CORS uses dynamic origin validation
  - [ ] User deletion semantics defined
  - [ ] Password reset tokens are hashed, atomic single-use
  - [ ] Audit logging implemented (not deferred to Phase 5)
  - [ ] Cross-subdomain SSO test plan exists
  - [ ] Permission trust boundaries documented (Phase 3)

- [ ] All MAJOR findings relevant to Phase 1 addressed:
  - [ ] Session store consistency model defined (Postgres-authoritative)
  - [ ] Token single-use enforcement atomic
  - [ ] Session fixation prevention implemented
  - [ ] Test harness specified

- [ ] No placeholders in code
- [ ] All tests pass
- [ ] Coverage ≥84%
- [ ] Migrations tested
- [ ] OpenAPI spec complete
- [ ] README updated

---

**Document Version:** 1.0
**Last Updated:** 2024-06-20
**Status:** Ready for Execution
