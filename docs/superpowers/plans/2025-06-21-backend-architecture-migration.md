# Backend Architecture Migration Checklist

**Context**: Transforming klynt-edu backend from monolithic 4+1 crates to scalable service-oriented architecture inspired by nexra-core.

**Status**: Not yet released — no backward compatibility requirements.

**Principles** (from codebase-design):
- Each service = **deep module** (small interface, deep implementation)
- **Locality**: Changes contained within services
- **Seam discipline**: Clear external and internal seams
- **Deletion test**: Can delete any service without breaking others

---

## Current Structure

```
backend/crates/
├── klynt-domain/          # All domain mixed
├── klynt-application/     # Monolithic app layer (auth, users)
├── klynt-infrastructure/  # Infrastructure concerns
├── klynt-api/            # HTTP layer
└── klynt-server/         # Entry point
```

## Target Structure

```
backend/crates/
├── core/
│   └── klynt_core/                    # Base abstractions
├── shared/
│   ├── klynt_contracts/              # Shared DTOs
│   ├── klynt_domain/                 # Shared domain types
│   ├── klynt_utils/                  # Common utilities
│   └── klynt_typedenum/              # Shared enums
├── infrastructure/
│   ├── klynt_messaging/              # Event/messaging
│   ├── klynt_storage/                # Storage abstractions
│   └── klynt_tracing/                # Observability
├── services/
│   ├── auth_service/                 # Auth business logic
│   ├── user_service/                 # User management
│   └── [future services...]
└── gateways/
    ├── api_gateway/                  # HTTP entry point
    └── web_server/                   # Alternative entry
```

---

## Phase 1: Foundation (Core, Shared, Infrastructure)

**Goal**: Establish shared abstractions without breaking existing code.

### 1.1 Create Core Crate

**Directory**: `backend/crates/core/klynt_core/`

**Create files**:
```
klynt_core/
├── Cargo.toml
└── src/
    ├── lib.rs
    ├── base/
    │   ├── mod.rs
    │   ├── mod.rs
    │   └── constants.rs
    ├── ctx/
    │   ├── mod.rs
    │   └── request_context.rs
    ├── error.rs
    └── lib.rs
```

**Cargo.toml**:
```toml
[package]
name = "klynt_core"
version = "0.1.0"
edition = "2021"

[dependencies]
thiserror = { workspace = true }
anyhow = { workspace = true }
tracing = { workspace = true }
serde = { workspace = true }
```

**Content to migrate**:
- [ ] Extract base error types from `klynt-domain/src/errors.rs`
- [ ] Extract context structures from `klynt-domain/src/ctx.rs`
- [ ] Extract audit base types from `klynt-domain/src/audit.rs`
- [ ] Create base trait definitions

### 1.2 Create Shared Utils

**Directory**: `backend/crates/shared/klynt_utils/`

**Create files**:
```
klynt_utils/
├── Cargo.toml
└── src/
    ├── lib.rs
    ├── id.rs                    # ID generation
    ├── crypto.rs                # Crypto utilities
    ├── time.rs                  # Time utilities
    └── validation.rs            # Validation helpers
```

**Content to migrate**:
- [ ] Move ID generation utilities from `klynt-domain/src/` or `klynt-infrastructure/src/`
- [ ] Extract crypto helpers from `klynt-infrastructure/src/password_hasher.rs`
- [ ] Extract token generation from `klynt-infrastructure/src/token_generator.rs`

### 1.3 Create Shared Domain

**Directory**: `backend/crates/shared/klynt_domain/`

**Create files**:
```
klynt_domain/
├── Cargo.toml
└── src/
    ├── lib.rs
    ├── error.rs                # Common domain errors
    ├── utils.rs                # Domain utilities
    └── types.rs                # Shared domain types
```

**Content to migrate**:
- [ ] Extract SHARED domain types from `klynt-domain/src/models.rs`
- [ ] Extract common domain errors
- [ ] Keep only truly shared concepts (UserId, base types)

