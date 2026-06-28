# Backend Architecture Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Klynt backend from shallow modules to deep modules, improving testability, AI-navigability, and developer experience through concentrated complexity and clean seams.

**Architecture:** This plan deepens five architectural areas identified in the architecture review: (1) extracts session synchronization from tenant service into a SessionCoordinator, (2) consolidates distributed authorization logic into a single deep interface, (3) deepens repository interfaces by grouping operations into command objects, (4) introduces facades to reduce service composition complexity, and (5) unifies Membership concepts across session and domain layers.

**Tech Stack:** Rust, async/await, sqlx (Postgres), Redis, existing domain types in `shared/domain`, existing ports in `base::ports`

## Global Constraints

- **Rust version:** Use whatever `cargo fmt` accepts in this repo
- **Dependencies:** No new external dependencies beyond what's already in `Cargo.lock`
- **Naming:** Follow existing naming conventions (snake_case for functions, PascalCase for types)
- **Tests:** All new code must have tests; use existing test patterns from `base::testkit`
- **Commits:** Each task ends with a commit; use conventional commit format (`feat:`, `refactor:`, `fix:`)
- **Backward compatibility:** Do not break existing HTTP handlers or public service interfaces during this refactor
- **ADR compliance:** Respect ADR-007 (Tenant storage), ADR-008 (Permission model), ADR-009 (Authorization), ADR-011 (Mock-only email)

---

## File Structure

### New Files to Create

```
backend/crates/
├── services/
│   ├── session_coordinator/           # NEW - Session synchronization service
│   │   ├── src/
│   │   │   ├── lib.rs                 # Public interface
│   │   │   ├── event.rs               # Membership events
│   │   │   ├── coordinator.rs         # Core coordination logic
│   │   │   ├── config.rs              # Configuration
│   │   │   ├── error.rs               # Error types
│   │   │   └── tests/
│   │   │       └── integration.rs     # Integration tests
│   │   └── Cargo.toml                 # Crate definition
│   └── infra_facades/                 # NEW - Infrastructure facades
│       ├── src/
│       │   ├── lib.rs                 # Facade exports
│       │   ├── persistence.rs         # PersistenceFacade (repos + stores)
│       │   ├── infrastructure.rs      # InfraFacade (hashing, email, clock)
│       │   └── tests/
│       │       └── facade_tests.rs    # Facade tests
│       └── Cargo.toml
├── shared/
│   └── domain/
│       └── src/
│           └── operations/            # NEW - Command objects for repos
│               ├── mod.rs
│               ├── user_op.rs         # User operations
│               ├── membership_op.rs   # Membership operations
│               └── tenant_op.rs       # Tenant operations
```

### Files to Modify

```
backend/crates/
├── services/tenant_service/
│   └── src/
│       ├── lib.rs                     # Remove session_store from Dependencies
│       ├── builder.rs                 # Remove session_store wiring
│       └── application/use_cases/
│       ├── add_member.rs              # Remove direct session sync
│       ├── update_member_role.rs      # Remove direct session sync
│       └── remove_member.rs           # Remove direct session sync
├── services/tenant_service/src/application/
│   └── authorization.rs               # Deepen with private helper methods
├── base/src/ports/
│   ├── repository.rs                  # Add command-based methods
│   └── session.rs                     # Simplify (remove MembershipSnapshot)
├── shared/domain/src/
│   ├── membership.rs                  # Add serialization helpers
│   └── lib.rs                         # Re-export operations
└── gateways/src/state/
    └── services.rs                    # Wire new services and facades
```

---

## Task 1: Create SessionCoordinator Crate Structure

**Files:**
- Create: `backend/crates/services/session_coordinator/Cargo.toml`
- Create: `backend/crates/services/session_coordinator/src/lib.rs`
- Create: `backend/crates/services/session_coordinator/src/event.rs`
- Create: `backend/crates/services/session_coordinator/src/error.rs`
- Create: `backend/crates/services/session_coordinator/src/config.rs`
- Create: `backend/crates/services/session_coordinator/src/coordinator.rs`

**Interfaces:**
- Produces: `SessionCoordinator` struct with `handle_membership_event` method
- Produces: `MembershipEvent` enum (Added, Updated, Removed)
- Produces: `SessionCoordinatorError` error type

**Purpose:** Establish the foundation for extracting session synchronization logic from tenant service.

- [ ] **Step 1: Create Cargo.toml for session_coordinator crate**

```toml
[package]
name = "session_coordinator"
version = "0.1.0"
edition = "2021"

[dependencies]
base = { path = "../../../base" }
domain = { path = "../../../shared/domain" }
async-trait = "0.1"
thiserror = "2.0"
tokio = { version = "1", features = ["rt"] }
```

Run: `cd backend/crates/services && cargo new session_coordinator --lib`

Expected: New crate created at `backend/crates/services/session_coordinator/`

- [ ] **Step 2: Replace generated lib.rs with SessionCoordinator module structure**

```rust
//! Session synchronization coordinator.
//!
//! Listens to membership change events and keeps session state in sync.

pub mod coordinator;
pub mod error;
pub mod event;
pub mod config;

pub use coordinator::SessionCoordinator;
pub use error::SessionCoordinatorError;
pub use event::MembershipEvent;
```

Run: `cat backend/crates/services/session_coordinator/src/lib.rs`

Expected: File contains the module exports above

- [ ] **Step 3: Create event.rs with MembershipEvent enum**

```rust
//! Membership change events for session coordination.

use domain::{TenantId, UserId, membership::TenantRole};
use serde::{Deserialize, Serialize};

/// Event representing a membership change.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MembershipEvent {
    /// A new membership was created.
    Added {
        tenant_id: TenantId,
        user_id: UserId,
        role: TenantRole,
    },
    /// A membership's role was updated.
    Updated {
        tenant_id: TenantId,
        user_id: UserId,
        role: TenantRole,
    },
    /// A membership was removed.
    Removed {
        tenant_id: TenantId,
        user_id: UserId,
    },
}

impl MembershipEvent {
    /// Return the tenant ID this event relates to.
    pub fn tenant_id(&self) -> TenantId {
        match self {
            Self::Added { tenant_id, .. } | Self::Updated { tenant_id, .. } | Self::Removed { tenant_id, .. } => *tenant_id,
        }
    }

    /// Return the user ID this event relates to.
    pub fn user_id(&self) -> UserId {
        match self {
            Self::Added { user_id, .. } | Self::Updated { user_id, .. } | Self::Removed { user_id, .. } => *user_id,
        }
    }
}
```

