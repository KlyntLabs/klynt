# Cleanup Plan: Removing Legacy Monolithic Crates

**Goal**: Remove old monolithic crates that have been superseded by the service-oriented architecture.

**Prerequisites**: Phases 1-4 complete — services and gateway operational.

**Estimated Time**: 3-5 days

---

## Overview

The old crates are still present but no longer needed. This plan removes them systematically while maintaining functionality.

### Current State

```
backend/crates/
├── ✅ Services (NEW)
│   ├── auth_service/
│   └── user_service/
├── ✅ Gateway (NEW)
│   └── api_gateway/
├── ✅ Foundation (NEW)
│   ├── core/klynt_core/
│   ├── shared/
│   └── infrastructure/
└── ❌ Legacy (TO REMOVE)
    ├── klynt-domain/          → Minimize
    ├── klynt-application/     → Delete
    ├── klynt-api/            → Delete
    ├── klynt-infrastructure/  → Keep (minimal, shared only)
    └── klynt-server/         → Keep (minimal entry point)
```

### Dependencies Analysis

```
klynt-domain
  ↑ (used by)
  ├── klynt-application
  ├── klynt-api
  ├── klynt-server
  ├── klynt-infrastructure
  └── services (via adapters)

klynt-application
  ↑ (used by)
  └── api_gateway (only AuditService!)

klynt-api
  ↑ (used by)
  └── (nothing - can delete immediately)
```

---

## Step 1: Extract Audit Service (Day 1)

**Why**: `api_gateway` depends on `klynt-application` only for `AuditService`.

**Current location**: `klynt-application/src/audit.rs`

**Target**: Create shared audit infrastructure

### 1.1 Create klynt_audit Infrastructure

**Directory**: `backend/crates/infrastructure/klynt_audit/`

**Create structure**:
```bash
mkdir -p backend/crates/infrastructure/klynt_audit/src
```

**File**: `backend/crates/infrastructure/klynt_audit/Cargo.toml`

```toml
[package]
name = "klynt_audit"
version = "0.1.0"
edition = "2021"

[dependencies]
# Core
klynt_core = { path = "../../core/klynt_core" }
klynt_shared_domain = { path = "../../../shared/klynt_domain" }
klynt_utils = { path = "../../../shared/klynt_utils" }

# Async
tokio = { workspace = true }
async-trait = { workspace = true }

# Database
sqlx = { workspace = true }

# Time
chrono = { workspace = true }

# Error handling
thiserror = { workspace = true }

# Tracing
tracing = { workspace = true }
```

### 1.2 Move Audit Service

**From**: `klynt-application/src/audit.rs`

**To**: `klynt_audit/src/audit_service.rs`

**Content** (extract and adapt):
```rust
//! Audit service for tracking system events.

use std::sync::Arc;

use chrono::{DateTime, Utc};
use klynt_core::ctx::ExecutionContext;
use klynt_utils::UserId;

use crate::repository::AuditEventRepository;

/// Audit service.
#[derive(Clone)]
pub struct AuditService {
    repository: Arc<dyn AuditEventRepository>,
}

impl AuditService {
    pub fn new(repository: Arc<dyn AuditEventRepository>) -> Self {
        Self { repository }
    }

    /// Log an audit event.
    pub async fn log_event(
        &self,
        ctx: &ExecutionContext,
        event: AuditEvent,
    ) -> Result<(), AuditError> {
        self.repository.save(ctx, event).await
    }

    /// Get events for a user.
    pub async fn get_user_events(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        limit: usize,
    ) -> Result<Vec<AuditEvent>, AuditError> {
        self.repository.find_by_user(ctx, user_id, limit).await
    }
}

/// Audit event.
#[derive(Debug, Clone)]
pub struct AuditEvent {
    pub id: uuid::Uuid,
    pub actor_id: Option<UserId>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub metadata: serde_json::Value,
}
```

### 1.3 Update Workspace

**File**: `backend/Cargo.toml`

