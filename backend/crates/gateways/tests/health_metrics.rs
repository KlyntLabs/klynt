//! Health and metrics endpoint tests.

use std::sync::Arc;

use axum::{
    body::Body,
    http::{Method, Request, StatusCode},
};
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
async fn health_live_endpoint_returns_ok() {
    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/health/live")
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
    assert_eq!(json["status"], "alive");
    assert!(json["timestamp"].is_string());
}

#[tokio::test]
async fn health_ready_endpoint_returns_ok_when_healthy() {
    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/health/ready")
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
    assert_eq!(json["healthy"], true);
    assert!(json["components"].is_array());
    assert!(json["checked_at"].is_string());
}

#[tokio::test]
async fn health_ready_endpoint_returns_service_unavailable_when_unhealthy() {
    let health_reporter = Arc::new(observability::health::CompositeHealthReporter::new(vec![
        Arc::new(observability::health::AlwaysUnhealthyCheck::new("postgres")),
    ]));
    let config = support::test_config();
    let services = support::build_test_services_with_health_reporter(health_reporter);
    let app = gateways::create_router(config, services);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/health/ready")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["healthy"], false);
    assert_eq!(json["components"][0]["name"], "postgres");
    assert_eq!(json["components"][0]["healthy"], false);
}

#[tokio::test]
async fn metrics_endpoint_returns_prometheus_exposition() {
    // Prime the metrics endpoint with at least one request.
    let _ = app()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/metrics")
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
        "text/plain; version=0.0.4"
    );

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let text = String::from_utf8(body.to_vec()).unwrap();
    assert!(text.contains("http_requests_total"));
    assert!(text.contains("http_request_duration_seconds"));
}

#[tokio::test]
async fn metrics_endpoint_uses_unknown_path_label_for_unmatched_routes() {
    // Request a path that does not match any route.
    let _ = app()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/does-not-exist/secret-token")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let response = app()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/metrics")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let text = String::from_utf8(body.to_vec()).unwrap();

    assert!(
        text.contains("path=\"unknown\""),
        "metrics should label unmatched routes as 'unknown'"
    );
    assert!(
        !text.contains("secret-token"),
        "raw unmatched path must not appear in metrics"
    );
}