### 1.4 Create Shared Contracts

**Directory**: `backend/crates/shared/klynt_contracts/`

**Create files**:
```
klynt_contracts/
├── Cargo.toml
└── src/
    ├── lib.rs
    ├── auth.rs                 # Auth DTOs
    ├── user.rs                 # User DTOs
    └── common.rs               # Common request/response types
```

**Content to define**:
- [ ] Define request/response DTOs for service boundaries
- [ ] Define API contracts between services

### 1.5 Create Infrastructure Storage

**Directory**: `backend/crates/infrastructure/klynt_storage/`

**Create files**:
```
klynt_storage/
├── Cargo.toml
└── src/
    ├── lib.rs
    ├── db.rs                   # Database client wrapper
    ├── repository.rs           # Base repository trait
    └── migrations.rs           # Migration utilities
```

**Dependencies**: `sqlx`, `redis`, `klynt_core`

**Content to define**:
- [ ] Create base `Repository` trait
- [ ] Create database client wrapper
- [ ] Create migration utilities

### 1.6 Create Infrastructure Messaging

**Directory**: `backend/crates/infrastructure/klynt_messaging/`

**Create files**:
```
klynt_messaging/
├── Cargo.toml
└── src/
    ├── lib.rs
    ├── event.rs                # Event types
    ├── bus.rs                  # Message bus abstraction
    └── redis.rs                # Redis pub/sub
```

**Content to define**:
- [ ] Define event types
- [ ] Create message bus trait
- [ ] Implement Redis backend

### 1.7 Create Infrastructure Tracing

**Directory**: `backend/crates/infrastructure/klynt_tracing/`

**Create files**:
```
klynt_tracing/
├── Cargo.toml
└── src/
    ├── lib.rs
    ├── subscriber.rs          # Tracing subscriber setup
    ├── fields.rs              # Custom tracing fields
    └── middleware.rs          # Tracing middleware
```

**Content to migrate**:
- [ ] Extract tracing setup from `klynt-server/src/telemetry.rs`
- [ ] Extract middleware from `klynt-api/src/`

### 1.8 Update Workspace

**File**: `backend/Cargo.toml`

**Add new members**:
```toml
[workspace]
members = [
    # Existing (keep for now)
    "crates/klynt-domain",
    "crates/klynt-application",
    "crates/klynt-infrastructure",
    "crates/klynt-api",
    "crates/klynt-server",

    # NEW
    "crates/core/klynt_core",
    "crates/shared/klynt_contracts",
    "crates/shared/klynt_domain",
    "crates/shared/klynt_utils",
    "crates/infrastructure/klynt_storage",
    "crates/infrastructure/klynt_messaging",
    "crates/infrastructure/klynt_tracing",
]
```

---

## Phase 2: Extract auth_service

**Goal**: First complete service following deep module principles.

### 2.1 Create Service Structure

**Directory**: `backend/crates/services/auth_service/`

**Create structure**:
```
auth_service/
├── Cargo.toml
└── src/
    ├── lib.rs                  # PUBLIC INTERFACE
    ├── domain/
    │   ├── mod.rs
    │   ├── password_policy.rs  # From klynt-domain
    │   ├── session.rs          # From klynt-domain
    │   └── tokens.rs           # From klynt-domain
    ├── application/
    │   ├── mod.rs
    │   ├── auth.rs             # From klynt-application
    │   ├── password_reset.rs   # From klynt-application
    │   └── mfa.rs              # New or from existing
    ├── infrastructure/
    │   ├── mod.rs
    │   └── repositories/
    │       ├── mod.rs
    │       ├── user_repository.rs      # From klynt-infrastructure
    │       ├── session_repository.rs  # From klynt-infrastructure
    │       └── token_repository.rs    # From klynt-infrastructure
    ├── models/
    │   ├── mod.rs
    │   ├── auth.rs             # Auth models
    │   ├── user.rs             # User-related auth models
    │   └── session.rs          # Session models
    └── error.rs                # Auth-specific errors
```

