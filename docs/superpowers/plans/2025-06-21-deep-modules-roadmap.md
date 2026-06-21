# Plan: Deep Modules Roadmap

**Created:** 2025-06-21
**Status:** In Progress
**Priority:** High

## Overview

This plan addresses Candidates 2-6 from the Architecture Review, implementing deep module principles throughout the backend. These candidates are designed to be executed incrementally, with each building on the foundation of Candidate 1 (Consolidate Duplicate Ports).

**Prerequisites:** Candidate 1 (Consolidate Duplicate Ports) should be completed first, as it enables several other candidates.

## Candidates Summary

| Candidate | Title | Strength | Dependencies | Effort |
|-----------|-------|----------|--------------|--------|
| 1 | Consolidate Duplicate Ports | Strong | None | Medium |
| 2 | Consolidate Type Systems | Strong | None | High |
| 3 | Unify Execution Context | Worth exploring | 2 | Medium |
| 4 | Simplify Service Construction | Worth exploring | 1 | Medium |
| 5 | Extract Error Mapping Adapter | Speculative | 2 | Low |
| 6 | Reduce Test Surface Area | Worth exploring | 1 | Medium |

*Note: Candidate 1 is implemented separately. This plan covers Candidates 2-6.*

---

## Candidate 2: Consolidate Type Systems

**Strength:** Strong
**Effort:** High
**Dependencies:** None (can run parallel to Candidate 1)

### Problem Statement

Three type systems create constant conversion overhead:
1. `klynt_persistence` types (legacy database models)
2. `klynt_common` types (shared domain models)
3. Service-specific types (auth/user models)

Every adapter method performs bidirectional conversion via `conversion.rs`. Bugs hide in conversion logic that's only visible when stepping through the call chain.

### Current State

**Type System Flow:**
```
Database (klynt_persistence::User)
    ↓ to_legacy_user()
Service Model (auth_service::models::User)
    ↓ into()
Contract (klynt_common::contracts::auth::UserSessionInfo)
```

**Conversion Example:**
```rust
// auth_service/src/infrastructure/conversion.rs
pub fn from_legacy_user(user: klynt_persistence::repositories::User) -> crate::models::User {
    crate::models::User {
        id: from_legacy_user_id(user.id),
        email: user.email.as_str().to_string(),
        password_hash: user.password_hash,
        full_name: Some(user.name),
        status: from_legacy_status(user.status),
        role: from_legacy_role(user.role),
        created_at: user.created_at,
    }
}
```

### Design Decisions

#### Decision 1: Which type system to standardize on?

**Options:**
1. Keep `klynt_persistence` types as the source of truth
2. Standardize on `klynt_common` types as the canonical domain model
3. Create entirely new domain types in a `klynt_domain` crate

**Decision:** Standardize on `klynt_common` types

**Rationale:**
- `klynt_common` is already positioned as "shared domain types"
- Persistence types are implementation details of the storage layer
- Service-specific types add unnecessary indirection
- Aligns with the repository pattern where repositories return domain models

#### Decision 2: How to handle persistence-specific fields?

**Options:**
1. Add persistence fields to domain models (violates separation)
2. Use separate persistence models that convert to domain models
3. Use metadata/extension pattern for persistence-specific data

**Decision:** Separate persistence models that convert to domain models

**Rationale:**
- Database-specific fields (like `institution_id`, `global_role`) shouldn't leak to domain
- Conversion happens at the repository boundary
- Domain models remain pure and framework-agnostic
- Allows persistence schema to evolve independently

#### Decision 3: Where to put domain types?

**Options:**
1. Keep in `klynt_common/src/domain/`
2. Move to `klynt_base/src/domain/`
3. Create new `klynt_domain` crate

**Decision:** Keep in `klynt_common/src/domain/`

**Rationale:**
- Already exists and is well-positioned
- `klynt_base` is for architectural abstractions, not domain models
- Creating a new crate adds overhead without clear benefit

### Proposed Structure

```
klynt_common/src/domain/
├── mod.rs              (exports all domain types)
├── user.rs             (User domain model + related types)
├── auth.rs             (Auth-specific domain models)
├── session.rs          (Session domain model)
├── token.rs            (Token domain model)
└── types.rs            (shared types: UserId, Email, Role, etc.)
```

