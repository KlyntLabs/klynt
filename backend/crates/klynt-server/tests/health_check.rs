use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use tower::ServiceExt;

mod helpers;

#[tokio::test]
async fn liveness_returns_ok() {
    let app = helpers::test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/health/live")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["status"], "ok");
}

#[tokio::test]
async fn readiness_returns_ok() {
    let app = helpers::test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/health/ready")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}
