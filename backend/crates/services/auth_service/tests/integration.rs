//! Integration tests for auth service public interface.

use klynt_domain::contracts::auth::{LoginRequest, RegistrationRequest};
use klynt_domain::UserStatus;

mod support;

#[tokio::test]
async fn full_registration_flow() {
    let (service, _user_repo, email_sender) = support::build_test_service();
    let ctx = support::test_ctx();

    // Register
    let user_id = service
        .register(
            &ctx,
            RegistrationRequest {
                email: "ada@example.com".to_string(),
                password: "Str0ng!Pass#123".to_string(),
                full_name: Some("Ada Lovelace".to_string()),
            },
        )
        .await
        .unwrap();

    // Extract verification token from fake email
    let token = {
        let sent = email_sender.sent.lock().unwrap();
        let (_, _, verification_url) = sent
            .iter()
            .find(|(kind, _, _)| kind == "verification")
            .expect("verification email sent");
        verification_url.split('/').next_back().unwrap().to_string()
    };

    // Verify email
    let verified_user_id = service.verify_email(&ctx, &token).await.unwrap();
    assert_eq!(user_id, verified_user_id);

    // Login
    let login_response = service
        .login(
            &ctx,
            LoginRequest {
                email: "ada@example.com".to_string(),
                password: "Str0ng!Pass#123".to_string(),
                remember_me: None,
            },
        )
        .await
        .unwrap();

    assert!(!login_response.access_token.is_empty());
    assert_eq!(login_response.user.email, "ada@example.com");

    // Logout
    service
        .logout(&ctx, &login_response.access_token)
        .await
        .unwrap();
}

#[tokio::test]
async fn login_fails_for_unknown_user() {
    let (service, _, _) = support::build_test_service();
    let ctx = support::test_ctx();

    let result = service
        .login(
            &ctx,
            LoginRequest {
                email: "nobody@example.com".to_string(),
                password: "Str0ng!Pass#123".to_string(),
                remember_me: None,
            },
        )
        .await;

    assert!(result.is_err());
}

#[tokio::test]
async fn login_fails_for_inactive_user() {
    let (service, user_repo, _) = support::build_test_service();
    let ctx = support::test_ctx();

    let user = support::test_user(
        "inactive@example.com",
        "Str0ng!Pass#123",
        UserStatus::Pending,
    );
    user_repo.insert(user);

    let result = service
        .login(
            &ctx,
            LoginRequest {
                email: "inactive@example.com".to_string(),
                password: "Str0ng!Pass#123".to_string(),
                remember_me: None,
            },
        )
        .await;

    assert!(result.is_err());
}

#[tokio::test]
async fn password_reset_flow() {
    let (service, user_repo, email_sender) = support::build_test_service();
    let ctx = support::test_ctx();

    let user = support::test_user("ada@example.com", "OldPass#123", UserStatus::Active);
    user_repo.insert(user);

    // Request reset
    service
        .request_password_reset(&ctx, "ada@example.com")
        .await
        .unwrap();

    // Extract reset token
    let token = {
        let sent = email_sender.sent.lock().unwrap();
        let (_, _, reset_url) = sent
            .iter()
            .find(|(kind, _, _)| kind == "password_reset")
            .expect("reset email sent");
        reset_url.split('/').next_back().unwrap().to_string()
    };

    // Reset password
    service
        .reset_password(&ctx, &token, "NewStr0ng!Pass#123")
        .await
        .unwrap();

    // Login with new password
    let login_response = service
        .login(
            &ctx,
            LoginRequest {
                email: "ada@example.com".to_string(),
                password: "NewStr0ng!Pass#123".to_string(),
                remember_me: None,
            },
        )
        .await
        .unwrap();

    assert!(!login_response.access_token.is_empty());
}

#[tokio::test]
async fn request_password_reset_returns_ok_for_unknown_email() {
    let (service, _, _) = support::build_test_service();
    let ctx = support::test_ctx();

    let result = service
        .request_password_reset(&ctx, "unknown@example.com")
        .await;

    assert!(result.is_ok());
}
