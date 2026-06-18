use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use tower::ServiceExt;
use uuid::Uuid;

mod helpers;

fn register_payload() -> String {
    serde_json::json!({
        "name": "Ada Lovelace",
        "email": "ada@example.com",
        "password": "str0ng!passphrase",
        "role": "student",
        "terms_accepted": true,
        "terms_version": "2026-06-18"
    })
    .to_string()
}

#[tokio::test]
async fn create_user_returns_201() {
    let app = helpers::test_app();
    let idempotency_key = Uuid::new_v4();

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/users")
                .header("Content-Type", "application/json")
                .header("Idempotency-Key", idempotency_key.to_string())
                .body(Body::from(register_payload()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["name"], "Ada Lovelace");
    assert_eq!(json["email"], "ada@example.com");
    assert_eq!(json["role"], "student");
    assert_eq!(json["status"], "pending_verification");
}

#[tokio::test]
async fn duplicate_email_returns_409() {
    let app = helpers::test_app();
    let first_key = Uuid::new_v4();
    let second_key = Uuid::new_v4();

    let req = |key: Uuid| {
        Request::builder()
            .method("POST")
            .uri("/api/v1/users")
            .header("Content-Type", "application/json")
            .header("Idempotency-Key", key.to_string())
            .body(Body::from(register_payload()))
            .unwrap()
    };

    let first = app.clone().oneshot(req(first_key)).await.unwrap();
    assert_eq!(first.status(), StatusCode::CREATED);

    let second = app.clone().oneshot(req(second_key)).await.unwrap();
    assert_eq!(second.status(), StatusCode::CONFLICT);
}

#[tokio::test]
async fn missing_idempotency_key_returns_400() {
    let app = helpers::test_app();

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/users")
                .header("Content-Type", "application/json")
                .body(Body::from(register_payload()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn idempotency_replay_returns_same_user() {
    let app = helpers::test_app();
    let idempotency_key = Uuid::new_v4();

    let req = || {
        Request::builder()
            .method("POST")
            .uri("/api/v1/users")
            .header("Content-Type", "application/json")
            .header("Idempotency-Key", idempotency_key.to_string())
            .body(Body::from(register_payload()))
            .unwrap()
    };

    let first = app.clone().oneshot(req()).await.unwrap();
    let first_body = first.into_body().collect().await.unwrap().to_bytes();
    let first_json: serde_json::Value = serde_json::from_slice(&first_body).unwrap();

    let second = app.clone().oneshot(req()).await.unwrap();
    let second_body = second.into_body().collect().await.unwrap().to_bytes();
    let second_json: serde_json::Value = serde_json::from_slice(&second_body).unwrap();

    assert_eq!(first_json["id"], second_json["id"]);
}

#[tokio::test]
async fn concurrent_duplicate_email_creates_only_one_user() {
    let app = helpers::test_app();

    let mut handles = vec![];
    for i in 0..10 {
        let app = app.clone();
        let handle = tokio::spawn(async move {
            let key = Uuid::new_v4();
            let response = app
                .oneshot(
                    Request::builder()
                        .method("POST")
                        .uri("/api/v1/users")
                        .header("Content-Type", "application/json")
                        .header("Idempotency-Key", key.to_string())
                        .body(Body::from(register_payload()))
                        .unwrap(),
                )
                .await
                .unwrap();
            (i, response.status())
        });
        handles.push(handle);
    }

    let results: Vec<_> = futures::future::join_all(handles)
        .await
        .into_iter()
        .map(|r| r.unwrap())
        .collect();

    let created_count = results
        .iter()
        .filter(|(_, s)| *s == StatusCode::CREATED)
        .count();
    assert_eq!(created_count, 1);
}
