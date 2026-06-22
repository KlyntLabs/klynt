//! Authentication integration tests.

use std::net::SocketAddr;

use axum::{
    body::Body,
    extract::ConnectInfo,
    http::{Method, Request, StatusCode},
};
use base::ctx::{ExecutionContext, RequestContext};
use chrono::Utc;
use domain::{Email, User, UserId, UserRole, UserStatus};
use gateways::constants::SESSION_TOKEN_COOKIE;
use tower::ServiceExt;

mod support;

fn app() -> axum::Router {
    let config = support::test_config();
    let services = support::build_test_services();
    gateways::create_router(config, services)
}

#[tokio::test]
async fn login_with_invalid_credentials_returns_unauthorized() {
    let login_request = serde_json::json!({
        "email": "test@example.com",
        "password": "wrong-password"
    });
    let addr = SocketAddr::from(([127, 0, 0, 1], 1234));

    let response = app()
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

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn register_with_invalid_email_returns_bad_request() {
    let register_request = serde_json::json!({
        "email": "not-an-email",
        "password": "short"
    });
    let addr = SocketAddr::from(([127, 0, 0, 1], 1234));

    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/register")
                .header("content-type", "application/json")
                .extension(ConnectInfo(addr))
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
    let json: std::collections::HashMap<String, serde_json::Value> =
        serde_json::from_slice(&body).unwrap();
    assert_eq!(json["success"], true);
}

#[tokio::test]
async fn malformed_json_returns_bad_request() {
    let addr = SocketAddr::from(([127, 0, 0, 1], 1234));

    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .extension(ConnectInfo(addr))
                .body(Body::from("not json"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn sso_cookie_authenticates_across_subdomains() {
    let (services, _, auth_user_repo, user_service_repo) =
        support::build_test_services_with_auth_fakes();
    let config = support::test_config();
    let app = gateways::create_router(config, services);

    let user_id = UserId::new();
    let now = Utc::now();
    let user = User {
        id: user_id,
        email: Email::new("ada@example.com".to_string()),
        full_name: Some("Ada Lovelace".to_string()),
        password_hash: "hash-password".to_string(),
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
    };
    auth_user_repo.insert(user.clone());
    user_service_repo.insert(user);

    let login_request = serde_json::json!({
        "email": "ada@example.com",
        "password": "password"
    });
    let addr = SocketAddr::from(([127, 0, 0, 1], 1234));

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .header("host", "tenant.klynt.edu")
                .extension(ConnectInfo(addr))
                .body(Body::from(serde_json::to_vec(&login_request).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let set_cookie = response
        .headers()
        .get("set-cookie")
        .expect("login should set a session cookie")
        .to_str()
        .unwrap();
    assert!(
        set_cookie.contains(&format!("{SESSION_TOKEN_COOKIE}=")),
        "set-cookie should contain {SESSION_TOKEN_COOKIE}: {set_cookie}"
    );
    // The cookie crate normalizes RFC 6265 domain attributes by stripping the
    // legacy leading dot; both forms are functionally equivalent for SSO.
    assert!(
        set_cookie.contains("Domain=.klynt.edu") || set_cookie.contains("Domain=klynt.edu"),
        "set-cookie should set cross-subdomain domain: {set_cookie}"
    );
    assert!(
        set_cookie.contains("HttpOnly"),
        "set-cookie should be HttpOnly: {set_cookie}"
    );
    assert!(
        set_cookie.contains("Path=/"),
        "set-cookie should have path /: {set_cookie}"
    );
    assert!(
        set_cookie.contains("Max-Age="),
        "set-cookie should have Max-Age: {set_cookie}"
    );

    let cookie_value = set_cookie.split(';').next().unwrap().trim();

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/api/v1/users/me")
                .header("host", "other.klynt.edu")
                .header("cookie", cookie_value)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

async fn cookie_authenticated_app() -> (axum::Router, String) {
    let (services, session_service, auth_user_repo, user_service_repo) =
        support::build_test_services_with_auth_fakes();
    let config = support::test_config();

    let user_id = UserId::new();
    let now = Utc::now();
    let user = User {
        id: user_id,
        email: Email::new("ada@example.com".to_string()),
        full_name: Some("Ada Lovelace".to_string()),
        password_hash: "hash-password".to_string(),
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
    };
    auth_user_repo.insert(user.clone());
    user_service_repo.insert(user);

    let token = session_service
        .create(
            &ExecutionContext::new(RequestContext::new()),
            UserId(user_id.inner()),
        )
        .await
        .unwrap();

    (
        gateways::create_router(config, services),
        token.token.0.to_string(),
    )
}

#[tokio::test]
async fn logout_with_cookie_clears_session_cookie() {
    let (app, token) = cookie_authenticated_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/logout")
                .header("cookie", format!("{SESSION_TOKEN_COOKIE}={token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let set_cookie = response
        .headers()
        .get("set-cookie")
        .expect("logout should clear the session cookie")
        .to_str()
        .unwrap();
    assert!(
        set_cookie.contains(&format!("{SESSION_TOKEN_COOKIE}=")),
        "set-cookie should reference {SESSION_TOKEN_COOKIE}: {set_cookie}"
    );
    assert!(
        set_cookie.contains("Domain=.klynt.edu") || set_cookie.contains("Domain=klynt.edu"),
        "set-cookie should set cross-subdomain domain: {set_cookie}"
    );
    assert!(
        set_cookie.contains("Path=/"),
        "set-cookie should have path /: {set_cookie}"
    );
    assert!(
        set_cookie.contains("HttpOnly"),
        "set-cookie should be HttpOnly: {set_cookie}"
    );
    assert!(
        set_cookie.contains("SameSite=Lax"),
        "set-cookie should be SameSite=Lax: {set_cookie}"
    );
    assert!(
        set_cookie.contains("Max-Age=0") || set_cookie.contains("Expires="),
        "set-cookie should expire the cookie: {set_cookie}"
    );
}

#[tokio::test]
async fn logout_with_body_token_succeeds() {
    let (app, token) = cookie_authenticated_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/logout")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({ "session_token": token }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn logout_without_token_returns_bad_request() {
    let (services, _, _, _) = support::build_test_services_with_auth_fakes();
    let config = support::test_config();
    let app = gateways::create_router(config, services);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/logout")
                .header("content-type", "application/json")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn refresh_token_cannot_access_protected_route() {
    let (services, session_service, auth_user_repo, user_service_repo) =
        support::build_test_services_with_auth_fakes();
    let config = support::test_config();
    let app = gateways::create_router(config, services);

    let user_id = UserId::new();
    let now = Utc::now();
    let user = User {
        id: user_id,
        email: Email::new("ada@example.com".to_string()),
        full_name: Some("Ada Lovelace".to_string()),
        password_hash: "hash-password".to_string(),
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
    };
    auth_user_repo.insert(user.clone());
    user_service_repo.insert(user);

    let refresh = session_service
        .create_refresh(&ExecutionContext::new(RequestContext::new()), user_id, None)
        .await
        .unwrap();

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/api/v1/users/me")
                .header("authorization", format!("Bearer {}", refresh.token.0))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}