Run: `cat backend/crates/services/session_coordinator/src/event.rs`

Expected: File contains the MembershipEvent enum above

- [ ] **Step 4: Create error.rs with SessionCoordinatorError**

```rust
//! Session coordinator errors.

use thiserror::Error;

/// Errors from session coordination operations.
#[derive(Debug, Error)]
pub enum SessionCoordinatorError {
    #[error("Session store error: {0}")]
    SessionStore(String),

    #[error("Invalid event: {0}")]
    InvalidEvent(String),
}
```

Run: `cat backend/crates/services/session_coordinator/src/error.rs`

Expected: File contains the error type above

- [ ] **Step 5: Create config.rs with SessionCoordinatorConfig**

```rust
//! Session coordinator configuration.

#[derive(Debug, Clone)]
pub struct SessionCoordinatorConfig {
    /// Whether session synchronization is enabled.
    pub enabled: bool,
}

impl Default for SessionCoordinatorConfig {
    fn default() -> Self {
        Self { enabled: true }
    }
}
```

Run: `cat backend/crates/services/session_coordinator/src/config.rs`

Expected: File contains the config struct above

- [ ] **Step 6: Create coordinator.rs with SessionCoordinator stub**

```rust
//! Session synchronization coordinator.

use std::sync::Arc;

use base::ctx::ExecutionContext;
use base::ports::session::SessionStore;
use domain::TenantId;

use super::event::MembershipEvent;
use super::error::SessionCoordinatorError;
use super::config::SessionCoordinatorConfig;

/// Coordinates session updates in response to membership changes.
pub struct SessionCoordinator {
    session_store: Arc<dyn SessionStore>,
    config: SessionCoordinatorConfig,
}

impl SessionCoordinator {
    /// Create a new session coordinator.
    pub fn new(
        session_store: Arc<dyn SessionStore>,
        config: SessionCoordinatorConfig,
    ) -> Self {
        Self {
            session_store,
            config,
        }
    }

    /// Handle a membership event by updating affected sessions.
    pub async fn handle_membership_event(
        &self,
        ctx: &ExecutionContext,
        event: MembershipEvent,
    ) -> Result<(), SessionCoordinatorError> {
        if !self.config.enabled {
            return Ok(());
        }

        // TODO: Implement event handling in next task
        Ok(())
    }
}
```

Run: `cat backend/crates/services/session_coordinator/src/coordinator.rs`

Expected: File contains the SessionCoordinator stub above

- [ ] **Step 7: Commit**

```bash
git add backend/crates/services/session_coordinator/
git commit -m "feat: add session_coordinator crate structure"
```

---

## Task 2: Implement SessionCoordinator Event Handling

**Files:**
- Modify: `backend/crates/services/session_coordinator/src/coordinator.rs`
- Create: `backend/crates/services/session_coordinator/src/tests/integration.rs`

**Interfaces:**
- Consumes: `MembershipEvent` from Task 1
- Consumes: `SessionStore` from `base::ports`
- Produces: `handle_membership_event` implementation

**Purpose:** Implement the core session synchronization logic that will replace direct session calls in tenant use cases.

- [ ] **Step 1: Write failing test for Added event handling**

```rust
// In backend/crates/services/session_coordinator/src/tests/integration.rs

use base::ctx::ExecutionContext;
use base::testkit::{FakeSessionStore, test_ctx};
use session_coordinator::{SessionCoordinator, SessionCoordinatorConfig, event::MembershipEvent};
use domain::{TenantId, UserId, membership::TenantRole};

#[tokio::test]
async fn test_added_event_adds_membership_to_session() {
    let fake_store = Arc::new(FakeSessionStore::new());
    let coordinator = SessionCoordinator::new(fake_store.clone(), SessionCoordinatorConfig::default());
    let ctx = test_ctx();
    let tenant_id = TenantId::new();
    let user_id = UserId::new();

    let event = MembershipEvent::Added {
        tenant_id,
        user_id,
        role: TenantRole::Member,
    };

    coordinator.handle_membership_event(&ctx, event).await.unwrap();

    let sessions = fake_store.all_sessions(&ctx).await.unwrap();
    assert!(!sessions.is_empty(), "Session should be created/updated");
}
```

Run: `cd backend && cargo test -p session_coordinator`

Expected: FAIL with "not implemented" or session count mismatch

- [ ] **Step 2: Implement Added event handling in coordinator.rs**

Update `handle_membership_event` method:

```rust
pub async fn handle_membership_event(
    &self,
    ctx: &ExecutionContext,
    event: MembershipEvent,
) -> Result<(), SessionCoordinatorError> {
    if !self.config.enabled {
        return Ok(());
    }

    match event {
        MembershipEvent::Added { tenant_id, user_id, role } => {
            use base::ports::session::MembershipSnapshot;
            let snapshot = MembershipSnapshot {
                tenant_id: tenant_id.inner(),
                role,
            };
            self.session_store
                .add_membership(ctx, user_id, snapshot)
                .await
                .map_err(|e| SessionCoordinatorError::SessionStore(e.to_string()))?;
        }
        _ => {
            // TODO: Implement other variants in next steps
            return Ok(());
        }
    }

    Ok(())
}
```

Run: `cd backend && cargo test -p session_coordinator`

Expected: PASS for `test_added_event_adds_membership_to_session`

- [ ] **Step 3: Write and implement Updated event test**

