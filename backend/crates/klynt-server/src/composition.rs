use std::sync::Arc;

use axum::Router;
use klynt_api::startup::build_router;
use klynt_api::state::AppState;
use klynt_application::request_gate::UserRequestGate;
use klynt_application::users::UserService;
use klynt_domain::config::AppConfig;
use klynt_domain::ports::{IdempotencyStore, RateLimiter};
use klynt_domain::unit_of_work::UnitOfWork;
use klynt_infrastructure::rate_limiter::RateLimiter as InMemoryRateLimiter;
use klynt_infrastructure::repositories::idempotency::InMemoryIdempotencyStore;
use klynt_infrastructure::repositories::in_memory_user::InMemoryUserRepository;
use klynt_infrastructure::unit_of_work::InMemoryUnitOfWork;

/// Builds the application-specific request gate from the provided config.
///
/// This is the single composition root for production wiring. Keeping it in the
/// server crate keeps the application crate free of infrastructure knowledge.
pub fn build_request_gate(config: AppConfig) -> Arc<UserRequestGate> {
    let user_repo = InMemoryUserRepository::new();
    let uow: Arc<dyn UnitOfWork> = Arc::new(InMemoryUnitOfWork::new(user_repo));
    let user_service = Arc::new(UserService::new(uow));
    let rate_limiter: Arc<dyn RateLimiter> =
        Arc::new(InMemoryRateLimiter::new(config.rate_limiter));
    let idempotency_store: Arc<dyn IdempotencyStore<klynt_domain::models::UserDto>> =
        Arc::new(InMemoryIdempotencyStore::new());

    Arc::new(UserRequestGate::new(
        rate_limiter,
        idempotency_store,
        user_service,
    ))
}

/// Builds a fully configured Axum router for tests or production.
pub fn build_app(config: AppConfig) -> Router {
    let request_gate = build_request_gate(config.clone());
    let state = Arc::new(AppState::new(config, request_gate));
    build_router(state)
}
