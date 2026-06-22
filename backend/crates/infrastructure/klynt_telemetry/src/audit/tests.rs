use std::sync::Mutex;

use super::*;
use klynt_base::ctx::RequestContext;
use klynt_base::ports::audit::AuditLogger;

struct CapturingRepo {
    events: Mutex<Vec<AuditEvent>>,
}

impl CapturingRepo {
    fn new() -> Self {
        Self {
            events: Mutex::new(Vec::new()),
        }
    }

    fn events(&self) -> Vec<AuditEvent> {
        self.events.lock().unwrap().clone()
    }
}

#[async_trait::async_trait]
impl AuditEventRepository for CapturingRepo {
    async fn log(&self, _ctx: &ExecutionContext, event: AuditEvent) -> Result<(), DomainError> {
        self.events.lock().unwrap().push(event);
        Ok(())
    }
}

struct ErrorRepo;

#[async_trait::async_trait]
impl AuditEventRepository for ErrorRepo {
    async fn log(&self, _ctx: &ExecutionContext, _event: AuditEvent) -> Result<(), DomainError> {
        Err(DomainError::Internal("audit storage failed".to_string()))
    }
}

fn capturing_service() -> (AuditService, Arc<CapturingRepo>) {
    let repo = Arc::new(CapturingRepo::new());
    let service = AuditService::new(repo.clone());
    (service, repo)
}

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

    AuditLogger::log_profile_updated(&service, &ctx, user_id).await;

    let events = repo.events();
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].action, AuditAction::UserProfileUpdated);
    assert_eq!(events[0].actor_user_id, Some(user_id));
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