**Domain Model Example:**
```rust
// klynt_common/src/domain/user.rs
use crate::types::{UserId, Email, UserRole, UserStatus};

/// User domain model - pure, framework-agnostic
pub struct User {
    pub id: UserId,
    pub email: Email,
    pub password_hash: String,
    pub full_name: Option<String>,
    pub role: UserRole,
    pub status: UserStatus,
    pub email_verified_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

impl User {
    pub fn new_pending(email: Email, password_hash: String, full_name: Option<String>) -> Self { ... }
    pub fn activate(&mut self) -> Result<(), DomainError> { ... }
    pub fn is_active(&self) -> bool { ... }
}

/// User profile for display (excludes sensitive data)
pub struct UserProfile {
    pub id: UserId,
    pub email: Email,
    pub full_name: Option<String>,
    pub role: UserRole,
    pub status: UserStatus,
}

impl From<User> for UserProfile {
    fn from(user: User) -> Self { ... }
}
```

### Implementation Steps

#### Phase 1: Audit current types
1. Document all types in `klynt_persistence::repositories`
2. Document all types in `klynt_common::domain`
3. Document all types in service `models/` directories
4. Create mapping document showing type conversions

#### Phase 2: Establish canonical domain models
1. Review and consolidate `klynt_common::domain` types
2. Add missing domain types (Session, Token if not present)
3. Add domain methods (business logic) to domain models
4. Ensure domain models are framework-agnostic

#### Phase 3: Update persistence adapters
1. Modify repositories to return `klynt_common::domain` types
2. Move conversion logic into repository implementations
3. Update `klynt_persistence` types to be internal-only
4. Add tests for repository conversions

#### Phase 4: Update services
1. Remove service-specific `models/` directories
2. Update services to use `klynt_common::domain` types directly
3. Remove `conversion.rs` files
4. Update port interfaces to use domain types

#### Phase 5: Update contracts
1. Review `klynt_common::contracts` types
2. Ensure contracts are DTOs, not domain models
3. Add conversion between domain models and contracts at boundaries
4. Update API layer to handle contract conversion

### Migration Path

**Non-Breaking Strategy:**
1. Phase 1-2 add new code, don't modify existing
2. Phase 3-4 update implementations, keep tests passing
3. Deprecation warnings guide migration
4. Remove old types after migration complete

**Rollback Plan:**
- Each phase is independently reversible
- Git revert per phase if needed

### Success Criteria

- [ ] Service-specific `models/` directories removed
- [ ] `conversion.rs` files removed
- [ ] All services use `klynt_common::domain` types
- [ ] Persistence types are private to `klynt_persistence`
- [ ] All tests pass
- [ ] Documentation updated

---

## Candidate 3: Unify Execution Context

**Strength:** Worth exploring
**Effort:** Medium
**Dependencies:** Candidate 2 (type system consolidation)

### Problem Statement

Two context types coexist: legacy `Ctx` and new `ExecutionContext`. Every adapter must call `to_legacy_ctx()` before calling persistence. The `ExecutionContext` is passed through every layer as the first parameter, creating tight coupling.

### Current State

**Dual Context Types:**
```rust
// klynt_base/src/ctx/context.rs (legacy)
pub struct Ctx {
    pub request_id: Uuid,
    pub user_id: Option<UserId>,
}

// klynt_base/src/ctx/request_context.rs (new)
pub struct RequestContext {
    pub request_id: RequestId,
    pub actor: Option<Actor>,
}

pub struct ExecutionContext {
    pub request: RequestContext,
    pub actor_id: Option<Uuid>,
}
```

**Conversion in Every Adapter:**
```rust
// Called in every adapter method
pub fn to_legacy_ctx(ctx: &ExecutionContext) -> klynt_base::ctx::Ctx {
    let actor_id = ctx.actor_id.map(klynt_common::util::UserId);
    klynt_base::ctx::Ctx {
        request_id: ctx.request.request_id.0,
        user_id: actor_id,
    }
}
```

### Design Decisions

#### Decision 1: Which context to keep?

**Options:**
1. Keep legacy `Ctx`, remove `ExecutionContext`
2. Keep `ExecutionContext`, remove `Ctx`
3. Merge into a single new context type

**Decision:** Keep `ExecutionContext`, remove `Ctx`

**Rationale:**
- `ExecutionContext` is more feature-complete (actor tracking, richer metadata)
- `ExecutionContext` is newer and better-designed
- Migration path is clear (update persistence to accept new context)

#### Decision 2: How to handle context propagation?

**Options:**
1. Keep passing as first parameter (current approach)
2. Use thread-local storage
3. Use opaque context handle

**Decision:** Keep passing as first parameter initially, evaluate thread-local later

**Rationale:**
- Explicit propagation is clearer and more testable
- Thread-local storage complicates testing
- Can revisit for performance if needed
- Opaque handles add complexity without clear benefit

