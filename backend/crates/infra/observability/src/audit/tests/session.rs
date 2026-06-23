use super::*;

#[tokio::test]
async fn log_session_created_creates_expected_event() {
    let (service, repo) = capturing_service();
    let ctx = ExecutionContext::new(RequestContext::new());
    let user_id = UserId::new();
    let session_id = Uuid::new_v4();

    service
        .log_session_created(&ctx, user_id, session_id, Some("10.0.0.1".to_string()))
        .await
        .unwrap();

    let events = repo.events();
    assert_eq!(events.len(), 1);

    let event = &events[0];
    assert_eq!(event.action, AuditAction::SessionCreated);
    assert_eq!(event.resource_type, ResourceType::Session);
    assert_eq!(event.actor_user_id, Some(user_id));
    assert_eq!(event.resource_id, Some(session_id));
    assert_eq!(event.request_id, Some(ctx.request.request_id.0));
    assert_eq!(event.actor_ip_address, Some("10.0.0.1".to_string()));
    assert!(event.success);
}

#[tokio::test]
async fn log_login_failed_creates_expected_event() {
    let (service, repo) = capturing_service();
    let ctx = ExecutionContext::new(RequestContext::new());

    service
        .log_login_failed(
            &ctx,
            "attacker@example.com",
            Some("192.168.1.1".to_string()),
            "Invalid credentials".to_string(),
        )
        .await
        .unwrap();

    let events = repo.events();
    assert_eq!(events.len(), 1);

    let event = &events[0];
    assert_eq!(event.action, AuditAction::LoginFailed);
    assert_eq!(event.resource_type, ResourceType::User);
    assert!(event.actor_user_id.is_none());
    assert!(event.resource_id.is_none());
    assert_eq!(event.request_id, Some(ctx.request.request_id.0));
    assert_eq!(event.actor_ip_address, Some("192.168.1.1".to_string()));
    assert!(!event.success);
    assert_eq!(event.error_message, Some("Invalid credentials".to_string()));
    assert_eq!(
        event.after_data,
        Some(serde_json::json!({ "attempted_email": "attacker@example.com" }))
    );
}

#[tokio::test]
async fn log_login_failed_omits_ip_when_none() {
    let (service, repo) = capturing_service();
    let ctx = ExecutionContext::new(RequestContext::new());

    service
        .log_login_failed(&ctx, "nobody@example.com", None, "bad password".to_string())
        .await
        .unwrap();

    let events = repo.events();
    assert_eq!(events.len(), 1);
    assert!(events[0].actor_ip_address.is_none());
}

#[tokio::test]
async fn audit_logger_trait_logs_session_created_event() {
    let (service, repo) = capturing_service();
    let ctx = ExecutionContext::new(RequestContext::new());
    let user_id = UserId::new();
    let session_id = Uuid::new_v4().to_string();

    AuditLogger::log_session_created(&service, &ctx, user_id, session_id.clone()).await;

    let events = repo.events();
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].action, AuditAction::SessionCreated);
    assert_eq!(
        events[0].resource_id,
        Some(Uuid::parse_str(&session_id).unwrap())
    );
}
