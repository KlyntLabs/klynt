mod support;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::{Email, UserStatus};
use uuid::Uuid;

use support::{sample_request, user_service};

#[tokio::test]
async fn create_user_and_replays_idempotent_request() {
    let service = user_service();
    let key = Uuid::new_v4();
    let ctx = Ctx::guest(Uuid::new_v4());
    let req = sample_request();
    let email = req.email.clone();

    let first = service.create_user(&ctx, key, req.clone()).await.unwrap();
    assert_eq!(first.email, email);

    let second = service.create_user(&ctx, key, req).await.unwrap();
    assert_eq!(second.id, first.id);
}

#[tokio::test]
async fn create_pending_user_returns_user_id() {
    let service = user_service();
    let ctx = Ctx::guest(Uuid::new_v4());
    let email = Email::parse("pending@example.com").unwrap();

    let user_id = service
        .create_pending_user(
            &ctx,
            "Ada Lovelace".to_string(),
            &email,
            "str0ng!passphrase",
            true,
            "1.0".to_string(),
        )
        .await
        .unwrap();

    let user = service.find_by_id(&ctx, user_id).await.unwrap();
    assert_eq!(user.status, UserStatus::PendingVerification);
    assert!(user.email_verified_at.is_none());
}

#[tokio::test]
async fn create_pending_user_rejects_weak_password() {
    let service = user_service();
    let ctx = Ctx::guest(Uuid::new_v4());
    let email = Email::parse("weak@example.com").unwrap();

    let result = service
        .create_pending_user(
            &ctx,
            "Ada".to_string(),
            &email,
            "short",
            true,
            "1.0".to_string(),
        )
        .await;

    assert!(matches!(result, Err(DomainError::WeakPassword(_))));
}

#[tokio::test]
async fn create_pending_user_rejects_unaccepted_terms() {
    let service = user_service();
    let ctx = Ctx::guest(Uuid::new_v4());
    let email = Email::parse("terms@example.com").unwrap();

    let result = service
        .create_pending_user(
            &ctx,
            "Ada".to_string(),
            &email,
            "str0ng!passphrase",
            false,
            "1.0".to_string(),
        )
        .await;

    assert!(matches!(result, Err(DomainError::TermsNotAccepted)));
}

#[tokio::test]
async fn activate_user_verifies_email() {
    let service = user_service();
    let ctx = Ctx::guest(Uuid::new_v4());
    let email = Email::parse("activate@example.com").unwrap();

    let user_id = service
        .create_pending_user(
            &ctx,
            "Ada Lovelace".to_string(),
            &email,
            "str0ng!passphrase",
            true,
            "1.0".to_string(),
        )
        .await
        .unwrap();

    service.activate_user(&ctx, user_id).await.unwrap();

    let user = service.find_by_id(&ctx, user_id).await.unwrap();
    assert_eq!(user.status, UserStatus::Active);
    assert!(user.email_verified_at.is_some());
}

#[tokio::test]
async fn update_password_changes_authentication() {
    let service = user_service();
    let ctx = Ctx::guest(Uuid::new_v4());
    let email = Email::parse("update-password@example.com").unwrap();

    let user_id = service
        .create_pending_user(
            &ctx,
            "Ada Lovelace".to_string(),
            &email,
            "str0ng!passphrase",
            true,
            "1.0".to_string(),
        )
        .await
        .unwrap();

    service
        .update_password(&ctx, user_id, "n3w!longer-pass")
        .await
        .unwrap();

    // Simulate email verification so the user can authenticate.
    service.activate_user(&ctx, user_id).await.unwrap();

    let auth = service.authenticate(&ctx, &email, "n3w!longer-pass").await;
    assert!(auth.is_ok());

    let old_auth = service
        .authenticate(&ctx, &email, "str0ng!passphrase")
        .await;
    assert!(old_auth.is_err());
}

#[tokio::test]
async fn update_password_rejects_weak_password() {
    let service = user_service();
    let ctx = Ctx::guest(Uuid::new_v4());
    let email = Email::parse("update-password-weak@example.com").unwrap();

    let user_id = service
        .create_pending_user(
            &ctx,
            "Ada Lovelace".to_string(),
            &email,
            "str0ng!passphrase",
            true,
            "1.0".to_string(),
        )
        .await
        .unwrap();

    let result = service.update_password(&ctx, user_id, "short").await;
    assert!(matches!(result, Err(DomainError::WeakPassword(_))));
}