#### Decision 3: What about RequestContext vs ExecutionContext?

**Options:**
1. Collapse into single type
2. Keep separation (RequestContext is immutable, ExecutionContext is mutable)

**Decision:** Keep separation initially, evaluate collapsing later

**Rationale:**
- Separation has value (immutable request context, mutable execution context)
- Can collapse if distinction doesn't prove useful
- Non-breaking to keep both

### Implementation Steps

#### Phase 1: Update persistence layer
1. Update `klynt_persistence` repositories to accept `ExecutionContext`
2. Update all repository method signatures
3. Update repository implementations
4. Run persistence tests

#### Phase 2: Update adapters
1. Remove `to_legacy_ctx()` calls from adapters
2. Pass `ExecutionContext` directly to repositories
3. Update adapter tests
4. Run adapter tests

#### Phase 3: Remove legacy context
1. Remove `klynt_base/src/ctx/context.rs`
2. Update imports across codebase
3. Update documentation
4. Run full test suite

#### Phase 4: (Optional) Evaluate thread-local
1. Measure performance impact of context passing
2. If significant, prototype thread-local approach
3. A/B test performance
4. Decide whether to adopt

### Migration Path

**Breaking Change:** This is a breaking change for the persistence layer.

**Strategy:**
1. Phase 1 adds support for `ExecutionContext` alongside `Ctx`
2. Phase 2 migrates adapters one at a time
3. Phase 3 removes `Ctx` once all adapters migrated
4. Rollback: revert to previous persistence layer

### Success Criteria

- [ ] `to_legacy_ctx()` calls removed from all adapters
- [ ] `klynt_base/src/ctx/context.rs` deleted
- [ ] All repositories accept `ExecutionContext`
- [ ] All tests pass
- [ ] No performance regression

---

## Candidate 4: Simplify Service Construction

**Strength:** Worth exploring
**Effort:** Medium
**Dependencies:** Candidate 1 (consolidated ports)

### Problem Statement

Creating a service requires manually wiring 7 dependencies for auth, 4 for user. The composition root must know each service's internal structure. Adding a new dependency requires changes in multiple places.

### Current State

**Manual Dependency Wiring:**
```rust
// gateways/src/state/services.rs:78-135
let user_repository = Arc::new(AuthUserRepositoryAdapter::new(PgUserRepository::new(pool.clone())));
let session_store = Arc::new(SessionRepositoryAdapter::new(PgSessionStore::new(pool.clone())));
let token_store = Arc::new(TokenRepositoryAdapter::new(PgTokenStore::new(pool.clone())));
let audit_logger = Arc::new(AuthAuditLoggerAdapter::new(audit_service));
let email_sender = Arc::new(EmailSenderAdapter::new(email_service));
let password_hasher: Arc<dyn auth_service::application::ports::PasswordHasher> = ...;
let clock: Arc<dyn auth_service::application::ports::Clock> = ...;

let auth_service = AuthService::new(
    AuthConfig { ... },
    AuthDependencies {
        user_repository,
        session_store,
        token_store,
        email_sender,
        audit_logger,
        password_hasher,
        clock,
    },
)?;
```

### Design Decisions

#### Decision 1: What approach to use for simplification?

**Options:**
1. Builder pattern per service
2. Dependency injection container
3. Factory functions with sensible defaults
4. Config-driven dependency resolution

**Decision:** Builder pattern per service

**Rationale:**
- Builders are idiomatic in Rust
- Clearer than DI containers for this scale
- Allows service-specific configuration
- Testable (builders can have `test()` methods)
- Doesn't require external dependencies

#### Decision 2: Where to put builders?

**Options:**
1. In each service crate
2. In shared `klynt_base` crate
3. In `gateways` crate

**Decision:** In each service crate

**Rationale:**
- Builders are service-specific
- Keeps services self-contained
- `klynt_base` shouldn't know about service construction
- `gateways` is for HTTP, not service construction

### Proposed Structure

