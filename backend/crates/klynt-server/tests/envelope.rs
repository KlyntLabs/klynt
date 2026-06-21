use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use tower::ServiceExt;
use uuid::Uuid;

mod helpers;

fn unique_email(prefix: &str) -> String {
    format!("{prefix}-{uuid}@example.com", uuid = Uuid::new_v4())
}

fn register_payload(email: &str) -> String {
    serde_json::json!({
        "name": "Ada Lovelace",
        "email": email,
        "password": "str0ng!passphrase",
        "role": "student",
        "terms_accepted": true,
        "terms_version": "2026-06-18"
    })
    .to_string()
}

#[tokio::test]
async fn success_response_has_full_envelope() {
    let app = helpers::test_app().await;
    let idempotency_key = Uuid::new_v4();
    let email = unique_email("envelope");

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/users")
                .header("Content-Type", "application/json")
                .header("Idempotency-Key", idempotency_key.to_string())
                .body(Body::from(register_payload(&email)))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

    // Envelope structure.
    assert!(json["id"].is_string());
    assert_eq!(json["status"], 0);
    assert_eq!(json["type"], "success");
    assert!(json["error"].is_null());

    // Data is nested.
    assert_eq!(json["data"]["name"], "Ada Lovelace");
    assert_eq!(json["data"]["email"], email);

    // Meta has observability fields.
    assert!(json["meta"]["request_id"].is_string());
    assert!(json["meta"]["trace_id"].is_string());
    assert!(json["meta"]["timestamp"].is_string());
    assert!(json["meta"]["duration_ms"].is_number());
}

#[tokio::test]
async fn health_response_is_not_enveloped() {
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

    // Health is raw — no envelope wrapper.
    assert_eq!(json["status"], "ok");
    // There is no "data" field — proving it's not enveloped.
    assert!(json.get("data").is_none());
    assert!(json.get("type").is_none());
}

#[tokio::test]
async fn error_response_has_full_envelope() {
    let app = helpers::test_app().await;
    let email = unique_email("envelope-error");
    let body_text = register_payload(&email);

    // First create succeeds.
    let first = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/users")
                .header("Content-Type", "application/json")
                .header("Idempotency-Key", Uuid::new_v4().to_string())
                .body(Body::from(body_text.clone()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(first.status(), StatusCode::CREATED);

    // Second with same email → 409 conflict.
    let second = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/users")
                .header("Content-Type", "application/json")
                .header("Idempotency-Key", Uuid::new_v4().to_string())
                .body(Body::from(body_text))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(second.status(), StatusCode::CONFLICT);

    let body = second.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

    // Error envelope structure.
    assert_eq!(json["status"], 1);
    assert_eq!(json["type"], "error");
    assert!(json["data"].is_null());

    assert_eq!(json["error"]["type"], "CONFLICT");
    assert_eq!(json["error"]["code"], 409);
    assert!(json["error"]["message"].is_string());
}
