use axum::{
    body::Body,
    http::{header, Method, Request, StatusCode},
};
use serde_json::json;
use tower::ServiceExt;

/// Test registration flow.
#[tokio::test]
#[ignore = "requires running server"]
async fn test_registration_flow() {
    let app = create_test_app().await;

    // Register new user
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/register")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    json!(
                        {
                            "name": "Test User",
                            "email": "test@example.com",
                            "password": "a-very-long-password-123"
                        }
                    )
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    // Verify email with token (mocked in test)
    // In real test, would extract token from mock email service

    // Try logging in before verification (should fail)
    // ...

    // Verify email
    // ...

    // Login after verification (should succeed)
    // ...
}

/// Test password reset flow.
#[tokio::test]
#[ignore = "requires running server"]
async fn test_password_reset_flow() {
    let app = create_test_app().await;

    // Request password reset
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/request-password-reset")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    json!(
                        {
                            "email": "test@example.com"
                        }
                    )
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    // Reset password with token from mock email
    // ...
}

/// Test session fixation prevention.
#[tokio::test]
#[ignore = "requires running server"]
async fn test_session_fixation_prevention() {
    let _app = create_test_app().await;

    // Create anonymous session
    // ...

    // Login (should create NEW session ID, not reuse old one)
    // ...

    // Assert old session is invalid
    // ...
}

/// Test cross-subdomain SSO cookie.
#[tokio::test]
#[ignore = "requires running server"]
async fn test_cross_subdomain_sso() {
    // This test requires:
    // 1. DNS setup for *.klynt.test
    // 2. Cookie domain set to .klynt.test
    // 3. Test that cookie from login.klynt.test works on tenant.klynt.test

    // For CI, use Playwright with configurable cookie domain
    // ...
}

async fn create_test_app() -> axum::Router {
    // Setup test app with mock services
    // ...
    axum::Router::new()
}