**Service Builder Example:**
```rust
// auth_service/src/lib.rs
impl AuthService {
    pub fn builder() -> AuthBuilder {
        AuthBuilder::new()
    }
}

pub struct AuthBuilder {
    config: Option<AuthConfig>,
    pool: Option<sqlx::PgPool>,
    // Optional overrides
    password_hasher: Option<Arc<dyn PasswordHasher>>,
    clock: Option<Arc<dyn Clock>>,
}

impl AuthBuilder {
    pub fn new() -> Self {
        Self {
            config: None,
            pool: None,
            password_hasher: None,
            clock: None,
        }
    }

    pub fn with_config(mut self, config: AuthConfig) -> Self {
        self.config = Some(config);
        self
    }

    pub fn with_pool(mut self, pool: sqlx::PgPool) -> Self {
        self.pool = Some(pool);
        self
    }

    /// For testing - override default implementations
    pub fn with_password_hasher(mut self, hasher: Arc<dyn PasswordHasher>) -> Self {
        self.password_hasher = Some(hasher);
        self
    }

    pub async fn build(self) -> Result<AuthService, AuthError> {
        let pool = self.pool.ok_or_else(|| AuthError::Internal("Pool required".into()))?;
        let config = self.config.unwrap_or_default();

        // Create default implementations
        let user_repository = Arc::new(AuthUserRepositoryAdapter::new(PgUserRepository::new(pool.clone())));
        let session_store = Arc::new(SessionRepositoryAdapter::new(PgSessionStore::new(pool.clone())));
        let token_store = Arc::new(TokenRepositoryAdapter::new(PgTokenStore::new(pool.clone())));
        let audit_logger = create_default_audit_logger(pool.clone());
        let email_sender = create_default_email_sender();
        let password_hasher = self.password_hasher.unwrap_or_else(|| Arc::new(AuthPasswordHasherAdapter::new(Argon2PasswordHasher::new())));
        let clock = self.clock.unwrap_or_else(|| Arc::new(SystemClock));

        AuthService::new(config, Dependencies { ... })
    }

    /// Test-specific build with in-memory implementations
    #[cfg(test)]
    pub fn build_test(self) -> Result<AuthService, AuthError> {
        // Use TestKit implementations
        ...
    }
}
```

**Usage in Composition Root:**
```rust
// gateways/src/state/services.rs
pub async fn from_config(config: &Config) -> Result<Self, crate::GatewayError> {
    let pool = sqlx::PgPool::connect(&config.database_url).await?;

    let auth_service = AuthService::builder()
        .with_config(AuthConfig {
            base_url: config.base_url.clone(),
            session_duration_secs: 86400,
            token_duration_secs: 3600,
            password_policy: None,
        })
        .with_pool(pool.clone())
        .build()
        .await?;

    let user_service = UserService::builder()
        .with_config(UserConfig::default())
        .with_pool(pool)
        .build()
        .await?;

    Ok(Self { auth: Arc::new(auth_service), user: Arc::new(user_service) })
}
```

### Implementation Steps

#### Phase 1: Create builders for each service
1. Add `AuthBuilder` to `auth_service`
2. Add `UserBuilder` to `user_service`
3. Implement `with_config()`, `with_pool()`, `build()` methods
4. Add `build_test()` methods for testing

#### Phase 2: Update composition root
1. Replace manual dependency wiring with builder calls
2. Simplify `Services::from_config()`
3. Add tests for builder construction

#### Phase 3: Update service constructors
1. Keep `new()` for backward compatibility initially
2. Mark `new()` as deprecated
3. Migrate internal usage to builders
4. Remove `new()` after migration period

#### Phase 4: Add test utilities
1. Create `build_test()` methods using TestKit
2. Update service tests to use builders
3. Remove manual test setup code

### Migration Path

**Non-Breaking Strategy:**
1. Phase 1-2 add builders, keep existing code working
2. Phase 3 migrates to builders, deprecates `new()`
3. Phase 4 leverages builders for tests

**Rollback Plan:**
- Builders can be removed if they don't prove useful
- Keep `new()` methods as fallback

### Success Criteria

- [x] `Services::from_config()` is ~50% shorter
- [x] Adding a dependency doesn't require composition root changes
- [ ] Test setup uses `build_test()` methods (deferred to Candidate 6 — requires TestKit)
- [x] All tests pass
- [x] Documentation updated

### Implementation Notes

Implemented on 2025-06-21.

- Added `AuthBuilder` in `auth_service/src/builder.rs` and `UserBuilder` in `user_service/src/builder.rs`.
- Builders require a `sqlx::PgPool` and wire default adapters; every dependency can be overridden via `with_*` methods.
- Kept `AuthService::new` and `UserService::new` as non-deprecated constructors for tests and custom injection.
- Replaced manual wiring in `gateways/src/state/services.rs` with builder calls, reducing `from_config` and helpers significantly.
- Updated `auth_service/README.md` with builder usage.

---

## Candidate 5: Extract Error Mapping Adapter

**Strength:** Speculative
**Effort:** Low
**Dependencies:** Candidate 2 (type system consolidation)

### Problem Statement

