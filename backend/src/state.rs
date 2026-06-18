use std::sync::Arc;

use crate::application::request_gate::RequestGate;
use crate::application::users::UserService;
use crate::config::AppConfig;
use crate::domain::ports::{IdempotencyStore, RateLimiter};
use crate::domain::unit_of_work::UnitOfWork;
use crate::infrastructure::rate_limiter::RateLimiter as InMemoryRateLimiter;
use crate::infrastructure::repositories::idempotency::InMemoryIdempotencyStore;
use crate::infrastructure::repositories::in_memory_user::InMemoryUserRepository;
use crate::infrastructure::unit_of_work::InMemoryUnitOfWork;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub request_gate: Arc<RequestGate>,
}

impl AppState {
    pub fn new(config: AppConfig) -> Self {
        let user_repo = InMemoryUserRepository::new();
        let uow: Arc<dyn UnitOfWork> = Arc::new(InMemoryUnitOfWork::new(user_repo));
        let user_service = Arc::new(UserService::new(uow));
        let rate_limiter: Arc<dyn RateLimiter> =
            Arc::new(InMemoryRateLimiter::new(config.rate_limiter.clone()));
        let idempotency_store: Arc<dyn IdempotencyStore> =
            Arc::new(InMemoryIdempotencyStore::new());
        let request_gate = Arc::new(RequestGate::new(
            rate_limiter,
            idempotency_store,
            user_service,
        ));

        Self {
            config: Arc::new(config),
            request_gate,
        }
    }
}