### 2.2 Create Service Interface

**File**: `auth_service/src/lib.rs`

**Define clean public interface**:
```rust
pub use application::AuthUseCases;
pub use error::AuthError;
pub use models::AuthResult;

// Small surface area, deep implementation
pub struct AuthService;

impl AuthService {
    // Core operations - small interface
    pub async fn register(/* ... */) -> Result<AuthResult, AuthError>;
    pub async fn login(/* ... */) -> Result<Session, AuthError>;
    pub async fn refresh_token(/* ... */) -> Result<TokenPair, AuthError>;
    pub async fn logout(/* ... */) -> Result<(), AuthError>;
    pub async fn reset_password(/* ... */) -> Result<(), AuthError>;
}
```

### 2.3 Migrate Domain Layer

**Files to move**:
- [ ] `klynt-domain/src/password_policy.rs` → `auth_service/src/domain/password_policy.rs`
- [ ] `klynt-domain/src/session.rs` → `auth_service/src/domain/session.rs`
- [ ] `klynt-domain/src/tokens.rs` → `auth_service/src/domain/tokens.rs`
- [ ] Auth-related models from `klynt-domain/src/models.rs`

**Update imports**:
- [ ] Update all `use klynt_domain::` to `use crate::domain::`
- [ ] Add necessary dependencies to `auth_service/Cargo.toml`

### 2.4 Migrate Application Layer

**Files to move**:
- [ ] `klynt-application/src/auth.rs` → `auth_service/src/application/auth.rs`
- [ ] Password reset logic from `klynt-application/`

**Create use case structure**:
```rust
// application/use_cases/
├── mod.rs
├── registration.rs
├── authentication.rs
├── password_reset.rs
└── token_management.rs
```

### 2.5 Migrate Infrastructure

**Files to move**:
- [ ] `klynt-infrastructure/src/repositories/user_repository.rs` → `auth_service/src/infrastructure/repositories/user_repository.rs`
- [ ] `klynt-infrastructure/src/password_hasher.rs` → `auth_service/src/infrastructure/password_hasher.rs`
- [ ] `klynt-infrastructure/src/token_generator.rs` → `auth_service/src/infrastructure/token_generator.rs`

**Implement repository traits**:
- [ ] Make repositories implement `klynt_storage::Repository`
- [ ] Update database client usage

### 2.6 Update Dependencies

**File**: `auth_service/Cargo.toml`

```toml
[dependencies]
# Core
klynt_core = { path = "../../../core/klynt_core" }
klynt_contracts = { path = "../../../shared/klynt_contracts" }
klynt_domain = { path = "../../../shared/klynt_domain" }
klynt_utils = { path = "../../../shared/klynt_utils" }
klynt_storage = { path = "../../../infrastructure/klynt_storage" }

# Async
tokio = { workspace = true }
async-trait = { workspace = true }

# Database
sqlx = { workspace = true }

# etc...
```

### 2.7 Migrate Tests

**Directory**: `auth_service/tests/`

**Move tests**:
- [ ] `klynt-application/tests/registration.rs` → `auth_service/tests/registration.rs`
- [ ] `klynt-application/tests/password_reset.rs` → `auth_service/tests/password_reset.rs`

**Update test imports**:
- [ ] Update to use `auth_service` directly
- [ ] Update test helpers

### 2.8 Verify Service Compilation

- [ ] `cargo build -p auth_service`
- [ ] `cargo test -p auth_service`
- [ ] Verify no dependencies on old monolithic crates

---

## Phase 3: Create Gateway Layer

**Goal**: Separate HTTP routing from business logic.

### 3.1 Create API Gateway

**Directory**: `backend/crates/gateways/api_gateway/`

