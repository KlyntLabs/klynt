//! Rate-limit middleware integration tests.

use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    body::Body,
    extract::ConnectInfo,
    http::{Method, Request, StatusCode},
};
use tower::ServiceExt;

mod support;

#[tokio::test]
async fn login_rate_limit_returns_429_with_retry_after() {
    let services =
        support::build_test_services_with_rate_limiter(Arc::new(support::FakeRateLimiter::new(2)));
    let config = support::test_config();
    let app = gateways::create_router(config, services);
    let addr = SocketAddr::from(([127, 0, 0, 1], 1234));
    let login_request = serde_json::json!({
        "email": "test@example.com",
        "password": "wrong-password"
    });
    let body_bytes = serde_json::to_vec(&login_request).unwrap();

    // First two requests are allowed (invalid credentials still pass the middleware).
    for _ in 0..2 {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/v1/auth/login")
                    .header("content-type", "application/json")
                    .extension(ConnectInfo(addr))
                    .body(Body::from(body_bytes.clone()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    // Third request from the same IP is rate limited.
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .extension(ConnectInfo(addr))
                .body(Body::from(body_bytes))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
    assert!(response.headers().contains_key("retry-after"));

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["code"], "RATE_LIMITED");
    assert_eq!(json["retry_after"], 60);
}

#[tokio::test]
async fn register_rate_limit_returns_429_with_retry_after() {
    let services =
        support::build_test_services_with_rate_limiter(Arc::new(support::FakeRateLimiter::new(2)));
    let config = support::test_config();
    let app = gateways::create_router(config, services);
    let addr = SocketAddr::from(([127, 0, 0, 1], 1234));
    let register_request = serde_json::json!({
        "email": "not-an-email",
        "username": "testuser",
        "password": "short"
    });
    let body_bytes = serde_json::to_vec(&register_request).unwrap();

    // First two requests are allowed (invalid payload still passes the middleware).
    for _ in 0..2 {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/v1/auth/register")
                    .header("content-type", "application/json")
                    .extension(ConnectInfo(addr))
                    .body(Body::from(body_bytes.clone()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    // Third request from the same IP is rate limited.
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/register")
                .header("content-type", "application/json")
                .extension(ConnectInfo(addr))
                .body(Body::from(body_bytes))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
    assert!(response.headers().contains_key("retry-after"));

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["code"], "RATE_LIMITED");
    assert_eq!(json["retry_after"], 60);
}

#[tokio::test]
async fn login_rate_limit_uses_x_forwarded_for_behind_trusted_proxy() {
    let services = support::build_test_services_with_rate_limiter_and_proxies(
        Arc::new(support::FakeRateLimiter::new(1)),
        vec![ipnet::IpNet::from(
            "127.0.0.1".parse::<std::net::IpAddr>().unwrap(),
        )],
    );
    let config = support::test_config();
    let app = gateways::create_router(config, services);
    let peer = SocketAddr::from(([127, 0, 0, 1], 1234));
    let login_request = serde_json::json!({
        "email": "test@example.com",
        "password": "wrong-password"
    });
    let body_bytes = serde_json::to_vec(&login_request).unwrap();

    // First request from client A via the trusted proxy is allowed.
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .header("x-forwarded-for", "203.0.113.1")
                .extension(ConnectInfo(peer))
                .body(Body::from(body_bytes.clone()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    // Request from client B via the same trusted proxy is still allowed.
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .header("x-forwarded-for", "203.0.113.2")
                .extension(ConnectInfo(peer))
                .body(Body::from(body_bytes.clone()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    // Second request from client A is rate limited.
    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/auth/login")
                .header("content-type", "application/json")
                .header("x-forwarded-for", "203.0.113.1")
                .extension(ConnectInfo(peer))
                .body(Body::from(body_bytes))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
}
