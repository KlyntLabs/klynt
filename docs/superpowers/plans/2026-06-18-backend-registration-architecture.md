# Backend Registration Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the user registration vertical slice (`POST /api/v1/users`) inside the existing single Rust crate, with Clean Architecture module boundaries, atomic email uniqueness, password hashing, rate limiting, idempotency, and a minimal frontend `/register` page plus E2E test.

**Architecture:** Keep `backend/` as one crate (`klynt-api`) with modules `contracts/`, `domain/`, `application/`, `infrastructure/`, and `api/`. The workspace skeleton that currently exists is empty and broken, so the first task collapses it back to a single crate. Domain code has no framework dependencies; only `api/` knows Axum.

**Tech Stack:** Rust 2021, Axum 0.8, Tokio, serde, thiserror, uuid, chrono, argon2, async-trait. Frontend: React 19, TypeScript, React Router 7, Axios, React Hook Form, Zod, Vitest, Playwright.

---

## File Structure

### Existing files to modify

- `backend/Cargo.toml` — revert broken workspace to single crate manifest.
- `backend/src/main.rs` — ensure imports match the crate name.
- `backend/src/lib.rs` — add `contracts` module.
- `backend/src/state.rs` — hold `UserService`, rate limiter, idempotency store.
- `backend/src/startup.rs` — wire `/api/v1/users` route.
- `backend/src/error.rs` — add `DomainError`, `Conflict`, `RateLimited` variants.
- `backend/src/api/v1/mod.rs` — nest users router.
- `backend/src/api/v1/health.rs` — no changes.
- `backend/tests/helpers.rs` — construct `AppState` with services.
- `frontend/src/routes/route-paths.ts` — add `register`.
- `frontend/src/routes/index.tsx` — add `/register` route.
- `frontend/src/lib/api-client.ts` — add `registerUser` function.

### New files to create

- `backend/src/contracts/mod.rs`
- `backend/src/contracts/users.rs`
- `backend/src/domain/errors.rs`
- `backend/src/domain/models.rs` (replace placeholder)
- `backend/src/domain/ctx.rs`
- `backend/src/domain/repositories.rs` (replace placeholder)
- `backend/src/domain/unit_of_work.rs`
- `backend/src/application/users.rs`
- `backend/src/infrastructure/repositories/in_memory_user.rs`
- `backend/src/infrastructure/repositories/idempotency.rs`
- `backend/src/infrastructure/rate_limiter.rs`
- `backend/src/infrastructure/unit_of_work.rs`
- `backend/src/api/v1/users.rs`
- `backend/tests/users.rs`
- `frontend/src/features/auth/api/register.ts`
- `frontend/src/features/auth/components/register-form.tsx`
- `frontend/src/routes/register.tsx`
- `frontend/src/features/auth/components/register-form.test.tsx`
- `frontend/e2e/register.spec.ts`

---

## Task 1: Fix broken workspace manifest

**Files:**
- Modify: `backend/Cargo.toml`
- Delete: `backend/crates/` directory tree

The workspace currently references empty crate directories, so `cargo check` fails. Revert to a single crate manifest.

- [ ] **Step 1: Replace `backend/Cargo.toml` contents**

```toml
[package]
name = "klynt-api"
version = "0.1.0"
edition = "2021"

[dependencies]
anyhow = "1"
argon2 = "0.5"
async-trait = "0.1"
axum = "0.8"
chrono = { version = "0.4", features = ["serde"] }
config = "0.15"
dotenvy = "0.15"
serde = { version = "1", features = ["derive"] }
thiserror = "1"
tokio = { version = "1", features = ["full"] }
tower = "0.5"
tower-http = { version = "0.6", features = ["cors", "trace", "compression", "timeout"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
uuid = { version = "1", features = ["v4", "serde"] }

[dev-dependencies]
http-body-util = "0.1"
serde_json = "1"
```

- [ ] **Step 2: Delete empty workspace crate directories**

Run:

```bash
rm -rf backend/crates
```

- [ ] **Step 3: Verify `cargo check` passes**

Run:

```bash
cd backend && cargo check
```

Expected: success (warnings about unused modules are OK).

- [ ] **Step 4: Commit**

```bash
git add backend/Cargo.toml
git rm -r backend/crates
git commit -m "chore: collapse empty workspace back to single klynt-api crate"
```

---

## Task 2: Implement domain value objects and errors

**Files:**
- Create: `backend/src/domain/errors.rs`
- Modify: `backend/src/domain/models.rs`
- Modify: `backend/src/domain/mod.rs`

- [ ] **Step 1: Create `backend/src/domain/errors.rs`**

```rust
use thiserror::Error;

#[derive(Debug, Error, PartialEq)]
pub enum EmailError {
    #[error("email is empty")]
    Empty,
    #[error("invalid email format")]
    InvalidFormat,
}

#[derive(Debug, Error, PartialEq)]
pub enum PasswordError {
    #[error("password must be at least 12 characters")]
    TooShort,
}

#[derive(Debug, Error, PartialEq)]
pub enum RoleError {
    #[error("unknown role")]
    Unknown,
}

#[derive(Debug, Error)]
pub enum DomainError {
    #[error("user already exists: {email}")]
    AlreadyExists { email: String },
    #[error("invalid email")]
    InvalidEmail(#[from] EmailError),
    #[error("weak password")]
    WeakPassword(#[from] PasswordError),
    #[error("invalid role")]
    InvalidRole(#[from] RoleError),
    #[error("not found")]
    NotFound,
    #[error("institution is required for role {0:?}")]
    InstitutionRequired(Role),
    #[error("terms must be accepted")]
    TermsNotAccepted,
}
```

- [ ] **Step 2: Replace `backend/src/domain/models.rs`**

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::domain::errors::{EmailError, PasswordError, RoleError};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct UserId(pub Uuid);

