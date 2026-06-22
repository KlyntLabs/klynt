//! Integration tests using real infrastructure services.
//!
//! These tests require Postgres and Redis running locally. The pre-push hook sets
//! the standard test URLs; for local runs use docker compose from the repo root.

use gateways::{Config, Services};

fn database_url() -> String {
    std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://klynt:klynt@localhost:5432/test".to_string())
}

fn redis_url() -> String {
    std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379/0".to_string())
}

fn test_config() -> Config {
    Config {
        service_name: "api-gateway-test".to_string(),
        bind_address: "127.0.0.1:0".to_string(),
        base_url: "http://localhost".to_string(),
        database_url: database_url(),
        redis_url: Some(redis_url()),
        rate_limiter: config::RateLimiterConfig::default(),
        hsts_enabled: false,
        allowed_origins: vec!["http://localhost:5173".to_string()],
        trusted_proxies: Vec::new(),
        log_level: "warn".to_string(),
        cookie_domain: ".klynt.edu".to_string(),
        cookie_secure: false,
    }
}

#[tokio::test]
async fn services_can_be_built_from_config() {
    let config = test_config();
    let services = Services::from_config(&config).await;

    assert!(
        services.is_ok(),
        "services should build with real infrastructure: {:?}",
        services.err()
    );
}

#[tokio::test]
async fn services_requires_database_url() {
    let mut config = test_config();
    config.database_url = String::new();

    let result = Services::from_config(&config).await;

    assert!(result.is_err());
    let err = match result {
        Err(e) => e.to_string(),
        Ok(_) => panic!("expected error"),
    };
    assert!(
        err.contains("DATABASE_URL is required"),
        "unexpected error: {err}"
    );
}

#[tokio::test]
async fn services_requires_redis_url_when_rate_limiting_enabled() {
    let mut config = test_config();
    config.redis_url = None;
    config.rate_limiter = config::RateLimiterConfig {
        enabled: true,
        ..Default::default()
    };

    let result = Services::from_config(&config).await;

    assert!(result.is_err());
    let err = match result {
        Err(e) => e.to_string(),
        Ok(_) => panic!("expected error"),
    };
    assert!(
        err.contains("REDIS_URL is not configured"),
        "unexpected error: {err}"
    );
}