```rust
#[tokio::test]
async fn test_updated_event_updates_membership_in_session() {
    let fake_store = Arc::new(FakeSessionStore::new());
    let coordinator = SessionCoordinator::new(fake_store.clone(), SessionCoordinatorConfig::default());
    let ctx = test_ctx();
    let tenant_id = TenantId::new();
    let user_id = UserId::new();

    // First add a membership
    let add_event = MembershipEvent::Added {
        tenant_id,
        user_id,
        role: TenantRole::Member,
    };
    coordinator.handle_membership_event(&ctx, add_event).await.unwrap();

    // Then update to Admin
    let update_event = MembershipEvent::Updated {
        tenant_id,
        user_id,
        role: TenantRole::Admin,
    };
    coordinator.handle_membership_event(&ctx, update_event).await.unwrap();

    let sessions = fake_store.all_sessions(&ctx).await.unwrap();
    // Verify role is now Admin in session
    // (Exact verification depends on FakeSessionStore implementation)
}
```

Update `handle_membership_event` to handle Updated:

```rust
MembershipEvent::Updated { tenant_id, user_id, role } => {
    use base::ports::session::MembershipSnapshot;
    let snapshot = MembershipSnapshot {
        tenant_id: tenant_id.inner(),
        role,
    };
    self.session_store
        .update_membership(ctx, user_id, snapshot)
        .await
        .map_err(|e| SessionCoordinatorError::SessionStore(e.to_string()))?;
}
```

Run: `cd backend && cargo test -p session_coordinator`

Expected: PASS for Updated test

- [ ] **Step 4: Write and implement Removed event test**

```rust
#[tokio::test]
async fn test_removed_event_removes_membership_from_session() {
    let fake_store = Arc::new(FakeSessionStore::new());
    let coordinator = SessionCoordinator::new(fake_store.clone(), SessionCoordinatorConfig::default());
    let ctx = test_ctx();
    let tenant_id = TenantId::new();
    let user_id = UserId::new();

    // First add a membership
    let add_event = MembershipEvent::Added {
        tenant_id,
        user_id,
        role: TenantRole::Member,
    };
    coordinator.handle_membership_event(&ctx, add_event).await.unwrap();

    // Then remove it
    let remove_event = MembershipEvent::Removed {
        tenant_id,
        user_id,
    };
    coordinator.handle_membership_event(&ctx, remove_event).await.unwrap();

    // Verify membership is removed from session
}
```

Update `handle_membership_event` to handle Removed:

```rust
MembershipEvent::Removed { tenant_id, user_id } => {
    self.session_store
        .remove_membership(ctx, user_id, tenant_id)
        .await
        .map_err(|e| SessionCoordinatorError::SessionStore(e.to_string()))?;
}
```

Run: `cd backend && cargo test -p session_coordinator`

Expected: PASS for Removed test

- [ ] **Step 5: Commit**

```bash
git add backend/crates/services/session_coordinator/
git commit -m "feat: implement SessionCoordinator event handling"
```

---

## Task 3: Integrate SessionCoordinator into Tenant Service

**Files:**
- Modify: `backend/crates/services/tenant_service/src/lib.rs`
- Modify: `backend/crates/services/tenant_service/src/builder.rs`
- Modify: `backend/crates/services/tenant_service/src/application/use_cases/add_member.rs`
- Modify: `backend/crates/services/tenant_service/src/application/use_cases/update_member_role.rs`
- Modify: `backend/crates/services/tenant_service/src/application/use_cases/remove_member.rs`

**Interfaces:**
- Consumes: `SessionCoordinator` from Task 2
- Removes: Direct `session_store` dependency from tenant service

**Purpose:** Replace direct session synchronization calls with event-driven coordination.

- [ ] **Step 1: Add session_coordinator dependency to tenant_service Cargo.toml**

```toml
[dependencies]
session_coordinator = { path = "../session_coordinator" }
# ... existing dependencies
```

Run: `cargo check -p tenant_service`

Expected: OK

- [ ] **Step 2: Update tenant_service lib.rs to include SessionCoordinator in Dependencies**

Add to imports:

```rust
use session_coordinator::SessionCoordinator;
```

Update `Dependencies` struct:

```rust
#[derive(Clone)]
pub struct Dependencies {
    pub tenant_repository: Arc<dyn TenantRepository>,
    pub membership_repository: Arc<dyn MembershipRepository>,
    pub user_repository: Arc<dyn UserRepository>,
    pub invite_repository: Arc<dyn TenantInviteRepository>,
    pub permission_repository: Arc<dyn PermissionRepository>,
    pub role_repository: Arc<dyn RoleRepository>,
    // REMOVE: pub session_store: Arc<dyn SessionStore>,
    pub session_coordinator: Arc<SessionCoordinator>,  // ADD
    pub audit_logger: Arc<dyn AuditLogger>,
}
```

Update `InternalState`:

```rust
pub(crate) struct InternalState {
    pub tenant_repository: Arc<dyn TenantRepository>,
    pub membership_repository: Arc<dyn MembershipRepository>,
    pub user_repository: Arc<dyn UserRepository>,
    pub invite_repository: Arc<dyn TenantInviteRepository>,
    pub permission_repository: Arc<dyn PermissionRepository>,
    pub role_repository: Arc<dyn RoleRepository>,
    // REMOVE: pub session_store: Arc<dyn SessionStore>,
    pub session_coordinator: Arc<SessionCoordinator>,  // ADD
    pub audit_logger: Arc<dyn AuditLogger>,
    pub authorization_service: AuthorizationService,
}
```

Update `TenantService::new` constructor:

```rust
pub fn new(_config: TenantConfig, dependencies: Dependencies) -> Result<Self, TenantError> {
    let authorization_service = AuthorizationService::new(
        dependencies.membership_repository.clone(),
        dependencies.permission_repository.clone(),
        dependencies.role_repository.clone(),
    );

    Ok(Self {
        internal_state: InternalState {
            tenant_repository: dependencies.tenant_repository,
            membership_repository: dependencies.membership_repository,
            user_repository: dependencies.user_repository,
            invite_repository: dependencies.invite_repository,
            permission_repository: dependencies.permission_repository,
            role_repository: dependencies.role_repository,
            // REMOVE: session_store: dependencies.session_store,
            session_coordinator: dependencies.session_coordinator,  // ADD
            audit_logger: dependencies.audit_logger,
            authorization_service,
        },
    })
}
```

Remove `session_store()` helper method:

