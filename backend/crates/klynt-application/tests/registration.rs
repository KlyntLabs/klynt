mod support;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::{DomainError, TokenError};
use klynt_domain::models::{Email, UserStatus};
use uuid::Uuid;

use support::auth::auth_service;

#[tokio::test]
async fn register_creates_pending_user_and_sends_email() {
    let (service, user_service, email_service) = auth_service();
    let ctx = Ctx::guest(Uuid::new_v4());
    let email = Email::parse("register@example.com").unwrap();

    let user_id = service
        .register(
            &ctx,
            "Ada Lovelace".to_string(),
            &email,
            "Str0ng!passphrase",
            true,
            "1.0".to_string(),
        )
        .await
        .unwrap();

    let user = user_service.find_by_id(&ctx, user_id).await.unwrap();
    assert_eq!(user.email.as_str(), "register@example.com");
    assert_eq!(user.status, UserStatus::PendingVerification);

    let sent = email_service.sent.lock().unwrap();
    assert_eq!(sent.len(), 1);
    assert_eq!(sent[0].recipient.as_str(), "register@example.com");
    assert!(!sent[0].body_text.is_empty());
}

#[tokio::test]
async fn verify_email_activates_user() {
    let (service, user_service, email_service) = auth_service();
    let ctx = Ctx::guest(Uuid::new_v4());
    let email = Email::parse("verify@example.com").unwrap();

    let user_id = service
        .register(
            &ctx,
            "Ada Lovelace".to_string(),
            &email,
            "Str0ng!passphrase",
            true,
            "1.0".to_string(),
        )
        .await
        .unwrap();

    let plaintext_token = email_service.first_token();

    let verified_id = service.verify_email(&ctx, &plaintext_token).await.unwrap();
    assert_eq!(verified_id, user_id);

    let user = user_service.find_by_id(&ctx, user_id).await.unwrap();
    assert_eq!(user.status, UserStatus::Active);
    assert!(user.email_verified_at.is_some());
}

#[tokio::test]
async fn verify_email_with_unknown_token_fails() {
    let (service, _, _) = auth_service();
    let ctx = Ctx::guest(Uuid::new_v4());

    let result = service.verify_email(&ctx, "not-a-token").await;

    assert!(
        matches!(result, Err(DomainError::InvalidToken(TokenError::Invalid))),
        "expected InvalidToken error, got {result:?}"
    );
}
