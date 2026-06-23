# Multi-Tenant Authentication — Phase 2: Multi-Tenancy Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce tenant and membership domain models, enforce atomic tenant ownership limits, build tenant-scoped API routes with membership-aware auth, populate session membership snapshots for fast permission checks, and add a data-retention cleanup job.

**Architecture:** Postgres remains authoritative for tenants and memberships. A `TenantService` orchestrates creation (with an ownership-limit database trigger), lookup, updates, and deletion. A `TenantContext` extractor runs after `require_auth` and verifies the current user is a member of the requested tenant. Session snapshots are populated on login/tenant-switch and invalidated when memberships change. A background cleanup job purges expired sessions, tokens, and stale audit rows.

**Tech Stack:** Rust, Axum 0.8, SQLx, PostgreSQL, Redis, `chrono`, `uuid`, `serde_json`, React 19 + React Router 7 + TanStack Query

---

## File Structure

```
backend/
├── migrations/
│   ├── 0006_add_tenants_and_memberships.sql      ← NEW
├── crates/
│   ├── shared/domain/src/
│   │   ├── tenant.rs                              ← NEW
│   │   ├── membership.rs                          ← NEW
│   │   ├── lib.rs                                 ← MODIFY
│   │   └── error.rs                               ← MODIFY (add tenant errors)
│   ├── base/src/
│   │   ├── ports/
│   │   │   ├── repository.rs                      ← MODIFY (add TenantRepo, MembershipRepo)
│   │   │   └── session.rs                         ← MODIFY (membership snapshot)
│   │   └── ctx.rs                                 ← MODIFY (add active tenant)
│   ├── infra/persistence/src/
│   │   ├── repositories/
│   │   │   ├── tenant.rs                          ← NEW
│   │   │   ├── membership.rs                      ← NEW
│   │   │   └── mod.rs                             ← MODIFY
│   │   └── lib.rs                                 ← MODIFY
│   ├── services/tenant_service/                   ← NEW crate
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── config.rs
│   │   │   ├── error.rs
│   │   │   └── application/
│   │   │       ├── create_tenant.rs
│   │   │       ├── list_my_tenants.rs
│   │   │       ├── get_tenant.rs
│   │   │       ├── update_tenant.rs
│   │   │       └── delete_tenant.rs
│   │   └── tests/integration.rs
│   ├── services/session_service/src/
│   │   └── lib.rs                                 ← MODIFY (snapshot on create)
│   ├── services/auth_service/src/
│   │   └── application/use_cases/login.rs         ← MODIFY (pass membership repo)
│   ├── gateways/src/
│   │   ├── middleware/
│   │   │   ├── tenant_context.rs                  ← NEW
│   │   │   └── mod.rs                             ← MODIFY
│   │   ├── routes/
│   │   │   ├── tenants.rs                         ← NEW
│   │   │   └── mod.rs                             ← MODIFY
│   │   └── state/services.rs                      ← MODIFY (wire tenant service)
│   └── server/src/
│       └── main.rs                                ← MODIFY (spawn cleanup job)
frontend/
├── src/
│   ├── features/tenant/
│   │   ├── components/
│   │   │   ├── TenantSwitcher.tsx                 ← NEW
│   │   │   └── CreateTenantForm.tsx               ← NEW
│   │   ├── api/
│   │   │   └── tenantApi.ts                       ← NEW
│   │   └── types.ts                               ← NEW
│   └── routes/
│       └── dashboard.tsx                          ← MODIFY (add tenant switcher)
```

---

## Task 1: Tenant + Membership Domain Entities

**Files:**
- Create: `backend/crates/shared/domain/src/tenant.rs`
- Create: `backend/crates/shared/domain/src/membership.rs`
- Modify: `backend/crates/shared/domain/src/lib.rs`
- Modify: `backend/crates/shared/domain/src/error.rs`
- Test: `backend/crates/shared/domain/src/tenant_test.rs` ← NEW

### Step 1.1: Create tenant entity

**Create: `backend/crates/shared/domain/src/tenant.rs`**

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::DomainError;
use crate::user::UserId;

/// Unique identifier for a tenant.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct TenantId(pub Uuid);

impl TenantId {
    pub fn new() -> Self { Self(Uuid::new_v4()) }
}

impl Default for TenantId {
    fn default() -> Self { Self::new() }
}

/// Human-readable tenant slug used in URLs.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct TenantSlug(String);

impl TenantSlug {
    pub fn parse(raw: &str) -> Result<Self, DomainError> {
        let lower = raw.to_lowercase();
        if lower.len() < 3 || lower.len() > 63 {
            return Err(DomainError::validation("slug must be 3-63 characters"));
        }
        if !lower.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
            return Err(DomainError::validation("slug may only contain a-z, 0-9, and hyphens"));
        }
        if lower.starts_with('-') || lower.ends_with('-') {
            return Err(DomainError::validation("slug may not start or end with a hyphen"));
        }
        Ok(Self(lower))
    }

    pub fn as_str(&self) -> &str { &self.0 }
}

