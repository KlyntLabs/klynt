# Backend Architecture Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deepen five shallow/leaky seams in the backend Cargo workspace: collapse the duplicated token lifecycle, delete the no-op UnitOfWork, remove the AppState forwarding facade, centralise fire-and-forget glue, and trim dead interface surface.

**Architecture:** Each phase is a behavior-preserving refactoring ordered by dependency. Phase 1 trims dead surface (no downstream breakage). Phase 2 deletes the UnitOfWork (changes `UserService::new`). Phase 3 collapses token repos (changes `AuthService::new`). Phase 4 deletes the AppState facade (changes all handlers). Phase 5 centralises glue (touches `AuthService` internals + handler extractors). All phases end with `just check` + `just test-coverage` green.

**Tech Stack:** Rust 2021, Axum 0.8, sqlx 0.8, async-trait, chrono, sha2, cargo nextest

---

## File Structure

| File | Phase(s) | Responsibility |
|---|---|---|
| `backend/crates/klynt-domain/src/repositories.rs` | 1, 3 | Trait definitions — trim dead methods, collapse token traits |
| `backend/crates/klynt-domain/src/tokens.rs` | 3 | One generic token module replacing two duplicates |
| `backend/crates/klynt-domain/src/unit_of_work.rs` | 2 | **Deleted** — no-op seam removed |
| `backend/crates/klynt-domain/src/config.rs` | 1 | Remove dead `Default` impls |
| `backend/crates/klynt-application/src/audit.rs` | 1, 5 | Trim dead trait methods from test doubles; add `try_log` |
| `backend/crates/klynt-application/src/auth.rs` | 3, 5 | Use unified `TokenStore`; use `try_log` for audit |
| `backend/crates/klynt-application/src/users.rs` | 2 | Hold `Arc<dyn UserRepository>` directly; remove UoW |
| `backend/crates/klynt-application/tests/support/mod.rs` | 2 | Delete `FakeUnitOfWork`/`FakeTransaction` |
| `backend/crates/klynt-application/tests/support/auth.rs` | 1, 3 | Trim dead trait methods; collapse token fakes |
| `backend/crates/klynt-infrastructure/src/repositories/sqlx_token_repo.rs` | 3 | One parameterised adapter replacing two |
| `backend/crates/klynt-infrastructure/src/repositories/sqlx_audit_repo.rs` | 1 | Remove dead `find_by_*` methods + test |
| `backend/crates/klynt-infrastructure/src/repositories/pg_user.rs` | 2 | Remove `PgUnitOfWork`/`PgTransaction` |
| `backend/crates/klynt-infrastructure/src/config.rs` | 1 | Use domain `Default` impls as single source of truth |
| `backend/crates/klynt-api/src/state.rs` | 4 | Thin bag of accessors — delete forwarders + dead fields |
| `backend/crates/klynt-api/src/error.rs` | 1 | Delete dead `Validation` variant |
| `backend/crates/klynt-api/src/v1/auth.rs` | 4, 5 | Call services directly; use `CtxW` extractor |
| `backend/crates/klynt-api/src/v1/sessions.rs` | 4, 5 | Call services directly; use `CtxW` extractor |
| `backend/crates/klynt-api/src/v1/users.rs` | 4 | Call services directly |
| `backend/crates/klynt-server/src/composition.rs` | 2, 3, 4 | Rewire without UoW; wire unified token store; pass services |

---

## Phase 1: Trim dead interface surface

Quick wins — delete methods and variants with zero production callers.

---

### Task 1: Delete dead AuditEventRepository query methods

**Files:**
- Modify: `backend/crates/klynt-domain/src/repositories.rs:85-106`
- Modify: `backend/crates/klynt-infrastructure/src/repositories/sqlx_audit_repo.rs:57-123,174-205`
- Modify: `backend/crates/klynt-application/src/audit.rs:137-155,157-185`
- Modify: `backend/crates/klynt-application/tests/support/auth.rs:169-215`

- [ ] **Step 1: Trim the trait in `repositories.rs`**

Replace the full `AuditEventRepository` trait (lines 85-106) so only `log` remains:

```rust
#[async_trait]
pub trait AuditEventRepository: Send + Sync {
    /// Log an audit event (append-only).
    async fn log(&self, ctx: &Ctx, event: AuditEvent) -> Result<(), DomainError>;
}
```

Also remove the now-unused imports at the top of the file — `Uuid` is still needed by `EmailVerificationTokenRepository::find_valid` return type? No — check: `Uuid` is imported at line 3 but only used in `find_by_resource`. After removing `find_by_resource`, `Uuid` is unused. Remove line 3:

```rust
// DELETE this line — Uuid no longer used in this file
use uuid::Uuid;
```

Wait — `UserId` is imported from `crate::models`. `Uuid` was only for `find_by_resource`. Remove the `use uuid::Uuid;` import at line 3.

- [ ] **Step 2: Remove the impl methods in `sqlx_audit_repo.rs`**

Delete the `find_by_user` method (lines 57-88) and `find_by_resource` method (lines 90-123) from the `impl AuditEventRepository for PgAuditEventRepository` block.

Also delete the `AuditEventRow` struct (lines 127-142) and its `impl AuditEventRow` block (lines 144-172) — they are only used by the deleted query methods.

Also delete the `#[cfg(test)] mod tests` block (lines 174-205) — its only test calls `find_by_user`.

Also remove now-unused imports: `std::str::FromStr` (line 4), `Utc` (line 2, only used in `AuditEventRow`), `UserId` (line 10, only used in `find_by_user` param). Keep `Uuid` (line 5, used in `AuditEvent.id` field binding). Actually `Uuid` is not directly used after deleting `AuditEventRow` — check: `event.id` is bound but its type comes from `AuditEvent`. Remove unused imports:

```rust
// Final imports for sqlx_audit_repo.rs after cleanup:
use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;

use klynt_domain::audit::AuditEvent;
use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::repositories::AuditEventRepository;
```

- [ ] **Step 3: Remove the methods from test doubles in `audit.rs`**

In `backend/crates/klynt-application/src/audit.rs`, the test `CapturingRepo` (lines 130-155) and `ErrorRepo` (lines 157-185) each implement `find_by_user` and `find_by_resource`. Delete both methods from both structs. The `CapturingRepo` impl block should look like:

```rust
    #[async_trait::async_trait]
    impl AuditEventRepository for CapturingRepo {
        async fn log(&self, _ctx: &Ctx, event: AuditEvent) -> Result<(), DomainError> {
            self.events.lock().unwrap().push(event);
            Ok(())
        }
    }
```

And `ErrorRepo`:

```rust
    #[async_trait::async_trait]
    impl AuditEventRepository for ErrorRepo {
        async fn log(&self, _ctx: &Ctx, _event: AuditEvent) -> Result<(), DomainError> {
            Err(DomainError::Internal(
                "audit storage failed".to_string().into(),
            ))
        }
    }
```

Remove now-unused imports `Uuid` and `UserId` from the test module if they become unused (check: `UserId` is used in test bodies like `log_user_registered_creates_expected_event` at line 197 — keep it).

- [ ] **Step 4: Remove the methods from `FakeAuditEventRepository` in `support/auth.rs`**

In `backend/crates/klynt-application/tests/support/auth.rs`, delete the `find_by_user` method (lines 182-195) and `find_by_resource` method (lines 197-214) from `FakeAuditEventRepository`. The impl should look like:

```rust
#[async_trait]
impl AuditEventRepository for FakeAuditEventRepository {
    async fn log(&self, _ctx: &Ctx, event: AuditEvent) -> Result<(), DomainError> {
        let mut events = self.events.lock().unwrap();
        events.push(event);
        Ok(())
    }
}
```

- [ ] **Step 5: Verify compilation and tests**

Run: `cd backend && cargo check --workspace`
Expected: PASS — no compilation errors

