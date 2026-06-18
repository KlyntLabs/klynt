use std::sync::Arc;

use crate::application::users::UserService;
use crate::config::AppConfig;
use crate::domain::unit_of_work::UnitOfWork;
use crate::infrastructure::rate_limiter::RateLimiter;
use crate::infrastructure::repositories::idempotency::InMemoryIdempotencyStore;
use crate::infrastructure::repositories::in_memory_user::InMemoryUserRepository;
use crate::infrastructure::unit_of_work::InMemoryUnitOfWork;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub user_service: Arc<UserService>,
    pub idempotency_store: Arc<InMemoryIdempotencyStore>,
    pub rate_limiter: Arc<RateLimiter>,
}

impl AppState {
    pub fn new(config: AppConfig) -> Self {
        let user_repo = InMemoryUserRepository::new();
        let uow: Arc<dyn UnitOfWork> = Arc::new(InMemoryUnitOfWork::new(user_repo));
        let user_service = Arc::new(UserService::new(uow));
        Self {
            config: Arc::new(config),
            user_service,
            idempotency_store: Arc::new(InMemoryIdempotencyStore::new()),
            rate_limiter: Arc::new(RateLimiter::new()),
        }
    }
}