impl UserId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for UserId {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Email(String);

impl Email {
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

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

pub fn validate_password(raw: &str) -> Result<(), PasswordError> {
    if raw.len() < 12 {
        return Err(PasswordError::TooShort);
    }
    Ok(())
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UserStatus {
    PendingVerification,
    Active,
    Suspended,
}

#[derive(Debug, Clone)]
pub struct User {
    pub id: UserId,
    pub name: String,
    pub email: Email,
    pub role: Role,
    pub institution_id: Option<Uuid>,
    pub status: UserStatus,
    pub password_hash: String,
    pub terms_accepted_at: DateTime<Utc>,
    pub terms_version: String,
    pub created_at: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn email_parses_valid_address() {
        let email = Email::parse("Ada@Example.COM").unwrap();
        assert_eq!(email.as_str(), "ada@example.com");
    }

    #[test]
    fn email_preserves_plus_addressing() {
        let a = Email::parse("ada+tag@example.com").unwrap();
        let b = Email::parse("ada@example.com").unwrap();
        assert_ne!(a, b);
    }

    #[test]
    fn email_rejects_invalid_addresses() {
        assert_eq!(Email::parse(""), Err(EmailError::Empty));
        assert_eq!(Email::parse("  "), Err(EmailError::Empty));
        assert_eq!(Email::parse("ada"), Err(EmailError::InvalidFormat));
        assert_eq!(Email::parse("ada@"), Err(EmailError::InvalidFormat));
        assert_eq!(Email::parse("@example.com"), Err(EmailError::InvalidFormat));
        assert_eq!(Email::parse("ada@example"), Err(EmailError::InvalidFormat));
    }

    #[test]
    fn password_must_be_at_least_12_chars() {
        assert_eq!(validate_password("short1!"), Err(PasswordError::TooShort));
        assert!(validate_password("long-enough-pass").is_ok());
    }

    #[test]
    fn role_parses_known_roles() {
        assert_eq!(Role::parse("student").unwrap(), Role::Student);
        assert_eq!(Role::parse("Teacher").unwrap(), Role::Teacher);
        assert_eq!(Role::parse("ADMIN").unwrap(), Role::Admin);
        assert_eq!(Role::parse("parent").unwrap(), Role::Parent);
        assert_eq!(Role::parse("guest"), Err(RoleError::Unknown));
    }

    #[test]
    fn teacher_and_admin_require_institution() {
        assert!(Role::Teacher.requires_institution());
        assert!(Role::Admin.requires_institution());
        assert!(!Role::Student.requires_institution());
        assert!(!Role::Parent.requires_institution());
    }
}
```

- [ ] **Step 3: Modify `backend/src/domain/mod.rs`**

```rust
pub mod ctx;
pub mod errors;
pub mod models;
pub mod repositories;
pub mod unit_of_work;
```

- [ ] **Step 4: Run tests**

Run:

```bash
cd backend && cargo test domain::models::tests
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain/
git commit -m "feat(domain): add User, Email, Role, Password, errors, and tests"
```

---

## Task 3: Implement request context and repository port

**Files:**
- Create: `backend/src/domain/ctx.rs`
- Modify: `backend/src/domain/repositories.rs`

- [ ] **Step 1: Create `backend/src/domain/ctx.rs`**

```rust
use uuid::Uuid;

#[derive(Debug, Clone, Copy)]
pub struct Ctx {
    pub request_id: Uuid,
}

impl Ctx {
    pub fn new(request_id: Uuid) -> Self {
        Self { request_id }
    }
}
```

- [ ] **Step 2: Replace `backend/src/domain/repositories.rs`**

```rust
use async_trait::async_trait;

use crate::domain::ctx::Ctx;
use crate::domain::errors::DomainError;
use crate::domain::models::{Email, User, UserId};

pub enum CreateResult {
    Created,
    AlreadyExists(User),
}

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn create_if_not_exists(
        &self,
        ctx: &Ctx,
        email: &Email,
        user: &User,
    ) -> Result<CreateResult, DomainError>;

    async fn find_by_email(
        &self,
        ctx: &Ctx,
        email: &Email,
    ) -> Result<Option<User>, DomainError>;

    async fn find_by_id(&self, ctx: &Ctx, id: UserId) -> Result<Option<User>, DomainError>;
}
```

- [ ] **Step 3: Verify compile**

Run:

```bash
cd backend && cargo check
```

Expected: success.

- [ ] **Step 4: Commit**

```bash
git add backend/src/domain/ctx.rs backend/src/domain/repositories.rs
git commit -m "feat(domain): add Ctx and UserRepository port"
```

---

## Task 4: Implement UnitOfWork port

**Files:**
- Create: `backend/src/domain/unit_of_work.rs`

- [ ] **Step 1: Create `backend/src/domain/unit_of_work.rs`**

```rust
use async_trait::async_trait;

use crate::domain::errors::DomainError;
use crate::domain::repositories::UserRepository;

#[async_trait]
pub trait Transaction: Send + Sync {
    fn users(&self) -> &dyn UserRepository;
    async fn commit(self: Box<Self>) -> Result<(), DomainError>;
    async fn rollback(self: Box<Self>) -> Result<(), DomainError>;
}

#[async_trait]
pub trait UnitOfWork: Send + Sync {
    async fn begin(&self) -> Result<Box<dyn Transaction>, DomainError>;
}
```

- [ ] **Step 2: Verify compile**

Run:

```bash
cd backend && cargo check
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add backend/src/domain/unit_of_work.rs
git commit -m "feat(domain): add UnitOfWork port"
```

---

## Task 5: Implement contracts DTOs

**Files:**
- Create: `backend/src/contracts/mod.rs`
- Create: `backend/src/contracts/users.rs`
- Modify: `backend/src/lib.rs`

- [ ] **Step 1: Create `backend/src/contracts/mod.rs`**

```rust
pub mod users;
```

- [ ] **Step 2: Create `backend/src/contracts/users.rs`**

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub name: String,
    pub email: String,
    pub password: String,
    pub role: String,
    pub institution_id: Option<Uuid>,
    pub terms_accepted: bool,
    pub terms_version: String,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub role: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
}
```

- [ ] **Step 3: Modify `backend/src/lib.rs`**

```rust
pub mod api;
pub mod application;
pub mod config;
pub mod contracts;
pub mod domain;
pub mod error;
pub mod infrastructure;
pub mod startup;
pub mod state;
pub mod telemetry;
```

- [ ] **Step 4: Verify compile**

Run:

```bash
cd backend && cargo check
```

Expected: success.

- [ ] **Step 5: Commit**

```bash
git add backend/src/contracts/ backend/src/lib.rs
git commit -m "feat(contracts): add user registration DTOs"
```

---

## Task 6: Implement application UserService

**Files:**
- Create: `backend/src/application/users.rs`
- Modify: `backend/src/application/mod.rs`

- [ ] **Step 1: Create `backend/src/application/users.rs`**

```rust
use std::sync::Arc;

use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHasher,
};
use chrono::Utc;

use crate::contracts::users::{CreateUserRequest, UserResponse};
use crate::domain::ctx::Ctx;
use crate::domain::errors::DomainError;
use crate::domain::models::{
    validate_password, Email, Role, User, UserId, UserStatus,
};
use crate::domain::repositories::{CreateResult, UserRepository};

#[derive(Debug, Clone)]
pub struct UserDto {
    pub id: UserId,
    pub name: String,
    pub email: String,
    pub role: Role,
    pub status: UserStatus,
    pub created_at: chrono::DateTime<Utc>,
}

impl From<&User> for UserDto {
    fn from(user: &User) -> Self {
        Self {
            id: user.id,
            name: user.name.clone(),
            email: user.email.as_str().to_string(),
            role: user.role,
            status: user.status,
            created_at: user.created_at,
        }
    }
}

impl From<&UserDto> for UserResponse {
    fn from(dto: &UserDto) -> Self {
        Self {
            id: dto.id.0,
            name: dto.name.clone(),
            email: dto.email.clone(),
            role: format!("{:?}", dto.role).to_lowercase(),
            status: format!("{:?}", dto.status).to_lowercase(),
            created_at: dto.created_at,
        }
    }
}

pub struct UserService {
    user_repo: Arc<dyn UserRepository>,
}

impl UserService {
    pub fn new(user_repo: Arc<dyn UserRepository>) -> Self {
        Self { user_repo }
    }

    pub async fn create_user(
        &self,
        ctx: &Ctx,
        req: CreateUserRequest,
    ) -> Result<UserDto, DomainError> {
        if !req.terms_accepted {
            return Err(DomainError::TermsNotAccepted);
        }

        let email = Email::parse(&req.email)?;
        validate_password(&req.password)?;
        let role = Role::parse(&req.role)?;

        if role.requires_institution() && req.institution_id.is_none() {
            return Err(DomainError::InstitutionRequired(role));
        }

        let password_hash = hash_password(&req.password)
            .map_err(|_| DomainError::TermsNotAccepted)?;

        let user = User {
            id: UserId::new(),
            name: req.name,
            email: email.clone(),
            role,
            institution_id: req.institution_id,
            status: UserStatus::PendingVerification,
            password_hash,
            terms_accepted_at: Utc::now(),
            terms_version: req.terms_version,
            created_at: Utc::now(),
        };

        match self.user_repo.create_if_not_exists(ctx, &email, &user).await? {
            CreateResult::Created => Ok(UserDto::from(&user)),
            CreateResult::AlreadyExists(_) => Err(DomainError::AlreadyExists {
                email: email.as_str().to_string(),
            }),
        }
    }
}

fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2.hash_password(password.as_bytes(), &salt)?;
    Ok(hash.to_string())
}
```

Note: the password-hash error mapping uses `DomainError::TermsNotAccepted` as a temporary placeholder because we have not added a `DomainError::Internal` variant. After Task 11, replace that mapping with `DomainError::Internal(anyhow::Error)`. The plan will call this out in Task 11.

- [ ] **Step 2: Modify `backend/src/application/mod.rs`**

```rust
pub mod users;
```

- [ ] **Step 3: Verify compile**

Run:

```bash
cd backend && cargo check
```

Expected: success (with placeholder error mapping).

- [ ] **Step 4: Commit**

```bash
git add backend/src/application/
git commit -m "feat(application): add UserService with password hashing"
```

---

## Task 7: Implement in-memory adapters

**Files:**
- Create: `backend/src/infrastructure/repositories/in_memory_user.rs`
- Create: `backend/src/infrastructure/repositories/idempotency.rs`
- Create: `backend/src/infrastructure/rate_limiter.rs`
- Create: `backend/src/infrastructure/unit_of_work.rs`
- Modify: `backend/src/infrastructure/repositories/mod.rs`
- Modify: `backend/src/infrastructure/mod.rs`

- [ ] **Step 1: Create `backend/src/infrastructure/repositories/in_memory_user.rs`**

```rust
use std::collections::HashMap;
use std::sync::Mutex;

use async_trait::async_trait;

use crate::domain::ctx::Ctx;
use crate::domain::errors::DomainError;
use crate::domain::models::{Email, User, UserId};
use crate::domain::repositories::{CreateResult, UserRepository};

#[derive(Debug, Default)]
pub struct InMemoryUserRepository {
    users: Mutex<HashMap<Email, User>>,
}

impl InMemoryUserRepository {
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl UserRepository for InMemoryUserRepository {
    async fn create_if_not_exists(
        &self,
        _ctx: &Ctx,
        email: &Email,
        user: &User,
    ) -> Result<CreateResult, DomainError> {
        let mut users = self.users.lock().unwrap();
        if let Some(existing) = users.get(email) {
            return Ok(CreateResult::AlreadyExists(existing.clone()));
        }
        users.insert(email.clone(), user.clone());
        Ok(CreateResult::Created)
    }

    async fn find_by_email(
        &self,
        _ctx: &Ctx,
        email: &Email,
    ) -> Result<Option<User>, DomainError> {
        let users = self.users.lock().unwrap();
        Ok(users.get(email).cloned())
    }

    async fn find_by_id(&self, _ctx: &Ctx, id: UserId) -> Result<Option<User>, DomainError> {
        let users = self.users.lock().unwrap();
        Ok(users.values().find(|u| u.id == id).cloned())
    }
}
```

- [ ] **Step 2: Create `backend/src/infrastructure/repositories/idempotency.rs`**

```rust
use std::collections::HashMap;
use std::sync::Mutex;

use async_trait::async_trait;
use uuid::Uuid;

use crate::application::users::UserDto;
use crate::domain::errors::DomainError;

#[async_trait]
pub trait IdempotencyStore: Send + Sync {
    async fn get(&self, key: Uuid) -> Result<Option<UserDto>, DomainError>;
    async fn set(&self, key: Uuid, user: UserDto) -> Result<(), DomainError>;
}

#[derive(Debug, Default)]
pub struct InMemoryIdempotencyStore {
    cache: Mutex<HashMap<Uuid, UserDto>>,
}

impl InMemoryIdempotencyStore {
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl IdempotencyStore for InMemoryIdempotencyStore {
    async fn get(&self, key: Uuid) -> Result<Option<UserDto>, DomainError> {
        let cache = self.cache.lock().unwrap();
        Ok(cache.get(&key).cloned())
    }

    async fn set(&self, key: Uuid, user: UserDto) -> Result<(), DomainError> {
        let mut cache = self.cache.lock().unwrap();
        cache.insert(key, user);
        Ok(())
    }
}
```

- [ ] **Step 3: Create `backend/src/infrastructure/rate_limiter.rs`**

```rust
use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::Mutex;
use std::time::{Duration, Instant};

#[derive(Debug, Default)]
pub struct RateLimiter {
    buckets: Mutex<HashMap<IpAddr, Vec<Instant>>>,
}

impl RateLimiter {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn is_allowed(&self, ip: IpAddr, max_requests: usize, window: Duration) -> bool {
        let mut buckets = self.buckets.lock().unwrap();
        let now = Instant::now();
        let cutoff = now - window;

        let entries = buckets.entry(ip).or_default();
        entries.retain(|t| *t > cutoff);

        if entries.len() >= max_requests {
            return false;
        }

        entries.push(now);
        true
    }
}
```

- [ ] **Step 4: Create `backend/src/infrastructure/unit_of_work.rs`**

```rust
use async_trait::async_trait;

use crate::domain::errors::DomainError;
use crate::domain::repositories::UserRepository;
use crate::domain::unit_of_work::{Transaction, UnitOfWork};
use crate::infrastructure::repositories::in_memory_user::InMemoryUserRepository;

#[derive(Debug, Default, Clone)]
pub struct InMemoryUnitOfWork {
    users: InMemoryUserRepository,
}

impl InMemoryUnitOfWork {
    pub fn new(users: InMemoryUserRepository) -> Self {
        Self { users }
    }
}

#[async_trait]
impl UnitOfWork for InMemoryUnitOfWork {
    async fn begin(&self) -> Result<Box<dyn Transaction>, DomainError> {
        Ok(Box::new(InMemoryTransaction {
            users: self.users.clone(),
        }))
    }
}

struct InMemoryTransaction {
    users: InMemoryUserRepository,
}

#[async_trait]
impl Transaction for InMemoryTransaction {
    fn users(&self) -> &dyn UserRepository {
        &self.users
    }

    async fn commit(self: Box<Self>) -> Result<(), DomainError> {
        Ok(())
    }

    async fn rollback(self: Box<Self>) -> Result<(), DomainError> {
        Ok(())
    }
}
```

- [ ] **Step 5: Modify `backend/src/infrastructure/repositories/mod.rs`**

```rust
pub mod idempotency;
pub mod in_memory_user;
```

- [ ] **Step 6: Modify `backend/src/infrastructure/mod.rs`**

```rust
pub mod rate_limiter;
pub mod repositories;
pub mod unit_of_work;
```

- [ ] **Step 7: Verify compile**

Run:

```bash
cd backend && cargo check
```

Expected: success.

- [ ] **Step 8: Commit**

```bash
git add backend/src/infrastructure/
git commit -m "feat(infrastructure): add in-memory repository, idempotency, rate limiter, and UoW"
```

---

## Task 8: Add repository conformance tests

**Files:**
- Create: `backend/src/domain/repositories_test.rs` (or inline tests in `repositories.rs`)

Because `UserRepository` is a trait, add a shared test helper function in `backend/src/domain/repositories.rs` under `#[cfg(test)]`.

- [ ] **Step 1: Append tests to `backend/src/domain/repositories.rs`**

Add at the bottom:

```rust
#[cfg(test)]
mod conformance_tests {
    use super::*;
    use crate::domain::ctx::Ctx;
    use crate::domain::models::{
        Email, Role, User, UserId, UserStatus,
    };
    use chrono::Utc;
    use uuid::Uuid;

    fn ctx() -> Ctx {
        Ctx::new(Uuid::new_v4())
    }

    fn sample_user(email: &str) -> User {
        User {
            id: UserId::new(),
            name: "Ada Lovelace".to_string(),
            email: Email::parse(email).unwrap(),
            role: Role::Student,
            institution_id: None,
            status: UserStatus::PendingVerification,
            password_hash: "hash".to_string(),
            terms_accepted_at: Utc::now(),
            terms_version: "2026-06-18".to_string(),
            created_at: Utc::now(),
        }
    }

    pub async fn run_user_repository_conformance_tests(repo: &dyn UserRepository) {
        let ctx = ctx();
        let email = Email::parse("ada@example.com").unwrap();
        let user = sample_user("ada@example.com");

        let result = repo.create_if_not_exists(&ctx, &email, &user).await.unwrap();
        assert!(matches!(result, CreateResult::Created));

        let found = repo.find_by_email(&ctx, &email).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().email.as_str(), "ada@example.com");

        let duplicate = repo.create_if_not_exists(&ctx, &email, &user).await.unwrap();
        assert!(matches!(duplicate, CreateResult::AlreadyExists(_)));

        let found_by_id = repo.find_by_id(&ctx, user.id).await.unwrap();
        assert!(found_by_id.is_some());
    }
}
```

- [ ] **Step 2: Create `backend/tests/repository_conformance.rs`**

```rust
use klynt_api::domain::repositories::conformance_tests::run_user_repository_conformance_tests;
use klynt_api::infrastructure::repositories::in_memory_user::InMemoryUserRepository;

#[tokio::test]
async fn in_memory_user_repository_conforms() {
    let repo = InMemoryUserRepository::new();
    run_user_repository_conformance_tests(&repo).await;
}
```

- [ ] **Step 3: Run tests**

Run:

```bash
cd backend && cargo test repository_conformance
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add backend/src/domain/repositories.rs backend/tests/repository_conformance.rs
git commit -m "test(domain): add UserRepository conformance tests"
```

---

## Task 9: Update AppError for domain mapping

**Files:**
- Modify: `backend/src/error.rs`
- Modify: `backend/src/application/users.rs` (fix placeholder error mapping)

- [ ] **Step 1: Replace `backend/src/error.rs`**

```rust
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use tracing::error;

use crate::domain::errors::DomainError;

#[derive(Debug, Serialize)]
pub struct ApiErrorBody {
    pub code: String,
    pub message: String,
}

impl ApiErrorBody {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("resource not found")]
    NotFound,
    #[error("bad request: {0}")]
    BadRequest(String),
    #[error("conflict: {0}")]
    Conflict(String),
    #[error("too many requests")]
    RateLimited,
    #[error("unprocessable entity: {0}")]
    Validation(String),
    #[error("internal server error")]
    Internal(#[from] anyhow::Error),
}

impl From<DomainError> for AppError {
    fn from(err: DomainError) -> Self {
        match err {
            DomainError::NotFound => AppError::NotFound,
            DomainError::AlreadyExists { email } => {
                AppError::Conflict(format!("email already registered: {email}"))
            }
            DomainError::InvalidEmail(e) => AppError::BadRequest(e.to_string()),
            DomainError::WeakPassword(e) => AppError::BadRequest(e.to_string()),
            DomainError::InvalidRole(e) => AppError::BadRequest(e.to_string()),
            DomainError::InstitutionRequired(role) => AppError::BadRequest(format!(
                "institution_id is required for role {:?}",
                role
            )),
            DomainError::TermsNotAccepted => {
                AppError::BadRequest("terms must be accepted".to_string())
            }
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let request_id = ""; // populated via extension in production

        let (status, body) = match &self {
            AppError::NotFound => (
                StatusCode::NOT_FOUND,
                ApiErrorBody::new("not_found", self.to_string()),
            ),
            AppError::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                ApiErrorBody::new("bad_request", msg.clone()),
            ),
            AppError::Conflict(msg) => (
                StatusCode::CONFLICT,
                ApiErrorBody::new("conflict", msg.clone()),
            ),
            AppError::RateLimited => (
                StatusCode::TOO_MANY_REQUESTS,
                ApiErrorBody::new("rate_limited", "too many requests"),
            ),
            AppError::Validation(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                ApiErrorBody::new("validation_error", msg.clone()),
            ),
            AppError::Internal(err) => {
                error!(error = ?err, request_id, "internal server error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiErrorBody::new("internal_error", "something went wrong"),
                )
            }
        };

        (status, Json(body)).into_response()
    }
}
```

- [ ] **Step 2: Fix placeholder error mapping in `backend/src/application/users.rs`**

Replace:

```rust
let password_hash = hash_password(&req.password)
    .map_err(|_| DomainError::TermsNotAccepted)?;
```

with:

```rust
let password_hash = hash_password(&req.password)
    .map_err(|e| DomainError::Internal(anyhow::Error::new(e)))?;
```

Then add `anyhow` import at the top:

```rust
use anyhow::Error as AnyhowError;
```

Wait — `DomainError` currently has no `Internal` variant. Add one to `backend/src/domain/errors.rs`:

```rust
#[error("internal domain error")]
Internal(#[from] anyhow::Error),
```

- [ ] **Step 3: Add `Internal` variant to `DomainError`**

In `backend/src/domain/errors.rs`, add inside the `DomainError` enum:

```rust
#[error("internal domain error")]
Internal(#[from] anyhow::Error),
```

- [ ] **Step 4: Update `hash_password` error mapping in `backend/src/application/users.rs`**

```rust
let password_hash = hash_password(&req.password)
    .map_err(|e| DomainError::Internal(anyhow::Error::new(e)))?;
```

- [ ] **Step 5: Verify compile**

Run:

```bash
cd backend && cargo check
```

Expected: success.

- [ ] **Step 6: Commit**

```bash
git add backend/src/error.rs backend/src/domain/errors.rs backend/src/application/users.rs
git commit -m "feat(api): map DomainError to HTTP responses and add Internal variant"
```

---

## Task 10: Update AppState with services

**Files:**
- Modify: `backend/src/state.rs`

- [ ] **Step 1: Replace `backend/src/state.rs`**

```rust
use std::sync::Arc;

use crate::application::users::UserService;
use crate::config::AppConfig;
use crate::infrastructure::rate_limiter::RateLimiter;
use crate::infrastructure::repositories::idempotency::InMemoryIdempotencyStore;
use crate::infrastructure::repositories::in_memory_user::InMemoryUserRepository;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub user_service: Arc<UserService>,
    pub idempotency_store: Arc<InMemoryIdempotencyStore>,
    pub rate_limiter: Arc<RateLimiter>,
}

impl AppState {
    pub fn new(config: AppConfig) -> Self {
        let user_repo = Arc::new(InMemoryUserRepository::new());
        let user_service = Arc::new(UserService::new(user_repo));
        Self {
            config: Arc::new(config),
            user_service,
            idempotency_store: Arc::new(InMemoryIdempotencyStore::new()),
            rate_limiter: Arc::new(RateLimiter::new()),
        }
    }
}
```

- [ ] **Step 2: Verify compile**

Run:

```bash
cd backend && cargo check
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add backend/src/state.rs
git commit -m "feat(state): wire UserService, idempotency store, and rate limiter into AppState"
```

---

## Task 11: Implement create_user handler

**Files:**
- Create: `backend/src/api/v1/users.rs`

- [ ] **Step 1: Create `backend/src/api/v1/users.rs`**

```rust
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use axum::{
    extract::{ConnectInfo, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use axum::response::IntoResponse;
use uuid::Uuid;

use crate::application::users::UserDto;
use crate::contracts::users::{CreateUserRequest, UserResponse};
use crate::domain::ctx::Ctx;
use crate::domain::errors::DomainError;
use crate::error::AppError;
use crate::state::AppState;

pub async fn create_user(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Json(req): Json<CreateUserRequest>,
) -> Result<impl IntoResponse, AppError> {
    let ip = addr.ip();
    if !state
        .rate_limiter
        .is_allowed(ip, 5, Duration::from_secs(15 * 60))
    {
        return Err(AppError::RateLimited);
    }

    let idempotency_key = parse_idempotency_key(&headers)?;
    let ctx = Ctx::new(Uuid::new_v4());

    if let Some(cached) = state.idempotency_store.get(idempotency_key).await? {
        return Ok((StatusCode::CREATED, Json(UserResponse::from(&cached))));
    }

    let user_dto = state.user_service.create_user(&ctx, req).await?;
    state
        .idempotency_store
        .set(idempotency_key, user_dto.clone())
        .await?;

    Ok((StatusCode::CREATED, Json(UserResponse::from(&user_dto))))
}

fn parse_idempotency_key(headers: &HeaderMap) -> Result<Uuid, AppError> {
    let header = headers
        .get("Idempotency-Key")
        .ok_or_else(|| AppError::BadRequest("Idempotency-Key header is required".to_string()))?;

    let text = header
        .to_str()
        .map_err(|_| AppError::BadRequest("Idempotency-Key is not valid UTF-8".to_string()))?;

    Uuid::parse_str(text)
        .map_err(|_| AppError::BadRequest("Idempotency-Key must be a UUID".to_string()))
}
```

Note: `IdempotencyStore::get` returns `Result<Option<UserDto>, DomainError>`, so `?` converts `DomainError` into `AppError`. The `set` call returns `Result<(), DomainError>` too.

- [ ] **Step 2: Verify compile**

Run:

```bash
cd backend && cargo check
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/v1/users.rs
git commit -m "feat(api): add POST /api/v1/users handler with rate limiting and idempotency"
```

---

## Task 12: Wire users route

**Files:**
- Modify: `backend/src/api/v1/mod.rs`
- Modify: `backend/src/startup.rs`

- [ ] **Step 1: Modify `backend/src/api/v1/mod.rs`**

```rust
use std::sync::Arc;

use axum::{routing::post, Router};

use crate::state::AppState;

pub mod health;
pub mod users;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/health/live", get(health::liveness))
        .route("/health/ready", get(health::readiness))
        .route("/users", post(users::create_user))
}
```

Add missing import for `get`:

```rust
use axum::{routing::{get, post}, Router};
```

- [ ] **Step 2: Modify `backend/src/startup.rs`**

Add `ConnectInfo` layer so the handler can extract client IP:

```rust
use axum::extract::ConnectInfo;
```

And chain it onto the router before returning:

```rust
    Router::new()
        .nest("/api/v1", api::v1::router())
        .layer(TraceLayer::new_for_http())
        .layer(CompressionLayer::new())
        .layer(TimeoutLayer::with_status_code(
            StatusCode::REQUEST_TIMEOUT,
            Duration::from_secs(30),
        ))
        .layer(cors)
        .with_state(state)
}
```

Wait, `ConnectInfo` is added via `.layer(ConnectInfo::new())`? Actually in Axum 0.8, you need to use `Router::layer` with `tower::ServiceBuilder` or use `axum::extract::connect_info::IntoMakeServiceWithConnectInfo`. For `Serve`, you use `serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())` in `main.rs`.

So the change belongs in `main.rs`, not `startup.rs`.

- [ ] **Step 2 (corrected): Modify `backend/src/main.rs`**

Replace:

```rust
    serve(listener, app).await?;
```

with:

```rust
    serve(listener, app.into_make_service_with_connect_info::<SocketAddr>()).await?;
```

Add `use std::net::SocketAddr;` at the top of `main.rs`.

- [ ] **Step 3: Modify `backend/src/startup.rs` if needed**

No change required; the handler's `ConnectInfo` extractor works once `into_make_service_with_connect_info` is used.

- [ ] **Step 4: Verify compile**

Run:

```bash
cd backend && cargo check
```

Expected: success.

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/v1/mod.rs backend/src/main.rs
git commit -m "feat(api): wire POST /api/v1/users route and ConnectInfo"
```

---

## Task 13: Add backend integration tests

**Files:**
- Create: `backend/tests/users.rs`

- [ ] **Step 1: Create `backend/tests/users.rs`**

```rust
use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use tower::ServiceExt;
use uuid::Uuid;

mod helpers;

fn register_payload() -> String {
    serde_json::json!({
        "name": "Ada Lovelace",
        "email": "ada@example.com",
        "password": "str0ng!passphrase",
        "role": "student",
        "terms_accepted": true,
        "terms_version": "2026-06-18"
    })
    .to_string()
}

#[tokio::test]
async fn create_user_returns_201() {
    let app = helpers::test_app();
    let idempotency_key = Uuid::new_v4();

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/users")
                .header("Content-Type", "application/json")
                .header("Idempotency-Key", idempotency_key.to_string())
                .body(Body::from(register_payload()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["name"], "Ada Lovelace");
    assert_eq!(json["email"], "ada@example.com");
    assert_eq!(json["role"], "student");
    assert_eq!(json["status"], "pending_verification");
}

#[tokio::test]
async fn duplicate_email_returns_409() {
    let app = helpers::test_app();
    let idempotency_key = Uuid::new_v4();

    let req = || {
        Request::builder()
            .method("POST")
            .uri("/api/v1/users")
            .header("Content-Type", "application/json")
            .header("Idempotency-Key", idempotency_key.to_string())
            .body(Body::from(register_payload()))
            .unwrap()
    };

    let first = app.clone().oneshot(req()).await.unwrap();
    assert_eq!(first.status(), StatusCode::CREATED);

    let second = app.clone().oneshot(req()).await.unwrap();
    assert_eq!(second.status(), StatusCode::CONFLICT);
}

#[tokio::test]
async fn missing_idempotency_key_returns_400() {
    let app = helpers::test_app();

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/users")
                .header("Content-Type", "application/json")
                .body(Body::from(register_payload()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn idempotency_replay_returns_same_user() {
    let app = helpers::test_app();
    let idempotency_key = Uuid::new_v4();

    let req = || {
        Request::builder()
            .method("POST")
            .uri("/api/v1/users")
            .header("Content-Type", "application/json")
            .header("Idempotency-Key", idempotency_key.to_string())
            .body(Body::from(register_payload()))
            .unwrap()
    };

    let first = app.clone().oneshot(req()).await.unwrap();
    let first_body = first.into_body().collect().await.unwrap().to_bytes();
    let first_json: serde_json::Value = serde_json::from_slice(&first_body).unwrap();

    let second = app.clone().oneshot(req()).await.unwrap();
    let second_body = second.into_body().collect().await.unwrap().to_bytes();
    let second_json: serde_json::Value = serde_json::from_slice(&second_body).unwrap();

    assert_eq!(first_json["id"], second_json["id"]);
}

#[tokio::test]
async fn concurrent_duplicate_email_creates_only_one_user() {
    let app = helpers::test_app();

    let mut handles = vec![];
    for i in 0..10 {
        let app = app.clone();
        let handle = tokio::spawn(async move {
            let key = Uuid::new_v4();
            let response = app
                .oneshot(
                    Request::builder()
                        .method("POST")
                        .uri("/api/v1/users")
                        .header("Content-Type", "application/json")
                        .header("Idempotency-Key", key.to_string())
                        .body(Body::from(register_payload()))
                        .unwrap(),
                )
                .await
                .unwrap();
            (i, response.status())
        });
        handles.push(handle);
    }

    let results: Vec<_> = futures::future::join_all(handles)
        .await
        .into_iter()
        .map(|r| r.unwrap())
        .collect();

    let created_count = results.iter().filter(|(_, s)| *s == StatusCode::CREATED).count();
    assert_eq!(created_count, 1);
}
```

Note: the concurrent test uses `futures::future::join_all`, so add `futures = "0.3"` to `[dev-dependencies]` in `backend/Cargo.toml`.

- [ ] **Step 2: Add `futures` dev dependency**

In `backend/Cargo.toml`, change `[dev-dependencies]` to:

```toml
[dev-dependencies]
futures = "0.3"
http-body-util = "0.1"
serde_json = "1"
```

- [ ] **Step 3: Run integration tests**

Run:

```bash
cd backend && cargo test --test users
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add backend/Cargo.toml backend/tests/users.rs
git commit -m "test(api): add user registration integration tests"
```

---

## Task 14: Frontend API client function

**Files:**
- Modify: `frontend/src/lib/api-client.ts`

- [ ] **Step 1: Modify `frontend/src/lib/api-client.ts`**

```typescript
import axios from "axios";

export interface RegisterInput {
	name: string;
	email: string;
	password: string;
	role: string;
	institutionId?: string;
	termsAccepted: boolean;
	termsVersion: string;
}

export interface RegisterResponse {
	id: string;
	name: string;
	email: string;
	role: string;
	status: string;
	createdAt: string;
}

export const apiClient = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
	headers: {
		"Content-Type": "application/json",
	},
});

apiClient.interceptors.response.use(
	(response) => response,
	(error: unknown) => {
		// TODO: global error handling (toast, logout on 401, etc.)
		return Promise.reject(error instanceof Error ? error : new Error(String(error)));
	},
);

export async function registerUser(
	input: RegisterInput,
	idempotencyKey: string,
): Promise<RegisterResponse> {
	const { data } = await apiClient.post<RegisterResponse>("/users", input, {
		headers: {
			"Idempotency-Key": idempotencyKey,
		},
	});
	return data;
}
```

- [ ] **Step 2: Verify typecheck**

Run:

```bash
cd frontend && npm run typecheck
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api-client.ts
git commit -m "feat(frontend): add registerUser API client function"
```

---

## Task 15: Frontend /register route and form

**Files:**
- Create: `frontend/src/features/auth/api/register.ts`
- Create: `frontend/src/features/auth/components/register-form.tsx`
- Create: `frontend/src/routes/register.tsx`
- Modify: `frontend/src/routes/route-paths.ts`
- Modify: `frontend/src/routes/index.tsx`

- [ ] **Step 1: Create `frontend/src/features/auth/api/register.ts`**

```typescript
import { apiClient, type RegisterInput, type RegisterResponse } from "@/lib/api-client";
import { v4 as uuidv4 } from "uuid";

export type { RegisterInput, RegisterResponse };

export async function register(input: RegisterInput): Promise<RegisterResponse> {
	const idempotencyKey = uuidv4();
	const { data } = await apiClient.post<RegisterResponse>("/users", input, {
		headers: {
			"Idempotency-Key": idempotencyKey,
		},
	});
	return data;
}
```

Wait — `uuid` is not in frontend dependencies. We can use `crypto.randomUUID()` instead, which is available in modern browsers and Node 18+.

Revise:

```typescript
import { apiClient, type RegisterInput, type RegisterResponse } from "@/lib/api-client";

export type { RegisterInput, RegisterResponse };

export async function register(input: RegisterInput): Promise<RegisterResponse> {
	const idempotencyKey = crypto.randomUUID();
	const { data } = await apiClient.post<RegisterResponse>("/users", input, {
		headers: {
			"Idempotency-Key": idempotencyKey,
		},
	});
	return data;
}
```

- [ ] **Step 2: Create `frontend/src/features/auth/components/register-form.tsx`**

```tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { register, type RegisterResponse } from "@/features/auth/api/register";

const registerSchema = z
	.object({
		name: z.string().min(1, "Name is required"),
		email: z.string().email("Invalid email"),
		password: z.string().min(12, "Password must be at least 12 characters"),
		role: z.enum(["student", "teacher", "admin", "parent"]),
		institutionId: z.string().uuid().optional(),
		termsAccepted: z.literal(true, {
			errorMap: () => ({ message: "You must accept the terms" }),
		}),
		termsVersion: z.string(),
	})
	.refine(
		(data) =>
			!(data.role === "teacher" || data.role === "admin") ||
			(data.institutionId !== undefined && data.institutionId !== ""),
		{
			message: "Institution is required for this role",
			path: ["institutionId"],
		},
	);

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
	const [result, setResult] = useState<RegisterResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const {
		register: registerField,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<RegisterFormData>({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			role: "student",
			termsAccepted: false,
			termsVersion: "2026-06-18",
		},
	});

	const onSubmit = async (data: RegisterFormData) => {
		setError(null);
		try {
			const response = await register({
				name: data.name,
				email: data.email,
				password: data.password,
				role: data.role,
				institutionId: data.institutionId,
				termsAccepted: data.termsAccepted,
				termsVersion: data.termsVersion,
			});
			setResult(response);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Registration failed";
			setError(message);
		}
	};

	return (
		<div className="max-w-md mx-auto p-6">
			<h1 className="text-2xl font-bold mb-4">Register</h1>
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				<div>
					<label htmlFor="name">Name</label>
					<input id="name" {...registerField("name")} className="w-full border p-2" />
					{errors.name && <p className="text-red-600">{errors.name.message}</p>}
				</div>
				<div>
					<label htmlFor="email">Email</label>
					<input
						id="email"
						type="email"
						{...registerField("email")}
						className="w-full border p-2"
					/>
					{errors.email && <p className="text-red-600">{errors.email.message}</p>}
				</div>
				<div>
					<label htmlFor="password">Password</label>
					<input
						id="password"
						type="password"
						{...registerField("password")}
						className="w-full border p-2"
					/>
					{errors.password && <p className="text-red-600">{errors.password.message}</p>}
				</div>
				<div>
					<label htmlFor="role">Role</label>
					<select id="role" {...registerField("role")} className="w-full border p-2">
						<option value="student">Student</option>
						<option value="teacher">Teacher</option>
						<option value="admin">Admin</option>
						<option value="parent">Parent</option>
					</select>
					{errors.role && <p className="text-red-600">{errors.role.message}</p>}
				</div>
				<div>
					<label htmlFor="institutionId">Institution ID</label>
					<input
						id="institutionId"
						{...registerField("institutionId")}
						className="w-full border p-2"
					/>
					{errors.institutionId && (
						<p className="text-red-600">{errors.institutionId.message}</p>
					)}
				</div>
				<div className="flex items-center gap-2">
					<input id="termsAccepted" type="checkbox" {...registerField("termsAccepted")} />
					<label htmlFor="termsAccepted">I accept the terms and conditions</label>
				</div>
				{errors.termsAccepted && (
					<p className="text-red-600">{errors.termsAccepted.message}</p>
				)}
				<button
					type="submit"
					disabled={isSubmitting}
					className="w-full bg-blue-600 text-white p-2 rounded"
				>
					{isSubmitting ? "Registering..." : "Register"}
				</button>
			</form>
			{error && <p className="text-red-600 mt-4">{error}</p>}
			{result && (
				<pre className="mt-4 bg-gray-100 p-4 rounded text-sm">
					{JSON.stringify(result, null, 2)}
				</pre>
			)}
		</div>
	);
}
```

Note: `@hookform/resolvers` is not currently in `package.json`. Add it as a dependency.

- [ ] **Step 3: Add dependency `@hookform/resolvers`**

Run:

```bash
cd frontend && npm install @hookform/resolvers
```

- [ ] **Step 4: Create `frontend/src/routes/register.tsx`**

```tsx
import { RegisterForm } from "@/features/auth/components/register-form";

export function RegisterPage() {
	return <RegisterForm />;
}
```

- [ ] **Step 5: Modify `frontend/src/routes/route-paths.ts`**

```typescript
export const routePaths = {
  home: "/",
  dashboard: "/dashboard",
  login: "/login",
  register: "/register",
} as const;
```

- [ ] **Step 6: Modify `frontend/src/routes/index.tsx`**

```tsx
import { RootLayout } from "@/app/layout/root-layout";
import { RegisterPage } from "@/routes/register";
import { routePaths } from "@/routes/route-paths";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: routePaths.home,
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <div className="p-6">Welcome to Klynt</div>,
      },
      {
        path: routePaths.dashboard,
        element: <div className="p-6">Dashboard (coming soon)</div>,
      },
      {
        path: routePaths.login,
        element: <div className="p-6">Login (coming soon)</div>,
      },
      {
        path: routePaths.register,
        element: <RegisterPage />,
      },
    ],
  },
]);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 7: Verify typecheck and lint**