Run: `cd backend && cargo nextest run --all-features`
Expected: PASS — all tests green

- [ ] **Step 6: Commit**

```bash
git add backend/crates/klynt-domain/src/repositories.rs backend/crates/klynt-infrastructure/src/repositories/sqlx_audit_repo.rs backend/crates/klynt-application/src/audit.rs backend/crates/klynt-application/tests/support/auth.rs
git commit -m "refactor: remove dead AuditEventRepository query methods

find_by_user and find_by_resource had zero production callers.
Every adapter and test double had to stub them. Delete the dead
interface surface — re-add when a caller appears."
```

---

### Task 2: Delete dead AppErrorKind::Validation variant

**Files:**
- Modify: `backend/crates/klynt-api/src/error.rs:46-49,127-130`

- [ ] **Step 1: Remove the variant and its match arm**

In `backend/crates/klynt-api/src/error.rs`, delete the `Validation` variant (lines 46-49):

```rust
// DELETE these lines:
    /// Reserved for application-layer validation errors that should return 422.
    /// Domain validation errors are mapped to `BadRequest` (400).
    #[error("unprocessable entity: {0}")]
    Validation(String),
```

Delete its match arm in `IntoResponse` (lines 127-130):

```rust
// DELETE these lines:
            AppErrorKind::Validation(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                ApiErrorBody::new("validation_error", msg.clone(), &request_id),
            ),
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && cargo check --workspace`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/crates/klynt-api/src/error.rs
git commit -m "refactor: remove dead AppErrorKind::Validation variant

No constructor ever produced this variant. Domain validation
errors route to BadRequest. Delete the speculative surface."
```

---

### Task 3: Remove duplicated config defaults

**Files:**
- Modify: `backend/crates/klynt-domain/src/config.rs:10-18,27-35`
- Modify: `backend/crates/klynt-infrastructure/src/config.rs:17-25`

- [ ] **Step 1: Make the infra loader use domain `Default` impls as the single source of truth**

In `backend/crates/klynt-infrastructure/src/config.rs`, replace the hardcoded `set_default` calls with values derived from the domain's `Default` impls:

```rust
use config::{Config, ConfigError, Environment, File};

use klynt_domain::config::{ApiConfig, AppConfig, RateLimiterConfig};

pub fn load_config() -> Result<AppConfig, ConfigError> {
    let base_path = std::env::current_dir().expect("failed to determine current directory");
    let config_dir = base_path.join("config");

    let api_default = ApiConfig::default();
    let rl_default = RateLimiterConfig::default();

    let config = Config::builder()
        .add_source(File::from(config_dir.join("default.toml")).required(false))
        .add_source(File::from(config_dir.join("local.toml")).required(false))
        .add_source(
            Environment::with_prefix("KLYNT")
                .prefix_separator("_")
                .separator("__"),
        )
        .set_default("api.host", api_default.host)?
        .set_default("api.port", api_default.port)?
        .set_default("api.allowed_origins", api_default.allowed_origins)?
        .set_default("rate_limiter.enabled", rl_default.enabled)?
        .set_default("rate_limiter.max_requests", rl_default.max_requests)?
        .set_default("rate_limiter.window_seconds", rl_default.window_seconds)?
        .set_default("log_level", "info")?
        .set_default("database_url", None::<String>)?
        .set_default("redis_url", None::<String>)?
        .build()?;

    config.try_deserialize()
}
```

This makes the `Default` impls in `config.rs` the single source of truth for default values, and the infra loader references them rather than duplicating.

- [ ] **Step 2: Verify compilation and tests**

Run: `cd backend && cargo check --workspace && cargo nextest run --all-features`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/crates/klynt-infrastructure/src/config.rs
git commit -m "refactor: deduplicate config defaults

The infra loader now references the domain Default impls instead
of hardcoding the same values. One source of truth."
```

---

## Phase 2: Delete the no-op UnitOfWork seam

`UnitOfWork`/`Transaction` has one adapter, `begin()` never calls `pool.begin()`, and `commit`/`rollback` are unconditional `Ok(())`. Every `UserService` method pays begin/commit ceremony for zero atomicity.

---

### Task 4: Replace UnitOfWork with direct UserRepository in UserService

**Files:**
- Modify: `backend/crates/klynt-application/src/users.rs`
- Modify: `backend/crates/klynt-application/tests/support/mod.rs`
- Delete: `backend/crates/klynt-domain/src/unit_of_work.rs`
- Modify: `backend/crates/klynt-domain/src/lib.rs`

- [ ] **Step 1: Rewrite `UserService` to hold `Arc<dyn UserRepository>` directly**

In `backend/crates/klynt-application/src/users.rs`, replace the struct definition and all method bodies. The new struct drops `uow: Arc<dyn UnitOfWork>` in favor of `user_repo: Arc<dyn UserRepository>`. Every method replaces the `begin() → tx.users() → commit()` ceremony with a direct repo call.

Replace the imports (lines 1-11):

```rust
use std::sync::Arc;

use chrono::Utc;
use uuid::Uuid;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::{DomainError, NameError};
use klynt_domain::models::{validate_password, Email, Role, User, UserDto, UserId, UserStatus};
use klynt_domain::ports::{HashedPassword, IdempotencyStore, PasswordHasher};
use klynt_domain::repositories::{CreateResult, UserRepository};
```

Replace the struct + constructor (lines 24-52):

```rust
pub struct UserService {
    user_repo: Arc<dyn UserRepository>,
    password_hasher: Arc<dyn PasswordHasher>,
    idempotency_store: Arc<dyn IdempotencyStore<UserDto>>,
}

fn validate_name(name: &str) -> Result<String, DomainError> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err(DomainError::InvalidName(NameError::Empty));
    }
    if name.chars().count() > 200 {
        return Err(DomainError::InvalidName(NameError::TooLong));
    }
    Ok(name)
}

impl UserService {
    pub fn new(
        user_repo: Arc<dyn UserRepository>,
        password_hasher: Arc<dyn PasswordHasher>,
        idempotency_store: Arc<dyn IdempotencyStore<UserDto>>,
    ) -> Self {
        Self {
            user_repo,
            password_hasher,
            idempotency_store,
        }
    }
```

Replace `create_user` (lines 54-112) — remove begin/commit:

```rust
    pub async fn create_user(
        &self,
        ctx: &Ctx,
        idempotency_key: Uuid,
        req: CreateUserRequest,
    ) -> Result<UserDto, DomainError> {
        if let Some(cached) = self.idempotency_store.get(idempotency_key).await? {
            return Ok(cached);
        }

        if !req.terms_accepted {
            return Err(DomainError::TermsNotAccepted);
        }

        let name = validate_name(&req.name)?;
        let email = Email::parse(&req.email)?;
        validate_password(&req.password)?;
        let role = Role::parse(&req.role)?;

        if role.requires_institution() && req.institution_id.is_none() {
            return Err(DomainError::InstitutionRequired(role));
        }

        let password_hash = self.password_hasher.hash(&req.password).await?;

        let user = User {
            id: UserId::new(),
            name,
            email: email.clone(),
            role,
            institution_id: req.institution_id,
            status: UserStatus::PendingVerification,
            email_verified_at: None,
            global_role: None,
            password_hash: password_hash.as_str().to_string(),
            terms_accepted_at: Utc::now(),
            terms_version: req.terms_version,
            created_at: Utc::now(),
        };

        match self
            .user_repo
            .create_if_not_exists(ctx, &email, &user)
            .await?
        {
            CreateResult::Created => {
                let user_dto = UserDto::from(&user);
                let cached = self
                    .idempotency_store
                    .get_or_insert(idempotency_key, user_dto.clone())
                    .await?;
                Ok(cached.unwrap_or(user_dto))
            }
            CreateResult::AlreadyExists(existing) => Err(DomainError::AlreadyExists {
                email: existing.email.as_str().to_string(),
            }),
        }
    }
```

