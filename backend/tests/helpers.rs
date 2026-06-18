use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::sync::Arc;

use axum::extract::ConnectInfo;
use axum::Extension;
use axum::Router;
use klynt_api::{
    application::users::UserService,
    config::{ApiConfig, AppConfig},
    domain::unit_of_work::UnitOfWork,
    infrastructure::rate_limiter::RateLimiter,
    infrastructure::repositories::idempotency::InMemoryIdempotencyStore,
    infrastructure::repositories::in_memory_user::InMemoryUserRepository,
    infrastructure::unit_of_work::InMemoryUnitOfWork,
    startup::build_router,
    state::AppState,
};

pub fn test_config() -> AppConfig {
    AppConfig {
        api: ApiConfig {
            host: "127.0.0.1".to_string(),
            port: 0,
            allowed_origins: vec!["http://localhost:5173".to_string()],
        },
        log_level: "error".to_string(),
    }
}

pub fn test_app() -> Router {
    let config = test_config();
    let user_repo = InMemoryUserRepository::new();
    let uow: Arc<dyn UnitOfWork> = Arc::new(InMemoryUnitOfWork::new(user_repo));
    let user_service = Arc::new(UserService::new(uow));
    let state = Arc::new(AppState {
        config: Arc::new(config),
        user_service,
        idempotency_store: Arc::new(InMemoryIdempotencyStore::new()),
        rate_limiter: Arc::new(RateLimiter::disabled()),
    });
    let connect_info = ConnectInfo(SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0));

    build_router(state).layer(Extension(connect_info))
}
