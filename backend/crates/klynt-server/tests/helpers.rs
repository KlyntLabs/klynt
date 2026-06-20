use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::sync::Arc;

use async_trait::async_trait;
use axum::extract::ConnectInfo;
use axum::Extension;
use axum::Router;
use klynt_domain::config::{ApiConfig, AppConfig, RateLimiterConfig};
use klynt_domain::errors::DomainError;
use klynt_domain::models::Email;
use klynt_domain::ports::{EmailService, SharedEmailService};
use klynt_infrastructure::email::MockEmailService;
use klynt_server::composition::{build_app, build_app_with_email_service};

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
        database_url: None,
        redis_url: None,
    }
}

pub fn test_app() -> Router {
    let config = test_config();
    let connect_info = ConnectInfo(SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0));

    build_app(config).layer(Extension(connect_info))
}

/// Builds a test app and returns the email service so tests can inspect the
/// tokens "sent" by the mock adapter.
#[allow(dead_code)]
pub fn test_app_with_email_service() -> (Router, Arc<MockEmailService>) {
    let config = test_config();
    let connect_info = ConnectInfo(SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0));
    let email_service: Arc<MockEmailService> = Arc::new(MockEmailService::new());
    let email_service_port: SharedEmailService = Arc::clone(&email_service) as SharedEmailService;

    let app =
        build_app_with_email_service(config, email_service_port).layer(Extension(connect_info));
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
#[allow(dead_code)]
pub fn test_app_with_failing_password_reset_email_service() -> Router {
    let config = test_config();
    let connect_info = ConnectInfo(SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0));
    let email_service: SharedEmailService = Arc::new(FailingPasswordResetEmailService);

    build_app_with_email_service(config, email_service).layer(Extension(connect_info))
}
