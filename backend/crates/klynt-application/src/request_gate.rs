use std::net::IpAddr;
use std::sync::Arc;

use uuid::Uuid;

use crate::users::{CreateUserRequest, UserService};
use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::UserDto;
use klynt_domain::ports::{IdempotencyStore, RateLimiter};

pub struct RequestGate {
    rate_limiter: Arc<dyn RateLimiter>,
    idempotency_store: Arc<dyn IdempotencyStore>,
    user_service: Arc<UserService>,
}

impl RequestGate {
    pub fn new(
        rate_limiter: Arc<dyn RateLimiter>,
        idempotency_store: Arc<dyn IdempotencyStore>,
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
        idempotency_key: Uuid,
        req: CreateUserRequest,
    ) -> Result<UserDto, DomainError> {
        if !self.rate_limiter.is_allowed(ip) {
            return Err(DomainError::RateLimited);
        }

        let ctx = Ctx::new(Uuid::new_v4());

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
    use std::net::{IpAddr, Ipv4Addr};
    use std::sync::Arc;

    use uuid::Uuid;

    use crate::request_gate::RequestGate;
    use crate::users::{CreateUserRequest, UserService};
    use klynt_domain::config::RateLimiterConfig;
    use klynt_domain::errors::DomainError;
    use klynt_domain::ports::IdempotencyStore;
    use klynt_domain::unit_of_work::UnitOfWork;
    use klynt_infrastructure::rate_limiter::RateLimiter as InMemoryRateLimiter;
    use klynt_infrastructure::repositories::idempotency::InMemoryIdempotencyStore;
    use klynt_infrastructure::repositories::in_memory_user::InMemoryUserRepository;
    use klynt_infrastructure::unit_of_work::InMemoryUnitOfWork;

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

    fn disabled_gate() -> RequestGate {
        let user_repo = InMemoryUserRepository::new();
        let uow: Arc<dyn UnitOfWork> = Arc::new(InMemoryUnitOfWork::new(user_repo));
        let user_service = Arc::new(UserService::new(uow));
        let idempotency_store: Arc<dyn IdempotencyStore> =
            Arc::new(InMemoryIdempotencyStore::new());
        RequestGate::new(
            Arc::new(InMemoryRateLimiter::disabled()),
            idempotency_store,
            user_service,
        )
    }

    #[tokio::test]
    async fn creates_user_and_replays_idempotent_request() {
        let gate = disabled_gate();
        let key = Uuid::new_v4();
        let ip = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1));
        let req = sample_request();
        let email = req.email.clone();

        let first = gate.create_user(ip, key, req.clone()).await.unwrap();
        assert_eq!(first.email, email);

        let second = gate.create_user(ip, key, req).await.unwrap();
        assert_eq!(second.id, first.id);
    }

    #[tokio::test]
    async fn returns_rate_limited_when_over_limit() {
        let user_repo = InMemoryUserRepository::new();
        let uow: Arc<dyn UnitOfWork> = Arc::new(InMemoryUnitOfWork::new(user_repo));
        let user_service = Arc::new(UserService::new(uow));
        let config = RateLimiterConfig {
            enabled: true,
            max_requests: 1,
            window_seconds: 900,
        };
        let idempotency_store: Arc<dyn IdempotencyStore> =
            Arc::new(InMemoryIdempotencyStore::new());
        let gate = RequestGate::new(
            Arc::new(InMemoryRateLimiter::new(config)),
            idempotency_store,
            user_service,
        );

        let ip = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1));
        let req = sample_request();
        let key = Uuid::new_v4();

        let first = gate.create_user(ip, key, req.clone()).await;
        assert!(first.is_ok());

        let second_key = Uuid::new_v4();
        let second = gate.create_user(ip, second_key, req).await;
        assert!(matches!(second, Err(DomainError::RateLimited)));
    }
}