Run:

```bash
cd frontend && npm run typecheck && npm run lint
```

Expected: success (or fixable warnings).

- [ ] **Step 8: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add /register route and form"
```

---

## Task 16: Frontend register form unit test

**Files:**
- Create: `frontend/src/features/auth/components/register-form.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RegisterForm } from "./register-form";
import * as registerApi from "@/features/auth/api/register";

vi.mock("@/features/auth/api/register", () => ({
	register: vi.fn(),
}));

describe("RegisterForm", () => {
	it("submits valid data and displays the response", async () => {
		const mockRegister = vi.mocked(registerApi.register).mockResolvedValue({
			id: "550e8400-e29b-41d4-a716-446655440000",
			name: "Ada Lovelace",
			email: "ada@example.com",
			role: "student",
			status: "pending_verification",
			createdAt: "2026-06-18T04:24:34Z",
		});

		render(<RegisterForm />);

		await userEvent.type(screen.getByLabelText(/name/i), "Ada Lovelace");
		await userEvent.type(screen.getByLabelText(/email/i), "ada@example.com");
		await userEvent.type(screen.getByLabelText(/password/i), "str0ng!passphrase");
		await userEvent.click(screen.getByLabelText(/terms/i));
		await userEvent.click(screen.getByRole("button", { name: /register/i }));

		await waitFor(() => {
			expect(mockRegister).toHaveBeenCalledWith({
				name: "Ada Lovelace",
				email: "ada@example.com",
				password: "str0ng!passphrase",
				role: "student",
				termsAccepted: true,
				termsVersion: "2026-06-18",
			});
		});

		expect(await screen.findByText(/550e8400/)).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run tests**

Run:

```bash
cd frontend && npm run test -- register-form.test.tsx
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/auth/components/register-form.test.tsx
git commit -m "test(frontend): add RegisterForm unit test"
```

---

## Task 17: Playwright E2E test for /register

**Files:**
- Create: `frontend/e2e/register.spec.ts`

- [ ] **Step 1: Create `frontend/e2e/register.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

test.describe("/register", () => {
	test("creates a user and shows the response", async ({ page }) => {
		await page.goto("/register");

		await page.getByLabel("Name").fill("Ada Lovelace");
		await page.getByLabel("Email").fill(`ada-${Date.now()}@example.com`);
		await page.getByLabel("Password").fill("str0ng!passphrase");
		await page.getByLabel("Role").selectOption("student");
		await page.getByLabel("I accept the terms and conditions").check();

		await page.getByRole("button", { name: "Register" }).click();

		await expect(page.getByText("pending_verification")).toBeVisible();
	});

	test("shows conflict on duplicate email", async ({ page }) => {
		const email = `ada-dup-${Date.now()}@example.com`;

		await page.goto("/register");
		await page.getByLabel("Name").fill("Ada Lovelace");
		await page.getByLabel("Email").fill(email);
		await page.getByLabel("Password").fill("str0ng!passphrase");
		await page.getByLabel("Role").selectOption("student");
		await page.getByLabel("I accept the terms and conditions").check();
		await page.getByRole("button", { name: "Register" }).click();

		await expect(page.getByText("pending_verification")).toBeVisible();

		await page.goto("/register");
		await page.getByLabel("Name").fill("Ada Lovelace");
		await page.getByLabel("Email").fill(email);
		await page.getByLabel("Password").fill("str0ng!passphrase");
		await page.getByLabel("Role").selectOption("student");
		await page.getByLabel("I accept the terms and conditions").check();
		await page.getByRole("button", { name: "Register" }).click();

		await expect(page.getByText(/conflict|already registered/)).toBeVisible();
	});
});
```

- [ ] **Step 2: Verify Playwright config supports E2E**

`frontend/playwright.config.ts` already exists. Run a dry compile:

```bash
cd frontend && npx tsc --noEmit e2e/register.spec.ts
```

Expected: success.

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/register.spec.ts
git commit -m "test(e2e): add /register happy path and conflict tests"
```

---

## Task 18: Final verification

- [ ] **Step 1: Run backend checks**

```bash
cd backend && cargo fmt --all && cargo clippy --all-targets --all-features -- -D warnings && cargo test
```

Expected: all pass.

- [ ] **Step 2: Run frontend checks**

```bash
cd frontend && npm run check && npm run test
```

Expected: all pass.

- [ ] **Step 3: Manual smoke test**

In two terminals:

```bash
cd backend && cargo run
```

```bash
cd frontend && npm run dev
```

Open http://localhost:5173/register, submit the form, and confirm the created user response. Confirm duplicate email returns an error.

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final formatting and lint fixes for registration slice"
```

---

## Spec Coverage Checklist

| Spec requirement | Task(s) |
|------------------|---------|
| Single crate with module-enforced Clean Architecture | Task 1, 2–12 |
| Bounded-context crate strategy for future | Documented in Decision Summary (no code yet) |
| `klynt-contracts` module | Task 5 |
| `Ctx` request context | Task 3 |
| `UnitOfWork` port | Task 4, 7 |
| Atomic `create_if_not_exists` | Task 3, 7, 13 |
| Password hashing with Argon2id | Task 6 |
| Email verification status | Task 6 (pending) |
| Rate limiting | Task 7, 11 |
| Idempotency key | Task 7, 11, 13 |
| API versioning policy | Documented in spec; `/api/v1/users` implemented |
| Repository conformance test | Task 8 |
| PII handling / audit / trace redaction | Partial — audit logging and trace redaction are deferred; encryption at rest deferred to PostgreSQL slice. Document in follow-up task. |
| Frontend `/register` page | Task 15 |
| Playwright E2E test | Task 17 |
| Success metrics / rollback criteria | Documented in spec; measured at Task 18 |

## Open Gaps / Follow-Up Tasks

1. **Audit logging for PII reads/writes** — add `AuditLog` port and in-memory adapter; log every repository operation with `request_id` and action.
2. **Trace-layer redaction** — configure `TraceLayer` to redact `password`, `authorization`, and cookie headers.
3. **Email verification flow** — send actual verification email or enqueue an outbox event when the domain-event seam is added.
4. **TypeScript type generation from contracts** — add a build step that generates TS types from Rust DTOs (e.g., `typeshare` or `ts-rs`).
5. **CAPTCHA** — add bot protection once abuse is observed or security review requires it.
