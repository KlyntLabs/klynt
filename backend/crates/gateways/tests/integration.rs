//! Gateway integration tests.

use std::collections::HashMap;

use axum::{
    body::Body,
    http::{Method, Request, StatusCode},
};
use base::ctx::{ExecutionContext, RequestContext};
use chrono::Utc;
use domain::{Email, User, UserId, UserRole, UserStatus};
use tower::ServiceExt;

mod support;

fn app() -> axum::Router {
    let config = support::test_config();
    let services = support::build_test_services();
    gateways::create_router(config, services)
}

#[tokio::test]
async fn health_endpoint_returns_ok() {
    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["status"], "ok");
}

#[tokio::test]
async fn openapi_endpoint_returns_ok_with_json_content_type() {
    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/openapi.json")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response
            .headers()
            .get("content-type")
            .unwrap()
            .to_str()
            .unwrap(),
        "application/json"
    );
}

#[tokio::test]
async fn request_id_is_generated_when_missing() {
    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert!(response.headers().contains_key("x-request-id"));
    let request_id = response
        .headers()
        .get("x-request-id")
        .unwrap()
        .to_str()
        .unwrap();
    assert!(!request_id.is_empty());
}

#[tokio::test]
async fn request_id_is_echoed_when_provided() {
    let request_id = uuid::Uuid::new_v4().to_string();

    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/health")
                .header("x-request-id", &request_id)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(
        response
            .headers()
            .get("x-request-id")
            .unwrap()
            .to_str()
            .unwrap(),
        request_id
    );
}

#[tokio::test]
async fn invalid_request_id_is_replaced() {
    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/health")
                .header("x-request-id", "not-a-valid-uuid")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let echoed_id = response
        .headers()
        .get("x-request-id")
        .unwrap()
        .to_str()
        .unwrap();
    assert_ne!(echoed_id, "not-a-valid-uuid");
    assert!(echoed_id.parse::<uuid::Uuid>().is_ok());
}

#[tokio::test]
async fn security_headers_are_present() {
    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(
        response.headers().get("X-Content-Type-Options").unwrap(),
        "nosniff"
    );
    assert_eq!(response.headers().get("X-Frame-Options").unwrap(), "DENY");
    assert_eq!(
        response.headers().get("Referrer-Policy").unwrap(),
        "strict-origin-when-cross-origin"
    );
}

#[tokio::test]
async fn cors_preflight_returns_ok() {
    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::OPTIONS)
                .uri("/api/v1/auth/login")
                .header("origin", "http://localhost:5173")
                .header("access-control-request-method", "POST")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    assert!(response
        .headers()
        .contains_key("access-control-allow-origin"));
}

#[tokio::test]
async fn login_with_invalid_credentials_returns_unauthorized() {
    let login_request = serde_json::json!({
        "email": "test@example.com",
        "password": "wrong-password"
    });

    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&login_request).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn register_with_invalid_email_returns_bad_request() {
    let register_request = serde_json::json!({
        "email": "not-an-email",
        "password": "short"
    });

    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/register")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&register_request).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn request_password_reset_returns_ok_to_prevent_enumeration() {
    let request = serde_json::json!({
        "email": "nobody@example.com"
    });

    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/request-password-reset")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&request).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: HashMap<String, serde_json::Value> = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["success"], true);
}

#[tokio::test]
async fn malformed_json_returns_bad_request() {
    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .body(Body::from("not json"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

async fn authenticated_app() -> (axum::Router, UserId, String) {
    let (services, session_service, user_repo) = support::build_test_services_with_fakes();
    let config = support::test_config();

    let user_id = UserId::new();

    let token = session_service
        .create(
            &ExecutionContext::new(RequestContext::new()),
            UserId(user_id.inner()),
        )
        .await
        .unwrap();

    let now = Utc::now();
    user_repo.insert(User {
        id: user_id,
        email: Email::new("ada@example.com".to_string()),
        full_name: Some("Ada Lovelace".to_string()),
        password_hash: "old-password".to_string(),
        status: UserStatus::Active,
        role: UserRole::Student,
        global_role: None,
        email_verified_at: None,
        institution_id: None,
        terms_accepted_at: now,
        terms_version: "1.0".to_string(),
        created_at: now,
        updated_at: now,
        deleted_at: None,
    });

    (
        gateways::create_router(config, services),
        user_id,
        token.0.to_string(),
    )
}

#[tokio::test]
async fn get_me_returns_authenticated_user_profile() {
    let (app, _user_id, token) = authenticated_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/api/v1/users/me")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["data"]["email"], "ada@example.com");
    assert_eq!(json["data"]["full_name"], "Ada Lovelace");
}

#[tokio::test]
async fn update_profile_changes_full_name() {
    let (app, _user_id, token) = authenticated_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::PATCH)
                .uri("/api/v1/users/me")
                .header("Authorization", format!("Bearer {token}"))
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({ "full_name": "New Name" }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["data"]["full_name"], "New Name");
}

#[tokio::test]
async fn change_password_with_valid_password_succeeds() {
    let (app, _user_id, token) = authenticated_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/users/me/password")
                .header("Authorization", format!("Bearer {token}"))
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "current_password": "old-password",
                        "new_password": "new-password",
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn change_password_with_invalid_password_returns_unauthorized() {
    let (app, _user_id, token) = authenticated_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/users/me/password")
                .header("Authorization", format!("Bearer {token}"))
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "current_password": "wrong-password",
                        "new_password": "new-password",
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn protected_user_routes_require_authentication() {
    let app = app();

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/api/v1/users/me")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn list_users_returns_paginated_response() {
    let (app, _user_id, token) = authenticated_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/api/v1/users?page=1&page_size=10")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(json["data"]["items"].is_array());
    assert_eq!(json["data"]["page"], 1);
    assert_eq!(json["data"]["page_size"], 10);
}