**Create structure**:
```
api_gateway/
├── Cargo.toml
└── src/
    ├── lib.rs
    ├── main.rs                 # Entry point (moved from klynt-server)
    ├── routes/
    │   ├── mod.rs
    │   ├── auth.rs             # Auth routes
    │   ├── users.rs            # User routes
    │   └── health.rs           # Health check
    ├── middleware/
    │   ├── mod.rs
    │   ├── auth.rs             # Auth middleware
    │   ├── cors.rs             # CORS
    │   └── rate_limit.rs       # Rate limiting
    ├── state.rs                # Application state
    └── error.rs                # HTTP error handling
```

### 3.2 Migrate HTTP Layer

**Files to move**:
- [ ] `klynt-server/src/main.rs` → `api_gateway/src/main.rs`
- [ ] `klynt-api/src/v1/auth/` → `api_gateway/src/routes/auth.rs`
- [ ] `klynt-api/src/v1/users/` → `api_gateway/src/routes/users.rs`
- [ ] `klynt-api/src/middleware/` → `api_gateway/src/middleware/`
- [ ] `klynt-api/src/state.rs` → `api_gateway/src/state.rs`

**Key changes**:
- [ ] Remove business logic from handlers (only call service methods)
- [ ] Update to use `auth_service` instead of `klynt-application`
- [ ] Clean up error handling

### 3.3 Update Composition Root

**File**: `api_gateway/src/main.rs` or `api_gateway/src/composition.rs`

**Wire up services**:
```rust
use auth_service::AuthService;
use klynt_storage::DatabaseClient;

#[tokio::main]
async fn main() {
    // Infrastructure
    let db = DatabaseClient::new(&config).await;
    let redis = RedisClient::new(&config).await;

    // Services
    let auth_service = AuthService::new(db.clone(), redis.clone());

    // Gateway
    let app = create_router(auth_service);

    // Serve
    serve(app).await;
}
```

### 3.4 Migrate OpenAPI Documentation

- [ ] Move `klynt-api/src/openapi.rs` → `api_gateway/src/openapi.rs`
- [ ] Update to reference service DTOs
- [ ] Move `klynt-api/src/openapi.yaml`

### 3.5 Update Server Configuration

- [ ] Move `klynt-server/src/composition.rs` → `api_gateway/src/composition.rs`
- [ ] Move `klynt-server/src/telemetry.rs` → `api_gateway/src/telemetry.rs`
- [ ] Update to use new crate structure

---

## Phase 4: Extract user_service

**Goal**: Second service, following the auth_service pattern.

### 4.1 Create Service Structure

**Directory**: `backend/crates/services/user_service/`

**Create structure**:
```
user_service/
├── Cargo.toml
└── src/
    ├── lib.rs                  # PUBLIC INTERFACE
    ├── domain/
    │   ├── mod.rs
    │   ├── user.rs             # User domain logic
    │   └── profile.rs         # Profile domain
    ├── application/
    │   ├── mod.rs
    │   ├── user_management.rs  # User CRUD
    │   └── profile_management.rs
    ├── infrastructure/
    │   ├── mod.rs
    │   └── repositories/
    │       └── user_repository.rs
    ├── models/
    │   ├── mod.rs
    │   └── user.rs
    └── error.rs
```

### 4.2 Migrate User Logic

**Files to move**:
- [ ] `klynt-application/src/users.rs` → `user_service/src/application/user_management.rs`
- [ ] User models from `klynt-domain/src/models.rs`

### 4.3 Create Service Interface

**File**: `user_service/src/lib.rs`

```rust
pub use application::UserUseCases;
pub use error::UserError;
pub use models::UserResult;

pub struct UserService;

impl UserService {
    pub async fn create_user(/* ... */) -> Result<User, UserError>;
    pub async fn get_user(/* ... */) -> Result<User, UserError>;
    pub async fn update_user(/* ... */) -> Result<User, UserError>;
    pub async fn delete_user(/* ... */) -> Result<(), UserError>;
    pub async fn list_users(/* ... */) -> Result<Vec<User>, UserError>;
}
```

### 4.4 Update Gateway

- [ ] Add `user_service` routes to `api_gateway/src/routes/users.rs`
- [ ] Wire up `UserService` in composition root

