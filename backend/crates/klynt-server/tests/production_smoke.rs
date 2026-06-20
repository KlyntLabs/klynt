//! End-to-end smoke tests for the production composition backed by Postgres
//! and Redis. These tests run against real infrastructure and therefore require
//! `DATABASE_URL` and `REDIS_URL` to point at running services.

use std::sync::Arc;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use klynt_domain::config::{ApiConfig, AppConfig, RateLimiterConfig};
use klynt_domain::ports::SharedEmailService;
use klynt_infrastructure::email::MockEmailService;
use klynt_server::composition::build_app_with_email_service;
use tower::ServiceExt;
use uuid::Uuid;

fn production_config() -> AppConfig {
    AppConfig {
        api: ApiConfig {
            host: "127.0.0.1".to_string(),
            port: 0,
            allowed_origins: vec!["http://localhost:5173".to_string()],
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

async fn app_with_email() -> (axum::Router, Arc<MockEmailService>) {
    let config = production_config();
    let mock_email: Arc<MockEmailService> = Arc::new(MockEmailService::new());
    let email_service: SharedEmailService = Arc::clone(&mock_email) as SharedEmailService;
    let app = build_app_with_email_service(config, email_service).await;
    (app, mock_email)
}

fn get_request(uri: &str) -> Request<Body> {
    Request::builder().uri(uri).body(Body::empty()).unwrap()
}

fn post_request(uri: &str, body: serde_json::Value) -> Request<Body> {
    Request::builder()
        .method("POST")
        .uri(uri)
        .header("Content-Type", "application/json")
        .body(Body::from(body.to_string()))
        .unwrap()
}

#[tokio::test]
async fn production_health_checks_pass() {
    let (app, _) = app_with_email().await;

    let live = app
        .clone()
        .oneshot(get_request("/api/v1/health/live"))
        .await
        .unwrap();
    assert_eq!(live.status(), StatusCode::OK);

    let ready = app
        .oneshot(get_request("/api/v1/health/ready"))
        .await
        .unwrap();
    assert_eq!(ready.status(), StatusCode::OK);
}

#[tokio::test]
async fn register_verify_login_and_get_me_round_trip_with_postgres() {
    let (app, email_service) = app_with_email().await;
    let suffix = Uuid::new_v4();
    let email = format!("smoke-{suffix}@example.com");
    let password = "str0ng!passphrase";

    // Register a new user.
    let register_response = app
        .clone()
        .oneshot(post_request(
            "/api/v1/auth/register",
            serde_json::json!({
                "name": "Smoke Test",
                "email": email,
                "password": password,
                "terms_accepted": true,
                "terms_version": "2026-06-18",
            }),
        ))
        .await
        .unwrap();
    assert_eq!(register_response.status(), StatusCode::CREATED);

    // Extract the verification token from the mock email service.
    let verification_token = email_service
        .recorded_verifications()
        .into_iter()
        .find(|(sent_to, _)| sent_to == &email)
        .map(|(_, token)| token)
        .expect("verification email was not recorded");

    // Verify the email address.
    let verify_response = app
        .clone()
        .oneshot(post_request(
            "/api/v1/auth/verify-email",
            serde_json::json!({ "token": verification_token }),
        ))
        .await
        .unwrap();
    assert_eq!(verify_response.status(), StatusCode::OK);

    // Log in and capture the session cookie.
    let login_response = app
        .clone()
        .oneshot(post_request(
            "/api/v1/sessions",
            serde_json::json!({
                "email": email,
                "password": password,
            }),
        ))
        .await
        .unwrap();
    assert_eq!(login_response.status(), StatusCode::OK);

    let login_body = login_response
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let login_json: serde_json::Value = serde_json::from_slice(&login_body).unwrap();
    let session_token = login_json["token"]
        .as_str()
        .expect("login did not return a token");

    // Fetch the current user profile using the bearer token.
    let me_response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/users/me")
                .header("Authorization", format!("Bearer {session_token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(me_response.status(), StatusCode::OK);

    let body = me_response.into_body().collect().await.unwrap().to_bytes();
    let profile: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(profile["email"], email);
}