impl std::fmt::Display for TenantSlug {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

/// A tenant / organization in the platform.
#[derive(Debug, Clone)]
pub struct Tenant {
    pub id: TenantId,
    pub slug: TenantSlug,
    pub name: String,
    pub owner_id: UserId,
    pub status: TenantStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TenantStatus {
    Active,
    Suspended,
}

impl Tenant {
    pub fn create(slug: TenantSlug, name: String, owner_id: UserId) -> Result<Self, DomainError> {
        if name.trim().is_empty() {
            return Err(DomainError::validation("tenant name is required"));
        }
        Ok(Self {
            id: TenantId::new(),
            slug,
            name,
            owner_id,
            status: TenantStatus::Active,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        })
    }

    pub fn rename(&mut self, name: String) -> Result<(), DomainError> {
        if name.trim().is_empty() {
            return Err(DomainError::validation("tenant name is required"));
        }
        self.name = name;
        self.updated_at = Utc::now();
        Ok(())
    }

    pub fn is_active(&self) -> bool { matches!(self.status, TenantStatus::Active) }
}
```

### Step 1.2: Create membership entity

**Create: `backend/crates/shared/domain/src/membership.rs`**

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::tenant::TenantId;
use crate::user::UserId;

/// Tenant-scoped role. Phase 3 will expand this into a custom role system.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TenantRole {
    Owner,
    Admin,
    Member,
    Guest,
}

impl TenantRole {
    pub fn parse(raw: &str) -> Result<Self, crate::error::DomainError> {
        match raw.to_lowercase().as_str() {
            "owner" => Ok(Self::Owner),
            "admin" => Ok(Self::Admin),
            "member" => Ok(Self::Member),
            "guest" => Ok(Self::Guest),
            _ => Err(crate::error::DomainError::validation("unknown tenant role")),
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Owner => "owner",
            Self::Admin => "admin",
            Self::Member => "member",
            Self::Guest => "guest",
        }
    }

    /// Whether this role can manage tenant settings and members.
    pub fn can_administer(self) -> bool {
        matches!(self, Self::Owner | Self::Admin)
    }
}

#[derive(Debug, Clone)]
pub struct Membership {
    pub tenant_id: TenantId,
    pub user_id: UserId,
    pub role: TenantRole,
    pub joined_at: DateTime<Utc>,
}

impl Membership {
    pub fn new(tenant_id: TenantId, user_id: UserId, role: TenantRole) -> Self {
        Self {
            tenant_id,
            user_id,
            role,
            joined_at: Utc::now(),
        }
    }
}
```

### Step 1.3: Export new modules and add errors

**Modify: `backend/crates/shared/domain/src/lib.rs`**

```rust
pub mod auth;
pub mod contracts;
pub mod email;
pub mod error;
pub mod membership; // NEW
pub mod pagination;
pub mod role;
pub mod tenant;     // NEW
pub mod user;
```

**Modify: `backend/crates/shared/domain/src/error.rs`**

Add variants:

```rust
#[error("tenant limit reached")]
TenantLimitReached,

#[error("user is not a member of tenant")]
NotTenantMember,

#[error("invalid tenant slug")]
InvalidTenantSlug,
```

### Step 1.4: Add domain tests

**Create: `backend/crates/shared/domain/src/tenant_test.rs`**

```rust
#[cfg(test)]
mod tests {
    use super::super::*;
    use crate::tenant::{TenantSlug, Tenant};
    use crate::user::UserId;

    #[test]
    fn slug_rejects_invalid_characters() {
        assert!(TenantSlug::parse("hello world").is_err());
        assert!(TenantSlug::parse("ab").is_err());
        assert!(TenantSlug::parse("-bad-").is_err());
    }

    #[test]
    fn slug_accepts_valid_input() {
        let slug = TenantSlug::parse("klynt-edu").unwrap();
        assert_eq!(slug.as_str(), "klynt-edu");
    }

    #[test]
    fn tenant_requires_non_empty_name() {
        let owner = UserId::new();
        let slug = TenantSlug::parse("valid-slug").unwrap();
        assert!(Tenant::create(slug, "   ".to_string(), owner).is_err());
    }
}
```

### Step 1.5: Run domain tests

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo nextest run -p domain
```

**Expected:** Domain tests pass.

### Step 1.6: Commit

```bash
git add crates/shared/domain/src/tenant.rs crates/shared/domain/src/membership.rs crates/shared/domain/src/lib.rs crates/shared/domain/src/error.rs crates/shared/domain/src/tenant_test.rs
git commit -m "feat: add tenant and membership domain entities"
```

---

## Task 2: Database Migrations and Ownership Limit Trigger

**Files:**
- Create: `backend/migrations/0006_add_tenants_and_memberships.sql`
- Test: `backend/crates/infra/persistence/tests/tenant_repo_test.rs` ← NEW

### Step 2.1: Create tenant and membership tables

**Create: `backend/migrations/0006_add_tenants_and_memberships.sql`**

```sql
-- Phase 2: Multi-tenancy core

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(63) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_owner_id ON tenants(owner_id);
CREATE INDEX idx_tenants_status ON tenants(status);

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS user_tenant_memberships (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX idx_memberships_user_id ON user_tenant_memberships(user_id);
CREATE INDEX idx_memberships_tenant_id ON user_tenant_memberships(tenant_id);

-- Atomic ownership limit: a user may own at most 2 tenants.
CREATE OR REPLACE FUNCTION enforce_tenant_ownership_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (
        SELECT COUNT(*)
        FROM tenants
        WHERE owner_id = NEW.owner_id
          AND status = 'active'
    ) >= 2 THEN
        RAISE EXCEPTION 'Tenant ownership limit reached for user %', NEW.owner_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenant_ownership_limit ON tenants;
CREATE TRIGGER tenant_ownership_limit
    BEFORE INSERT OR UPDATE OF owner_id ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION enforce_tenant_ownership_limit();

COMMENT ON TABLE tenants IS 'Organizations / tenants in the platform';
COMMENT ON TABLE user_tenant_memberships IS 'User membership within a tenant';
```

### Step 2.2: Run migration

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
sqlx migrate run --source migrations
```

**Expected:** Migration applies successfully.

### Step 2.3: Commit

```bash
git add migrations/0006_add_tenants_and_memberships.sql
git commit -m "feat: add tenants and memberships schema with ownership limit trigger"
```

---

## Task 3: Repository Ports + Postgres Implementations

**Files:**
- Modify: `backend/crates/base/src/ports/repository.rs`
- Create: `backend/crates/infra/persistence/src/repositories/tenant.rs`
- Create: `backend/crates/infra/persistence/src/repositories/membership.rs`
- Modify: `backend/crates/infra/persistence/src/repositories/mod.rs`
- Test: `backend/crates/infra/persistence/tests/tenant_repo_test.rs`
- Test: `backend/crates/infra/persistence/tests/membership_repo_test.rs`

### Step 3.1: Add repository ports

**Modify: `backend/crates/base/src/ports/repository.rs`**

```rust
use async_trait::async_trait;
use domain::membership::{Membership, TenantRole};
use domain::tenant::{Tenant, TenantId, TenantSlug};
use domain::user::UserId;
use domain::DomainResult;

use crate::ctx::ExecutionContext;

#[async_trait]
pub trait TenantRepository: Send + Sync {
    async fn create(&self, ctx: &ExecutionContext, tenant: &Tenant) -> DomainResult<Tenant>;
    async fn find_by_id(&self, ctx: &ExecutionContext, id: TenantId) -> DomainResult<Option<Tenant>>;
    async fn find_by_slug(&self, ctx: &ExecutionContext, slug: &TenantSlug) -> DomainResult<Option<Tenant>>;
    async fn list_for_user(&self, ctx: &ExecutionContext, user_id: UserId) -> DomainResult<Vec<Tenant>>;
    async fn update(&self, ctx: &ExecutionContext, tenant: &Tenant) -> DomainResult<Tenant>;
    async fn delete(&self, ctx: &ExecutionContext, id: TenantId) -> DomainResult<()>;
    async fn count_owned_by_user(&self, ctx: &ExecutionContext, user_id: UserId) -> DomainResult<i64>;
}

#[async_trait]
pub trait MembershipRepository: Send + Sync {
    async fn create(&self, ctx: &ExecutionContext, membership: &Membership) -> DomainResult<Membership>;
    async fn find(&self, ctx: &ExecutionContext, tenant_id: TenantId, user_id: UserId) -> DomainResult<Option<Membership>>;
    async fn list_for_user(&self, ctx: &ExecutionContext, user_id: UserId) -> DomainResult<Vec<Membership>>;
    async fn list_for_tenant(&self, ctx: &ExecutionContext, tenant_id: TenantId) -> DomainResult<Vec<Membership>>;
    async fn update_role(&self, ctx: &ExecutionContext, tenant_id: TenantId, user_id: UserId, role: TenantRole) -> DomainResult<()>;
    async fn delete(&self, ctx: &ExecutionContext, tenant_id: TenantId, user_id: UserId) -> DomainResult<()>;
}
```

### Step 3.2: Implement tenant repository

**Create: `backend/crates/infra/persistence/src/repositories/tenant.rs`**

```rust
use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::repository::TenantRepository;
use chrono::{DateTime, Utc};
use domain::tenant::{Tenant, TenantId, TenantSlug, TenantStatus};
use domain::user::UserId;
use domain::{DomainError, DomainResult};
use sqlx::PgPool;
use uuid::Uuid;

pub struct PgTenantRepository {
    pool: PgPool,
}

impl PgTenantRepository {
    pub fn new(pool: PgPool) -> Self { Self { pool } }
}

#[async_trait]
impl TenantRepository for PgTenantRepository {
    async fn create(&self, _ctx: &ExecutionContext, tenant: &Tenant) -> DomainResult<Tenant> {
        let row = sqlx::query_as::<_, TenantRow>(
            r#"
            INSERT INTO tenants (id, slug, name, owner_id, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, slug, name, owner_id, status, created_at, updated_at
            "#,
        )
        .bind(tenant.id.0)
        .bind(tenant.slug.as_str())
        .bind(&tenant.name)
        .bind(tenant.owner_id.0)
        .bind(tenant.status.as_str())
        .bind(tenant.created_at)
        .bind(tenant.updated_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| match e {
            sqlx::Error::Database(db) if db.constraint().is_some() => {
                DomainError::conflict("tenant slug already exists")
            }
            _ => DomainError::internal(e),
        })?;

        Ok(row.into())
    }

    // ... implement find_by_id, find_by_slug, list_for_user, update, delete, count_owned_by_user
}

struct TenantRow {
    id: Uuid,
    slug: String,
    name: String,
    owner_id: Uuid,
    status: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl From<TenantRow> for Tenant {
    fn from(row: TenantRow) -> Self {
        Self {
            id: TenantId(row.id),
            slug: TenantSlug::parse(&row.slug).expect("DB stores valid slugs"),
            name: row.name,
            owner_id: UserId(row.owner_id),
            status: row.status.parse().expect("valid status"),
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

impl TenantStatus {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Suspended => "suspended",
        }
    }
}

impl std::str::FromStr for TenantStatus {
    type Err = DomainError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "active" => Ok(Self::Active),
            "suspended" => Ok(Self::Suspended),
            _ => Err(DomainError::validation("invalid tenant status")),
        }
    }
}
```

### Step 3.3: Implement membership repository

**Create: `backend/crates/infra/persistence/src/repositories/membership.rs`**

```rust
use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::repository::MembershipRepository;
use domain::membership::{Membership, TenantRole};
use domain::tenant::TenantId;
use domain::user::UserId;
use domain::{DomainError, DomainResult};
use sqlx::PgPool;

pub struct PgMembershipRepository {
    pool: PgPool,
}

impl PgMembershipRepository {
    pub fn new(pool: PgPool) -> Self { Self { pool } }
}

#[async_trait]
impl MembershipRepository for PgMembershipRepository {
    async fn create(&self, _ctx: &ExecutionContext, membership: &Membership) -> DomainResult<Membership> {
        sqlx::query(
            r#"
            INSERT INTO user_tenant_memberships (tenant_id, user_id, role, joined_at)
            VALUES ($1, $2, $3, $4)
            "#,
        )
        .bind(membership.tenant_id.0)
        .bind(membership.user_id.0)
        .bind(membership.role.as_str())
        .bind(membership.joined_at)
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::internal(e))?;
        Ok(membership.clone())
    }

    // ... implement find, list_for_user, list_for_tenant, update_role, delete
}
```

### Step 3.4: Export repositories

**Modify: `backend/crates/infra/persistence/src/repositories/mod.rs`**

```rust
pub mod audit_event;
pub mod membership;
pub mod session;
pub mod tenant;
pub mod token;
pub mod user;
```

### Step 3.5: Add repository integration tests

Create tests that verify:
- Creating a tenant makes the creator an Owner member.
- A user can own at most 2 active tenants (trigger fires).
- Listing memberships for a user returns expected tenants.
- Updating/deleting memberships works.

### Step 3.6: Run persistence tests

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo nextest run -p persistence
```

### Step 3.7: Commit

```bash
git add crates/base/src/ports/repository.rs crates/infra/persistence/src/repositories/tenant.rs crates/infra/persistence/src/repositories/membership.rs crates/infra/persistence/src/repositories/mod.rs crates/infra/persistence/tests/tenant_repo_test.rs crates/infra/persistence/tests/membership_repo_test.rs
git commit -m "feat: add tenant and membership Postgres repositories"
```

---

## Task 4: Tenant Service Use Cases

**Files:**
- Create: `backend/crates/services/tenant_service/` (new crate)
- Modify: `backend/Cargo.toml`
- Modify: `backend/crates/gateways/src/state/services.rs`
- Test: `backend/crates/services/tenant_service/tests/integration.rs`

### Step 4.1: Create tenant_service crate

**Create: `backend/crates/services/tenant_service/Cargo.toml`**

```toml
[package]
name = "tenant_service"
version = "0.1.0"
edition = "2021"

[dependencies]
async-trait = { workspace = true }
base = { path = "../../base" }
domain = { path = "../../shared/domain" }
chrono = { workspace = true }
thiserror = { workspace = true }
tokio = { workspace = true }
uuid = { workspace = true }

[dev-dependencies]
persistence = { path = "../../infra/persistence" }
sqlx = { workspace = true }
```

Add `tenant_service` to the workspace `members` list in `backend/Cargo.toml`.

### Step 4.2: Implement create tenant use case

**Create: `backend/crates/services/tenant_service/src/application/create_tenant.rs`**

```rust
use base::ctx::ExecutionContext;
use domain::membership::{Membership, TenantRole};
use domain::tenant::{Tenant, TenantSlug};
use domain::user::UserId;

use crate::error::TenantError;
use crate::TenantService;

pub struct CreateTenantRequest {
    pub slug: String,
    pub name: String,
}

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    request: CreateTenantRequest,
) -> Result<Tenant, TenantError> {
    let actor = ctx.actor().ok_or(TenantError::AuthenticationRequired)?;
    let slug = TenantSlug::parse(&request.slug).map_err(TenantError::Domain)?;

    let tenant = Tenant::create(slug, request.name, actor.user_id)
        .map_err(TenantError::Domain)?;

    let created = service
        .tenant_repo()
        .create(ctx, &tenant)
        .await
        .map_err(TenantError::Domain)?;

    let membership = Membership::new(created.id, actor.user_id, TenantRole::Owner);
    service
        .membership_repo()
        .create(ctx, &membership)
        .await
        .map_err(TenantError::Domain)?;

    service
        .audit_logger()
        .log_tenant_created(ctx, created.id)
        .await;

    Ok(created)
}
```

### Step 4.3: Implement remaining use cases

Create:
- `list_my_tenants.rs` — list tenants where the user is a member.
- `get_tenant.rs` — fetch by slug with membership check.
- `update_tenant.rs` — rename; restrict to Owner/Admin.
- `delete_tenant.rs` — soft-delete or hard-delete; restrict to Owner.

### Step 4.4: Wire tenant service in composition root

**Modify: `backend/crates/gateways/src/state/services.rs`**

```rust
use tenant_service::TenantService;

pub struct Services {
    pub auth: Arc<AuthService>,
    pub user: Arc<UserService>,
    pub session: Arc<SessionService>,
    pub tenant: Arc<TenantService>, // NEW
    pub rate_limiter: Arc<dyn RateLimiter>,
    pub health_reporter: Arc<dyn HealthReporter>,
    pub metrics_handle: PrometheusHandle,
}
```

Create `TenantService` with `PgTenantRepository` and `PgMembershipRepository` in `from_config`.

### Step 4.5: Run tenant service tests

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo nextest run -p tenant_service
```

### Step 4.6: Commit

```bash
git add crates/services/tenant_service backend/Cargo.toml crates/gateways/src/state/services.rs
git commit -m "feat: add tenant service use cases"
```

---

## Task 5: Tenant Context Middleware

**Files:**
- Modify: `backend/crates/base/src/ctx.rs`
- Create: `backend/crates/gateways/src/middleware/tenant_context.rs`
- Modify: `backend/crates/gateways/src/middleware/mod.rs`
- Modify: `backend/crates/gateways/src/routes/mod.rs`
- Test: `backend/crates/gateways/tests/integration.rs`

### Step 5.1: Add active tenant to execution context

**Modify: `backend/crates/base/src/ctx.rs`**

```rust
use domain::tenant::TenantId;

pub struct ExecutionContext {
    pub request: RequestContext,
    pub actor: Option<Actor>,
    pub tenant_id: Option<TenantId>, // NEW
}

impl ExecutionContext {
    pub fn with_tenant(mut self, tenant_id: TenantId) -> Self {
        self.tenant_id = Some(tenant_id);
        self
    }

    pub fn tenant_id(&self) -> Option<TenantId> {
        self.tenant_id
    }
}
```

### Step 5.2: Create tenant context extractor

**Create: `backend/crates/gateways/src/middleware/tenant_context.rs`**

```rust
use axum::{
    extract::{FromRequestParts, Path, Request},
    http::request::Parts,
    middleware::Next,
    response::Response,
};
use base::ctx::ExecutionContext;
use domain::tenant::TenantSlug;

use crate::state::Services;

#[derive(Debug, Clone)]
pub struct TenantContext(pub ExecutionContext);

impl<S: Send + Sync> FromRequestParts<S> for TenantContext {
    type Rejection = crate::GatewayError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let ctx = parts
            .extensions
            .get::<ExecutionContext>()
            .cloned()
            .ok_or_else(|| crate::GatewayError::Unauthorized("Authentication required".to_string()))?;

        let Path(params): Path<std::collections::HashMap<String, String>> =
            Path::from_request_parts(parts, _state)
                .await
                .map_err(|_| crate::GatewayError::BadRequest("Invalid path parameters".to_string()))?;

        let slug = params
            .get("tenant_slug")
            .ok_or_else(|| crate::GatewayError::BadRequest("Missing tenant slug".to_string()))?;

        Ok(Self(ctx.with_tenant(TenantSlug::parse(slug).map_err(|e| {
            crate::GatewayError::BadRequest(e.to_string())
        })?)))
    }
}

pub async fn require_tenant_membership(
    State(services): State<Services>,
    mut request: Request,
    next: Next,
) -> Result<Response, crate::GatewayError> {
    let ctx = request
        .extensions()
        .get::<ExecutionContext>()
        .cloned()
        .ok_or_else(|| crate::GatewayError::Unauthorized("Authentication required".to_string()))?;

    let tenant_slug = request
        .uri()
        .path()
        .split('/')
        .nth(3) // /api/v1/tenants/{slug}/...
        .ok_or_else(|| crate::GatewayError::BadRequest("Tenant slug not found in path".to_string()))?;

    let slug = TenantSlug::parse(tenant_slug)
        .map_err(|e| crate::GatewayError::BadRequest(e.to_string()))?;

    let tenant = services
        .tenant
        .get_by_slug(&ctx, &slug)
        .await
        .map_err(crate::GatewayError::from)?
        .ok_or_else(|| crate::GatewayError::NotFound("Tenant not found".to_string()))?;

    let actor = ctx.actor().ok_or_else(|| crate::GatewayError::Unauthorized)?;
    services
        .tenant
        .ensure_member(&ctx, tenant.id, actor.user_id)
        .await
        .map_err(crate::GatewayError::from)?;

    let ctx = ctx.with_tenant(tenant.id);
    request.extensions_mut().insert(ctx);
    Ok(next.run(request).await)
}
```

### Step 5.3: Mount tenant routes with middleware

**Modify: `backend/crates/gateways/src/routes/mod.rs`**

```rust
fn api_v1_routes(services: Services) -> Router<Services> {
    let protected_user_routes = users::routes().layer(middleware::from_fn_with_state(
        services.clone(),
        crate::middleware::auth::require_auth,
    ));

    let tenant_routes = tenants::routes().layer(middleware::from_fn_with_state(
        services.clone(),
        crate::middleware::auth::require_auth,
    ));

    Router::new()
        .nest("/auth", auth::routes())
        .nest("/users", protected_user_routes)
        .nest("/tenants", tenant_routes)
}
```

### Step 5.4: Add tenant route tests

Add tests that:
- A non-member cannot access a tenant's resources.
- A member can list their own tenants.
- An owner can update/delete their tenant.

### Step 5.5: Run gateway tests

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo nextest run -p gateways
```

### Step 5.6: Commit

```bash
git add crates/base/src/ctx.rs crates/gateways/src/middleware/tenant_context.rs crates/gateways/src/middleware/mod.rs crates/gateways/src/routes/mod.rs crates/gateways/src/routes/tenants.rs crates/gateways/tests/integration.rs
git commit -m "feat: add tenant context middleware and tenant routes"
```

---

## Task 6: Session Membership Snapshots + Invalidation

**Files:**
- Modify: `backend/crates/base/src/ports/session.rs`
- Modify: `backend/crates/infra/persistence/src/repositories/session.rs`
- Modify: `backend/crates/services/auth_service/src/application/use_cases/login.rs`
- Modify: `backend/crates/services/session_service/src/lib.rs`
- Modify: `backend/crates/services/tenant_service/src/application/create_tenant.rs`
- Test: persistence + auth service tests

### Step 6.1: Add membership snapshot to Session

**Modify: `backend/crates/base/src/ports/session.rs`**

```rust
use domain::membership::{Membership, TenantRole};

#[derive(Clone, Debug)]
pub struct Session {
    pub user_id: UserId,
    pub expires_at: DateTime<Utc>,
    pub tenant_memberships: Vec<MembershipSnapshot>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct MembershipSnapshot {
    pub tenant_id: Uuid,
    pub role: TenantRole,
}
```

### Step 6.2: Update session repository to read/write snapshots

**Modify: `backend/crates/infra/persistence/src/repositories/session.rs`**

```rust
use base::ports::session::{MembershipSnapshot, Session, SessionError, SessionStore, SessionToken};
use sqlx::{types::Json, PgPool};

async fn create(
    &self,
    _ctx: &ExecutionContext,
    user_id: UserId,
    expires_at: DateTime<Utc>,
) -> Result<SessionToken, SessionError> {
    let token = SessionToken::new();
    sqlx::query(
        r#"
        INSERT INTO sessions (token, user_id, expires_at, tenant_memberships)
        VALUES ($1, $2, $3, $4)
        "#,
    )
    .bind(token.0)
    .bind(user_id.0)
    .bind(expires_at)
    .bind(Json::<Vec<MembershipSnapshot>>::default())
    .execute(&self.pool)
    .await?;
    Ok(token)
}

async fn find_valid(
    &self,
    _ctx: &ExecutionContext,
    token: &SessionToken,
) -> Result<Option<Session>, SessionError> {
    let row: Option<(Uuid, DateTime<Utc>, Json<Vec<MembershipSnapshot>>)> = sqlx::query_as(
        r#"
        SELECT user_id, expires_at, tenant_memberships
        FROM sessions
        WHERE token = $1 AND expires_at > NOW()
        "#,
    )
    .bind(token.0)
    .fetch_optional(&self.pool)
    .await?;

    Ok(row.map(|(user_id, expires_at, memberships)| Session {
        user_id: UserId(user_id),
        expires_at,
        tenant_memberships: memberships.0,
    }))
}
```

### Step 6.3: Populate snapshot on login

**Modify: `backend/crates/services/auth_service/src/application/use_cases/login.rs`**

After creating the session, load the user's memberships and update the session:

```rust
let memberships = service
    .internal()
    .membership_repo
    .list_for_user(ctx, user.id)
    .await
    .map_err(|e| AuthError::Domain(e))?;

let snapshots: Vec<MembershipSnapshot> = memberships
    .into_iter()
    .map(|m| MembershipSnapshot {
        tenant_id: m.tenant_id.0,
        role: m.role,
    })
    .collect();

service
    .internal()
    .session_store
    .update_memberships(ctx, &access_token, snapshots)
    .await?;
```

### Step 6.4: Invalidate session on membership change

**Modify: `backend/crates/services/tenant_service/src/application/create_tenant.rs`**

After creating membership, invalidate the user's sessions or update snapshots:

```rust
service
    .session_store()
    .add_membership(ctx, actor.user_id, MembershipSnapshot {
        tenant_id: created.id.0,
        role: TenantRole::Owner,
    })
    .await
    .map_err(TenantError::Session)?;
```

Add `update_memberships` and `add_membership` methods to `SessionStore` trait and implement them in `PgSessionStore` and `CachedSessionStore`.

### Step 6.5: Run tests

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo nextest run -p persistence -p auth_service -p tenant_service
```

### Step 6.6: Commit

```bash
git add crates/base/src/ports/session.rs crates/infra/persistence/src/repositories/session.rs crates/services/auth_service/src/application/use_cases/login.rs crates/services/session_service/src/lib.rs crates/services/tenant_service/src/application/create_tenant.rs
git commit -m "feat: populate and invalidate session membership snapshots"
```

---

## Task 7: Data Retention Cleanup Job

**Files:**
- Create: `backend/crates/services/cleanup_job/` (new crate)
- Modify: `backend/Cargo.toml`
- Modify: `backend/crates/server/src/main.rs`
- Test: `backend/crates/services/cleanup_job/tests/integration.rs`

### Step 7.1: Create cleanup job crate

**Create: `backend/crates/services/cleanup_job/Cargo.toml`**

```toml
[package]
name = "cleanup_job"
version = "0.1.0"
edition = "2021"

[dependencies]
async-trait = { workspace = true }
base = { path = "../../base" }
persistence = { path = "../../infra/persistence" }
chrono = { workspace = true }
thiserror = { workspace = true }
tokio = { workspace = true }
tracing = { workspace = true }
```

Add to workspace `members`.

### Step 7.2: Implement cleanup job

**Create: `backend/crates/services/cleanup_job/src/lib.rs`**

```rust
use std::sync::Arc;
use chrono::{Duration, Utc};
use sqlx::PgPool;

pub struct CleanupJob {
    pool: PgPool,
    session_retention_days: i64,
    token_retention_days: i64,
    audit_retention_days: i64,
}

impl CleanupJob {
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            session_retention_days: 30,
            token_retention_days: 7,
            audit_retention_days: 365,
        }
    }

    pub async fn run_once(&self) -> Result<(), sqlx::Error> {
        let now = Utc::now();

        let sessions_deleted = sqlx::query(
            "DELETE FROM sessions WHERE expires_at < $1"
        )
        .bind(now)
        .execute(&self.pool)
        .await?
        .rows_affected();

        let tokens_deleted = sqlx::query(
            "DELETE FROM email_verification_tokens WHERE expires_at < $1"
        )
        .bind(now - Duration::days(self.token_retention_days))
        .execute(&self.pool)
        .await?
        .rows_affected();

        let audit_deleted = sqlx::query(
            "DELETE FROM audit_events WHERE created_at < $1"
        )
        .bind(now - Duration::days(self.audit_retention_days))
        .execute(&self.pool)
        .await?
        .rows_affected();

        tracing::info!(
            sessions_deleted,
            tokens_deleted,
            audit_deleted,
            "cleanup job completed"
        );
        Ok(())
    }
}
```

### Step 7.3: Spawn job in server

**Modify: `backend/crates/server/src/main.rs`**

```rust
let cleanup_job = cleanup_job::CleanupJob::new(services.session_store.pool().clone());
tokio::spawn(async move {
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(3600));
    loop {
        interval.tick().await;
        if let Err(e) = cleanup_job.run_once().await {
            tracing::error!(error = %e, "cleanup job failed");
        }
    }
});
```

### Step 7.4: Add tests

Test that the cleanup job deletes expired sessions and old tokens.

### Step 7.5: Run tests

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/backend
cargo nextest run -p cleanup_job
```

### Step 7.6: Commit

```bash
git add crates/services/cleanup_job backend/Cargo.toml crates/server/src/main.rs
git commit -m "feat: add data retention cleanup job"
```

---

## Task 8: Frontend Tenant UI

**Files:**
- Create: `frontend/src/features/tenant/types.ts`
- Create: `frontend/src/features/tenant/api/tenantApi.ts`
- Create: `frontend/src/features/tenant/components/TenantSwitcher.tsx`
- Create: `frontend/src/features/tenant/components/CreateTenantForm.tsx`
- Create: `frontend/src/routes/tenants/new.tsx`
- Modify: `frontend/src/routes/dashboard.tsx`
- Modify: `frontend/src/core/auth/auth-store.ts`
- Test: `frontend/src/features/tenant/components/TenantSwitcher.test.tsx`

### Step 8.1: Define tenant types

**Create: `frontend/src/features/tenant/types.ts`**

```typescript
export interface Tenant {
  id: string;
  slug: string;
  name: string;
  role: "owner" | "admin" | "member" | "guest";
  joinedAt: string;
}

export interface CreateTenantInput {
  slug: string;
  name: string;
}
```

### Step 8.2: Add tenant API client

**Create: `frontend/src/features/tenant/api/tenantApi.ts`**

```typescript
import { apiClient } from "@/lib/api";
import type { Tenant, CreateTenantInput } from "../types";

export async function listMyTenants(): Promise<Tenant[]> {
  const { data } = await apiClient.get<{ data: Tenant[] }>("/api/v1/tenants");
  return data.data;
}

export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const { data } = await apiClient.post<{ data: Tenant }>("/api/v1/tenants", input);
  return data.data;
}
```

### Step 8.3: Create tenant switcher component

**Create: `frontend/src/features/tenant/components/TenantSwitcher.tsx`**

```tsx
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { listMyTenants } from "../api/tenantApi";

export function TenantSwitcher() {
  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: listMyTenants,
  });