Replace `create_pending_user` (lines 114-160):

```rust
    /// Create a new user in pending verification state.
    pub async fn create_pending_user(
        &self,
        ctx: &Ctx,
        name: String,
        email: &Email,
        password: &str,
        terms_accepted: bool,
        terms_version: String,
    ) -> Result<UserId, DomainError> {
        if !terms_accepted {
            return Err(DomainError::TermsNotAccepted);
        }

        let name = validate_name(&name)?;
        validate_password(password)?;
        let password_hash = self.password_hasher.hash(password).await?;

        let user = User {
            id: UserId::new(),
            name,
            email: email.clone(),
            role: Role::Student,
            institution_id: None,
            status: UserStatus::PendingVerification,
            email_verified_at: None,
            global_role: None,
            password_hash: password_hash.as_str().to_string(),
            terms_accepted_at: Utc::now(),
            terms_version,
            created_at: Utc::now(),
        };

        match self
            .user_repo
            .create_if_not_exists(ctx, email, &user)
            .await?
        {
            CreateResult::Created => Ok(user.id),
            CreateResult::AlreadyExists(_) => Err(DomainError::AlreadyExists {
                email: email.as_str().to_string(),
            }),
        }
    }
```

Replace `activate_user` (lines 162-167):

```rust
    /// Activate a user account (after email verification).
    pub async fn activate_user(&self, ctx: &Ctx, user_id: UserId) -> Result<(), DomainError> {
        self.user_repo.set_email_verified(ctx, user_id).await
    }
```

Replace `authenticate` (lines 169-195):

```rust
    pub async fn authenticate(
        &self,
        ctx: &Ctx,
        email: &Email,
        password: &str,
    ) -> Result<User, DomainError> {
        let user = self
            .user_repo
            .find_by_email(ctx, email)
            .await?
            .ok_or(DomainError::AuthenticationRequired)?;

        let hash = HashedPassword::new(&user.password_hash);
        if !self.password_hasher.verify(password, &hash).await? {
            // Do not reveal whether the email exists.
            return Err(DomainError::AuthenticationRequired);
        }

        // Only active (email-verified) users may authenticate.
        if user.status != UserStatus::Active {
            return Err(DomainError::AuthenticationRequired);
        }

        Ok(user)
    }
```

Replace `find_by_id` (lines 197-206):

```rust
    pub async fn find_by_id(&self, ctx: &Ctx, id: UserId) -> Result<User, DomainError> {
        self.user_repo
            .find_by_id(ctx, id)
            .await?
            .ok_or(DomainError::NotFound)
    }
```

Replace `find_by_email` (lines 209-218):

```rust
    /// Find a user by email.
    pub async fn find_by_email(
        &self,
        ctx: &Ctx,
        email: &Email,
    ) -> Result<Option<User>, DomainError> {
        self.user_repo.find_by_email(ctx, email).await
    }
```

Replace `update_password` (lines 221-236):

```rust
    /// Update user password.
    pub async fn update_password(
        &self,
        ctx: &Ctx,
        user_id: UserId,
        new_password: &str,
    ) -> Result<(), DomainError> {
        validate_password(new_password)?;
        let password_hash = self.password_hasher.hash(new_password).await?;
        self.user_repo
            .update_password(ctx, user_id, &password_hash)
            .await
    }
```

- [ ] **Step 2: Delete the `unit_of_work` module from the domain crate**

In `backend/crates/klynt-domain/src/lib.rs`, remove line 10:

```rust
// DELETE this line:
pub mod unit_of_work;
```

Delete the file entirely:

```bash
rm backend/crates/klynt-domain/src/unit_of_work.rs
```

- [ ] **Step 3: Update test support — delete `FakeUnitOfWork` and `FakeTransaction`**

In `backend/crates/klynt-application/tests/support/mod.rs`, delete `FakeUnitOfWork` (lines 74-86), `FakeTransaction` (lines 88-105), and their imports.

Remove imports that are now unused:
- `use klynt_domain::unit_of_work::{Transaction, UnitOfWork};` (line 14) — delete

Update `user_service()` helper (lines 166-172) to pass `FakeUserRepository` directly:

```rust
pub fn user_service() -> UserService {
    let user_repo: Arc<dyn UserRepository> =
        Arc::new(FakeUserRepository::default());
    let password_hasher: Arc<dyn PasswordHasher> = Arc::new(FakePasswordHasher);
    let idempotency_store: Arc<dyn IdempotencyStore<UserDto>> =
        Arc::new(FakeIdempotencyStore::default());
    UserService::new(user_repo, password_hasher, idempotency_store)
}
```

