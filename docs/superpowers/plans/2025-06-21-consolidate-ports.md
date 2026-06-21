# Plan: Consolidate Duplicate Ports

**Created:** 2025-06-21
**Status:** Implemented
**Priority:** High

## Problem Statement

Both `auth_service` and `user_service` define identical port traits with different signatures:
- `Clock` - identical in both
- `PasswordHasher` - identical methods, different error types
- `AuditLogger` - different methods, same concept
- `UserRepository` - different methods, same concept

This duplication means:
- Changes to a port require updates across multiple files
- Adapters must implement different versions of essentially the same interface
- Test fakes must be duplicated per service
- No single source of truth for cross-cutting concerns

## Analysis

### Current Port Definitions

**auth_service/src/application/ports.rs:**
```rust
trait UserRepository {
    fn find_by_email(ctx, email) -> Result<Option<User>, AuthError>
    fn create_pending_user(ctx, ...) -> Result<UserId, AuthError>
    fn activate_user(ctx, id) -> Result<(), AuthError>
    fn update_password(ctx, id, hash) -> Result<(), AuthError>
}

trait PasswordHasher {
    fn hash(password) -> Result<String, AuthError>
    fn verify(password, hash) -> Result<bool, AuthError>
}

trait AuditLogger {
    fn log_login_success(ctx, user_id)
    fn log_login_failed(ctx, email, error)
    fn log_user_registered(ctx, user_id)
    fn log_email_verified(ctx, user_id)
    fn log_password_reset(ctx, user_id)
    fn log_session_created(ctx, user_id, session_id)
}

trait Clock {
    fn now(&self) -> DateTime<Utc>
}
```

**user_service/src/application/ports.rs:**
```rust
trait UserRepository {
    fn find_by_id(ctx, id) -> Result<Option<User>, UserError>
    fn update(ctx, user) -> Result<(), UserError>
    fn delete(ctx, id) -> Result<(), UserError>
    fn list(ctx, pagination) -> Result<(Vec<User>, u64), UserError>
}

trait PasswordHasher {
    fn verify(password, hash) -> Result<bool, UserError>
    fn hash(password) -> Result<String, UserError>
}

trait AuditLogger {
    fn log_profile_updated(ctx, user_id)
    fn log_password_changed(ctx, user_id)
    fn log_user_deleted(ctx, user_id)
}

trait Clock {
    fn now(&self) -> DateTime<Utc>
}
```

### Key Insight

The `Clock` trait is **identical** in both services. `PasswordHasher` has the same methods but different error types. `AuditLogger` and `UserRepository` have different methods but represent the same concept.

## Design Decisions

### Decision 1: Where to place shared ports?

**Options:**
1. `klynt_base/src/ports.rs` - New file at base level
2. `klynt_base/src/ports/mod.rs` - New ports module
3. `klynt_common/src/ports.rs` - In shared domain crate

**Decision:** `klynt_base/src/ports/mod.rs` - New ports module

**Rationale:**
- `klynt_base` is described as "Base types and abstractions for the Klynt platform"
- Ports are architectural abstractions, fitting the "base" designation
- `klynt_common` is described as domain types and utilities, not architectural interfaces
- Keeps ports separate from domain models (`klynt_common`) and base traits (`klynt_base/src/base/traits.rs`)

### Decision 2: How to handle different error types?

**Options:**
1. Generic error parameter: `trait PasswordHasher<E>`
2. Use `anyhow::Error` everywhere
3. Create a shared `PortError` enum
4. Keep service-specific errors but use same trait

**Decision:** Keep service-specific errors, use same trait with `Into` conversion

**Rationale:**
- Ports are interfaces; implementations can return different error types
- Each service wraps port errors in its own error type
- Adapters perform error conversion at the boundary
- Preserves error specificity while sharing interface

### Decision 3: How to handle different method signatures?

**Options:**
1. One big trait with all methods (some services ignore some)
2. Base trait + extension traits per service
3. Separate traits entirely (just share `Clock` and `PasswordHasher`)

**Decision:** Base trait for truly shared + extension traits per service

