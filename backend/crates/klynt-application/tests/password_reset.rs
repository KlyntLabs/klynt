mod support;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::{DomainError, TokenError};
use klynt_domain::models::Email;
use uuid::Uuid;

use support::auth::auth_service;

#[tokio::test]
async fn request_password_reset_sends_email_for_existing_user() {
    let (service, user_service, email_service) = auth_service();
    let ctx = Ctx::guest(Uuid::new_v4());
    let email = Email::parse("reset-existing@example.com").unwrap();

    user_service
        .create_pending_user(
            &ctx,
            "Ada Lovelace".to_string(),
            &email,
            "Str0ng!passphrase",
            true,
            "1.0".to_string(),
        )
        .await
        .unwrap();

    service.request_password_reset(&ctx, &email).await.unwrap();

    let sent = email_service.sent.lock().unwrap();
    assert_eq!(sent.len(), 1);
    assert_eq!(sent[0].recipient.as_str(), "reset-existing@example.com");
    assert!(!sent[0].body_text.is_empty());
}

#[tokio::test]
async fn request_password_reset_returns_ok_for_unknown_user() {
    let (service, _, email_service) = auth_service();
    let ctx = Ctx::guest(Uuid::new_v4());
    let email = Email::parse("reset-unknown@example.com").unwrap();

    let result = service.request_password_reset(&ctx, &email).await;
    assert!(result.is_ok());

    let sent = email_service.sent.lock().unwrap();
    assert!(sent.is_empty());
}

#[tokio::test]
async fn reset_password_updates_password() {
    let (service, user_service, email_service) = auth_service();
    let ctx = Ctx::guest(Uuid::new_v4());
    let email = Email::parse("reset-update@example.com").unwrap();

    let user_id = user_service
        .create_pending_user(
            &ctx,
            "Ada Lovelace".to_string(),
            &email,
            "Str0ng!passphrase",
            true,
            "1.0".to_string(),
        )
        .await
        .unwrap();

    service.request_password_reset(&ctx, &email).await.unwrap();

    let plaintext_token = email_service.first_token();

    service
        .reset_password(&ctx, &plaintext_token, "N3w!longer-pass")
        .await
        .unwrap();

    // Simulate the email-verification step so the user can authenticate.
    user_service.activate_user(&ctx, user_id).await.unwrap();

    let auth = user_service
        .authenticate(&ctx, &email, "N3w!longer-pass")
        .await;
    assert!(auth.is_ok());

    let old_auth = user_service
        .authenticate(&ctx, &email, "Str0ng!passphrase")
        .await;
    assert!(old_auth.is_err());
}

#[tokio::test]
async fn reset_password_with_weak_password_fails() {
    let (service, user_service, email_service) = auth_service();
    let ctx = Ctx::guest(Uuid::new_v4());
    let email = Email::parse("reset-weak@example.com").unwrap();

    user_service
        .create_pending_user(
            &ctx,
            "Ada Lovelace".to_string(),
            &email,
            "Str0ng!passphrase",
            true,
            "1.0".to_string(),
        )
        .await
        .unwrap();

    service.request_password_reset(&ctx, &email).await.unwrap();

    let plaintext_token = email_service.first_token();

    let result = service
        .reset_password(&ctx, &plaintext_token, "short")
        .await;
    assert!(matches!(result, Err(DomainError::PasswordPolicy(_))));
}

#[tokio::test]
async fn reset_password_with_unknown_token_fails() {
    let (service, _, _) = auth_service();
    let ctx = Ctx::guest(Uuid::new_v4());

    let result = service
        .reset_password(&ctx, "not-a-token", "N3w!longer-pass")
        .await;

    assert!(
        matches!(result, Err(DomainError::InvalidToken(TokenError::Invalid))),
        "expected InvalidToken error, got {result:?}"
    );
}

#[tokio::test]
async fn reset_password_with_reused_token_fails() {
    let (service, user_service, email_service) = auth_service();
    let ctx = Ctx::guest(Uuid::new_v4());
    let email = Email::parse("reset-reuse@example.com").unwrap();

    user_service
        .create_pending_user(
            &ctx,
            "Ada Lovelace".to_string(),
            &email,
            "Str0ng!passphrase",
            true,
            "1.0".to_string(),
        )
        .await
        .unwrap();

    service.request_password_reset(&ctx, &email).await.unwrap();

    let plaintext_token = email_service.first_token();

    service
        .reset_password(&ctx, &plaintext_token, "N3w!longer-pass")
        .await
        .unwrap();

    let result = service
        .reset_password(&ctx, &plaintext_token, "Another!l0ng-pass")
        .await;

    assert!(
        matches!(result, Err(DomainError::InvalidToken(TokenError::Invalid))),
        "expected InvalidToken error, got {result:?}"
    );
}
