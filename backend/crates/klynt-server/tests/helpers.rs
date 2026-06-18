use std::net::{IpAddr, Ipv4Addr, SocketAddr};

use axum::extract::ConnectInfo;
use axum::Extension;
use axum::Router;
use klynt_domain::config::{ApiConfig, AppConfig, RateLimiterConfig};
use klynt_server::composition::build_app;

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
    let connect_info = ConnectInfo(SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0));

    build_app(config).layer(Extension(connect_info))
}