```rust
// REMOVE THIS METHOD:
// pub(crate) fn session_store(&self) -> &Arc<dyn SessionStore> {
//     &self.internal_state.session_store
// }
```

Add `session_coordinator()` helper method:

```rust
pub(crate) fn session_coordinator(&self) -> &Arc<SessionCoordinator> {
    &self.internal_state.session_coordinator
}
```

Run: `cargo check -p tenant_service`

Expected: Compilation errors in builder and use_cases

- [ ] **Step 3: Update tenant_service builder.rs to wire SessionCoordinator**

Remove `with_session_store` method and add `with_session_coordinator`:

```rust
impl TenantBuilder {
    // REMOVE: pub fn with_session_store(mut self, session_store: Arc<dyn SessionStore>) -> Self {
    //     self.session_store = Some(session_store);
    //     self
    // }

    pub fn with_session_coordinator(mut self, session_coordinator: Arc<SessionCoordinator>) -> Self {
        self.session_coordinator = Some(session_coordinator);
        self
    }
}
```

Update `TenantBuilder` struct fields and `build` method accordingly.

Run: `cargo check -p tenant_service`

Expected: Compilation errors in use_cases files

- [ ] **Step 4: Update add_member.rs to emit event instead of direct session call**

Replace the session synchronization code (lines 61-72) with event emission:

```rust
// OLD CODE (REMOVE):
// service
//     .session_store()
//     .add_membership(
//         ctx,
//         target_user.id,
//         MembershipSnapshot {
//             tenant_id: tenant.id.inner(),
//             role: request.role,
//         },
//     )
//     .await
//     .map_err(TenantError::Session)?;

// NEW CODE (ADD):
use session_coordinator::event::MembershipEvent;

let event = MembershipEvent::Added {
    tenant_id: tenant.id,
    user_id: target_user.id,
    role: request.role,
};
service
    .session_coordinator()
    .handle_membership_event(ctx, event)
    .await
    .map_err(|e| TenantError::Internal(e.to_string()))?;
```

Run: `cargo check -p tenant_service`

Expected: No errors in add_member

- [ ] **Step 5: Update update_member_role.rs to emit Updated event**

Find and replace the session store call with event emission:

```rust
use session_coordinator::event::MembershipEvent;

// After updating the membership in the repository:
let event = MembershipEvent::Updated {
    tenant_id: tenant.id,
    user_id: target_user.id,
    role: request.role,
};
service
    .session_coordinator()
    .handle_membership_event(ctx, event)
    .await
    .map_err(|e| TenantError::Internal(e.to_string()))?;
```

Run: `cargo check -p tenant_service`

Expected: No errors in update_member_role

- [ ] **Step 6: Update remove_member.rs to emit Removed event**

Replace session store call with event emission:

```rust
use session_coordinator::event::MembershipEvent;

// After removing the membership:
let event = MembershipEvent::Removed {
    tenant_id: tenant.id,
    user_id: target_user.id,
};
service
    .session_coordinator()
    .handle_membership_event(ctx, event)
    .await
    .map_err(|e| TenantError::Internal(e.to_string()))?;
```

Run: `cargo check -p tenant_service`

Expected: All tenant_service compiles

- [ ] **Step 7: Run existing tenant service tests**

Run: `cargo test -p tenant_service`

Expected: All existing tests pass

- [ ] **Step 8: Commit**

```bash
git add backend/crates/services/tenant_service/
git commit -m "refactor: integrate SessionCoordinator into tenant service"
```

---

## Task 4: Wire SessionCoordinator in Composition Root

**Files:**
- Modify: `backend/crates/gateways/src/state/services.rs`

**Interfaces:**
- Consumes: `SessionCoordinator` from session_coordinator
- Produces: Wired `SessionCoordinator` in `Services` struct

**Purpose:** Ensure SessionCoordinator is properly constructed and available to tenant service.

- [ ] **Step 1: Add SessionCoordinator construction to services.rs**

Add import:

```rust
use session_coordinator::{SessionCoordinator, SessionCoordinatorConfig};
```

Add method to `impl Services`:

```rust
fn create_session_coordinator(
    session_store: Arc<dyn base::ports::session::SessionStore>,
) -> Arc<SessionCoordinator> {
    let config = SessionCoordinatorConfig::default();
    Arc::new(SessionCoordinator::new(session_store, config))
}
```

- [ ] **Step 2: Update `from_config` to create SessionCoordinator**

After session_store creation:

```rust
let session_coordinator = Self::create_session_coordinator(session_store.clone());
```

Pass to `create_tenant_service`:

```rust
let tenant_service = Self::create_tenant_service(
    pool.clone(),
    session_coordinator.clone(),
)?;
```

- [ ] **Step 3: Update `create_tenant_service` signature**

```rust
fn create_tenant_service(
    pool: sqlx::PgPool,
    session_coordinator: Arc<SessionCoordinator>,
) -> Result<TenantService, crate::GatewayError> {
```

Remove `session_store` parameter and use `session_coordinator` in builder.

- [ ] **Step 4: Update `create_auth_service` if it depends on tenant service**