```toml
[workspace]
members = [
    # ... existing ...

    # === NEW ===
    "crates/infrastructure/klynt_audit",
]

[workspace.dependencies]
# ... add ...
klynt_audit = { path = "crates/infrastructure/klynt_audit" }
```

### 1.4 Update api_gateway Dependencies

**File**: `backend/crates/gateways/api_gateway/Cargo.toml`

```toml
[dependencies]
# ... add ...
klynt_audit = { workspace = true }

# Remove:
# klynt-application = { workspace = true }
```

### 1.5 Update api_gateway Service Wiring

**File**: `backend/crates/gateways/api_gateway/src/state/services.rs`

**Change from**:
```rust
let audit_service = Arc::new(klynt_application::audit::AuditService::new(audit_repo));
```

**To**:
```rust
let audit_service = Arc::new(klynt_audit::AuditService::new(audit_repo));
```

### 1.6 Verify

```bash
cargo build --workspace
cargo test -p api_gateway
```

---

## Step 2: Remove klynt-api (Day 1)

**Why**: No longer used — all functionality moved to `api_gateway`.

### 2.1 Verify No Dependencies

```bash
# Check what depends on klynt-api
grep -r "klynt-api" backend/crates/*/Cargo.toml

# Expected: Only workspace entry, no actual dependencies
```

### 2.2 Remove from Workspace

**File**: `backend/Cargo.toml`

**Remove**:
```toml
# From members:
"crates/klynt-api",

# From dependencies:
klynt-api = { path = "crates/klynt-api" },
```

### 2.3 Delete Directory

```bash
rm -rf backend/crates/klynt-api
```

### 2.4 Verify

```bash
cargo build --workspace
cargo test --workspace
```

---

## Step 3: Minimize klynt-domain (Day 2)

**Why**: Most domain types have moved to services. Keep only truly shared types.

### 3.1 Audit What's Used

```bash
# Check imports from klynt-domain
grep -r "klynt_domain::" backend/crates/*/src
```

**Likely remaining uses**:
- `klynt_domain::config::AppConfig` — Configuration loading
- `klynt_domain::ctx::Ctx` — May be used by some infrastructure
- `klynt_domain::session::SessionStore` — Used by middleware (will migrate)

### 3.2 Move Configuration

**From**: `klynt-domain/src/config.rs`

**To**: Create `klynt_config/` infrastructure crate

**Or**: Keep in minimized `klynt-domain` as it's truly shared

**Decision**: **Keep in klynt-domain** — configuration is platform-wide

### 3.3 Remove Moved Types

**Delete these files**:
```bash
# These are now in services
rm backend/crates/klynt-domain/src/models.rs
rm backend/crates/klynt-domain/src/session.rs
rm backend/crates/klynt-domain/src/tokens.rs
rm -rf backend/crates/klynt-domain/src/password_policy/
rm backend/crates/klynt-domain/src/ports.rs
rm backend/crates/klynt-domain/src/repositories.rs
```

### 3.4 Update klynt-domain lib.rs

**File**: `backend/crates/klynt-domain/src/lib.rs`

**Before**:
```rust
pub mod audit;
pub mod config;
pub mod ctx;
pub mod email_content;
pub mod errors;
pub mod models;
pub mod password_policy;
pub mod ports;
pub mod repositories;
pub mod session;
pub mod tokens;
```

**After**:
```rust
pub mod audit;
pub mod config;
pub mod ctx;
pub mod email_content;
pub mod errors;

// NOTE: models, session, tokens, password_policy moved to services
// NOTE: ports, repositories were specific to old architecture
```

### 3.5 Fix Breaking Imports

**In services/gateway**: Update any imports from removed modules

```bash
# Find and fix
grep -r "klynt_domain::" backend/crates/services/*/src
grep -r "klynt_domain::" backend/crates/gateways/*/src
```

**Replace**:
- `klynt_domain::models::User` → `user_service::models::User`
- `klynt_domain::session::` → `auth_service::domain::session::`
- etc.