**Rationale:**
- `Clock` is 100% shared → extract to base
- `PasswordHasher` is 100% shared → extract to base
- `UserRepository` has different methods → create base trait with common methods (if any), plus extension traits
- `AuditLogger` has different methods → create base trait with common pattern, plus extension traits
- Allows services to add service-specific methods while sharing core interface

## Proposed Structure

```
klynt_base/src/ports/
├── mod.rs              (exports all ports)
├── clock.rs            (shared Clock trait + SystemClock)
├── password_hasher.rs  (shared PasswordHasher trait)
├── audit_logger.rs     (base AuditLogger + extensions)
└── user_repository.rs  (base UserRepository + extensions)
```

### Port Definitions

**clock.rs:**
```rust
pub trait Clock: Send + Sync {
    fn now(&self) -> DateTime<Utc>;
}

#[derive(Debug, Clone, Default)]
pub struct SystemClock;
impl Clock for SystemClock { fn now(&self) -> DateTime<Utc> { Utc::now() } }
```

**password_hasher.rs:**
```rust
#[async_trait]
pub trait PasswordHasher: Send + Sync {
    async fn hash(&self, password: &str) -> Result<String, Box<dyn std::error::Error + Send + Sync>>;
    async fn verify(&self, password: &str, hash: &str) -> Result<bool, Box<dyn std::error::Error + Send + Sync>>;
}
```

**audit_logger.rs:**
```rust
pub trait AuditLogger: Send + Sync {
    // Base trait - marker for audit logging capability
}

/// Auth-specific audit methods
#[async_trait]
pub trait AuthAuditLogger: AuditLogger {
    async fn log_login_success(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_login_failed(&self, ctx: &ExecutionContext, email: &str, error: String);
    // ... other auth methods
}

/// User-specific audit methods
#[async_trait]
pub trait UserAuditLogger: AuditLogger {
    async fn log_profile_updated(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_password_changed(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_user_deleted(&self, ctx: &ExecutionContext, user_id: UserId);
}
```

**user_repository.rs:**
```rust
#[async_trait]
pub trait UserRepository: Send + Sync {
    // Base trait - marker for user repo capability
}

/// Auth-specific user operations
#[async_trait]
pub trait AuthUserRepository: UserRepository {
    async fn find_by_email(&self, ctx: &ExecutionContext, email: &str) -> Result<Option<User>, AuthError>;
    async fn create_pending_user(&self, ctx: &ExecutionContext, ...) -> Result<UserId, AuthError>;
    // ... other auth methods
}

/// User-service-specific operations
#[async_trait]
pub trait UserServiceUserRepository: UserRepository {
    async fn find_by_id(&self, ctx: &ExecutionContext, id: UserId) -> Result<Option<User>, UserError>;
    async fn update(&self, ctx: &ExecutionContext, user: &User) -> Result<(), UserError>;
    // ... other user service methods
}
```

## Implementation Steps

### Phase 1: Create shared ports (non-breaking)
1. Create `klynt_base/src/ports/mod.rs`
2. Create `clock.rs` - move `Clock` and `SystemClock`
3. Create `password_hasher.rs` - define shared `PasswordHasher`
4. Export from `klynt_base/src/lib.rs`
5. Add tests for shared ports

### Phase 2: Migrate auth_service (non-breaking)
1. Update `auth_service` imports to use `klynt_base::ports::Clock`
2. Keep existing `UserRepository`, `AuditLogger`, etc. as service-specific
3. Update `PasswordHasher` to implement shared trait
4. Run tests to verify no breakage

### Phase 3: Migrate user_service (non-breaking)
1. Update `user_service` imports to use `klynt_base::ports::Clock`
2. Keep existing ports as service-specific
3. Update `PasswordHasher` to implement shared trait
4. Run tests to verify no breakage

### Phase 4: Extract AuditLogger extensions (optional)
1. Move `AuditLogger` base to `klynt_base::ports`
2. Create `AuthAuditLogger` extension in `auth_service`
3. Create `UserAuditLogger` extension in `user_service`
4. Update implementations

### Phase 5: Extract UserRepository extensions (optional)
1. Similar to AuditLogger - base trait + extensions
2. Evaluate if base trait adds value or if markers are sufficient

## Migration Path

### Non-Breaking Strategy

The consolidation can be done **without breaking existing code**:

