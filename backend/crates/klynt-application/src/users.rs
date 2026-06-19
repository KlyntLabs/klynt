use std::sync::Arc;

use chrono::Utc;
use uuid::Uuid;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::{DomainError, NameError};
use klynt_domain::models::{validate_password, Email, Role, User, UserDto, UserId, UserStatus};
use klynt_domain::ports::{HashedPassword, IdempotencyStore, PasswordHasher};
use klynt_domain::repositories::CreateResult;
use klynt_domain::unit_of_work::UnitOfWork;

#[derive(Debug, Clone)]
pub struct CreateUserRequest {
    pub name: String,
    pub email: String,
    pub password: String,
    pub role: String,
    pub institution_id: Option<Uuid>,
    pub terms_accepted: bool,
    pub terms_version: String,
}

pub struct UserService {
    uow: Arc<dyn UnitOfWork>,
    password_hasher: Arc<dyn PasswordHasher>,
    idempotency_store: Arc<dyn IdempotencyStore<UserDto>>,
}

impl UserService {
    pub fn new(
        uow: Arc<dyn UnitOfWork>,
        password_hasher: Arc<dyn PasswordHasher>,
        idempotency_store: Arc<dyn IdempotencyStore<UserDto>>,
    ) -> Self {
        Self {
            uow,
            password_hasher,
            idempotency_store,
        }
    }

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

        let name = req.name.trim().to_string();
        if name.is_empty() {
            return Err(DomainError::InvalidName(NameError::Empty));
        }
        if name.chars().count() > 200 {
            return Err(DomainError::InvalidName(NameError::TooLong));
        }

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
            password_hash: password_hash.as_str().to_string(),
            terms_accepted_at: Utc::now(),
            terms_version: req.terms_version,
            created_at: Utc::now(),
        };

        let tx = self.uow.begin().await?;
        match tx.users().create_if_not_exists(ctx, &email, &user).await? {
            CreateResult::Created => {
                tx.commit().await?;
                let user_dto = UserDto::from(&user);
                let cached = self
                    .idempotency_store
                    .get_or_insert(idempotency_key, user_dto.clone())
                    .await?;
                Ok(cached.unwrap_or(user_dto))
            }
            CreateResult::AlreadyExists(existing) => {
                tx.rollback().await?;
                Err(DomainError::AlreadyExists {
                    email: existing.email.as_str().to_string(),
                })
            }
        }
    }

    pub async fn authenticate(
        &self,
        ctx: &Ctx,
        email: &Email,
        password: &str,
    ) -> Result<User, DomainError> {
        let tx = self.uow.begin().await?;
        let user = tx
            .users()
            .find_by_email(ctx, email)
            .await?
            .ok_or(DomainError::AuthenticationRequired)?;

        let hash = HashedPassword::new(&user.password_hash);
        if !self.password_hasher.verify(password, &hash).await? {
            // Do not reveal whether the email exists.
            return Err(DomainError::AuthenticationRequired);
        }

        tx.commit().await?;
        Ok(user)
    }

    pub async fn find_by_id(&self, ctx: &Ctx, id: UserId) -> Result<User, DomainError> {
        let tx = self.uow.begin().await?;
        let user = tx
            .users()
            .find_by_id(ctx, id)
            .await?
            .ok_or(DomainError::NotFound)?;
        tx.commit().await?;
        Ok(user)
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};

    use async_trait::async_trait;
    use uuid::Uuid;

    use super::{CreateUserRequest, UserService};
    use klynt_domain::ctx::Ctx;
    use klynt_domain::errors::DomainError;
    use klynt_domain::models::{Email, User, UserDto, UserId};
    use klynt_domain::ports::{HashedPassword, IdempotencyStore, PasswordHasher};
    use klynt_domain::repositories::{CreateResult, UserRepository};
    use klynt_domain::unit_of_work::{Transaction, UnitOfWork};

    fn sample_request() -> CreateUserRequest {
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

    // Local test doubles so this crate's unit tests do not depend on infrastructure.

    #[derive(Debug, Default)]
    struct FakeUserRepository {
        users: Mutex<HashMap<Email, User>>,
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

    #[derive(Debug, Clone, Default)]
    struct FakeUnitOfWork {
        users: Arc<FakeUserRepository>,
    }

    #[async_trait]
    impl UnitOfWork for FakeUnitOfWork {
        async fn begin(&self) -> Result<Box<dyn Transaction>, DomainError> {
            Ok(Box::new(FakeTransaction {
                users: self.users.clone(),
            }))
        }
    }

    struct FakeTransaction {
        users: Arc<FakeUserRepository>,
    }

    #[async_trait]
    impl Transaction for FakeTransaction {
        fn users(&self) -> &dyn UserRepository {
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
    struct FakeIdempotencyStore {
        cache: Mutex<HashMap<Uuid, UserDto>>,
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
    struct FakePasswordHasher;

    #[async_trait::async_trait]
    impl PasswordHasher for FakePasswordHasher {
        async fn hash(&self, plaintext: &str) -> Result<HashedPassword, DomainError> {
            Ok(HashedPassword::new(format!("hashed:{plaintext}")))
        }

        async fn verify(
            &self,
            plaintext: &str,
            hash: &HashedPassword,
        ) -> Result<bool, DomainError> {
            Ok(hash.as_str() == format!("hashed:{plaintext}"))
        }
    }

    fn user_service() -> UserService {
        let uow: Arc<dyn UnitOfWork> = Arc::new(FakeUnitOfWork::default());
        let password_hasher: Arc<dyn PasswordHasher> = Arc::new(FakePasswordHasher);
        let idempotency_store: Arc<dyn IdempotencyStore<UserDto>> =
            Arc::new(FakeIdempotencyStore::default());
        UserService::new(uow, password_hasher, idempotency_store)
    }

    #[tokio::test]
    async fn creates_user_and_replays_idempotent_request() {
        let service = user_service();
        let key = Uuid::new_v4();
        let request_id = Uuid::new_v4();
        let ctx = Ctx::guest(request_id);
        let req = sample_request();
        let email = req.email.clone();

        let first = service.create_user(&ctx, key, req.clone()).await.unwrap();
        assert_eq!(first.email, email);

        let second = service.create_user(&ctx, key, req).await.unwrap();
        assert_eq!(second.id, first.id);
    }
}