Add the `UserRepository` import at the top of the file (it's used via full path currently):

```rust
use klynt_domain::repositories::UserRepository;
```

And change the `impl UserRepository for FakeUserRepository` line to use the short path (or keep the full path — either works).

- [ ] **Step 4: Verify compilation (will fail in composition.rs — fixed in Task 5)**

Run: `cd backend && cargo check -p klynt-application`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/crates/klynt-application/src/users.rs backend/crates/klynt-application/tests/support/mod.rs backend/crates/klynt-domain/src/lib.rs backend/crates/klynt-domain/src/unit_of_work.rs
git commit -m "refactor: replace no-op UnitOfWork with direct UserRepository

UserService now holds Arc<dyn UserRepository> directly, removing
the begin/commit ceremony from every method. The UnitOfWork/
Transaction traits had one adapter whose begin() never called
pool.begin() and whose commit/rollback were unconditional Ok(())."
```

---

### Task 5: Remove PgUnitOfWork/PgTransaction and rewire composition

**Files:**
- Modify: `backend/crates/klynt-infrastructure/src/repositories/pg_user.rs:210-257`
- Modify: `backend/crates/klynt-server/src/composition.rs`

- [ ] **Step 1: Delete `PgUnitOfWork` and `PgTransaction` from `pg_user.rs`**

In `backend/crates/klynt-infrastructure/src/repositories/pg_user.rs`, delete lines 210-257 (everything from `// Simple helper to serialize enums consistently` to end of file).

Also remove now-unused imports:
- `use klynt_domain::unit_of_work::{Transaction, UnitOfWork};` (line 11) — delete

- [ ] **Step 2: Rewire `composition.rs` — pass `PgUserRepository` as `Arc<dyn UserRepository>`**

In `backend/crates/klynt-server/src/composition.rs`, make these changes:

Remove imports (lines 16, 21):
```rust
// DELETE:
use klynt_domain::unit_of_work::UnitOfWork;
// CHANGE this import to remove PgUnitOfWork:
use klynt_infrastructure::repositories::pg_user::PgUserRepository;
```

Replace the wiring block (lines 63-96). Remove the `uow` line (line 65) and pass `user_repo` directly to `UserService::new`:

```rust
    let user_repo: Arc<PgUserRepository> = Arc::new(PgUserRepository::new(pool.clone()));
    let session_store: Arc<PgSessionStore> = Arc::new(PgSessionStore::new(pool.clone()));
    let email_verification_repo: Arc<dyn EmailVerificationTokenRepository> =
        Arc::new(PgEmailVerificationTokenRepository::new(pool.clone()));
    let password_reset_repo: Arc<dyn PasswordResetTokenRepository> =
        Arc::new(PgPasswordResetTokenRepository::new(pool.clone()));
    let audit_repo: Arc<dyn AuditEventRepository> =
        Arc::new(PgAuditEventRepository::new(pool.clone()));

    let idempotency_store: Arc<RedisIdempotencyStore<UserDto>> = Arc::new(
        RedisIdempotencyStore::new(&redis_url, IDEMPOTENCY_TTL_SECONDS)
            .await
            .expect("failed to connect to Redis for idempotency store"),
    );
    let idempotency_store_port: Arc<dyn IdempotencyStore<UserDto>> =
        Arc::clone(&idempotency_store) as Arc<dyn IdempotencyStore<UserDto>>;

    let rate_limiter: Arc<RedisRateLimiter> = Arc::new(
        RedisRateLimiter::new(config.rate_limiter.clone(), &redis_url)
            .await
            .expect("failed to connect to Redis for rate limiter"),
    );
    let rate_limiter_port: Arc<dyn klynt_domain::ports::RateLimiter> =
        Arc::clone(&rate_limiter) as Arc<dyn klynt_domain::ports::RateLimiter>;
    let rate_limiter_health: Arc<dyn HealthCheck> =
        Arc::clone(&rate_limiter) as Arc<dyn HealthCheck>;

    let password_hasher: Arc<dyn PasswordHasher> = Arc::new(Argon2PasswordHasher::new());
    let user_service = Arc::new(UserService::new(
        Arc::clone(&user_repo) as Arc<dyn klynt_domain::repositories::UserRepository>,
        password_hasher,
        Arc::clone(&idempotency_store_port),
    ));
```

Update the `health_checks` vec — remove `uow` (line 112):

```rust
    let health_checks: Vec<Arc<dyn HealthCheck>> = vec![
        Arc::clone(&user_repo) as Arc<dyn HealthCheck>,
        Arc::clone(&session_store) as Arc<dyn HealthCheck>,
        rate_limiter_health,
    ];
```

- [ ] **Step 3: Verify full workspace compilation**

Run: `cd backend && cargo check --workspace`
Expected: PASS

- [ ] **Step 4: Run tests**

Run: `cd backend && cargo nextest run --all-features`
Expected: PASS — all existing tests green (behavior preserved)

- [ ] **Step 5: Commit**

```bash
git add backend/crates/klynt-infrastructure/src/repositories/pg_user.rs backend/crates/klynt-server/src/composition.rs
git commit -m "refactor: remove PgUnitOfWork, wire UserRepository directly

Delete the no-op PgUnitOfWork/PgTransaction structs. The composition
root now passes PgUserRepository as Arc<dyn UserRepository> directly
to UserService."
```

---

## Phase 3: Collapse the token lifecycle into one deep module

Two near-identical traits, two byte-for-byte adapters (only table name differs), two 90%-duplicate value objects, and a consume-dance pasted into two callers. Collapse into one unified `TokenStore` module.

---

### Task 6: Create unified token domain model

**Files:**
- Rewrite: `backend/crates/klynt-domain/src/tokens.rs`

- [ ] **Step 1: Rewrite `tokens.rs` as a single generic module**

Replace the entire contents of `backend/crates/klynt-domain/src/tokens.rs`:

```rust
use chrono::{DateTime, Duration, Utc};

use crate::models::UserId;

/// Which kind of token — determines TTL and target table.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
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

    /// Database table name for this token kind.
    pub const fn table(self) -> &'static str {
        match self {
            Self::EmailVerification => "email_verification_tokens",
            Self::PasswordReset => "password_reset_tokens",
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
        let hash = sha256_hash(&plaintext);
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
        sha256_hash(token)
    }

    /// Check if token has expired.
    pub fn is_expired(&self) -> bool {
        Utc::now() >= self.expires_at
    }
}

/// Generate a cryptographically secure random token (≥256 bits).
fn generate_csprng_token() -> String {
    // 43 bytes of random data = 344 bits (more than 256 required)
    // Base64URL encoding = ~58 characters
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let mut bytes = [0u8; 43];
    for byte in bytes.iter_mut() {
        *byte = rng.gen();
    }
    base64_url_encode(&bytes)
}

/// Compute SHA-256 hash (hex string).
fn sha256_hash(token: &str) -> String {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn email_verification_token_has_sufficient_entropy() {
        let token = Token::generate(TokenKind::EmailVerification, UserId::new());
        assert!(token.plaintext.len() >= 56);
        assert_eq!(token.hash.len(), 64);
    }

    #[test]
    fn email_verification_expires_after_24_hours() {
        let token = Token::generate(TokenKind::EmailVerification, UserId::new());
        let expected = Utc::now() + TokenKind::EmailVerification.ttl();
        let diff = (token.expires_at - expected).num_seconds().abs();
        assert!(diff <= 1);
    }

    #[test]
    fn password_reset_expires_after_30_minutes() {
        let token = Token::generate(TokenKind::PasswordReset, UserId::new());
        let expected = Utc::now() + TokenKind::PasswordReset.ttl();
        let diff = (token.expires_at - expected).num_seconds().abs();
        assert!(diff <= 1);
    }

    #[test]
    fn sha256_is_deterministic() {
        let h1 = Token::sha256_hash("test-token");
        let h2 = Token::sha256_hash("test-token");
        assert_eq!(h1, h2);
        assert_eq!(h1.len(), 64);
    }

    #[test]
    fn generated_tokens_are_unique() {
        let uid = UserId::new();
        let t1 = Token::generate(TokenKind::EmailVerification, uid);
        let t2 = Token::generate(TokenKind::EmailVerification, uid);
        assert_ne!(t1.plaintext, t2.plaintext);
        assert_ne!(t1.hash, t2.hash);
    }

    #[test]
    fn expired_token_detection_works() {
        let mut token = Token::generate(TokenKind::EmailVerification, UserId::new());
        token.expires_at = Utc::now() - Duration::seconds(1);
        assert!(token.is_expired());

        token.expires_at = Utc::now() + Duration::seconds(1);
        assert!(!token.is_expired());
    }

    #[test]
    fn token_kind_table_names_differ() {
        assert_ne!(
            TokenKind::EmailVerification.table(),
            TokenKind::PasswordReset.table()
        );
    }
}
```

- [ ] **Step 2: Verify domain crate compiles**

Run: `cd backend && cargo check -p klynt-domain`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/crates/klynt-domain/src/tokens.rs
git commit -m "refactor: collapse EmailVerificationToken + PasswordResetToken into one Token

Two 90%-duplicate structs (identical generate_csprng_token, sha256_hash,
is_expired) become one Token + TokenKind enum. Entropy, hashing, and
TTL policy now live in one place."
```

---

### Task 7: Replace two token traits with one TokenStore trait

**Files:**
- Modify: `backend/crates/klynt-domain/src/repositories.rs:41-83`

- [ ] **Step 1: Replace both token traits with a single `TokenStore` trait**

In `backend/crates/klynt-domain/src/repositories.rs`, delete `EmailVerificationTokenRepository` (lines 41-61) and `PasswordResetTokenRepository` (lines 63-83). Replace with:

```rust
use crate::tokens::TokenKind;

/// Unified store for issue-once tokens (email verification, password reset).
///
/// Behind this interface sits the CSPRNG-hash-persist-consume lifecycle.
/// The `kind` parameter selects the target table.
#[async_trait]
pub trait TokenStore: Send + Sync {
    /// Store a token hash with its expiry.
    async fn save(
        &self,
        ctx: &Ctx,
        kind: TokenKind,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError>;

    /// Atomically consume a token: validate it exists, is unused, is not
    /// expired, and mark it used — all in one step.
    ///
    /// Returns the user_id on success, or an error if the token is
    /// invalid/expired/already-used.
    async fn consume(
        &self,
        ctx: &Ctx,
        kind: TokenKind,
        token_hash: &str,
    ) -> Result<UserId, DomainError>;
}
```

Add the `TokenKind` import at the top of the file alongside the existing imports:

```rust
use crate::tokens::TokenKind;
```

- [ ] **Step 2: Verify domain crate compiles (will fail downstream — expected)**

Run: `cd backend && cargo check -p klynt-domain`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/crates/klynt-domain/src/repositories.rs
git commit -m "refactor: replace two token traits with one TokenStore

EmailVerificationTokenRepository and PasswordResetTokenRepository were
structurally identical (same 3 methods, same param types). Collapse to
one TokenStore with save + consume, parameterised by TokenKind."
```

---

### Task 8: Rewrite token adapters as one parameterised implementation

**Files:**
- Rewrite: `backend/crates/klynt-infrastructure/src/repositories/sqlx_token_repo.rs`

- [ ] **Step 1: Replace the entire file with one unified adapter**

Replace the entire contents of `backend/crates/klynt-infrastructure/src/repositories/sqlx_token_repo.rs`:

```rust
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::{DomainError, TokenError};
use klynt_domain::models::UserId;
use klynt_domain::repositories::TokenStore;
use klynt_domain::tokens::TokenKind;

/// PostgreSQL implementation of [`TokenStore`].
///
/// Uses parameterised table names from `TokenKind::table()`.
/// The `consume` method does find + mark-used atomically via
/// a single `UPDATE ... RETURNING` statement.
pub struct PgTokenStore {
    pool: PgPool,
}

impl PgTokenStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl TokenStore for PgTokenStore {
    async fn save(
        &self,
        _ctx: &Ctx,
        kind: TokenKind,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError> {
        let table = kind.table();
        let sql = format!(
            r#"
            INSERT INTO {table} (user_id, token_hash, expires_at)
            VALUES ($1, $2, $3)
            "#
        );

        sqlx::query(&sql)
            .bind(user_id.0)
            .bind(token_hash)
            .bind(expires_at)
            .execute(&self.pool)
            .await
            .map_err(DomainError::internal)?;

        Ok(())
    }

    async fn consume(
        &self,
        _ctx: &Ctx,
        kind: TokenKind,
        token_hash: &str,
    ) -> Result<UserId, DomainError> {
        let table = kind.table();

        // Atomic: mark an unused, unexpired token as used and return its user_id.
        // If no row matches, the token was invalid, expired, or already used.
        let sql = format!(
            r#"
            UPDATE {table}
            SET used_at = NOW()
            WHERE token_hash = $1
              AND used_at IS NULL
              AND expires_at > NOW()
            RETURNING user_id
            "#
        );

        let result = sqlx::query_scalar::<_, uuid::Uuid>(&sql)
            .bind(token_hash)
            .fetch_optional(&self.pool)
            .await
            .map_err(DomainError::internal)?;

        result
            .map(|id| UserId(id))
            .ok_or(DomainError::InvalidToken(TokenError::Invalid))
    }
}
```

Note: the `consume` method combines `find_valid` + `mark_used` into one atomic `UPDATE ... RETURNING`. This eliminates the race where two concurrent requests could both pass `find_valid` before either calls `mark_used`. The old two-step dance was not just duplicated — it was also racy.

- [ ] **Step 2: Verify compilation (will fail in auth.rs and composition.rs — fixed in Tasks 9-10)**

Run: `cd backend && cargo check -p klynt-infrastructure`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/crates/klynt-infrastructure/src/repositories/sqlx_token_repo.rs
git commit -m "refactor: collapse two Pg token repos into one PgTokenStore

One adapter with save + consume, parameterised by TokenKind::table().
The consume method uses UPDATE...RETURNING for atomic find-and-invalidate,
eliminating the race in the old two-step find_valid + mark_used dance."
```

---

### Task 9: Update AuthService to use unified TokenStore

**Files:**
- Modify: `backend/crates/klynt-application/src/auth.rs`
- Modify: `backend/crates/klynt-application/tests/support/auth.rs`

- [ ] **Step 1: Rewrite `AuthService` to hold one `TokenStore`**

In `backend/crates/klynt-application/src/auth.rs`, replace the imports (lines 1-14):

```rust
use std::sync::Arc;

use chrono::Utc;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::{Email, UserDto, UserId};
use klynt_domain::ports::SharedEmailService;
use klynt_domain::repositories::TokenStore;
use klynt_domain::session::{Session, SessionStore, SessionToken};
use klynt_domain::tokens::{Token, TokenKind};

use crate::audit::AuditService;
use crate::users::UserService;
```

Replace the struct + constructor (lines 16-42):

```rust
pub struct AuthService {
    user_service: Arc<UserService>,
    session_store: Arc<dyn SessionStore>,
    token_store: Arc<dyn TokenStore>,
    email_service: SharedEmailService,
    audit_service: Arc<AuditService>,
}

impl AuthService {
    pub fn new(
        user_service: Arc<UserService>,
        session_store: Arc<dyn SessionStore>,
        token_store: Arc<dyn TokenStore>,
        email_service: SharedEmailService,
        audit_service: Arc<AuditService>,
    ) -> Self {
        Self {
            user_service,
            session_store,
            token_store,
            email_service,
            audit_service,
        }
    }
```

The `login` method (lines 44-94) stays **unchanged** — it doesn't use token repos.

Replace `register` (lines 96-134) — use `Token::generate` + `token_store.save`:

```rust
    /// Register a new user and send a verification email.
    pub async fn register(
        &self,
        ctx: &Ctx,
        name: String,
        email: &Email,
        password: &str,
        terms_accepted: bool,
        terms_version: String,
    ) -> Result<UserId, DomainError> {
        let user_id = self
            .user_service
            .create_pending_user(ctx, name, email, password, terms_accepted, terms_version)
            .await?;

        if let Err(e) = self
            .audit_service
            .log_user_registered(ctx, user_id, None)
            .await
        {
            tracing::warn!(
                error = %e,
                action = "user_registered",
                request_id = ?ctx.request_id,
                "failed to log audit event"
            );
        }

        let token = Token::generate(TokenKind::EmailVerification, user_id);
        self.token_store
            .save(ctx, TokenKind::EmailVerification, user_id, &token.hash, token.expires_at)
            .await?;

        self.email_service
            .send_verification(email, &token.plaintext)
            .await?;

        Ok(user_id)
    }
```

Replace `verify_email` (lines 136-171) — use `token_store.consume` (one call replaces the 4-step dance):

```rust
    /// Verify email using token from email link.
    pub async fn verify_email(&self, ctx: &Ctx, token: &str) -> Result<UserId, DomainError> {
        let token_hash = Token::sha256_hash(token);

        let user_id = self
            .token_store
            .consume(ctx, TokenKind::EmailVerification, &token_hash)
            .await?;

        self.user_service.activate_user(ctx, user_id).await?;

        if let Err(e) = self.audit_service.log_email_verified(ctx, user_id).await {
            tracing::warn!(
                error = %e,
                action = "email_verified",
                request_id = ?ctx.request_id,
                "failed to log audit event"
            );
        }

        Ok(user_id)
    }
```

Replace `request_password_reset` (lines 173-207) — use `Token::generate` + `token_store.save`:

```rust
    /// Request password reset (user initiates).
    ///
    /// Always returns Ok to prevent email enumeration.
    pub async fn request_password_reset(
        &self,
        ctx: &Ctx,
        email: &Email,
    ) -> Result<(), DomainError> {
        let user = match self.user_service.find_by_email(ctx, email).await {
            Ok(Some(user)) => user,
            Ok(None) => {
                // User doesn't exist - return Ok to prevent enumeration
                return Ok(());
            }
            Err(e) => return Err(e),
        };

        let token = Token::generate(TokenKind::PasswordReset, user.id);

        self.token_store
            .save(ctx, TokenKind::PasswordReset, user.id, &token.hash, token.expires_at)
            .await?;

        // Swallow email errors to prevent account enumeration during outages.
        if let Err(e) = self
            .email_service
            .send_password_reset(email, &token.plaintext)
            .await
        {
            tracing::warn!(
                error = %e,
                action = "password_reset_email",
                request_id = ?ctx.request_id,
                "failed to send password reset email"
            );
        }

        Ok(())
    }
```

Note: the `eprintln!` at line 203 is now `tracing::warn!` — this fixes the inconsistency flagged in the review.

Replace `reset_password` (lines 209-250) — use `token_store.consume`:

```rust
    /// Reset password using token from email.
    pub async fn reset_password(
        &self,
        ctx: &Ctx,
        token: &str,
        new_password: &str,
    ) -> Result<(), DomainError> {
        klynt_domain::models::validate_password(new_password)?;

        let token_hash = Token::sha256_hash(token);

        let user_id = self
            .token_store
            .consume(ctx, TokenKind::PasswordReset, &token_hash)
            .await?;

        self.user_service
            .update_password(ctx, user_id, new_password)
            .await?;

        if let Err(e) = self.audit_service.log_password_reset(ctx, user_id).await {
            tracing::warn!(
                error = %e,
                action = "password_reset",
                request_id = ?ctx.request_id,
                "failed to log audit event"
            );
        }

        Ok(())
    }
```

- [ ] **Step 2: Update test support — collapse token fakes**

In `backend/crates/klynt-application/tests/support/auth.rs`, delete `FakeEmailVerificationTokenRepository` (lines 73-119) and `FakePasswordResetTokenRepository` (lines 121-167). Replace with one `FakeTokenStore`:

```rust
use std::collections::HashMap;
use klynt_domain::repositories::TokenStore;
use klynt_domain::tokens::TokenKind;

type FakeTokenEntry = (UserId, DateTime<Utc>, bool);

#[derive(Debug, Default)]
pub struct FakeTokenStore {
    tokens: Arc<Mutex<HashMap<(TokenKind, String), FakeTokenEntry>>>,
}

#[async_trait]
impl TokenStore for FakeTokenStore {
    async fn save(
        &self,
        _ctx: &Ctx,
        kind: TokenKind,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError> {
        let mut tokens = self.tokens.lock().unwrap();
        tokens.insert((kind, token_hash.to_string()), (user_id, expires_at, false));
        Ok(())
    }

    async fn consume(
        &self,
        _ctx: &Ctx,
        kind: TokenKind,
        token_hash: &str,
    ) -> Result<UserId, DomainError> {
        let mut tokens = self.tokens.lock().unwrap();
        let key = (kind, token_hash.to_string());
        let Some((user_id, expires_at, used)) = tokens.get_mut(&key) else {
            return Err(DomainError::InvalidToken(
                klynt_domain::errors::TokenError::Invalid,
            ));
        };
        if *used {
            return Err(DomainError::InvalidToken(
                klynt_domain::errors::TokenError::AlreadyUsed,
            ));
        }
        if *expires_at <= Utc::now() {
            return Err(DomainError::InvalidToken(
                klynt_domain::errors::TokenError::Expired,
            ));
        }
        *used = true;
        Ok(*user_id)
    }
}
```

Update the `auth_service()` helper to use `FakeTokenStore`:

```rust
pub fn auth_service() -> (
    AuthService,
    Arc<klynt_application::users::UserService>,
    Arc<FakeEmailService>,
) {
    let user_service = Arc::new(user_service());
    let session_store: Arc<dyn SessionStore> = Arc::new(FakeSessionStore);
    let token_store: Arc<dyn TokenStore> = Arc::new(FakeTokenStore::default());
    let email_service_impl = Arc::new(FakeEmailService::default());
    let email_service: SharedEmailService = Arc::clone(&email_service_impl) as SharedEmailService;
    let audit_repo: Arc<dyn AuditEventRepository> = Arc::new(FakeAuditEventRepository::default());
    let audit_service = Arc::new(AuditService::new(audit_repo));
    let auth_service = AuthService::new(
        Arc::clone(&user_service),
        session_store,
        token_store,
        email_service,
        audit_service,
    );
    (auth_service, user_service, email_service_impl)
}
```

Update imports in `support/auth.rs` — remove `EmailVerificationTokenRepository`, `PasswordResetTokenRepository`, add `TokenStore`, `TokenKind`.

- [ ] **Step 3: Verify application crate compiles**

Run: `cd backend && cargo check -p klynt-application`
Expected: PASS

- [ ] **Step 4: Run application tests**

Run: `cd backend && cargo nextest run -p klynt-application`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/crates/klynt-application/src/auth.rs backend/crates/klynt-application/tests/support/auth.rs
git commit -m "refactor: AuthService uses unified TokenStore

Two token repos replaced by one Arc<dyn TokenStore>. The 4-step
consume dance (hash → find_valid → mark_used → check was_used) is
now one token_store.consume() call. Also fixes eprintln! → tracing::warn!"
```

---

### Task 10: Rewire composition root for TokenStore

**Files:**
- Modify: `backend/crates/klynt-server/src/composition.rs`

- [ ] **Step 1: Replace two token repo constructions with one `PgTokenStore`**

In `backend/crates/klynt-server/src/composition.rs`, update imports:

Remove:
```rust
use klynt_domain::repositories::{
    AuditEventRepository, EmailVerificationTokenRepository, PasswordResetTokenRepository,
};
```

Replace with:
```rust
use klynt_domain::repositories::{AuditEventRepository, TokenStore};
```

Remove:
```rust
use klynt_infrastructure::repositories::sqlx_token_repo::{
    PgEmailVerificationTokenRepository, PgPasswordResetTokenRepository,
};
```

Replace with:
```rust
use klynt_infrastructure::repositories::sqlx_token_repo::PgTokenStore;
```

In the wiring block, replace lines 66-69 (two token repos):

```rust
    // DELETE these two lines:
    // let email_verification_repo: Arc<dyn EmailVerificationTokenRepository> = ...
    // let password_reset_repo: Arc<dyn PasswordResetTokenRepository> = ...

    // REPLACE with:
    let token_store: Arc<dyn TokenStore> = Arc::new(PgTokenStore::new(pool.clone()));
```

Update `AuthService::new` call (lines 100-107):

```rust
    let auth_service = Arc::new(AuthService::new(
        Arc::clone(&user_service),
        Arc::clone(&session_store) as Arc<dyn SessionStore>,
        Arc::clone(&token_store),
        email_service,
        Arc::clone(&audit_service),
    ));
```

Update `AppState::new` call — remove the two token repo fields (lines 123-124). See Task 12 for the full AppState changes; for now, remove `email_verification_repo` and `password_reset_repo` from the `AppStateDeps` struct and the `AppState::new` call.

- [ ] **Step 2: Verify full workspace compilation**

Run: `cd backend && cargo check --workspace`
Expected: PASS

- [ ] **Step 3: Run full test suite**

Run: `cd backend && cargo nextest run --all-features`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/crates/klynt-server/src/composition.rs
git commit -m "refactor: wire composition root with unified PgTokenStore"
```

---

## Phase 4: Delete the AppState forwarding facade

`AppState` has 7 one-line delegation methods + 3 dead accessors + 2 duplicated token-repo handles. Slim it to a bag of port accessors.

---

### Task 11: Slim AppState to a port bag and update handlers

**Files:**
- Modify: `backend/crates/klynt-api/src/state.rs`
- Modify: `backend/crates/klynt-api/src/v1/auth.rs`
- Modify: `backend/crates/klynt-api/src/v1/sessions.rs`
- Modify: `backend/crates/klynt-api/src/v1/users.rs`

- [ ] **Step 1: Rewrite `state.rs` — delete forwarders, dead fields, and dead accessors**

Replace the entire contents of `backend/crates/klynt-api/src/state.rs`:

```rust
use std::sync::Arc;

use klynt_application::audit::AuditService;
use klynt_application::auth::AuthService;
use klynt_application::users::UserService;
use klynt_domain::config::AppConfig;
use klynt_domain::ports::{HealthCheck, RateLimiter};
use klynt_domain::session::SessionStore;

#[derive(Clone)]
pub struct AppState {
    config: Arc<AppConfig>,
    user_service: Arc<UserService>,
    auth_service: Arc<AuthService>,
    session_store: Arc<dyn SessionStore>,
    rate_limiter: Arc<dyn RateLimiter>,
    health_checks: Vec<Arc<dyn HealthCheck>>,
}

/// Named dependency bag for constructing [`AppState`].
pub struct AppStateDeps {
    pub config: AppConfig,
    pub user_service: Arc<UserService>,
    pub auth_service: Arc<AuthService>,
    pub session_store: Arc<dyn SessionStore>,
    pub rate_limiter: Arc<dyn RateLimiter>,
    pub health_checks: Vec<Arc<dyn HealthCheck>>,
}

impl AppState {
    pub fn new(deps: AppStateDeps) -> Self {
        Self {
            config: Arc::new(deps.config),
            user_service: deps.user_service,
            auth_service: deps.auth_service,
            session_store: deps.session_store,
            rate_limiter: deps.rate_limiter,
            health_checks: deps.health_checks,
        }
    }

    pub fn config(&self) -> &AppConfig {
        &self.config
    }

    pub fn rate_limiter(&self) -> &dyn RateLimiter {
        &*self.rate_limiter
    }

    pub fn session_store(&self) -> &dyn SessionStore {
        &*self.session_store
    }

    pub fn user_service(&self) -> &UserService {
        &self.user_service
    }

    pub fn auth_service(&self) -> &AuthService {
        &self.auth_service
    }

    pub async fn check_health(&self) -> Result<(), klynt_domain::errors::DomainError> {
        for check in &self.health_checks {
            check.check().await?;
        }
        Ok(())
    }
}
```

Deleted: 7 forwarding methods (`create_user`, `find_user_by_id`, `login`, `register`, `verify_email`, `request_password_reset`, `reset_password`), 3 dead accessors (`email_verification_repo`, `password_reset_repo`, `audit_service`), and the 3 dead fields they exposed.

- [ ] **Step 2: Update `auth.rs` handlers to call `state.auth_service()` directly**

In `backend/crates/klynt-api/src/v1/auth.rs`, update the `register` handler (lines 62-91):

```rust
pub async fn register(
    State(state): State<Arc<AppState>>,
    Extension(request_id): Extension<RequestId>,
    Json(body): Json<RegisterBody>,
) -> Result<impl IntoResponse, AppError> {
    let email = Email::parse(&body.email)
        .map_err(|e| AppError::from(DomainError::InvalidEmail(e)).with_request_id(request_id.0))?;

    let ctx = Ctx::guest(request_id.0);
    let user_id = state
        .auth_service()
        .register(
            &ctx,
            body.name,
            &email,
            &body.password,
            body.terms_accepted,
            body.terms_version,
        )
        .await
        .with_request_id(request_id.0)?;

    Ok((
        StatusCode::CREATED,
        Json(RegisterResponse {
            user_id: user_id.0,
            message: "Registration successful. Please check your email to verify your account."
                .to_string(),
        }),
    ))
}
```

Update `verify_email` (lines 94-110):

```rust
pub async fn verify_email(
    State(state): State<Arc<AppState>>,
    Extension(request_id): Extension<RequestId>,
    Json(body): Json<VerifyEmailBody>,
) -> Result<impl IntoResponse, AppError> {
    let ctx = Ctx::guest(request_id.0);
    let _user_id = state
        .auth_service()
        .verify_email(&ctx, &body.token)
        .await
        .with_request_id(request_id.0)?;

    Ok(Json(VerifyEmailResponse {
        message: "Email verified successfully. You can now log in.".to_string(),
    }))
}
```

Update `request_password_reset` (lines 115-134):

```rust
pub async fn request_password_reset(
    State(state): State<Arc<AppState>>,
    Extension(request_id): Extension<RequestId>,
    Json(body): Json<RequestPasswordResetBody>,
) -> Result<impl IntoResponse, AppError> {
    let email = Email::parse(&body.email)
        .map_err(|e| AppError::from(DomainError::InvalidEmail(e)).with_request_id(request_id.0))?;

    let ctx = Ctx::guest(request_id.0);
    state
        .auth_service()
        .request_password_reset(&ctx, &email)
        .await
        .with_request_id(request_id.0)?;

    Ok(Json(RequestPasswordResetResponse {
        message: "If an account exists with this email, a password reset link has been sent."
            .to_string(),
    }))
}
```

Update `reset_password` (lines 139-154):

```rust
pub async fn reset_password(
    State(state): State<Arc<AppState>>,
    Extension(request_id): Extension<RequestId>,
    Json(body): Json<ResetPasswordBody>,
) -> Result<impl IntoResponse, AppError> {
    let ctx = Ctx::guest(request_id.0);
    state
        .auth_service()
        .reset_password(&ctx, &body.token, &body.new_password)
        .await
        .with_request_id(request_id.0)?;

    Ok(Json(ResetPasswordResponse {
        message: "Password reset successfully. You can now log in with your new password."
            .to_string(),
    }))
}
```

- [ ] **Step 3: Update `sessions.rs` handler**

In `backend/crates/klynt-api/src/v1/sessions.rs`, update the `login` handler (lines 25-47):

```rust
pub async fn login(
    State(state): State<Arc<AppState>>,
    Extension(request_id): Extension<RequestId>,
    Json(body): Json<LoginBody>,
) -> Result<impl IntoResponse, AppError> {
    let email = Email::parse(&body.email).map_err(|e| {
        AppError::from(klynt_domain::errors::DomainError::InvalidEmail(e))
            .with_request_id(request_id.0)
    })?;

    let ctx = klynt_domain::ctx::Ctx::guest(request_id.0);
    let (token, user) = state
        .auth_service()
        .login(&ctx, &email, &body.password)
        .await
        .with_request_id(request_id.0)?;

    Ok((
        StatusCode::OK,
        Json(LoginResponse {
            token: token.0,
            user,
        }),
    ))
}
```

- [ ] **Step 4: Update `users.rs` handlers**

In `backend/crates/klynt-api/src/v1/users.rs`, update `create_user` (lines 45-58):

```rust
pub async fn create_user(
    State(state): State<Arc<AppState>>,
    Extension(request_id): Extension<RequestId>,
    headers: HeaderMap,
    Json(req): Json<CreateUserBody>,
) -> Result<impl IntoResponse, AppError> {
    let idempotency_key = parse_idempotency_key(&headers, request_id.0)?;
    let user_dto = state
        .user_service()
        .create_user(&Ctx::guest(request_id.0), idempotency_key, req.into())
        .await
        .with_request_id(request_id.0)?;

    Ok((StatusCode::CREATED, Json(user_dto)))
}
```

Update `get_me` (lines 60-75):

```rust
pub async fn get_me(
    State(state): State<Arc<AppState>>,
    Extension(request_id): Extension<RequestId>,
    CtxW(ctx): CtxW,
) -> Result<impl IntoResponse, AppError> {
    let user_id = ctx
        .user_id
        .ok_or_else(|| klynt_domain::errors::DomainError::AuthenticationRequired)?;

    let user = state
        .user_service()
        .find_by_id(&ctx, user_id)
        .await
        .with_request_id(request_id.0)?;

    Ok((StatusCode::OK, Json(UserDto::from(&user))))
}
```

- [ ] **Step 5: Update `composition.rs` to match new `AppStateDeps`**

In `backend/crates/klynt-server/src/composition.rs`, update the `AppState::new` call (lines 116-126) — remove `email_verification_repo`, `password_reset_repo`, and `audit_service` fields:

```rust
    let state = Arc::new(AppState::new(klynt_api::state::AppStateDeps {
        config,
        user_service,
        auth_service,
        session_store: Arc::clone(&session_store) as Arc<dyn SessionStore>,
        rate_limiter: rate_limiter_port,
        health_checks,
    }));
```

The `audit_service` Arc is now only used by `AuthService` — it doesn't need to be in `AppState`. Remove the `let audit_service` line from composition if it's no longer referenced after the `AppState::new` change. Check: `audit_service` is used at line 98 (`AuditService::new`) and line 106 (`AuthService::new`). After removing from `AppStateDeps`, it's still used at line 106. Keep the variable.

- [ ] **Step 6: Verify full workspace compilation**

Run: `cd backend && cargo check --workspace`
Expected: PASS

- [ ] **Step 7: Run tests**

Run: `cd backend && cargo nextest run --all-features`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add backend/crates/klynt-api/src/state.rs backend/crates/klynt-api/src/v1/auth.rs backend/crates/klynt-api/src/v1/sessions.rs backend/crates/klynt-api/src/v1/users.rs backend/crates/klynt-server/src/composition.rs
git commit -m "refactor: delete AppState forwarding facade

AppState is now a thin bag of port accessors. Handlers call
state.auth_service() / state.user_service() directly instead of
through 7 mirrored forwarding methods. Removes 3 dead accessors
and 2 duplicated token-repo handles."
```

---

## Phase 5: Centralise fire-and-forget glue

The "log audit, swallow error, warn" block is replicated 5× in `AuthService`. Centralise it behind `AuditService::try_log`.

---

### Task 12: Add `try_log` to AuditService and use it in AuthService

**Files:**
- Modify: `backend/crates/klynt-application/src/audit.rs`
- Modify: `backend/crates/klynt-application/src/auth.rs`

- [ ] **Step 1: Add a `try_log` helper method to `AuditService`**

In `backend/crates/klynt-application/src/audit.rs`, add this method to the `impl AuditService` block (after `log_login_failed`, before the closing `}`):

```rust
    /// Log an audit event, swallowing any error.
    ///
    /// Audit failures must never fail the request. This method encapsulates
    /// the "log, warn, move on" policy so callers don't replicate the
    /// error-handling boilerplate.
    pub async fn try_log(
        &self,
        ctx: &Ctx,
        action: &str,
        log_fn: impl std::future::Future<Output = Result<(), DomainError>>,
    ) {
        if let Err(e) = log_fn.await {
            tracing::warn!(
                error = %e,
                action = action,
                request_id = ?ctx.request_id,
                "failed to log audit event"
            );
        }
    }
```

- [ ] **Step 2: Write a test for `try_log` swallowing errors**

Add to the `#[cfg(test)] mod tests` block in `audit.rs`:

```rust
    #[tokio::test]
    async fn try_log_swallows_repo_error() {
        let service = AuditService::new(Arc::new(ErrorRepo));
        let ctx = Ctx::guest(Uuid::new_v4());
        let user_id = UserId::new();

        // Should NOT return an error even though ErrorRepo always fails.
        service
            .try_log(&ctx, "test", service.log_user_registered(&ctx, user_id, None))
            .await;
    }
```

- [ ] **Step 3: Replace the 5 boilerplate blocks in `AuthService`**

In `backend/crates/klynt-application/src/auth.rs`, replace each `if let Err(e) = self.audit_service...` block with a `try_log` call.

In `login` (replace lines 59-70):

```rust
        let user = match self.user_service.authenticate(ctx, email, password).await {
            Ok(user) => user,
            Err(e) => {
                self.audit_service
                    .try_log(ctx, "login_failed",
                        self.audit_service.log_login_failed(ctx, email.as_str(), None, e.to_string()))
                    .await;
                return Err(e);
            }
        };
```

In `login` (replace lines 80-91):

```rust
        self.audit_service
            .try_log(ctx, "session_created",
                self.audit_service.log_session_created(ctx, user_id, token.0, None))
            .await;
```

In `register` (replace lines 111-122):

```rust
        self.audit_service
            .try_log(ctx, "user_registered",
                self.audit_service.log_user_registered(ctx, user_id, None))
            .await;
```

In `verify_email` (replace lines 161-168):

```rust
        self.audit_service
            .try_log(ctx, "email_verified",
                self.audit_service.log_email_verified(ctx, user_id))
            .await;
```

In `reset_password` (replace lines 240-247):

```rust
        self.audit_service
            .try_log(ctx, "password_reset",
                self.audit_service.log_password_reset(ctx, user_id))
            .await;
```

- [ ] **Step 4: Verify compilation**

Run: `cd backend && cargo check --workspace`
Expected: PASS

- [ ] **Step 5: Run tests**

Run: `cd backend && cargo nextest run --all-features`
Expected: PASS — including the new `try_log_swallows_repo_error` test

- [ ] **Step 6: Commit**

```bash
git add backend/crates/klynt-application/src/audit.rs backend/crates/klynt-application/src/auth.rs
git commit -m "refactor: centralise audit swallow-and-warn in try_log

The 'log audit, swallow error, warn' policy was replicated 5x in
AuthService. AuditService::try_log now encapsulates it. One policy,
one place — locality."
```

---

### Task 13: Final verification and ADR update

**Files:**
- Modify: `docs/adr/0001-postgres-redis-persistence.md`

- [ ] **Step 1: Run the full quality gate**

Run: `cd backend && cargo fmt && cargo clippy --workspace --all-targets --all-features -- -D warnings`
Expected: PASS — no warnings

Run: `cd backend && cargo nextest run --all-features`
Expected: PASS

Run: `just check`
Expected: PASS

Run: `just test-coverage`
Expected: PASS — Rust ≥ 84%

- [ ] **Step 2: Update ADR-0001 to reflect the current state**

In `docs/adr/0001-postgres-redis-persistence.md`, update the Consequences section to remove references to in-memory adapters (deleted in commit `16dd8cd`) and the no-op UoW (deleted in this plan):

Replace lines 40-48:

```markdown
- **Positive**: Migrations are version-controlled and applied automatically, reducing
  drift between environments.
- **Negative**: Running the full backend coverage gate requires a Postgres and Redis
  instance; the `test-coverage` recipe therefore runs ignored infrastructure tests with
  `--include-ignored`.

> **Update (2026-06-20):** The in-memory adapters and no-op `UnitOfWork` referenced
> in the original ADR have been removed. The composition root now requires
> `DATABASE_URL` and `REDIS_URL` (no fallback). `UserService` holds
> `Arc<dyn UserRepository>` directly — real cross-aggregate transactions, if needed,
> will be introduced as a new seam that spans all repositories.
```

- [ ] **Step 3: Commit**

```bash
git add docs/adr/0001-postgres-redis-persistence.md
git commit -m "docs: update ADR-0001 to reflect removed in-memory adapters and UoW"
```

---

## Summary of deleted code

| Module | Lines removed (approx) | Why |
|---|---|---|
| `unit_of_work.rs` | 16 | No-op seam — one adapter, commit/rollback were `Ok(())` |
| `PgUnitOfWork` + `PgTransaction` | ~47 | No-op implementation |
| `FakeUnitOfWork` + `FakeTransaction` | ~32 | No-op test double |
| `EmailVerificationToken` + `PasswordResetToken` | ~100 | 90% duplicate structs |
| `EmailVerificationTokenRepository` + `PasswordResetTokenRepository` | ~42 | Structurally identical traits |
| `PgEmailVerificationTokenRepo` + `PgPasswordResetTokenRepo` | ~161 | Byte-for-byte duplicate SQL |
| `FakeEmailVerificationTokenRepo` + `FakePasswordResetTokenRepo` | ~95 | Duplicate test doubles |
| `AuditEventRepository::find_by_user` + `find_by_resource` | ~40 | Zero production callers |
| `PgAuditEventRepository::find_by_*` + `AuditEventRow` | ~115 | Implementing dead methods |
| `AppErrorKind::Validation` | ~4 | Dead variant |
| `AppState` forwarders + dead accessors | ~50 | Shallow facade |
| AuthService audit boilerplate | ~40 | 5× replicated policy |
| **Total** | **~740 lines** | |