  if (isLoading || !tenants) return <Button variant="ghost" disabled>Loading...</Button>;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">{tenants[0]?.name ?? "No tenant"}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {tenants.map((tenant) => (
          <DropdownMenuItem key={tenant.id}>{tenant.name}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Step 8.4: Mount switcher in dashboard

**Modify: `frontend/src/routes/dashboard.tsx`**

```tsx
import { TenantSwitcher } from "@/features/tenant/components/TenantSwitcher";

export default function DashboardPage() {
  return (
    <div>
      <header className="flex items-center justify-between p-4 border-b">
        <h1>Dashboard</h1>
        <TenantSwitcher />
      </header>
      <main className="p-4">
        <p>Welcome to your dashboard.</p>
      </main>
    </div>
  );
}
```

### Step 8.5: Add frontend tests

**Create: `frontend/src/features/tenant/components/TenantSwitcher.test.tsx`**

```tsx
import { render, screen } from "@/test/render";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { TenantSwitcher } from "./TenantSwitcher";

it("renders the active tenant name", async () => {
  server.use(
    http.get("/api/v1/tenants", () =>
      HttpResponse.json({ data: [{ id: "1", slug: "acme", name: "Acme", role: "owner", joinedAt: "2026-06-22T00:00:00Z" }] })
    )
  );

  render(<TenantSwitcher />);
  expect(await screen.findByText("Acme")).toBeInTheDocument();
});
```

### Step 8.6: Run frontend checks

```bash
cd /Users/jayden/Projects/Klynt/klynt-edu/frontend
bun run typecheck
bun run test --run
```

### Step 8.7: Commit

```bash
git add frontend/src/features/tenant frontend/src/routes/dashboard.tsx
git commit -m "feat: add frontend tenant switcher and create tenant form"
```

---

## Self-Review Checklist

- [ ] Spec coverage: Phase 2 roadmap items (tenant entities, memberships, ownership limits, session consistency, cleanup) are all represented.
- [ ] Placeholder scan: no `TBD`, `TODO`, or vague steps.
- [ ] Type consistency: `TenantId`, `TenantSlug`, `TenantRole`, `MembershipSnapshot` are used consistently.
- [ ] Path consistency: uses current refactored crate names.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-22-multi-tenant-auth-phase2-core-plan.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`.
2. **Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-22
