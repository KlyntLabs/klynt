//! Integration tests for auth service public interface.

use base::ports::repository::UserRepository;
use chrono::{Duration, Utc};
use domain::contracts::auth::{LoginRequest, RegistrationRequest};
use domain::{UserId, UserRole, UserStatus};
use std::sync::Arc;

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
                username: "ada".to_string(),
                password: "Str0ng!Pass#123".to_string(),
                full_name: Some("Ada Lovelace".to_string()),
                role: UserRole::Student,
                institution_id: None,
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
async fn registration_persists_institution_id_for_instructor() {
    let (service, user_repo, _) = support::build_test_service();
    let ctx = support::test_ctx();
    let institution_id = UserId::new().inner();

    let user_id = service
        .register(
            &ctx,
            RegistrationRequest {
                email: "teacher@example.com".to_string(),
                username: "teacher".to_string(),
                password: "Str0ng!Pass#123".to_string(),
                full_name: Some("Teacher".to_string()),
                role: UserRole::Instructor,
                institution_id: Some(institution_id),
            },
        )
        .await
        .unwrap();

    let user = user_repo.find_by_id(&ctx, user_id).await.unwrap().unwrap();
    assert_eq!(user.role, UserRole::Instructor);
    assert_eq!(user.institution_id, Some(institution_id));
}

#[tokio::test]
async fn registration_ignores_institution_id_for_student() {
    let (service, user_repo, _) = support::build_test_service();
    let ctx = support::test_ctx();
    let institution_id = UserId::new().inner();

    let user_id = service
        .register(
            &ctx,
            RegistrationRequest {
                email: "student@example.com".to_string(),
                username: "student".to_string(),
                password: "Str0ng!Pass#123".to_string(),
                full_name: Some("Student".to_string()),
                role: UserRole::Student,
                institution_id: Some(institution_id),
            },
        )
        .await
        .unwrap();

    let user = user_repo.find_by_id(&ctx, user_id).await.unwrap().unwrap();
    assert_eq!(user.role, UserRole::Student);
    assert_eq!(user.institution_id, None);
}

#[tokio::test]
async fn registration_rejects_duplicate_username() {
    let (service, _user_repo, _) = support::build_test_service();
    let ctx = support::test_ctx();

    service
        .register(
            &ctx,
            RegistrationRequest {
                email: "first@example.com".to_string(),
                username: "taken".to_string(),
                password: "Str0ng!Pass#123".to_string(),
                full_name: Some("First".to_string()),
                role: UserRole::Student,
                institution_id: None,
            },
        )
        .await
        .unwrap();

    let result = service
        .register(
            &ctx,
            RegistrationRequest {
                email: "second@example.com".to_string(),
                username: "taken".to_string(),
                password: "Str0ng!Pass#123".to_string(),
                full_name: Some("Second".to_string()),
                role: UserRole::Student,
                institution_id: None,
            },
        )
        .await;

    assert!(result.is_err());
}

#[tokio::test]
async fn registration_rejects_instructor_without_institution_id() {
    let (service, user_repo, _) = support::build_test_service();
    let ctx = support::test_ctx();

    let result = service
        .register(
            &ctx,
            RegistrationRequest {
                email: "teacher@example.com".to_string(),
                username: "teacher".to_string(),
                password: "Str0ng!Pass#123".to_string(),
                full_name: Some("Teacher".to_string()),
                role: UserRole::Instructor,
                institution_id: None,
            },
        )
        .await;

    assert!(result.is_err());
    assert!(user_repo
        .find_by_email(&ctx, &domain::Email::parse("teacher@example.com").unwrap())
        .await
        .unwrap()
        .is_none());
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

#[tokio::test]
async fn login_returns_distinct_access_and_refresh_tokens() {
    let (service, user_repo, _) = support::build_test_service();
    let ctx = support::test_ctx();

    let user = support::test_user("ada@example.com", "Str0ng!Pass#123", UserStatus::Active);
    user_repo.insert(user);

    let response = service
        .login(
            &ctx,
            LoginRequest {
                email: "ada@example.com".to_string(),
                password: "Str0ng!Pass#123".to_string(),
                remember_me: Some(false),
            },
        )
        .await
        .unwrap();

    assert!(!response.access_token.is_empty());
    assert!(!response.refresh_token.is_empty());
    assert_ne!(response.access_token, response.refresh_token);
}

#[tokio::test]
async fn login_without_remember_me_uses_default_session_lifetime() {
    let (service, user_repo, _, clock) = support::build_test_service_with_clock();
    let ctx = support::test_ctx();
    let now = Utc::now();
    clock.freeze_at(now);

    let user = support::test_user("ada@example.com", "Str0ng!Pass#123", UserStatus::Active);
    user_repo.insert(user);

    let response = service
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

    let expected = now + Duration::seconds(86400);
    assert_eq!(response.expires_at, expected);
}

#[tokio::test]
async fn login_remember_me_extends_access_session_lifetime() {
    let (service, user_repo, _, clock) = support::build_test_service_with_clock();
    let ctx = support::test_ctx();
    let now = Utc::now();
    clock.freeze_at(now);

    let user = support::test_user("ada@example.com", "Str0ng!Pass#123", UserStatus::Active);
    user_repo.insert(user);

    let short_lived = service
        .login(
            &ctx,
            LoginRequest {
                email: "ada@example.com".to_string(),
                password: "Str0ng!Pass#123".to_string(),
                remember_me: Some(false),
            },
        )
        .await
        .unwrap();

    let long_lived = service
        .login(
            &ctx,
            LoginRequest {
                email: "ada@example.com".to_string(),
                password: "Str0ng!Pass#123".to_string(),
                remember_me: Some(true),
            },
        )
        .await
        .unwrap();

    let expected_short = now + Duration::seconds(86400);
    let expected_long = now + Duration::seconds(30 * 24 * 3600);

    assert_eq!(short_lived.expires_at, expected_short);
    assert_eq!(long_lived.expires_at, expected_long);
}

#[tokio::test]
async fn login_revokes_access_token_when_refresh_creation_fails() {
    let failing_store = Arc::new(support::FailingSessionStore::new(1));
    let (service, user_repo, _, _) =
        support::build_test_service_with_session_store(failing_store.clone());
    let ctx = support::test_ctx();

    let user = support::test_user("ada@example.com", "Str0ng!Pass#123", UserStatus::Active);
    user_repo.insert(user);

    let result = service
        .login(
            &ctx,
            LoginRequest {
                email: "ada@example.com".to_string(),
                password: "Str0ng!Pass#123".to_string(),
                remember_me: Some(false),
            },
        )
        .await;

    assert!(result.is_err());
    // The access token created before the refresh failure should have been
    // revoked, so no sessions remain in the store.
    assert_eq!(failing_store.session_count(), 0);
}