The `GatewayError::status_code()` method contains nested pattern matching over every domain error variant. Adding a new domain error requires updating this 80-line function.

### Current State

**Error Mapping Function:**
```rust
// gateways/src/error.rs:60-143
impl GatewayError {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::Auth(auth_error) => match auth_error {
                auth_service::AuthError::InvalidCredentials => StatusCode::UNAUTHORIZED,
                auth_service::AuthError::AccountInactive => StatusCode::UNAUTHORIZED,
                auth_service::AuthError::Domain(domain_error) => match domain_error {
                    klynt_common::domain::DomainError::InvalidInput(_) => StatusCode::BAD_REQUEST,
                    klynt_common::domain::DomainError::NotFound(_) => StatusCode::NOT_FOUND,
                    // ... many more variants
                }
            }
            // ... more nested matching
        }
    }
}
```

### Design Decisions

#### Decision 1: Where to put HTTP status logic?

**Options:**
1. Add `to_http_status()` method to each error type
2. Create a separate `HttpError` trait
3. Create an error mapping adapter

**Decision:** Create an `HttpError` trait with blanket implementation

**Rationale:**
- Trait-based approach allows centralized implementation
- Blanket impl can handle common cases
- Errors can override default behavior if needed
- Keeps error semantics with the error definition

#### Decision 2: How to handle nested errors?

**Options:**
1. Flatten all errors into GatewayError variants
2. Keep nested errors, implement trait for each
3. Use macro to generate implementations

**Decision:** Keep nested errors, implement trait for each

**Rationale:**
- Preserves error type specificity
- Allows services to own their error types
- Trait approach is flexible
- Macro can reduce boilerplate if needed

### Proposed Structure

**HttpError Trait:**
```rust
// klynt_base/src/ports/http_error.rs
use axum::http::StatusCode;

pub trait HttpError {
    fn status_code(&self) -> StatusCode {
        StatusCode::INTERNAL_SERVER_ERROR
    }

    fn error_code(&self) -> &'static str {
        "INTERNAL_SERVER_ERROR"
    }
}

// Blanket implementation for common errors
impl<E> HttpError for anyhow::Error {
    fn status_code(&self) -> StatusCode {
        StatusCode::INTERNAL_SERVER_ERROR
    }
}
```

**Service Error Implementations:**
```rust
// auth_service/src/error.rs
impl HttpError for AuthError {
    fn status_code(&self) -> StatusCode {
        match self {
            AuthError::InvalidCredentials => StatusCode::UNAUTHORIZED,
            AuthError::AccountInactive => StatusCode::UNAUTHORIZED,
            AuthError::InvalidToken => StatusCode::BAD_REQUEST,
            AuthError::UserNotFound => StatusCode::NOT_FOUND,
            AuthError::RateLimited => StatusCode::TOO_MANY_REQUESTS,
            AuthError::PasswordPolicy(_) => StatusCode::BAD_REQUEST,
            AuthError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AuthError::Domain(err) => err.status_code(),
        }
    }

    fn error_code(&self) -> &'static str {
        match self {
            AuthError::InvalidCredentials => "UNAUTHORIZED",
            AuthError::UserNotFound => "NOT_FOUND",
            // ...
        }
    }
}
```

**Gateway Usage:**
```rust
// gateways/src/error.rs
impl IntoResponse for GatewayError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let code = self.error_code();
        let body = serde_json::json!({
            "success": false,
            "error": self.to_string(),
            "code": code,
        });
        (status, Json(body)).into_response()
    }
}

impl GatewayError {
    fn status_code(&self) -> StatusCode {
        match self {
            GatewayError::Auth(err) => err.status_code(),
            GatewayError::User(err) => err.status_code(),
            GatewayError::BadRequest(_) => StatusCode::BAD_REQUEST,
            GatewayError::NotFound(_) => StatusCode::NOT_FOUND,
            // ... other GatewayError variants
        }
    }

    fn error_code(&self) -> &'static str { ... }
}
```

### Implementation Steps

#### Phase 1: Create HttpError trait
1. Add `HttpError` trait to `klynt_base`
2. Add blanket implementations
3. Add documentation

#### Phase 2: Implement for service errors
1. Implement `HttpError` for `AuthError`
2. Implement `HttpError` for `UserError`
3. Implement `HttpError` for `DomainError`
4. Add tests for status code mappings

#### Phase 3: Update gateway
1. Simplify `GatewayError::status_code()` to delegate
2. Add `GatewayError::error_code()`
3. Update `IntoResponse` implementation
4. Add tests