### 3.6 Verify

```bash
cargo build --workspace
cargo test --workspace
```

---

## Step 4: Remove klynt-application (Day 2)

**Why**: All functionality moved to services. Only audit service was used (now extracted).

### 4.1 Verify No Dependencies

```bash
# Check what depends on klynt-application
grep -r "klynt-application" backend/crates/*/Cargo.toml
grep -r "klynt_application" backend/crates/*/src
```

### 4.2 Remove from Workspace

**File**: `backend/Cargo.toml`

**Remove**:
```toml
# From members:
"crates/klynt-application",

# From dependencies:
klynt-application = { path = "crates/klynt-application" },
```

### 4.3 Delete Directory

```bash
rm -rf backend/crates/klynt-application
```

### 4.4 Verify

```bash
cargo build --workspace
cargo test --workspace
```

---

## Step 5: Review klynt-infrastructure (Day 3)

**Why**: This crate is still needed as shared infrastructure, but should be reviewed.

### 5.1 What to Keep

```
klynt-infrastructure/
├── src/
│   ├── config.rs           # ✅ Keep — configuration loading
│   ├── email.rs            # ✅ Keep — email service
│   ├── health.rs           # ✅ Keep — health checks
│   ├── password_hasher.rs  # ✅ Keep — password hashing
│   ├── rate_limiter_redis.rs # ✅ Keep — rate limiting
│   ├── token_generator.rs  # ✅ Keep — token generation
│   └── repositories/
│       ├── pg_session.rs        # ✅ Keep — session storage
│       ├── pg_user.rs           # ✅ Keep — user storage
│       ├── sqlx_audit_repo.rs   # ✅ Keep — audit storage
│       ├── sqlx_token_repo.rs   # ✅ Keep — token storage
│       └── mod.rs
```

### 5.2 Rename for Clarity

**Optional**: Rename to clarify it's shared infrastructure

```bash
# This is optional, but makes things clearer
# Can be done later if desired
```

### 5.3 Documentation

**Add README** to clarify purpose:

```markdown
# klynt-infrastructure

Shared infrastructure components used across services.

## Contents

- **Repositories**: Database repository implementations
- **Services**: Email, password hashing, token generation
- **Utilities**: Config loading, health checks, rate limiting

## Usage

Services use these via adapters in their infrastructure layer.
```

---

## Step 6: Verify klynt-server (Day 3)

**Why**: Entry point should be minimal.

### 6.1 Current State Check

```bash
cat backend/crates/klynt-server/src/main.rs
```

**Should be**:
```rust
use api_gateway::{run, Config, Services};

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    dotenvy::dotenv().ok();

    let config = Config::from_env()?;
    let services = Services::from_config(&config).await?;

    run(config, services).await
}
```

### 6.2 Remove Unused Files

**Delete if not needed**:
```bash
# If these aren't used
rm -f backend/crates/klynt-server/src/composition.rs
rm -f backend/crates/klynt-server/src/telemetry.rs
rm -f backend/crates/klynt-server/src/metrics.rs
```

### 6.3 Keep Minimal

The server crate should only:
- Load configuration
- Wire services
- Call `api_gateway::run()`

---

## Step 7: Final Verification (Day 4)

### 7.1 Full Build Test

```bash
cargo clean
cargo build --workspace
```

### 7.2 Full Test Suite

```bash
cargo test --workspace --all-targets
```

### 7.3 Clippy Check

```bash
cargo clippy --workspace --all-targets
```

### 7.4 Dependencies Check

```bash
cargo +nightly udeps
```

### 7.5 Documentation Build

```bash
cargo doc --workspace --no-deps
```

---

## Step 8: Update Documentation (Day 5)

### 8.1 Update README Files