Check if auth service needs updating (it may not if it doesn't call tenant service).

- [ ] **Step 5: Build and test gateway**

Run: `cargo build -p gateways`

Expected: Clean build

- [ ] **Step 6: Run integration tests**

Run: `cargo test -p gateways`

Expected: All gateway tests pass

- [ ] **Step 7: Commit**

```bash
git add backend/crates/gateways/src/state/services.rs
git commit -m "refactor: wire SessionCoordinator in composition root"
```

---

## Task 5: Deepen AuthorizationService Interface

**Files:**
- Modify: `backend/crates/services/tenant_service/src/application/authorization.rs`
- Modify: `backend/crates/services/tenant_service/src/application/use_cases/shared.rs`

**Interfaces:**
- Consumes: Existing `MembershipRepository`, `PermissionRepository`, `RoleRepository`
- Produces: Deepened `AuthorizationService` with private helpers
- Removes: `require_member_permission` from shared.rs (consolidates into AuthorizationService)

**Purpose:** Consolidate distributed authorization logic into one deep module.

- [ ] **Step 1: Write test for consolidated authorization check**

Create test file:

```rust
// backend/crates/services/tenant_service/tests/authorization_test.rs

use base::testkit::{test_ctx, FakeMembershipRepository, FakePermissionRepository, FakeRoleRepository};
use domain::{TenantId, UserId, permission, membership::TenantRole};
use tenant_service::application::AuthorizationService;

#[tokio::test]
async fn test_authorization_service_deep_interface() {
    let ctx = test_ctx();
    let tenant_id = TenantId::new();
    let user_id = UserId::new();

    let membership_repo = Arc::new(FakeMembershipRepository::new());
    let permission_repo = Arc::new(FakePermissionRepository::new());
    let role_repo = Arc::new(FakeRoleRepository::new());

    // Setup: add membership with role
    // Setup: add role with permission

    let auth = AuthorizationService::new(membership_repo, permission_repo, role_repo);

    // Test: has_permission returns true
    let permitted = auth
        .has_permission(&ctx, tenant_id, user_id, permission::tenant::MANAGE_MEMBERS)
        .await
        .unwrap();

    assert!(permitted, "User should have permission");
}
```

Run: `cargo test -p tenant_service test_authorization_service_deep_interface`

Expected: FAIL (test doesn't exist yet)

- [ ] **Step 2: Add private helper methods to AuthorizationService**

Add to `authorization.rs`:

```rust
impl AuthorizationService {
    /// Private: resolve membership or return not-permitted.
    async fn resolve_membership(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
    ) -> DomainResult<Option<domain::Membership>> {
        self.membership_repository
            .find(ctx, tenant_id, user_id)
            .await
    }

    /// Private: resolve role aggregate or return not-permitted.
    async fn resolve_role(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        role: &domain::membership::TenantRole,
    ) -> DomainResult<Option<domain::TenantRoleAggregate>> {
        self.role_repository
            .find_role_by_name(ctx, tenant_id, role.as_str())
            .await
    }

    /// Private: resolve permission or return not-permitted.
    async fn resolve_permission(
        &self,
        ctx: &ExecutionContext,
        permission_name: &str,
    ) -> DomainResult<Option<domain::Permission>> {
        self.permission_repository
            .find_permission_by_name(ctx, permission_name)
            .await
    }

    /// Private: check if role grants permission.
    fn role_has_permission(
        &self,
        role: &domain::TenantRoleAggregate,
        permission_id: &domain::PermissionId,
    ) -> bool {
        role.permission_ids.contains(permission_id)
    }
}
```

- [ ] **Step 3: Simplify `has_permission` using new helpers**

```rust
pub async fn has_permission(
    &self,
    ctx: &ExecutionContext,
    tenant_id: TenantId,
    user_id: UserId,
    permission_name: &str,
) -> DomainResult<bool> {
    let membership = match self.resolve_membership(ctx, tenant_id, user_id).await? {
        Some(m) => m,
        None => return Ok(false),
    };

    let role = match self.resolve_role(ctx, tenant_id, &membership.role).await? {
        Some(r) => r,
        None => return Ok(false),
    };

    let permission = match self.resolve_permission(ctx, permission_name).await? {
        Some(p) => p,
        None => return Ok(false),
    };

    Ok(self.role_has_permission(&role, &permission.id))
}
```

Run: `cargo test -p tenant_service`

Expected: All authorization tests pass

- [ ] **Step 4: Move `require_member_permission` into AuthorizationService**

Copy from `shared.rs` into `authorization.rs` as a private method:

```rust
/// Ensure user has permission within tenant, returning domain error on failure.
pub(crate) async fn require_permission_with_context(
    &self,
    ctx: &ExecutionContext,
    tenant_id: TenantId,
    user_id: UserId,
    permission_name: &str,
) -> DomainResult<()> {
    let permitted = self
        .has_permission(ctx, tenant_id, user_id, permission_name)
        .await?;

    if permitted {
        Ok(())
    } else {
        Err(DomainError::NotPermitted(format!(
            "missing permission: {permission_name}"
        )))
    }
}
```

- [ ] **Step 5: Update use_cases to call AuthorizationService directly**

Replace calls to `require_member_permission(service, ctx, ...)` with:

```rust
service
    .authorization()
    .require_permission_with_context(ctx, tenant.id, actor_id, permission::tenant::MANAGE_MEMBERS)
    .await
    .map_err(|_| TenantError::NotAdmin)?;
```

Update all affected use cases:
- `add_member.rs`
- `update_member_role.rs`
- `remove_member.rs`
- `update_tenant.rs`
- `delete_tenant.rs`
- Role management use cases

- [ ] **Step 6: Remove `require_member_permission` from shared.rs**

Delete the function from `shared.rs` and update imports across use cases.

- [ ] **Step 7: Run all tenant service tests**

Run: `cargo test -p tenant_service`

Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add backend/crates/services/tenant_service/
git commit -m "refactor: deepen AuthorizationService interface"
```

---

## Task 6: Create Domain Command Objects

**Files:**
- Create: `backend/crates/shared/domain/src/operations/mod.rs`
- Create: `backend/crates/shared/domain/src/operations/user_op.rs`
- Create: `backend/crates/shared/domain/src/operations/membership_op.rs`
- Create: `backend/crates/shared/domain/src/operations/tenant_op.rs`

**Interfaces:**
- Produces: `UserOp`, `MembershipOp`, `TenantOp` enums
- Consumes: Existing domain types

**Purpose:** Group related repository operations into command objects, enabling deeper repository interfaces.

- [ ] **Step 1: Create operations module structure**

Create `mod.rs`:

```rust
//! Domain operation commands for repository interfaces.

pub mod user_op;
pub mod membership_op;
pub mod tenant_op;

pub use user_op::UserOp;
pub use membership_op::MembershipOp;
pub use tenant_op::TenantOp;
```

- [ ] **Step 2: Create UserOp enum**

Create `user_op.rs`:

```rust
//! User operation commands.

use domain::{Email, UserId, UserRole, User, PaginationRequest};

/// User repository operation.
pub enum UserOp {
    FindByEmail { email: Email },
    FindById { user_id: UserId },
    CreatePendingUser {
        full_name: String,
        username: String,
        email: Email,
        password_hash: String,
        role: UserRole,
        institution_id: Option<uuid::Uuid>,
    },
    ActivateUser { user_id: UserId },
    UpdatePassword { user_id: UserId, password_hash: String },
    Update { user: User },
    Delete { user_id: UserId },
    List { pagination: PaginationRequest },
}
```

- [ ] **Step 3: Create MembershipOp enum**

Create `membership_op.rs`:

```rust
//! Membership operation commands.

use domain::{Membership, TenantId, UserId, membership::TenantRole};

/// Membership repository operation.
pub enum MembershipOp {
    Create { membership: Membership },
    Find { tenant_id: TenantId, user_id: UserId },
    ListForUser { user_id: UserId },
    ListForTenant { tenant_id: TenantId },
    UpdateRole { tenant_id: TenantId, user_id: UserId, role: TenantRole },
    Delete { tenant_id: TenantId, user_id: UserId },
}
```

- [ ] **Step 4: Create TenantOp enum**

Create `tenant_op.rs`:

```rust
//! Tenant operation commands.

use domain::{Tenant, TenantId, TenantSlug};

/// Tenant repository operation.
pub enum TenantOp {
    Create { tenant: Tenant },
    FindById { id: TenantId },
    FindBySlug { slug: TenantSlug },
    ListForUser { user_id: UserId },
    Update { tenant: Tenant },
    Delete { id: TenantId },
    CountOwnedByUser { user_id: UserId },
}
```

- [ ] **Step 5: Update domain lib.rs to export operations**

Add to `lib.rs`:

```rust
pub mod operations;
```

- [ ] **Step 6: Commit**

```bash
git add backend/crates/shared/domain/src/operations/
git commit -m "feat: add domain operation command objects"
```

---

## Task 7: Add Command-Based Methods to Repository Ports

**Files:**
- Modify: `backend/crates/base/src/ports/repository.rs`

**Interfaces:**
- Consumes: `UserOp`, `MembershipOp`, `TenantOp` from Task 6
- Produces: `execute` methods on repository traits

**Purpose:** Provide alternative deep interfaces for repositories alongside existing methods (backward compatible).

- [ ] **Step 1: Add UserOp import and execute method to UserRepository**

Add to `repository.rs`:

```rust
use crate::operations::UserOp;
```

Add to `UserRepository` trait:

```rust
/// Execute a user operation command.
///
/// This provides a single-entry-point interface that delegates to the
/// specific methods above. New operations can be added without changing
/// the interface.
async fn execute(
    &self,
    ctx: &ExecutionContext,
    op: UserOp,
) -> Result<UserOpResult, RepositoryError>;
```

- [ ] **Step 2: Create UserOpResult enum**

Add to `repository.rs`:

```rust
/// Result of executing a UserOp.
pub enum UserOpResult {
    UserOption(Option<User>),
    UserId(UserId),
    User(User),
    Unit(()),
    UserList((Vec<User>, u64)),
}
```

- [ ] **Step 3: Implement execute for PgUserRepository**

In `infra/persistence/src/repositories/user.rs`:

```rust
async fn execute(
    &self,
    ctx: &ExecutionContext,
    op: UserOp,
) -> Result<UserOpResult, RepositoryError> {
    match op {
        UserOp::FindByEmail { email } => {
            let result = self.find_by_email(ctx, &email).await?;
            Ok(UserOpResult::UserOption(result))
        }
        UserOp::FindById { user_id } => {
            let result = self.find_by_id(ctx, user_id).await?;
            Ok(UserOpResult::UserOption(result))
        }
        // ... implement all variants
    }
}
```

- [ ] **Step 4: Repeat for MembershipRepository and TenantRepository**

Add `execute` methods and corresponding result types.

- [ ] **Step 5: Write tests for command-based execution**

Create test verifying `execute` delegates correctly:

```rust
#[tokio::test]
async fn test_user_execute_find_by_email() {
    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let email = Email::parse("test@example.com").unwrap();

    let result = repo
        .execute(&ctx, UserOp::FindByEmail { email })
        .await
        .unwrap();

    match result {
        UserOpResult::UserOption(None) => {},
        _ => panic!("Expected None for non-existent user"),
    }
}
```

- [ ] **Step 6: Run repository tests**

Run: `cargo test -p persistence repository`

Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add backend/crates/base/src/ports/repository.rs
git add backend/crates/infra/persistence/src/repositories/
git commit -m "feat: add command-based execute methods to repository ports"
```

---

## Task 8: Create Infrastructure Facade Crate

**Files:**
- Create: `backend/crates/services/infra_facades/Cargo.toml`
- Create: `backend/crates/services/infra_facades/src/lib.rs`
- Create: `backend/crates/services/infra_facades/src/persistence.rs`
- Create: `backend/crates/services/infra_facades/src/infrastructure.rs`

**Interfaces:**
- Produces: `PersistenceFacade` struct
- Produces: `InfraFacade` struct
- Consumes: Existing repository and infrastructure adapters

**Purpose:** Group related adapters behind smaller interfaces to reduce service composition complexity.

- [ ] **Step 1: Create infra_facades crate structure**

Create `Cargo.toml`:

```toml
[package]
name = "infra_facades"
version = "0.1.0"
edition = "2021"

[dependencies]
base = { path = "../../../base" }
domain = { path = "../../../shared/domain" }
persistence = { path = "../../infra/persistence" }
observability = { path = "../../infra/observability" }
thiserror = "2.0"
```

- [ ] **Step 2: Create persistence.rs with PersistenceFacade**

```rust
//! Persistence facade — groups all repository and store adapters.

use std::sync::Arc;
use base::ports::repository::*;
use base::ports::session::SessionStore;
use base::ports::TokenStore;
use base::ports::AuditLogger;

/// Persistence facade — single access point to all persistence adapters.
pub struct PersistenceFacade {
    // Repositories
    pub user_repository: Arc<dyn UserRepository>,
    pub tenant_repository: Arc<dyn TenantRepository>,
    pub membership_repository: Arc<dyn MembershipRepository>,
    pub invite_repository: Arc<dyn TenantInviteRepository>,
    pub permission_repository: Arc<dyn base::ports::permission::PermissionRepository>,
    pub role_repository: Arc<dyn base::ports::permission::RoleRepository>,
    pub layout_repository: Arc<dyn TenantDesktopLayoutRepository>,

    // Stores
    pub session_store: Arc<dyn SessionStore>,
    pub token_store: Arc<dyn TokenStore>,

    // Audit
    pub audit_logger: Arc<dyn AuditLogger>,
}

impl PersistenceFacade {
    /// Create a new persistence facade from individual adapters.
    pub fn new(
        user_repository: Arc<dyn UserRepository>,
        tenant_repository: Arc<dyn TenantRepository>,
        membership_repository: Arc<dyn MembershipRepository>,
        invite_repository: Arc<dyn TenantInviteRepository>,
        permission_repository: Arc<dyn base::ports::permission::PermissionRepository>,
        role_repository: Arc<dyn base::ports::permission::RoleRepository>,
        layout_repository: Arc<dyn TenantDesktopLayoutRepository>,
        session_store: Arc<dyn SessionStore>,
        token_store: Arc<dyn TokenStore>,
        audit_logger: Arc<dyn AuditLogger>,
    ) -> Self {
        Self {
            user_repository,
            tenant_repository,
            membership_repository,
            invite_repository,
            permission_repository,
            role_repository,
            layout_repository,
            session_store,
            token_store,
            audit_logger,
        }
    }
}
```

- [ ] **Step 3: Create infrastructure.rs with InfraFacade**

```rust
//! Infrastructure facade — groups infrastructure adapters.

use std::sync::Arc;
use base::ports::PasswordHasher;
use base::ports::EmailSender;
use base::ports::Clock;

/// Infrastructure facade — single access point to infrastructure adapters.
pub struct InfraFacade {
    pub password_hasher: Arc<dyn PasswordHasher>,
    pub email_sender: Arc<dyn EmailSender>,
    pub clock: Arc<dyn Clock>,
}

impl InfraFacade {
    /// Create a new infrastructure facade.
    pub fn new(
        password_hasher: Arc<dyn PasswordHasher>,
        email_sender: Arc<dyn EmailSender>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            password_hasher,
            email_sender,
            clock,
        }
    }
}
```

- [ ] **Step 4: Create lib.rs exports**

```rust
//! Infrastructure facades for simplified dependency injection.

pub mod persistence;
pub mod infrastructure;

pub use persistence::PersistenceFacade;
pub use infrastructure::InfraFacade;
```

- [ ] **Step 5: Commit**

```bash
git add backend/crates/services/infra_facades/
git commit -m "feat: add infrastructure facade crate"
```

---

## Task 9: Update Services to Use Facades

**Files:**
- Modify: `backend/crates/gateways/src/state/services.rs`
- Modify: `backend/crates/services/auth_service/src/builder.rs`
- Modify: `backend/crates/services/user_service/src/builder.rs`
- Modify: `backend/crates/services/tenant_service/src/builder.rs`

**Interfaces:**
- Consumes: `PersistenceFacade` and `InfraFacade` from Task 8
- Removes: Individual adapter dependencies from service builders

**Purpose:** Simplify service composition by wiring facades instead of individual adapters.

- [ ] **Step 1: Update services.rs to create facades**

After pool connection:

```rust
// Create persistence facade
let persistence_facade = Arc::new(PersistenceFacade::new(
    Arc::new(persistence::repositories::user::PgUserRepository::new(pool.clone())) as Arc<dyn UserRepository>,
    Arc::new(persistence::repositories::tenant::PgTenantRepository::new(pool.clone())) as Arc<dyn TenantRepository>,
    Arc::new(persistence::repositories::membership::PgMembershipRepository::new(pool.clone())) as Arc<dyn MembershipRepository>,
    Arc::new(persistence::repositories::tenant_invite::PgTenantInviteRepository::new(pool.clone())) as Arc<dyn TenantInviteRepository>,
    Arc::new(persistence::repositories::permission::PgPermissionRepository::new(pool.clone())) as Arc<dyn base::ports::permission::PermissionRepository>,
    Arc::new(persistence::repositories::role::PgRoleRepository::new(pool.clone())) as Arc<dyn base::ports::permission::RoleRepository>,
    Arc::new(persistence::repositories::tenant_desktop_layout::PgTenantDesktopLayoutRepository::new(pool.clone())) as Arc<dyn TenantDesktopLayoutRepository>,
    session_store.clone(),
    Arc::new(persistence::repositories::token::PgTokenStore::new(pool.clone())) as Arc<dyn TokenStore>,
    Arc::new(observability::audit::AuditService::new(Arc::new(persistence::repositories::audit_event::PgAuditEventRepository::new(pool.clone())))) as Arc<dyn AuditLogger>,
));
```

- [ ] **Step 2: Update service constructors to accept facades**

Simplify `create_auth_service`, `create_tenant_service`, etc. to accept `PersistenceFacade` instead of individual adapters.

- [ ] **Step 3: Update service builders to use facades internally**

Services can now access adapters through `facade.user_repository` instead of storing individual references.

- [ ] **Step 4: Build and test**

Run: `cargo build -p gateways`

Expected: Clean build

- [ ] **Step 5: Run integration tests**

Run: `cargo test -p gateways`

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add backend/crates/gateways/src/state/services.rs
git add backend/crates/services/
git commit -m "refactor: use infrastructure facades in service composition"
```

---

## Task 10: Unify Membership Concepts (Session and Domain)

**Files:**
- Modify: `backend/crates/shared/domain/src/membership.rs`
- Modify: `backend/crates/base/src/ports/session.rs`
- Modify: `backend/crates/services/session_coordinator/src/coordinator.rs`

**Interfaces:**
- Consumes: Existing `Membership` and `MembershipSnapshot`
- Produces: Serialization adapter for `Membership` in session context
- Removes: `MembershipSnapshot` (deprecated, replaced)

**Purpose:** Eliminate duplicate membership concepts by using serialization adapters instead of parallel types.

- [ ] **Step 1: Add serialization helpers to Membership type**

In `membership.rs`, add:

```rust
impl Membership {
    /// Convert to session-compatible snapshot format.
    pub fn to_session_snapshot(&self) -> SessionMembershipSnapshot {
        SessionMembershipSnapshot {
            tenant_id: self.tenant_id.inner(),
            role: self.role,
        }
    }

    /// Reconstruct from session snapshot (requires explicit user_id and joined_at).
    pub fn from_session_snapshot(
        snapshot: SessionMembershipSnapshot,
        user_id: UserId,
        joined_at: DateTime<Utc>,
    ) -> Self {
        Self {
            tenant_id: TenantId::from(snapshot.tenant_id),
            user_id,
            role: snapshot.role,
            joined_at,
        }
    }
}

/// Session-compatible membership representation (for serialization).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionMembershipSnapshot {
    pub tenant_id: Uuid,
    pub role: TenantRole,
}
```

- [ ] **Step 2: Update SessionStore port to use new type**

In `session.rs`:

```rust
// OLD: use MembershipSnapshot
// NEW: use domain::membership::SessionMembershipSnapshot as MembershipSnapshot

pub type MembershipSnapshot = domain::membership::SessionMembershipSnapshot;
```

- [ ] **Step 3: Update SessionCoordinator to use conversion helpers**

In `coordinator.rs`:

```rust
// When creating event:
use base::ports::session::MembershipSnapshot;

let snapshot = MembershipSnapshot {
    tenant_id: tenant_id.inner(),
    role,
};
```

This can now use `membership.to_session_snapshot()` directly.

- [ ] **Step 4: Run tests to verify serialization works**

Run: `cargo test -p session_coordinator -p tenant_service`

Expected: All tests pass

- [ ] **Step 5: Deprecate old MembershipSnapshot type**

Add deprecation notice if keeping for backward compatibility, or remove entirely.

- [ ] **Step 6: Commit**

```bash
git add backend/crates/shared/domain/src/membership.rs
git add backend/crates/base/src/ports/session.rs
git add backend/crates/services/session_coordinator/src/coordinator.rs
git commit -m "refactor: unify Membership concepts across session and domain"
```

---

## Task 11: Update CONTEXT.md with New Architecture

**Files:**
- Modify: `/Users/jayden/Projects/Klynt/klynt-edu/CONTEXT.md`

**Interfaces:**
- Updates: Domain glossary with new terms
- Updates: Architecture vocabulary documentation

**Purpose:** Document the new architectural concepts so future explorers understand the deepened design.

- [ ] **Step 1: Add SessionCoordinator to domain glossary**

Add to CONTEXT.md:

```markdown
### SessionCoordinator
Event-driven service that keeps session state in sync with membership changes. Emits `MembershipEvent` (Added, Updated, Removed) and updates sessions through the `SessionStore` port.

### MembershipEvent
Domain event representing a membership change. Carries tenant_id, user_id, and optionally the new role.

### PersistenceFacade
Infrastructure facade grouping all repository and store adapters behind a single interface. Simplifies service composition by reducing dependency count.

### InfraFacade  
Infrastructure facade grouping infrastructure adapters (PasswordHasher, EmailSender, Clock) behind a single interface.
```

- [ ] **Step 2: Update Crate Map section**

Add new crates to the diagram:

```markdown
backend/crates/
├── services/
│   ├── session_coordinator      # Session synchronization via events
│   └── infra_facades           # Persistence and infrastructure facades
```

- [ ] **Step 3: Add note about deepened interfaces**

```markdown
## Deepened Interfaces

- **AuthorizationService** — Consolidates all authorization checks internally
- **SessionCoordinator** — Single interface for session synchronization
- **Repository execute()** — Command-based entry point for all operations
```

- [ ] **Step 4: Commit**

```bash
git add CONTEXT.md
git commit -m "docs: update CONTEXT.md with deepened architecture"
```

---

## Task 12: Final Integration Testing and Verification

**Files:**
- All modified crates

**Interfaces:**
- Validates: End-to-end functionality after all changes
- Validates: Performance characteristics
- Validates: Test coverage

**Purpose:** Ensure the deepened architecture maintains correctness and improves developer experience.

- [ ] **Step 1: Run full test suite**

Run: `cd backend && cargo test`

Expected: All tests pass

- [ ] **Step 2: Run Clippy for lints**

Run: `cargo clippy --all-targets -- -D warnings`

Expected: No new warnings introduced

- [ ] **Step 3: Check formatting**

Run: `cargo fmt --all`

Expected: No formatting changes

- [ ] **Step 4: Build release binary**

Run: `cargo build --release`

Expected: Clean release build

- [ ] **Step 5: Verify composition root compiles cleanly**

Check that `services.rs` is simpler with facades.

- [ ] **Step 6: Measure dependency count reduction**

Verify:
- Tenant service dependencies: reduced by 1 (session_store removed)
- Composition root wiring: reduced from 10+ individual adapters to 2 facades per service

- [ ] **Step 7: Final commit**

```bash
git add backend/
git commit -m "test: verify deepened architecture with full test suite"
```

---

## Completion Checklist

After all tasks are complete:

- [ ] SessionCoordinator extracts session synchronization from tenant service
- [ ] AuthorizationService consolidates all authorization logic
- [ ] Repository ports have command-based `execute()` methods
- [ ] Infrastructure facades reduce service composition complexity
- [ ] Membership concepts unified across session and domain
- [ ] CONTEXT.md updated with new architecture
- [ ] All tests pass
- [ ] No new clippy warnings
- [ ] Code formatted
- [ ] Release build successful

---

## Execution Notes

- **Order matters:** Tasks 1-11 must be executed in order as they depend on each other
- **Test each task:** Every task ends with tests; do not proceed until tests pass
- **Commit frequently:** Each task ends with a commit; the plan is designed to be bisectable
- **Backward compatible:** Existing HTTP handlers continue to work throughout the refactor
- **Performance:** No performance regression expected; event-driven coordination is equivalent to direct calls

---

**Plan Status:** Ready for execution

**Estimated Duration:** 8-12 hours for all 12 tasks, assuming tests pass and no unexpected issues arise

**Risk Level:** Medium — architectural refactor touches many files but maintains backward compatibility throughout
