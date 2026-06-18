use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::sync::Arc;

use axum::extract::ConnectInfo;
use axum::Extension;
use axum::Router;
use klynt_api::{
    config::{ApiConfig, AppConfig, RateLimiterConfig},
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
        rate_limiter: RateLimiterConfig {
            enabled: false,
            max_requests: 5,
            window_seconds: 15 * 60,
        },
        log_level: "error".to_string(),
    }
}

pub fn test_app() -> Router {
    let state = Arc::new(AppState::new(test_config()));
    let connect_info = ConnectInfo(SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0));

    build_router(state).layer(Extension(connect_info))
}
