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

fn register_payload_with(
    name: &str,
    email: &str,
    password: &str,
    role: &str,
    terms_accepted: bool,
    institution_id: Option<Uuid>,
) -> String {
    serde_json::json!({
        "name": name,
        "email": email,
        "password": password,
        "role": role,
        "terms_accepted": terms_accepted,
        "terms_version": "2026-06-18",
        "institution_id": institution_id
    })
    .to_string()
}

fn post_users_request(idempotency_key: Uuid, body: String) -> Request<Body> {
    Request::builder()
        .method("POST")
        .uri("/api/v1/users")
        .header("Content-Type", "application/json")
        .header("Idempotency-Key", idempotency_key.to_string())
        .body(Body::from(body))
        .unwrap()
}

#[tokio::test]
async fn create_user_returns_201() {
    let app = helpers::test_app();
    let idempotency_key = Uuid::new_v4();

    let response = app
        .oneshot(post_users_request(idempotency_key, register_payload()))
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

    let req = |key: Uuid| post_users_request(key, register_payload());

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

    let req = || post_users_request(idempotency_key, register_payload());

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
                .oneshot(post_users_request(key, register_payload()))
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

#[tokio::test]
async fn weak_password_returns_400() {
    let app = helpers::test_app();
    let body = register_payload_with(
        "Grace Hopper",
        "weak@example.com",
        "short",
        "student",
        true,
        None,
    );

    let response = app
        .oneshot(post_users_request(Uuid::new_v4(), body))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn invalid_email_returns_400() {
    let app = helpers::test_app();
    let body = register_payload_with(
        "Grace Hopper",
        "not-an-email",
        "str0ng!passphrase",
        "student",
        true,
        None,
    );

    let response = app
        .oneshot(post_users_request(Uuid::new_v4(), body))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn unknown_role_returns_400() {
    let app = helpers::test_app();
    let body = register_payload_with(
        "Grace Hopper",
        "unknown-role@example.com",
        "str0ng!passphrase",
        "wizard",
        true,
        None,
    );

    let response = app
        .oneshot(post_users_request(Uuid::new_v4(), body))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn institution_required_for_teacher_returns_400() {
    let app = helpers::test_app();
    let body = register_payload_with(
        "Grace Hopper",
        "teacher-no-inst@example.com",
        "str0ng!passphrase",
        "teacher",
        true,
        None,
    );

    let response = app
        .oneshot(post_users_request(Uuid::new_v4(), body))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn terms_not_accepted_returns_400() {
    let app = helpers::test_app();
    let body = register_payload_with(
        "Grace Hopper",
        "terms-no@example.com",
        "str0ng!passphrase",
        "student",
        false,
        None,
    );

    let response = app
        .oneshot(post_users_request(Uuid::new_v4(), body))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn empty_or_too_long_name_returns_400() {
    let app = helpers::test_app();

    let empty_body = register_payload_with(
        "   ",
        "empty-name@example.com",
        "str0ng!passphrase",
        "student",
        true,
        None,
    );
    let empty_response = app
        .clone()
        .oneshot(post_users_request(Uuid::new_v4(), empty_body))
        .await
        .unwrap();
    assert_eq!(empty_response.status(), StatusCode::BAD_REQUEST);

    let long_name = "a".repeat(201);
    let long_body = register_payload_with(
        &long_name,
        "long-name@example.com",
        "str0ng!passphrase",
        "student",
        true,
        None,
    );
    let long_response = app
        .oneshot(post_users_request(Uuid::new_v4(), long_body))
        .await
        .unwrap();
    assert_eq!(long_response.status(), StatusCode::BAD_REQUEST);
}
