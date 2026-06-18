use std::net::IpAddr;
use std::sync::Arc;

use uuid::Uuid;

use crate::users::{CreateUserRequest, UserService};
use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::UserDto;
use klynt_domain::ports::{IdempotencyStore, RateLimiter};

/// Orchestrates user-registration requests.
///
/// This is intentionally a dedicated gate for the user-creation flow rather
/// than a generic catch-all. Cross-cutting concerns such as rate limiting can
/// later be lifted into Tower middleware once more endpoints need them.
pub struct UserRequestGate {
    rate_limiter: Arc<dyn RateLimiter>,
    idempotency_store: Arc<dyn IdempotencyStore<UserDto>>,
    user_service: Arc<UserService>,
}

impl UserRequestGate {
    pub fn new(
        rate_limiter: Arc<dyn RateLimiter>,
        idempotency_store: Arc<dyn IdempotencyStore<UserDto>>,
        user_service: Arc<UserService>,
    ) -> Self {
        Self {
            rate_limiter,
            idempotency_store,
            user_service,
        }
    }

    pub async fn create_user(
        &self,
        ip: IpAddr,
        request_id: Uuid,
        idempotency_key: Uuid,
        req: CreateUserRequest,
    ) -> Result<UserDto, DomainError> {
        if !self.rate_limiter.is_allowed(ip) {
            return Err(DomainError::RateLimited);
        }

        let ctx = Ctx::new(request_id);

        if let Some(cached) = self.idempotency_store.get(idempotency_key).await? {
            return Ok(cached);
        }

        let user_dto = self.user_service.create_user(&ctx, req).await?;
        let cached = self
            .idempotency_store
            .get_or_insert(idempotency_key, user_dto.clone())
            .await?;

        Ok(cached.unwrap_or(user_dto))
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::net::{IpAddr, Ipv4Addr};
    use std::sync::{Arc, Mutex};

    use async_trait::async_trait;
    use uuid::Uuid;

    use crate::request_gate::UserRequestGate;
    use crate::users::{CreateUserRequest, UserService};
    use klynt_domain::ctx::Ctx;
    use klynt_domain::errors::DomainError;
    use klynt_domain::models::{Email, User, UserDto, UserId};
    use klynt_domain::ports::{IdempotencyStore, RateLimiter};
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

    #[derive(Debug)]
    struct FakeRateLimiter {
        allowed: bool,
    }

    impl RateLimiter for FakeRateLimiter {
        fn is_allowed(&self, _ip: IpAddr) -> bool {
            self.allowed
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

    fn disabled_gate() -> UserRequestGate {
        let uow: Arc<dyn UnitOfWork> = Arc::new(FakeUnitOfWork::default());
        let user_service = Arc::new(UserService::new(uow));
        let idempotency_store: Arc<dyn IdempotencyStore<UserDto>> =
            Arc::new(FakeIdempotencyStore::default());
        UserRequestGate::new(
            Arc::new(FakeRateLimiter { allowed: true }),
            idempotency_store,
            user_service,
        )
    }

    #[tokio::test]
    async fn creates_user_and_replays_idempotent_request() {
        let gate = disabled_gate();
        let key = Uuid::new_v4();
        let request_id = Uuid::new_v4();
        let ip = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1));
        let req = sample_request();
        let email = req.email.clone();

        let first = gate
            .create_user(ip, request_id, key, req.clone())
            .await
            .unwrap();
        assert_eq!(first.email, email);

        let second = gate.create_user(ip, request_id, key, req).await.unwrap();
        assert_eq!(second.id, first.id);
    }

    #[tokio::test]
    async fn returns_rate_limited_when_blocked() {
        let uow: Arc<dyn UnitOfWork> = Arc::new(FakeUnitOfWork::default());
        let user_service = Arc::new(UserService::new(uow));
        let idempotency_store: Arc<dyn IdempotencyStore<UserDto>> =
            Arc::new(FakeIdempotencyStore::default());
        let gate = UserRequestGate::new(
            Arc::new(FakeRateLimiter { allowed: false }),
            idempotency_store,
            user_service,
        );

        let ip = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1));
        let req = sample_request();
        let key = Uuid::new_v4();
        let request_id = Uuid::new_v4();

        let result = gate.create_user(ip, request_id, key, req).await;
        assert!(matches!(result, Err(DomainError::RateLimited)));
    }
}
