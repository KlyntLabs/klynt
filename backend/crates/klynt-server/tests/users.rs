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
    let app = helpers::test_app().await;
    let idempotency_key = Uuid::new_v4();
    let email = unique_email("create");

    let response = app
        .oneshot(post_users_request(
            idempotency_key,
            register_payload(&email),
        ))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["data"]["name"], "Ada Lovelace");
    assert_eq!(json["data"]["email"], email);
    assert_eq!(json["data"]["role"], "student");
    assert_eq!(json["data"]["status"], "pending_verification");
}

#[tokio::test]
async fn duplicate_email_returns_409() {
    let app = helpers::test_app().await;
    let first_key = Uuid::new_v4();
    let second_key = Uuid::new_v4();
    let email = unique_email("duplicate");

    let req = |key: Uuid| post_users_request(key, register_payload(&email));

    let first = app.clone().oneshot(req(first_key)).await.unwrap();
    assert_eq!(first.status(), StatusCode::CREATED);

    let second = app.clone().oneshot(req(second_key)).await.unwrap();
    assert_eq!(second.status(), StatusCode::CONFLICT);
}

#[tokio::test]
async fn missing_idempotency_key_returns_400() {
    let app = helpers::test_app().await;
    let email = unique_email("missing-idem");

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/users")
                .header("Content-Type", "application/json")
                .body(Body::from(register_payload(&email)))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn idempotency_replay_returns_same_user() {
    let app = helpers::test_app().await;
    let idempotency_key = Uuid::new_v4();
    let email = unique_email("idempotency");

    let req = || post_users_request(idempotency_key, register_payload(&email));

    let first = app.clone().oneshot(req()).await.unwrap();
    let first_body = first.into_body().collect().await.unwrap().to_bytes();
    let first_json: serde_json::Value = serde_json::from_slice(&first_body).unwrap();

    let second = app.clone().oneshot(req()).await.unwrap();
    let second_body = second.into_body().collect().await.unwrap().to_bytes();
    let second_json: serde_json::Value = serde_json::from_slice(&second_body).unwrap();

    assert_eq!(first_json["data"]["id"], second_json["data"]["id"]);
}

#[tokio::test]
async fn concurrent_duplicate_email_creates_only_one_user() {
    let app = helpers::test_app().await;
    let email = unique_email("concurrent");

    let mut handles = vec![];
    for i in 0..10 {
        let app = app.clone();
        let email = email.clone();
        let handle = tokio::spawn(async move {
            let key = Uuid::new_v4();
            let response = app
                .oneshot(post_users_request(key, register_payload(&email)))
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
    let app = helpers::test_app().await;
    let email = unique_email("weak");
    let body = register_payload_with("Grace Hopper", &email, "short", "student", true, None);

    let response = app
        .oneshot(post_users_request(Uuid::new_v4(), body))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn invalid_email_returns_400() {
    let app = helpers::test_app().await;
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
    let app = helpers::test_app().await;
    let email = unique_email("unknown-role");
    let body = register_payload_with(
        "Grace Hopper",
        &email,
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
    let app = helpers::test_app().await;
    let email = unique_email("teacher-no-inst");
    let body = register_payload_with(
        "Grace Hopper",
        &email,
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
    let app = helpers::test_app().await;
    let email = unique_email("terms-no");
    let body = register_payload_with(
        "Grace Hopper",
        &email,
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
    let app = helpers::test_app().await;

    let empty_email = unique_email("empty-name");
    let empty_body = register_payload_with(
        "   ",
        &empty_email,
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

    let long_email = unique_email("long-name");
    let long_name = "a".repeat(201);
    let long_body = register_payload_with(
        &long_name,
        &long_email,
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

fn login_payload(email: &str, password: &str) -> String {
    serde_json::json!({
        "email": email,
        "password": password,
    })
    .to_string()
}

fn post_sessions_request(body: String) -> Request<Body> {
    Request::builder()
        .method("POST")
        .uri("/api/v1/sessions")
        .header("Content-Type", "application/json")
        .body(Body::from(body))
        .unwrap()
}

fn get_me_request(token: &str) -> Request<Body> {
    Request::builder()
        .method("GET")
        .uri("/api/v1/users/me")
        .header("Authorization", format!("Bearer {token}"))
        .body(Body::empty())
        .unwrap()
}

#[tokio::test]
async fn get_me_without_token_returns_401() {
    let app = helpers::test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/v1/users/me")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

fn post_auth_register_request(body: String) -> Request<Body> {
    Request::builder()
        .method("POST")
        .uri("/api/v1/auth/register")
        .header("Content-Type", "application/json")
        .body(Body::from(body))
        .unwrap()
}

fn post_auth_verify_email_request(token: &str) -> Request<Body> {
    Request::builder()
        .method("POST")
        .uri("/api/v1/auth/verify-email")
        .header("Content-Type", "application/json")
        .body(Body::from(
            serde_json::json!({ "token": token }).to_string(),
        ))
        .unwrap()
}

#[tokio::test]
async fn login_and_get_me_round_trip_works() {
    let (app, email_service) = helpers::test_app_with_email_service().await;
    let email = unique_email("ada-auth");

    // Register via the auth flow, which sends a verification email.
    let register_response = app
        .clone()
        .oneshot(post_auth_register_request(register_payload_with(
            "Ada Lovelace",
            &email,
            "str0ng!passphrase",
            "student",
            true,
            None,
        )))
        .await
        .unwrap();
    assert_eq!(register_response.status(), StatusCode::CREATED);

    // Extract the verification token from the mock email service.
    let verifications = email_service.recorded_verifications();
    let (_, verification_token) = verifications
        .iter()
        .find(|(e, _)| e == &email)
        .expect("verification email was sent");

    // Verify the email so the user becomes active.
    let verify_response = app
        .clone()
        .oneshot(post_auth_verify_email_request(verification_token))
        .await
        .unwrap();
    assert_eq!(verify_response.status(), StatusCode::OK);

    // Login
    let login_response = app
        .clone()
        .oneshot(post_sessions_request(login_payload(
            &email,
            "str0ng!passphrase",
        )))
        .await
        .unwrap();
    assert_eq!(login_response.status(), StatusCode::OK);

    let login_body = login_response
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let login_json: serde_json::Value = serde_json::from_slice(&login_body).unwrap();
    let token = login_json["data"]["token"].as_str().unwrap();
    assert_eq!(login_json["data"]["user"]["email"], email);

    // Get me
    let me_response = app.oneshot(get_me_request(token)).await.unwrap();
    assert_eq!(me_response.status(), StatusCode::OK);

    let me_body = me_response.into_body().collect().await.unwrap().to_bytes();
    let me_json: serde_json::Value = serde_json::from_slice(&me_body).unwrap();
    assert_eq!(me_json["data"]["email"], email);
}

#[tokio::test]
async fn login_with_unverified_email_returns_401() {
    let app = helpers::test_app().await;
    let email = unique_email("ada-unverified");

    let register_response = app
        .clone()
        .oneshot(post_users_request(
            Uuid::new_v4(),
            register_payload_with(
                "Ada Lovelace",
                &email,
                "str0ng!passphrase",
                "student",
                true,
                None,
            ),
        ))
        .await
        .unwrap();
    assert_eq!(register_response.status(), StatusCode::CREATED);

    let login_response = app
        .oneshot(post_sessions_request(login_payload(
            &email,
            "str0ng!passphrase",
        )))
        .await
        .unwrap();
    assert_eq!(login_response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn login_with_wrong_password_returns_401() {
    let app = helpers::test_app().await;
    let email = unique_email("ada-wrong");

    let register_response = app
        .clone()
        .oneshot(post_users_request(
            Uuid::new_v4(),
            register_payload_with(
                "Ada Lovelace",
                &email,
                "str0ng!passphrase",
                "student",
                true,
                None,
            ),
        ))
        .await
        .unwrap();
    assert_eq!(register_response.status(), StatusCode::CREATED);

    let login_response = app
        .oneshot(post_sessions_request(login_payload(
            &email,
            "wrong-password",
        )))
        .await
        .unwrap();
    assert_eq!(login_response.status(), StatusCode::UNAUTHORIZED);
}
