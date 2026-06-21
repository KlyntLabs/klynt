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
use klynt_domain::repositories::{CreateResult, UserRepository};

#[derive(Debug, Default)]
pub struct FakeUserRepository {
    pub users: Mutex<HashMap<Email, User>>,
}

#[async_trait]
impl UserRepository for FakeUserRepository {
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

    async fn update_password(
        &self,
        _ctx: &Ctx,
        user_id: UserId,
        password_hash: &HashedPassword,
    ) -> Result<(), DomainError> {
        let mut users = self.users.lock().unwrap();
        let user = users
            .values_mut()
            .find(|u| u.id == user_id)
            .ok_or(DomainError::NotFound)?;
        user.password_hash = password_hash.as_str().to_string();
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
    let user_repo: Arc<dyn UserRepository> = Arc::new(FakeUserRepository::default());
    let password_hasher: Arc<dyn PasswordHasher> = Arc::new(FakePasswordHasher);
    let idempotency_store: Arc<dyn IdempotencyStore<UserDto>> =
        Arc::new(FakeIdempotencyStore::default());
    UserService::new(user_repo, password_hasher, idempotency_store)
}

pub mod auth;
