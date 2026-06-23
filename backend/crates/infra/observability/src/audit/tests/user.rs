use super::*;

#[tokio::test]
async fn log_user_registered_creates_expected_event() {
    let (service, repo) = capturing_service();
    let ctx = ExecutionContext::new(RequestContext::new());
    let user_id = UserId::new();

    service
        .log_user_registered(&ctx, user_id, Some("127.0.0.1".to_string()))
        .await
        .unwrap();

    let events = repo.events();
    assert_eq!(events.len(), 1);

    let event = &events[0];
    assert_eq!(event.action, AuditAction::UserRegistered);
    assert_eq!(event.resource_type, ResourceType::User);
    assert_eq!(event.actor_user_id, Some(user_id));
    assert_eq!(event.resource_id, Some(user_id.inner()));
    assert_eq!(event.request_id, Some(ctx.request.request_id.0));
    assert_eq!(event.actor_ip_address, Some("127.0.0.1".to_string()));
    assert!(event.success);
}

#[tokio::test]
async fn log_user_registered_omits_ip_when_none() {
    let (service, repo) = capturing_service();
    let ctx = ExecutionContext::new(RequestContext::new());
    let user_id = UserId::new();

    service
        .log_user_registered(&ctx, user_id, None)
        .await
        .unwrap();

    let events = repo.events();
    assert_eq!(events.len(), 1);
    assert!(events[0].actor_ip_address.is_none());
}

#[tokio::test]
async fn log_email_verified_creates_expected_event() {
    let (service, repo) = capturing_service();
    let ctx = ExecutionContext::new(RequestContext::new());
    let user_id = UserId::new();

    service.log_email_verified(&ctx, user_id).await.unwrap();

    let events = repo.events();
    assert_eq!(events.len(), 1);

    let event = &events[0];
    assert_eq!(event.action, AuditAction::UserEmailVerified);
    assert_eq!(event.resource_type, ResourceType::User);
    assert_eq!(event.actor_user_id, Some(user_id));
    assert_eq!(event.resource_id, Some(user_id.inner()));
    assert_eq!(event.request_id, Some(ctx.request.request_id.0));
    assert!(event.success);
}

#[tokio::test]
async fn log_password_reset_creates_expected_event() {
    let (service, repo) = capturing_service();
    let ctx = ExecutionContext::new(RequestContext::new());
    let user_id = UserId::new();

    service.log_password_reset(&ctx, user_id).await.unwrap();

    let events = repo.events();
    assert_eq!(events.len(), 1);

    let event = &events[0];
    assert_eq!(event.action, AuditAction::UserPasswordReset);
    assert_eq!(event.resource_type, ResourceType::User);
    assert_eq!(event.actor_user_id, Some(user_id));
    assert_eq!(event.resource_id, Some(user_id.inner()));
    assert_eq!(event.request_id, Some(ctx.request.request_id.0));
    assert!(event.success);
}

#[tokio::test]
async fn repo_error_is_propagated() {
    let service = AuditService::new(Arc::new(ErrorRepo));
    let ctx = ExecutionContext::new(RequestContext::new());
    let user_id = UserId::new();

    let result = service.log_user_registered(&ctx, user_id, None).await;

    assert!(result.is_err());
}

#[tokio::test]
async fn try_log_swallows_repo_error() {
    let service = AuditService::new(Arc::new(ErrorRepo));
    let ctx = ExecutionContext::new(RequestContext::new());
    let user_id = UserId::new();

    // Should NOT return an error even though ErrorRepo always fails.
    service
        .try_log(
            &ctx,
            "test",
            service.log_user_registered(&ctx, user_id, None),
        )
        .await;
}

#[tokio::test]
async fn audit_logger_trait_logs_profile_updated_event() {
    let (service, repo) = capturing_service();
    let ctx = ExecutionContext::new(RequestContext::new());
    let user_id = UserId::new();
    let before = ProfileUpdateSnapshot {
        full_name_changed: false,
    };
    let after = ProfileUpdateSnapshot {
        full_name_changed: true,
    };

    AuditLogger::log_profile_updated(&service, &ctx, user_id, before.clone(), after.clone()).await;

    let events = repo.events();
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].action, AuditAction::UserProfileUpdated);
    assert_eq!(events[0].actor_user_id, Some(user_id));
    assert_eq!(
        events[0].before_data,
        Some(serde_json::json!({ "full_name_changed": false }))
    );
    assert_eq!(
        events[0].after_data,
        Some(serde_json::json!({ "full_name_changed": true }))
    );
}

#[tokio::test]
async fn audit_logger_trait_logs_password_changed_event() {
    let (service, repo) = capturing_service();
    let ctx = ExecutionContext::new(RequestContext::new());
    let user_id = UserId::new();
    let before = PasswordChangeSnapshot { changed: false };
    let after = PasswordChangeSnapshot { changed: true };

    AuditLogger::log_password_changed(&service, &ctx, user_id, before.clone(), after.clone()).await;

    let events = repo.events();
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].action, AuditAction::UserPasswordChanged);
    assert_eq!(events[0].actor_user_id, Some(user_id));
    assert_eq!(
        events[0].before_data,
        Some(serde_json::json!({ "changed": false }))
    );
    assert_eq!(
        events[0].after_data,
        Some(serde_json::json!({ "changed": true }))
    );
}