#### Phase 4: Add macro (optional)
1. Create derive macro for `HttpError`
2. Use macro for boilerplate reduction
3. Update implementations

### Migration Path

**Non-Breaking Strategy:**
1. Phase 1-2 add `HttpError` implementations alongside existing code
2. Phase 3 updates gateway to use `HttpError`
3. Old mapping function can be removed after verification

**Rollback Plan:**
- Remove `HttpError` trait
- Keep old `status_code()` function

### Success Criteria

- [ ] `GatewayError::status_code()` is ~20 lines instead of 80
- [ ] Adding an error doesn't require gateway changes
- [ ] All service errors implement `HttpError`
- [ ] All tests pass
- [ ] Documentation updated

---

## Candidate 6: Reduce Test Surface Area

**Strength:** Worth exploring
**Effort:** Medium
**Dependencies:** Candidate 1 (consolidated ports), Candidate 4 (builders)

### Problem Statement

Testing auth service requires 6 different fake implementations. The test support file is 316 lines—nearly as long as the service implementation. Integration tests require complex session creation and token management.

### Current State

**Test Fakes Per Service:**
```rust
// auth_service/tests/support/mod.rs (316 lines)
pub struct FakeUserRepository { ... }
pub struct FakeSessionStore { ... }
pub struct FakeTokenStore { ... }
pub struct FakeEmailSender { ... }
pub struct FakeAuditLogger { ... }
pub struct FakePasswordHasher { ... }
```

**Integration Test Complexity:**
```rust
// gateways/tests/integration.rs:277-310
let session_id = Uuid::new_v4();
let user_id = UserId::new();
let session = Session {
    id: session_id,
    user_id,
    expires_at: Utc::now() + Duration::hours(24),
    created_at: Utc::now(),
};
sqlx::query("INSERT INTO sessions ...")
    .bind(session_id)
    .bind(user_id)
    .bind(expires_at)
    .execute(&pool)
    .await?;
```

### Design Decisions

#### Decision 1: Where to put test utilities?

**Options:**
1. In each service crate
2. In `klynt_base` as a `testkit` module
3. In a separate `klynt_testkit` crate
4. In `gateways` test directory

**Decision:** In `klynt_base` as a `testkit` module with feature flag

**Rationale:**
- Shared location accessible by all services
- Feature flag (`testkit`) keeps it out of production builds
- `klynt_base` is already the architectural foundation
- Separate crate adds overhead

#### Decision 2: In-memory implementations vs fakes?

**Options:**
1. Create fake implementations that return canned responses
2. Create in-memory implementations that actually work
3. Use test containers with real databases

**Decision:** In-memory implementations with real behavior

**Rationale:**
- More reliable than canned responses
- Tests actual logic, not implementation
- Faster than test containers
- Can be reused across services

### Proposed Structure

```
klynt_base/src/testkit/
├── mod.rs              (exports testkit)
├── clock.rs            (TestClock that can be frozen)
├── repositories.rs     (InMemoryUserRepository, etc.)
├── stores.rs           (InMemorySessionStore, InMemoryTokenStore)
├── services.rs         (InMemoryAuditLogger, InMemoryEmailSender)
├── crypto.rs           (InMemoryPasswordHasher)
└── helpers.rs          (test setup helpers)
```

**TestKit Example:**
```rust
// klynt_base/src/testkit/mod.rs
pub struct TestKit {
    pub clock: Arc<TestClock>,
    pub user_repository: Arc<InMemoryUserRepository>,
    pub session_store: Arc<InMemorySessionStore>,
    pub token_store: Arc<InMemoryTokenStore>,
    pub email_sender: Arc<InMemoryEmailSender>,
    pub audit_logger: Arc<InMemoryAuditLogger>,
    pub password_hasher: Arc<InMemoryPasswordHasher>,
}

impl TestKit {
    pub fn new() -> Self {
        Self {
            clock: Arc::new(TestClock::new()),
            user_repository: Arc::new(InMemoryUserRepository::new()),
            session_store: Arc::new(InMemorySessionStore::new()),
            token_store: Arc::new(InMemoryTokenStore::new()),
            email_sender: Arc::new(InMemoryEmailSender::new()),
            audit_logger: Arc::new(InMemoryAuditLogger::new()),
            password_hasher: Arc::new(InMemoryPasswordHasher::new()),
        }
    }

    /// Create an auth service with test dependencies
    pub fn auth_service(&self) -> AuthService {
        AuthService::builder()
            .with_config(AuthConfig::default())
            .with_test_dependencies(self.clone())
            .build()
            .unwrap()
    }

    /// Create a user service with test dependencies
    pub fn user_service(&self) -> UserService {
        UserService::builder()
            .with_config(UserConfig::default())
            .with_test_dependencies(self.clone())
            .build()
            .unwrap()
    }

    /// Helper to create a test user
    pub async fn create_test_user(&self, email: &str) -> User {
        let user = User::new_pending(
            Email::parse(email).unwrap(),
            "hash".to_string(),
            Some("Test User".to_string()),
        );
        self.user_repository.users.lock().unwrap().insert(user.id, user.clone());
        user
    }
}

// In-memory implementations with real behavior
pub struct InMemoryUserRepository {
    pub users: Arc<Mutex<HashMap<UserId, User>>>,
}

impl InMemoryUserRepository {
    pub fn new() -> Self {
        Self { users: Arc::new(Mutex::new(HashMap::new())) }
    }
}

#[async_trait]
impl UserRepository for InMemoryUserRepository {
    async fn find_by_email(&self, _ctx: &ExecutionContext, email: &str) -> Result<Option<User>, AuthError> {
        let users = self.users.lock().unwrap();
        Ok(users.values().find(|u| u.email.as_str() == email).cloned())
    }
    // ... other methods
}
```

