#![allow(dead_code)]

use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::sync::Arc;

use async_trait::async_trait;
use axum::extract::ConnectInfo;
use axum::http::Request;
use axum::Router;
use klynt_domain::config::{ApiConfig, AppConfig, RateLimiterConfig};
use klynt_domain::errors::DomainError;
use klynt_domain::models::Email;
use klynt_domain::ports::{EmailService, SharedEmailService};
use klynt_infrastructure::email::MockEmailService;
use klynt_server::composition::build_app_with_email_service;

pub fn test_config() -> AppConfig {
    AppConfig {
        api: ApiConfig {
            host: "127.0.0.1".to_string(),
            port: 0,
            allowed_origins: vec!["http://localhost:5173".to_string()],
            trusted_proxies: vec![],
        },
        rate_limiter: RateLimiterConfig {
            enabled: true,
            max_requests: 10_000,
            window_seconds: 60,
        },
        log_level: "error".to_string(),
        database_url: Some(
            std::env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgresql://klynt:klynt@localhost:5432/test".to_string()),
        ),
        redis_url: Some(
            std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379/0".to_string()),
        ),
    }
}

fn connect_info() -> ConnectInfo<SocketAddr> {
    ConnectInfo(SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0))
}

pub async fn test_app() -> Router {
    let config = test_config();
    build_app_with_email_service(
        config,
        Arc::new(MockEmailService::new()) as SharedEmailService,
    )
    .await
    .layer(axum::Extension(connect_info()))
}

/// Builds a test app and returns the email service so tests can inspect the
/// tokens "sent" by the mock adapter.
pub async fn test_app_with_email_service() -> (Router, Arc<MockEmailService>) {
    let config = test_config();
    let email_service: Arc<MockEmailService> = Arc::new(MockEmailService::new());
    let email_service_port: SharedEmailService = Arc::clone(&email_service) as SharedEmailService;

    let app = build_app_with_email_service(config, email_service_port)
        .await
        .layer(axum::Extension(connect_info()));
    (app, email_service)
}

/// Test double that fails only on password-reset emails.
pub struct FailingPasswordResetEmailService;

#[async_trait]
impl EmailService for FailingPasswordResetEmailService {
    async fn send_verification(&self, _email: &Email, _token: &str) -> Result<(), DomainError> {
        Ok(())
    }

    async fn send_password_reset(&self, _email: &Email, _token: &str) -> Result<(), DomainError> {
        Err(DomainError::internal_msg("password reset email failed"))
    }
}

/// Builds a test app with an email service that fails only on password-reset emails.
pub async fn test_app_with_failing_password_reset_email_service() -> Router {
    let config = test_config();
    let email_service: SharedEmailService = Arc::new(FailingPasswordResetEmailService);

    build_app_with_email_service(config, email_service)
        .await
        .layer(axum::Extension(connect_info()))
}

/// Convenience helper to build a request with a bearer token.
pub fn authorized_request<B>(request: Request<B>, token: &str) -> Request<B> {
    let mut request = request;
    request
        .headers_mut()
        .insert("Authorization", format!("Bearer {token}").parse().unwrap());
    request
}
