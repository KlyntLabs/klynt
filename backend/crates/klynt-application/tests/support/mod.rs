use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use chrono::Utc;
use uuid::Uuid;

use klynt_application::users::{CreateUserRequest, UserService};
use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::{Email, User, UserDto, UserId, UserStatus};
use klynt_domain::ports::{HashedPassword, IdempotencyStore, PasswordHasher};
use klynt_domain::repositories::CreateResult;
use klynt_domain::unit_of_work::{Transaction, UnitOfWork};

#[derive(Debug, Default)]
pub struct FakeUserRepository {
    pub users: Mutex<HashMap<Email, User>>,
}

#[async_trait]
impl klynt_domain::repositories::UserRepository for FakeUserRepository {
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

    async fn find_by_email(&self, _ctx: &Ctx, email: &Email) -> Result<Option<User>, DomainError> {
        let users = self.users.lock().unwrap();
        Ok(users.get(email).cloned())
    }

    async fn find_by_id(&self, _ctx: &Ctx, id: UserId) -> Result<Option<User>, DomainError> {
        let users = self.users.lock().unwrap();
        Ok(users.values().find(|u| u.id == id).cloned())
    }

    async fn set_email_verified(&self, _ctx: &Ctx, user_id: UserId) -> Result<(), DomainError> {
        let mut users = self.users.lock().unwrap();
        let user = users
            .values_mut()
            .find(|u| u.id == user_id)
            .ok_or(DomainError::NotFound)?;
        user.status = UserStatus::Active;
        user.email_verified_at = Some(Utc::now());
        Ok(())
    }
}

#[derive(Debug, Clone, Default)]
pub struct FakeUnitOfWork {
    pub users: Arc<FakeUserRepository>,
}

#[async_trait]
impl UnitOfWork for FakeUnitOfWork {
    async fn begin(&self) -> Result<Box<dyn Transaction>, DomainError> {
        Ok(Box::new(FakeTransaction {
            users: self.users.clone(),
        }))
    }
}

pub struct FakeTransaction {
    users: Arc<FakeUserRepository>,
}

#[async_trait]
impl Transaction for FakeTransaction {
    fn users(&self) -> &dyn klynt_domain::repositories::UserRepository {
        &*self.users
    }

    async fn commit(self: Box<Self>) -> Result<(), DomainError> {
        Ok(())
    }

    async fn rollback(self: Box<Self>) -> Result<(), DomainError> {
        Ok(())
    }
}

#[derive(Debug, Default)]
pub struct FakeIdempotencyStore {
    pub cache: Mutex<HashMap<Uuid, UserDto>>,
}

#[async_trait]
impl IdempotencyStore<UserDto> for FakeIdempotencyStore {
    async fn get(&self, key: Uuid) -> Result<Option<UserDto>, DomainError> {
        let cache = self.cache.lock().unwrap();
        Ok(cache.get(&key).cloned())
    }

    async fn set(&self, key: Uuid, value: UserDto) -> Result<(), DomainError> {
        let mut cache = self.cache.lock().unwrap();
        cache.insert(key, value);
        Ok(())
    }

    async fn get_or_insert(
        &self,
        key: Uuid,
        value: UserDto,
    ) -> Result<Option<UserDto>, DomainError> {
        let mut cache = self.cache.lock().unwrap();
        if let Some(existing) = cache.get(&key) {
            return Ok(Some(existing.clone()));
        }
        cache.insert(key, value);
        Ok(None)
    }
}

#[derive(Debug, Default, Clone)]
pub struct FakePasswordHasher;

#[async_trait]
impl PasswordHasher for FakePasswordHasher {
    async fn hash(&self, plaintext: &str) -> Result<HashedPassword, DomainError> {
        Ok(HashedPassword::new(format!("hashed:{plaintext}")))
    }

    async fn verify(&self, plaintext: &str, hash: &HashedPassword) -> Result<bool, DomainError> {
        Ok(hash.as_str() == format!("hashed:{plaintext}"))
    }
}

#[allow(dead_code)]
pub fn sample_request() -> CreateUserRequest {
    CreateUserRequest {
        name: "Ada Lovelace".to_string(),
        email: format!("ada-{}@example.com", Uuid::new_v4()),
        password: "str0ng!passphrase".to_string(),
        role: "student".to_string(),
        institution_id: None,
        terms_accepted: true,
        terms_version: "2026-06-18".to_string(),
    }
}

pub fn user_service() -> UserService {
    let uow: Arc<dyn UnitOfWork> = Arc::new(FakeUnitOfWork::default());
    let password_hasher: Arc<dyn PasswordHasher> = Arc::new(FakePasswordHasher);
    let idempotency_store: Arc<dyn IdempotencyStore<UserDto>> =
        Arc::new(FakeIdempotencyStore::default());
    UserService::new(uow, password_hasher, idempotency_store)
}

pub mod auth;