**TestClock Example:**
```rust
// klynt_base/src/testkit/clock.rs
pub struct TestClock {
    frozen_at: Arc<Mutex<Option<DateTime<Utc>>>>,
}

impl TestClock {
    pub fn new() -> Self {
        Self { frozen_at: Arc::new(Mutex::new(None)) }
    }

    pub fn freeze_at(&self, time: DateTime<Utc>) {
        *self.frozen_at.lock().unwrap() = Some(time);
    }

    pub fn unfreeze(&self) {
        *self.frozen_at.lock().unwrap() = None;
    }
}

impl Clock for TestClock {
    fn now(&self) -> DateTime<Utc> {
        match *self.frozen_at.lock().unwrap() {
            Some(time) => time,
            None => Utc::now(),
        }
    }
}
```

**Integration Test Helpers:**
```rust
// klynt_base/src/testkit/helpers.rs
pub struct IntegrationTestHelper {
    pub pool: sqlx::PgPool,
}

impl IntegrationTestHelper {
    /// Clean all test data
    pub async fn clean(&self) -> Result<(), Box<dyn std::error::Error>> {
        sqlx::query("DELETE FROM sessions")
            .execute(&self.pool)
            .await?;
        sqlx::query("DELETE FROM tokens")
            .execute(&self.pool)
            .await?;
        sqlx::query("DELETE FROM users")
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Create a test session
    pub async fn create_session(&self, user_id: UserId, expires_in: Duration) -> Uuid {
        let session_id = Uuid::new_v4();
        sqlx::query("INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)")
            .bind(session_id)
            .bind(user_id)
            .bind(Utc::now() + expires_in)
            .execute(&self.pool)
            .await
            .unwrap();
        session_id
    }

    /// Get session for authentication middleware testing
    pub async fn create_auth_session(&self, user: &User) -> String {
        let session_id = self.create_session(user.id, Duration::hours(24)).await;
        // Return session token
        format!("{}:{}", session_id, user.id)
    }
}
```

### Implementation Steps

#### Phase 1: Create testkit module
1. Add `testkit` module to `klynt_base` with feature flag
2. Create `TestKit` struct
3. Implement `TestClock`
4. Add tests

#### Phase 2: Create in-memory implementations
1. Implement `InMemoryUserRepository`
2. Implement `InMemorySessionStore`, `InMemoryTokenStore`
3. Implement `InMemoryAuditLogger`, `InMemoryEmailSender`
4. Implement `InMemoryPasswordHasher`
5. Add tests for each

#### Phase 3: Update service tests
1. Remove service-specific `tests/support/mod.rs`
2. Update tests to use `TestKit`
3. Verify all tests pass
4. Measure lines of code reduction

#### Phase 4: Create integration test helpers
1. Create `IntegrationTestHelper`
2. Add helper methods for common operations
3. Update integration tests
4. Verify all tests pass

### Migration Path

**Non-Breaking Strategy:**
1. Phase 1-2 add `testkit`, don't modify existing tests
2. Phase 3 migrates tests one at a time
3. Remove old test files after migration

**Rollback Plan:**
- Keep old test files alongside new
- Revert to old tests if needed

### Success Criteria

- [ ] Service test support files removed
- [ ] `TestKit` used by all service tests
- [ ] Test setup is `let kit = TestKit::new();`
- [ ] Integration tests use helpers
- [ ] All tests pass
- [ ] Documentation updated

