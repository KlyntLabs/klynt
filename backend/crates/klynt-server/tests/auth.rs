use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use tower::ServiceExt;

mod helpers;

fn register_payload() -> String {
    serde_json::json!({
        "name": "Ada Lovelace",
        "email": "ada@example.com",
        "password": "str0ng!passphrase",
        "terms_accepted": true,
        "terms_version": "2026-06-18"
    })
    .to_string()
}

fn register_payload_with(name: &str, email: &str, password: &str, terms_accepted: bool) -> String {
    serde_json::json!({
        "name": name,
        "email": email,
        "password": password,
        "terms_accepted": terms_accepted,
        "terms_version": "2026-06-18"
    })
    .to_string()
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
        .body(Body::from(serde_json::json!({"token": token}).to_string()))
        .unwrap()
}

fn post_auth_request_password_reset_request(email: &str) -> Request<Body> {
    Request::builder()
        .method("POST")
        .uri("/api/v1/auth/request-password-reset")
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::json!({"email": email}).to_string()))
        .unwrap()
}

fn post_auth_reset_password_request(token: &str, new_password: &str) -> Request<Body> {
    Request::builder()
        .method("POST")
        .uri("/api/v1/auth/reset-password")
        .header("Content-Type", "application/json")
        .body(Body::from(
            serde_json::json!({"token": token, "new_password": new_password}).to_string(),
        ))
        .unwrap()
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

#[tokio::test]
async fn register_returns_201() {
    let app = helpers::test_app();

    let response = app
        .oneshot(post_auth_register_request(register_payload()))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(json["user_id"]
        .as_str()
        .unwrap()
        .parse::<uuid::Uuid>()
        .is_ok());
    assert_eq!(
        json["message"],
        "Registration successful. Please check your email to verify your account."
    );
}

#[tokio::test]
async fn register_with_invalid_email_returns_400() {
    let app = helpers::test_app();
    let body = register_payload_with("Ada Lovelace", "not-an-email", "str0ng!passphrase", true);

    let response = app.oneshot(post_auth_register_request(body)).await.unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn register_with_weak_password_returns_400() {
    let app = helpers::test_app();
    let body = register_payload_with("Ada Lovelace", "weak@example.com", "short", true);

    let response = app.oneshot(post_auth_register_request(body)).await.unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn register_with_unaccepted_terms_returns_400() {
    let app = helpers::test_app();
    let body = register_payload_with(
        "Ada Lovelace",
        "terms@example.com",
        "str0ng!passphrase",
        false,
    );

    let response = app.oneshot(post_auth_register_request(body)).await.unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn register_duplicate_email_returns_409() {
    let app = helpers::test_app();

    let first = app
        .clone()
        .oneshot(post_auth_register_request(register_payload()))
        .await
        .unwrap();
    assert_eq!(first.status(), StatusCode::CREATED);

    let second = app
        .clone()
        .oneshot(post_auth_register_request(register_payload()))
        .await
        .unwrap();
    assert_eq!(second.status(), StatusCode::CONFLICT);
}

#[tokio::test]
async fn verify_email_returns_200() {
    let (app, email_service) = helpers::test_app_with_email_service();

    let register_response = app
        .clone()
        .oneshot(post_auth_register_request(register_payload()))
        .await
        .unwrap();
    assert_eq!(register_response.status(), StatusCode::CREATED);

    let recorded = email_service.recorded_verifications();
    let (_email, token) = recorded.first().expect("verification email was recorded");

    let verify_response = app
        .oneshot(post_auth_verify_email_request(token))
        .await
        .unwrap();
    assert_eq!(verify_response.status(), StatusCode::OK);

    let body = verify_response
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(
        json["message"],
        "Email verified successfully. You can now log in."
    );
}

#[tokio::test]
async fn verify_email_with_invalid_token_returns_400() {
    let app = helpers::test_app();

    let response = app
        .oneshot(post_auth_verify_email_request("not-a-real-token"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn request_password_reset_returns_200() {
    let (app, email_service) = helpers::test_app_with_email_service();

    let register_response = app
        .clone()
        .oneshot(post_auth_register_request(register_payload()))
        .await
        .unwrap();
    assert_eq!(register_response.status(), StatusCode::CREATED);

    let response = app
        .clone()
        .oneshot(post_auth_request_password_reset_request("ada@example.com"))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(
        json["message"],
        "If an account exists with this email, a password reset link has been sent."
    );

    let recorded = email_service.recorded_password_resets();
    assert_eq!(recorded.len(), 1);
    assert_eq!(recorded[0].0, "ada@example.com");
}

#[tokio::test]
async fn request_password_reset_with_invalid_email_returns_400() {
    let app = helpers::test_app();

    let response = app
        .oneshot(post_auth_request_password_reset_request("not-an-email"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn request_password_reset_for_unknown_email_returns_200() {
    let app = helpers::test_app();

    let response = app
        .oneshot(post_auth_request_password_reset_request(
            "missing@example.com",
        ))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(
        json["message"],
        "If an account exists with this email, a password reset link has been sent."
    );
}

#[tokio::test]
async fn request_password_reset_swallows_email_service_error() {
    let app = helpers::test_app_with_failing_password_reset_email_service();

    let register_response = app
        .clone()
        .oneshot(post_auth_register_request(register_payload()))
        .await
        .unwrap();
    assert_eq!(register_response.status(), StatusCode::CREATED);

    let response = app
        .clone()
        .oneshot(post_auth_request_password_reset_request("ada@example.com"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn reset_password_with_valid_token_returns_200() {
    let (app, email_service) = helpers::test_app_with_email_service();

    let register_response = app
        .clone()
        .oneshot(post_auth_register_request(register_payload()))
        .await
        .unwrap();
    assert_eq!(register_response.status(), StatusCode::CREATED);

    let request_response = app
        .clone()
        .oneshot(post_auth_request_password_reset_request("ada@example.com"))
        .await
        .unwrap();
    assert_eq!(request_response.status(), StatusCode::OK);

    let recorded = email_service.recorded_password_resets();
    let (_email, token) = recorded.first().expect("password reset email was recorded");

    let reset_response = app
        .clone()
        .oneshot(post_auth_reset_password_request(
            token,
            "new-str0ng!passphrase",
        ))
        .await
        .unwrap();
    assert_eq!(reset_response.status(), StatusCode::OK);

    let body = reset_response
        .into_body()
        .collect()
        .await
        .unwrap()
        .to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(
        json["message"],
        "Password reset successfully. You can now log in with your new password."
    );

    // Verify the new password works end-to-end.
    let login_response = app
        .clone()
        .oneshot(post_sessions_request(login_payload(
            "ada@example.com",
            "new-str0ng!passphrase",
        )))
        .await
        .unwrap();
    assert_eq!(login_response.status(), StatusCode::OK);
}

#[tokio::test]
async fn reset_password_with_weak_password_returns_400() {
    let (app, email_service) = helpers::test_app_with_email_service();

    let register_response = app
        .clone()
        .oneshot(post_auth_register_request(register_payload()))
        .await
        .unwrap();
    assert_eq!(register_response.status(), StatusCode::CREATED);

    let request_response = app
        .clone()
        .oneshot(post_auth_request_password_reset_request("ada@example.com"))
        .await
        .unwrap();
    assert_eq!(request_response.status(), StatusCode::OK);

    let recorded = email_service.recorded_password_resets();
    let (_email, token) = recorded.first().expect("password reset email was recorded");

    let reset_response = app
        .clone()
        .oneshot(post_auth_reset_password_request(token, "short"))
        .await
        .unwrap();
    assert_eq!(reset_response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn reset_password_with_invalid_token_returns_400() {
    let app = helpers::test_app();

    let response = app
        .oneshot(post_auth_reset_password_request(
            "not-a-real-token",
            "new-str0ng!passphrase",
        ))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}
