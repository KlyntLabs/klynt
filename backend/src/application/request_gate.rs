use std::net::IpAddr;
use std::sync::Arc;

use axum::http::HeaderMap;
use uuid::Uuid;

use crate::application::users::{CreateUserRequest, UserDto, UserService};
use crate::domain::ctx::Ctx;
use crate::error::AppError;
use crate::infrastructure::rate_limiter::RateLimiter;
use crate::infrastructure::repositories::idempotency::IdempotencyStore;

pub struct RequestGate {
    rate_limiter: Arc<RateLimiter>,
    idempotency_store: Arc<dyn IdempotencyStore>,
    user_service: Arc<UserService>,
}

impl RequestGate {
    pub fn new(
        rate_limiter: Arc<RateLimiter>,
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
        headers: &HeaderMap,
        req: CreateUserRequest,
    ) -> Result<UserDto, AppError> {
        if !self.rate_limiter.is_allowed(ip) {
            return Err(AppError::RateLimited);
        }

        let idempotency_key = parse_idempotency_key(headers)?;

        if let Some(cached) = self.idempotency_store.get(idempotency_key).await? {
            return Ok(cached);
        }

        let ctx = Ctx::new(Uuid::new_v4());
        let user_dto = self.user_service.create_user(&ctx, req).await?;
        let cached = self
            .idempotency_store
            .get_or_insert(idempotency_key, user_dto.clone())
            .await?;

        Ok(cached.unwrap_or(user_dto))
    }
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

#[cfg(test)]
mod tests {
    use std::net::{IpAddr, Ipv4Addr};
    use std::sync::Arc;

    use axum::http::HeaderMap;
    use uuid::Uuid;

    use crate::application::request_gate::RequestGate;
    use crate::application::users::{CreateUserRequest, UserService};
    use crate::config::RateLimiterConfig;
    use crate::domain::unit_of_work::UnitOfWork;
    use crate::infrastructure::rate_limiter::RateLimiter;
    use crate::infrastructure::repositories::idempotency::{
        IdempotencyStore, InMemoryIdempotencyStore,
    };
    use crate::infrastructure::repositories::in_memory_user::InMemoryUserRepository;
    use crate::infrastructure::unit_of_work::InMemoryUnitOfWork;

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
            Arc::new(RateLimiter::disabled()),
            idempotency_store,
            user_service,
        )
    }

    fn headers_with_key(key: Uuid) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert("Idempotency-Key", key.to_string().parse().unwrap());
        headers
    }

    #[tokio::test]
    async fn creates_user_and_replays_idempotent_request() {
        let gate = disabled_gate();
        let key = Uuid::new_v4();
        let ip = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1));
        let req = sample_request();
        let email = req.email.clone();

        let first = gate
            .create_user(ip, &headers_with_key(key), req.clone())
            .await
            .unwrap();
        assert_eq!(first.email, email);

        let second = gate
            .create_user(ip, &headers_with_key(key), req)
            .await
            .unwrap();
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
            Arc::new(RateLimiter::new(config)),
            idempotency_store,
            user_service,
        );

        let ip = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1));
        let req = sample_request();
        let key = Uuid::new_v4();

        let first = gate
            .create_user(ip, &headers_with_key(key), req.clone())
            .await;
        assert!(first.is_ok());

        let second_key = Uuid::new_v4();
        let second = gate
            .create_user(ip, &headers_with_key(second_key), req)
            .await;
        assert!(matches!(second, Err(crate::error::AppError::RateLimited)));
    }
}
