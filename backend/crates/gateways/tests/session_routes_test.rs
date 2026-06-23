//! Integration tests for session-management routes.

use std::net::SocketAddr;

use axum::{
    body::Body,
    extract::ConnectInfo,
    http::{Method, Request, StatusCode},
};
use chrono::Utc;
use domain::{Email, User, UserId, UserRole, UserStatus};
use tower::ServiceExt;

mod support;

fn app() -> axum::Router {
    let config = support::test_config();
    let services = support::build_test_services();
    gateways::create_router(config, services)
}

fn make_user(email: &str) -> User {
    let now = Utc::now();
    User {
        id: UserId::new(),
        email: Email::new(email.to_string()),
        full_name: Some("Session Tester".to_string()),
        password_hash: format!("hash-{}", "Password123"),
        status: UserStatus::Active,
        role: UserRole::Student,
        global_role: None,
        email_verified_at: Some(now),
        institution_id: None,
        terms_accepted_at: now,
        terms_version: "1.0".to_string(),
        created_at: now,
        updated_at: now,
        deleted_at: None,
    }
}

async fn register_and_login_user(email: &str) -> (axum::Router, String) {
    let (mut services, _, auth_user_repo, user_service_repo) =
        support::build_test_services_with_auth_fakes();
    services.config.cookie_domain = String::new();
    let config = support::test_config();
    let app = gateways::create_router(config, services);

    let user = make_user(email);
    auth_user_repo.insert(user.clone());
    user_service_repo.insert(user.clone());

    let login_request = serde_json::json!({
        "email": email,
        "password": "Password123"
    });
    let addr = SocketAddr::from(([127, 0, 0, 1], 1234));

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .extension(ConnectInfo(addr))
                .body(Body::from(serde_json::to_vec(&login_request).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let access_token = json["data"]["access_token"]
        .as_str()
        .expect("login response should contain access_token")
        .to_string();

    (app, access_token)
}

async fn login_user_on_app(app: &axum::Router, email: &str) -> String {
    let login_request = serde_json::json!({
        "email": email,
        "password": "Password123"
    });
    let addr = SocketAddr::from(([127, 0, 0, 1], 1234));

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .extension(ConnectInfo(addr))
                .body(Body::from(serde_json::to_vec(&login_request).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    json["data"]["access_token"]
        .as_str()
        .expect("login response should contain access_token")
        .to_string()
}

async fn register_users_on_shared_app(emails: &[&str]) -> (axum::Router, Vec<String>) {
    let (mut services, _, auth_user_repo, user_service_repo) =
        support::build_test_services_with_auth_fakes();
    services.config.cookie_domain = String::new();
    let config = support::test_config();
    let app = gateways::create_router(config, services);

    for email in emails {
        let user = make_user(email);
        auth_user_repo.insert(user.clone());
        user_service_repo.insert(user.clone());
    }

    let mut tokens = Vec::new();
    for email in emails {
        tokens.push(login_user_on_app(&app, email).await);
    }

    (app, tokens)
}

#[tokio::test]
async fn list_and_revoke_sessions() {
    let email = "session-user@example.com";
    let (app, access_token) = register_and_login_user(email).await;

    // List sessions
    let list_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/api/v1/auth/sessions")
                .header("authorization", format!("Bearer {}", access_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(list_response.status(), StatusCode::OK);

    let list_body = axum::body::to_bytes(list_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let list_json: serde_json::Value = serde_json::from_slice(&list_body).unwrap();
    let sessions = list_json["data"]["sessions"]
        .as_array()
        .expect("response should contain sessions array");
    assert!(
        !sessions.is_empty(),
        "user should have at least one session"
    );

    // Revoke the access session so the follow-up list call is rejected.
    let session_id = sessions
        .iter()
        .find(|s| s["kind"].as_str() == Some("access"))
        .map(|s| s["id"].as_str().unwrap().to_string())
        .expect("access session should be listed");

    let revoke_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!("/api/v1/auth/sessions/{}", session_id))
                .header("authorization", format!("Bearer {}", access_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(revoke_response.status(), StatusCode::OK);

    // The access token used for authentication is now revoked.
    let list_after_response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/api/v1/auth/sessions")
                .header("authorization", format!("Bearer {}", access_token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(list_after_response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn list_sessions_requires_authentication() {
    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/api/v1/auth/sessions")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn revoke_session_requires_authentication() {
    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!("/api/v1/auth/sessions/{}", uuid::Uuid::new_v4()))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn cannot_revoke_another_users_session() {
    let (app, tokens) = register_users_on_shared_app(&[
        "session-owner-a@example.com",
        "session-owner-b@example.com",
    ])
    .await;

    // List user B's sessions while authenticated as user B.
    let list_response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/api/v1/auth/sessions")
                .header("authorization", format!("Bearer {}", tokens[1]))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(list_response.status(), StatusCode::OK);

    let list_body = axum::body::to_bytes(list_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let list_json: serde_json::Value = serde_json::from_slice(&list_body).unwrap();
    let sessions = list_json["data"]["sessions"]
        .as_array()
        .expect("response should contain sessions array");
    let b_session_id = sessions
        .iter()
        .find(|s| s["kind"].as_str() == Some("access"))
        .map(|s| s["id"].as_str().unwrap().to_string())
        .expect("user B should have an access session");

    // User A attempts to revoke user B's session.
    let revoke_response = app
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!("/api/v1/auth/sessions/{}", b_session_id))
                .header("authorization", format!("Bearer {}", tokens[0]))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(revoke_response.status(), StatusCode::FORBIDDEN);
}
