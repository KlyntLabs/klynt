use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::sync::Arc;

use axum::extract::ConnectInfo;
use axum::Extension;
use axum::Router;
use klynt_api::startup::build_router;
use klynt_api::state::AppState;
use klynt_application::request_gate::RequestGate;
use klynt_application::users::UserService;
use klynt_domain::config::{ApiConfig, AppConfig, RateLimiterConfig};
use klynt_domain::ports::{IdempotencyStore, RateLimiter};
use klynt_domain::unit_of_work::UnitOfWork;
use klynt_infrastructure::rate_limiter::RateLimiter as InMemoryRateLimiter;
use klynt_infrastructure::repositories::idempotency::InMemoryIdempotencyStore;
use klynt_infrastructure::repositories::in_memory_user::InMemoryUserRepository;
use klynt_infrastructure::unit_of_work::InMemoryUnitOfWork;

pub fn test_config() -> AppConfig {
    AppConfig {
        api: ApiConfig {
            host: "127.0.0.1".to_string(),
            port: 0,
            allowed_origins: vec!["http://localhost:5173".to_string()],
        },
        rate_limiter: RateLimiterConfig {
            enabled: false,
            max_requests: 5,
            window_seconds: 15 * 60,
        },
        log_level: "error".to_string(),
    }
}

pub fn test_app() -> Router {
    let config = test_config();
    let user_repo = InMemoryUserRepository::new();
    let uow: Arc<dyn UnitOfWork> = Arc::new(InMemoryUnitOfWork::new(user_repo));
    let user_service = Arc::new(UserService::new(uow));
    let rate_limiter: Arc<dyn RateLimiter> = Arc::new(InMemoryRateLimiter::disabled());
    let idempotency_store: Arc<dyn IdempotencyStore> = Arc::new(InMemoryIdempotencyStore::new());
    let request_gate = Arc::new(RequestGate::new(
        rate_limiter,
        idempotency_store,
        user_service,
    ));

    let state = Arc::new(AppState::new(config, request_gate));
    let connect_info = ConnectInfo(SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0));

    build_router(state).layer(Extension(connect_info))
}