---

## Phase 5: Extract Future Services

**Pattern established — repeat for each new service**.

For each new service (courses, lessons, etc.):

### 5.1 Create Service Directory

```bash
mkdir -p backend/crates/services/[service_name]_service/src/{domain,application,infrastructure,models}
```

### 5.2 Create Cargo.toml

```toml
[package]
name = "[service_name]_service"
version = "0.1.0"
edition = "2021"

[dependencies]
klynt_core = { path = "../../../core/klynt_core" }
klynt_contracts = { path = "../../../shared/klynt_contracts" }
klynt_storage = { path = "../../../infrastructure/klynt_storage" }
# ... other dependencies
```

### 5.3 Implement Service

Following the pattern:
1. Define domain in `src/domain/`
2. Define use cases in `src/application/`
3. Implement repositories in `src/infrastructure/`
4. Create clean public interface in `src/lib.rs`

### 5.4 Add to Gateway

- [ ] Add routes to `api_gateway/src/routes/[service_name].rs`
- [ ] Wire up in composition root
- [ ] Update OpenAPI docs

---

## Phase 6: Cleanup

**Goal**: Remove old monolithic crates.

### 6.1 Verify Migration Complete

- [ ] All services extracted and working
- [ ] All tests passing
- [ ] No dependencies on old crates
- [ ] Gateway uses only new services

### 6.2 Remove Old Crates

**Remove from workspace**:
```toml
# backend/Cargo.toml - remove these lines:
"crates/klynt-domain",
"crates/klynt-application",
"crates/klynt-infrastructure",
"crates/klynt-api",
"crates/klynt-server",
```

**Delete directories**:
- [ ] `rm -rf backend/crates/klynt-domain`
- [ ] `rm -rf backend/crates/klynt-application`
- [ ] `rm -rf backend/crates/klynt-infrastructure`
- [ ] `rm -rf backend/crates/klynt-api`
- [ ] `rm -rf backend/crates/klynt-server`

### 6.3 Final Verification

- [ ] `cargo build` succeeds
- [ ] `cargo test` passes
- [ ] `cargo clippy` clean
- [ ] `cargo fmt` applied

---

## Progress Tracking

### Phase 1: Foundation
- [ ] 1.1 Create klynt_core
- [ ] 1.2 Create klynt_utils
- [ ] 1.3 Create klynt_domain
- [ ] 1.4 Create klynt_contracts
- [ ] 1.5 Create klynt_storage
- [ ] 1.6 Create klynt_messaging
- [ ] 1.7 Create klynt_tracing
- [ ] 1.8 Update workspace

### Phase 2: Extract auth_service
- [ ] 2.1 Create service structure
- [ ] 2.2 Create service interface
- [ ] 2.3 Migrate domain layer
- [ ] 2.4 Migrate application layer
- [ ] 2.5 Migrate infrastructure
- [ ] 2.6 Update dependencies
- [ ] 2.7 Migrate tests
- [ ] 2.8 Verify compilation

### Phase 3: Create Gateway Layer
- [ ] 3.1 Create api_gateway
- [ ] 3.2 Migrate HTTP layer
- [ ] 3.3 Update composition root
- [ ] 3.4 Migrate OpenAPI
- [ ] 3.5 Update server config

### Phase 4: Extract user_service
- [ ] 4.1 Create service structure
- [ ] 4.2 Migrate user logic
- [ ] 4.3 Create service interface
- [ ] 4.4 Update gateway

### Phase 5: Future Services
- [ ] Template for new services

### Phase 6: Cleanup
- [ ] 6.1 Verify migration
- [ ] 6.2 Remove old crates
- [ ] 6.3 Final verification

---

## Notes

- **No backward compatibility needed** — system not yet released
- **Services can be extracted independently** — work on one doesn't block others
- **Tests migrate with services** — each service has its own test suite
- **Gateway is composition root** — where services are wired together
- **Shared crates are for truly shared code** — avoid creating dependencies between services