---

## Execution Order

The candidates can be executed in the following order, with some parallelization possible:

### Wave 1: Foundation (can run in parallel)
- **Candidate 1:** Consolidate Duplicate Ports
- **Candidate 2:** Consolidate Type Systems

### Wave 2: Depends on Wave 1
- **Candidate 3:** Unify Execution Context (depends on Candidate 2)
- **Candidate 4:** Simplify Service Construction (depends on Candidate 1)
- **Candidate 6:** Reduce Test Surface Area (depends on Candidates 1, 4)

### Wave 3: Polish
- **Candidate 5:** Extract Error Mapping Adapter (depends on Candidate 2)

**Critical Path:** 1 → 4 → 6
**Parallel Path:** 2 → 3, 2 → 5

---

## Success Metrics

Overall success criteria across all candidates:

- [ ] Reduced lines of code in service adapters by ~40%
- [ ] Reduced lines of code in tests by ~30%
- [ ] Single source of truth for ports, domain types, context
- [ ] All tests pass
- [ ] No performance regression
- [ ] Documentation updated
- [ ] Onboarding documentation for new developers

---

## References

**Files affected across all candidates:**
- `backend/crates/klynt_base/src/lib.rs`
- `backend/crates/klynt_base/src/ports/` (new)
- `backend/crates/klynt_base/src/testkit/` (new)
- `backend/crates/klynt_common/src/domain/`
- `backend/crates/services/auth_service/src/`
- `backend/crates/services/user_service/src/`
- `backend/crates/gateways/src/`
- `backend/crates/infrastructure/klynt_persistence/src/`

**Related plans:**
- `2025-06-21-consolidate-ports.md` (Candidate 1 detailed plan)

**Related ADRs:**
- None yet (will be created as decisions are made)

**Related issues:**
- None yet (will be filed if blockers arise)

---

## Implementation Notes

### Candidate 3 — Unify Execution Context

- Removed the legacy `klynt_base::ctx::Ctx` type.
- Migrated all persistence, telemetry, service, and gateway code to `ExecutionContext`/`RequestContext`.
- Deleted per-service `conversion.rs` files and identity conversion helpers (`to_legacy_ctx`, `to_legacy_user_id`, `from_legacy_user_id`).
- Updated in-memory test fakes to implement the new context signatures.

### Post-Candidate Legacy Cleanup

- Renamed `legacy_email` → `parsed_email`, `FakeLegacyTokenStore` →
  `FakePersistenceTokenStore`, `LegacyTokenKey`/`LegacyTokenEntry` →
  `PersistenceTokenKey`/`PersistenceTokenEntry`, and `FakeLegacySessionStore`
  → `FakePersistenceSessionStore`.
- Removed the legacy `DomainError::AlreadyExists` variant (replaced by
  `DomainError::Conflict`).
- Unified the duplicate `klynt_common::domain::Email` and
  `klynt_common::util::Email` types; `domain::Email` is now a re-export of the
  validated `util::Email`.

### Candidate 5 — Extract Error Mapping Adapter

- Added `klynt_base::ports::HttpError` trait with default `INTERNAL_SERVER_ERROR` mappings.
- Implemented `HttpError` for `klynt_common::domain::DomainError` in `klynt_base`.
- Implemented `HttpError` for `auth_service::AuthError` and `user_service::UserError` in their respective crates.
- Simplified `gateways/src/error.rs` so `GatewayError::status_code()` delegates to `HttpError::status_code()` and the JSON body uses `HttpError::error_code()`.

### Candidate 6 — Reduce Test Surface Area

- Added a `testkit` feature to `klynt_base` with shared test doubles:
  - `TestClock` — freezable/advanceable `Clock` implementation.
  - `TestPasswordHasher` — deterministic, prefix-based `PasswordHasher`.
  - `test_ctx()` — generic `ExecutionContext` helper.
  - `sample_user()` / `sample_active_user()` — domain model factories.
- Updated `auth_service` and `user_service` test support modules to use `klynt_base::testkit`, removing duplicate `FixedClock`, `TestClock`, `TestPasswordHasher`, `test_ctx`, and sample-user helpers.
- Service-specific fakes (`FakeUserRepository`, `FakeSessionStore`, etc.) remain in each service crate because they implement service-specific ports; centralizing them would introduce dependency cycles.

### Verification

- `cargo fmt --check` ✅
- `cargo clippy --workspace --all-targets --all-features -- -D warnings` ✅
- `cargo test --workspace` ✅
- `cargo machete` ✅