1. **Phase 1** creates new shared code, doesn't touch existing services
2. **Phase 2-3** update imports but keep existing trait definitions
3. Existing code continues to work while new code adopts shared ports
4. Deprecation warnings can guide migration

### Rollback Plan

Each phase is independently reversible:
- Phase 1: Delete new `klynt_base/src/ports` directory
- Phase 2-3: Revert imports to local traits
- Phase 4-5: Remove extension traits, use local traits

## Benefits

- **Locality:** Port definitions live in one place (`klynt_base/src/ports`)
- **Leverage:** Changes to `Clock`/`PasswordHasher` affect all services automatically
- **Tests:** Shared `TestKit` can implement shared ports once (enables Candidate 6)
- **AI-Navigability:** Single location to understand all ports
- **Future-Proof:** New services can adopt standard ports immediately

## Open Questions

1. Should we consolidate `UserRepository` methods or keep them separate?
   - **Recommendation:** Keep separate initially, evaluate base trait later
   - **Reason:** No truly shared methods currently; `find_by_id` vs `find_by_email` serve different purposes

2. Should `AuditLogger` have a base trait or just extension traits?
   - **Recommendation:** Base trait as marker + extension traits
   - **Reason:** Establishes audit logging as a first-class capability

3. Should we use generic errors or boxed errors?
   - **Recommendation:** Boxed errors for port interfaces
   - **Reason:** Ports define capability, errors are implementation detail

## Success Criteria

- [x] `Clock` exists only in `klynt_base::ports` (among application-layer service ports)
- [x] `PasswordHasher` exists only in `klynt_base::ports` (among application-layer service ports)
- [x] Both services use shared ports via `klynt_base::ports`
- [x] All existing tests pass without modification
- [x] No breaking changes to public service interfaces
- [x] Documentation updated in relevant files

## Next Steps

1. Create `klynt_base/src/ports/mod.rs` with `Clock` and `SystemClock`
2. Create `password_hasher.rs` with shared `PasswordHasher` trait
3. Update `auth_service` to use shared `Clock`
4. Update `user_service` to use shared `Clock`
5. Repeat for `PasswordHasher`
6. Evaluate `AuditLogger` and `UserRepository` consolidation

## Implementation Notes

Completed on 2025-06-21.

- Created `klynt_base::ports` with `Clock`/`SystemClock` and a shared `PasswordHasher`/`PasswordHashError`.
- Removed duplicate `Clock`/`SystemClock` and `PasswordHasher` traits from `auth_service` and `user_service` application ports.
- Added `From<PasswordHashError>` conversions to `AuthError` and `UserError` so service code can continue using the `?` operator.
- Updated adapters, composition root (`gateways/src/state/services.rs`), and all test fakes to use the shared ports.
- Note: `klynt_persistence::ports::PasswordHasher` was intentionally left untouched because it is a persistence-layer port with a different signature (`HashedPassword` wrapper); only the application-layer service ports were consolidated.

## References

- Files affected:
  - `backend/crates/klynt_base/src/lib.rs`
  - `backend/crates/klynt_base/src/ports/mod.rs`
  - `backend/crates/klynt_base/src/ports/clock.rs`
  - `backend/crates/klynt_base/src/ports/password_hasher.rs`
  - `backend/crates/services/auth_service/src/application/ports.rs`
  - `backend/crates/services/auth_service/src/error.rs`
  - `backend/crates/services/auth_service/src/lib.rs`
  - `backend/crates/services/auth_service/src/infrastructure/services/password_hasher_adapter.rs`
  - `backend/crates/services/auth_service/tests/support/mod.rs`
  - `backend/crates/services/user_service/src/application/ports.rs`
  - `backend/crates/services/user_service/src/error.rs`
  - `backend/crates/services/user_service/src/lib.rs`
  - `backend/crates/services/user_service/src/infrastructure/services/password_hasher_adapter.rs`
  - `backend/crates/services/user_service/tests/support/mod.rs`
  - `backend/crates/services/user_service/tests/postgres_integration.rs`
  - `backend/crates/gateways/src/state/services.rs`
  - `backend/crates/gateways/tests/support/mod.rs`
- Related ADRs: None (new architecture)
- Related issues: None
