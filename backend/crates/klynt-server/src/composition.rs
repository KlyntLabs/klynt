use std::sync::Arc;

use axum::Router;
use klynt_api::startup::build_router;
use klynt_api::state::AppState;
use klynt_application::auth::AuthService;
use klynt_application::request_gate::UserRequestGate;
use klynt_application::users::UserService;
use klynt_domain::config::AppConfig;
use klynt_domain::models::UserDto;
use klynt_domain::ports::{HealthCheck, IdempotencyStore, PasswordHasher, RateLimiter};
use klynt_domain::session::SessionStore;
use klynt_domain::unit_of_work::UnitOfWork;
use klynt_infrastructure::password_hasher::Argon2PasswordHasher;
use klynt_infrastructure::rate_limiter::RateLimiter as InMemoryRateLimiter;
use klynt_infrastructure::repositories::idempotency::InMemoryIdempotencyStore;
use klynt_infrastructure::repositories::in_memory_user::InMemoryUserRepository;
use klynt_infrastructure::repositories::session::InMemorySessionStore;
use klynt_infrastructure::unit_of_work::InMemoryUnitOfWork;

/// Builds the production application graph from the provided config.
///
/// This is the single composition root. Keeping it in the server crate keeps
/// the application crate free of infrastructure knowledge and makes the system
/// easy to bootstrap for both production and integration tests.
pub fn build_app(config: AppConfig) -> Router {
    let user_repo = InMemoryUserRepository::new();
    let idempotency_store: Arc<dyn IdempotencyStore<UserDto>> =
        Arc::new(InMemoryIdempotencyStore::new());
    let session_store = Arc::new(InMemorySessionStore::new());
    let session_store_port: Arc<dyn SessionStore> =
        Arc::clone(&session_store) as Arc<dyn SessionStore>;
    let session_store_health: Arc<dyn HealthCheck> =
        Arc::clone(&session_store) as Arc<dyn HealthCheck>;
    let rate_limiter: Arc<dyn RateLimiter> =
        Arc::new(InMemoryRateLimiter::new(config.rate_limiter.clone()));

    let password_hasher: Arc<dyn PasswordHasher> = Arc::new(Argon2PasswordHasher::new());
    let uow: Arc<dyn UnitOfWork> = Arc::new(InMemoryUnitOfWork::new(user_repo.clone()));
    let user_service = Arc::new(UserService::new(uow, password_hasher));

    let request_gate = Arc::new(UserRequestGate::new(
        Arc::clone(&idempotency_store),
        Arc::clone(&user_service),
    ));

    let auth_service = Arc::new(AuthService::new(
        Arc::clone(&user_service),
        Arc::clone(&session_store_port),
    ));

    let health_checks: Vec<Arc<dyn HealthCheck>> = vec![
        Arc::new(user_repo.clone()),
        Arc::new(InMemoryIdempotencyStore::<UserDto>::new()),
        session_store_health,
        Arc::new(InMemoryUnitOfWork::new(user_repo)),
        Arc::new(InMemoryRateLimiter::disabled()),
    ];

    let state = Arc::new(AppState::new(
        config,
        user_service,
        request_gate,
        auth_service,
        session_store_port,
        rate_limiter,
        health_checks,
    ));

    build_router(state)
}