**Backend README**:
```markdown
# Klynt Backend

Service-oriented architecture built on Rust.

## Architecture

```
backend/crates/
├── core/              # Base abstractions
├── shared/            # Shared libraries
├── infrastructure/    # Shared infrastructure
├── services/          # Business services
└── gateways/          # HTTP entry points
```

## Services

- `auth_service` — Authentication and authorization
- `user_service` — User profile management

## Gateway

- `api_gateway` — HTTP API gateway
```

### 8.2 Update Development Guides

**Create**: `docs/development/adding-a-service.md`
```markdown
# Adding a New Service

1. Create service directory
2. Implement domain layer
3. Implement application layer
4. Implement infrastructure layer
5. Wire into gateway
6. Add tests
7. Update documentation
```

---

## Rollback Plan

If something breaks, rollback steps:

```bash
# Quick rollback
git reflog
git reset --hard HEAD@{N}

# Or per-step:
git checkout <commit-before-step>
```

**Tag before cleanup**:
```bash
git tag pre-cleanup
git push origin pre-cleanup
```

---

## Completion Checklist

### Day 1: Extract & Remove klynt-api
- [ ] Create klynt_audit infrastructure
- [ ] Move audit service
- [ ] Update api_gateway dependencies
- [ ] Remove klynt-api from workspace
- [ ] Delete klynt-api directory
- [ ] Build and test pass

### Day 2: Minimize & Remove
- [ ] Remove moved files from klynt-domain
- [ ] Update klynt-domain lib.rs
- [ ] Fix breaking imports
- [ ] Remove klynt-application from workspace
- [ ] Delete klynt-application directory
- [ ] Build and test pass

### Day 3: Review
- [ ] Review klynt-infrastructure
- [ ] Verify klynt-server is minimal
- [ ] Document infrastructure purpose
- [ ] Build and test pass

### Day 4: Final Verification
- [ ] Clean build
- [ ] All tests pass
- [ ] Clippy clean
- [ ] No unused dependencies
- [ ] Documentation builds

### Day 5: Documentation
- [ ] Update README files
- [ ] Create development guides
- [ ] Document cleanup changes
- [ ] Update architecture diagrams

---

## Success Criteria

✅ **Cleanup complete when**:
- Old crates removed (klynt-api, klynt-application)
- klynt-domain minimized to shared types only
- All tests pass
- Build completes successfully
- No clippy warnings
- Documentation updated

✅ **Architecture clean when**:
- Only 2 layers: services + gateway
- Shared concerns in infrastructure
- No business logic in gateway
- Each service independently testable

---

## Post-Cleanup Architecture

```
backend/crates/
├── core/
│   └── klynt_core/              # Base abstractions
├── shared/
│   ├── klynt_contracts/         # DTOs
│   ├── klynt_domain/            # Shared types (minimized)
│   └── klynt_utils/             # Utilities
├── infrastructure/
│   ├── klynt_audit/             # NEW: Audit logging
│   ├── klynt_messaging/         # Events
│   ├── klynt_storage/           # Storage abstractions
│   ├── klynt_tracing/           # Observability
│   └── klynt-infrastructure/    # Repositories, email, etc.
├── services/
│   ├── auth_service/            # Auth business logic
│   └── user_service/            # User business logic
├── gateways/
│   └── api_gateway/             # HTTP entry point
├── klynt-domain/                # Minimized (config, shared types only)
├── klynt-infrastructure/        # Shared infrastructure
└── klynt-server/                 # Minimal entry point
```

---

## Notes

- **Take it step by step** — verify after each removal
- **Tag before major changes** — easy rollback
- **Test frequently** — catch issues early
- **Document changes** — help future developers

---

## Estimated Timeline

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| 1 | Extract audit, remove klynt-api | klynt_audit created, klynt-api gone |
| 2 | Minimize klynt-domain, remove klynt-application | klynt-domain minimal, klynt-application gone |
| 3 | Review infrastructure, verify server | Clean architecture verified |
| 4 | Full verification | All tests pass, build clean |
| 5 | Documentation | README and guides updated |

**Total**: 5 days to clean, verified, documented architecture.
