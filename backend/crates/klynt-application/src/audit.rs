use std::sync::Arc;
use uuid::Uuid;

use klynt_domain::audit::{AuditAction, AuditEvent, ResourceType};
use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::UserId;
use klynt_domain::repositories::AuditEventRepository;

/// Audit logging service.
///
/// Logs all security-relevant mutations for compliance and incident response.
pub struct AuditService {
    repo: Arc<dyn AuditEventRepository>,
}

impl AuditService {
    pub fn new(repo: Arc<dyn AuditEventRepository>) -> Self {
        Self { repo }
    }

    /// Log user registration.
    pub async fn log_user_registered(
        &self,
        ctx: &Ctx,
        user_id: UserId,
        ip: Option<String>,
    ) -> Result<(), DomainError> {
        let event = AuditEvent::new(AuditAction::UserRegistered, ResourceType::User)
            .with_actor(user_id)
            .with_resource(user_id.0)
            .with_request_id(ctx.request_id);

        let event = if let Some(ip) = ip {
            event.with_ip(ip)
        } else {
            event
        };

        self.repo.log(ctx, event).await
    }

    /// Log email verification.
    pub async fn log_email_verified(&self, ctx: &Ctx, user_id: UserId) -> Result<(), DomainError> {
        let event = AuditEvent::new(AuditAction::UserEmailVerified, ResourceType::User)
            .with_actor(user_id)
            .with_resource(user_id.0)
            .with_request_id(ctx.request_id);

        self.repo.log(ctx, event).await
    }

    /// Log session creation.
    pub async fn log_session_created(
        &self,
        ctx: &Ctx,
        user_id: UserId,
        session_id: Uuid,
        ip: Option<String>,
    ) -> Result<(), DomainError> {
        let event = AuditEvent::new(AuditAction::SessionCreated, ResourceType::Session)
            .with_actor(user_id)
            .with_resource(session_id)
            .with_request_id(ctx.request_id);

        let event = if let Some(ip) = ip {
            event.with_ip(ip)
        } else {
            event
        };

        self.repo.log(ctx, event).await
    }

    /// Log password reset.
    pub async fn log_password_reset(&self, ctx: &Ctx, user_id: UserId) -> Result<(), DomainError> {
        let event = AuditEvent::new(AuditAction::UserPasswordReset, ResourceType::User)
            .with_actor(user_id)
            .with_resource(user_id.0)
            .with_request_id(ctx.request_id);

        self.repo.log(ctx, event).await
    }

    /// Log failed authentication attempt.
    pub async fn log_login_failed(
        &self,
        ctx: &Ctx,
        email: &str,
        ip: Option<String>,
        error: String,
    ) -> Result<(), DomainError> {
        let event = AuditEvent::new(AuditAction::LoginFailed, ResourceType::User)
            .with_error(error)
            .with_request_id(ctx.request_id)
            .with_after(serde_json::json!({ "attempted_email": email }));

        let event = if let Some(ip) = ip {
            event.with_ip(ip)
        } else {
            event
        };

        self.repo.log(ctx, event).await
    }

    /// Log an audit event, swallowing any error.
    ///
    /// Audit failures must never fail the request. This method encapsulates
    /// the "log, warn, move on" policy so callers don't replicate the
    /// error-handling boilerplate.
    pub async fn try_log(
        &self,
        ctx: &Ctx,
        action: &str,
        log_fn: impl std::future::Future<Output = Result<(), DomainError>>,
    ) {
        if let Err(e) = log_fn.await {
            tracing::warn!(
                error = %e,
                action = action,
                request_id = ?ctx.request_id,
                "failed to log audit event"
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use super::*;

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
        async fn log(&self, _ctx: &Ctx, event: AuditEvent) -> Result<(), DomainError> {
            self.events.lock().unwrap().push(event);
            Ok(())
        }
    }

    struct ErrorRepo;

    #[async_trait::async_trait]
    impl AuditEventRepository for ErrorRepo {
        async fn log(&self, _ctx: &Ctx, _event: AuditEvent) -> Result<(), DomainError> {
            Err(DomainError::Internal(
                "audit storage failed".to_string().into(),
            ))
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
        let ctx = Ctx::guest(Uuid::new_v4());
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
        assert_eq!(event.resource_id, Some(user_id.0));
        assert_eq!(event.request_id, Some(ctx.request_id));
        assert_eq!(event.actor_ip_address, Some("127.0.0.1".to_string()));
        assert!(event.success);
    }

    #[tokio::test]
    async fn log_user_registered_omits_ip_when_none() {
        let (service, repo) = capturing_service();
        let ctx = Ctx::guest(Uuid::new_v4());
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
        let ctx = Ctx::guest(Uuid::new_v4());
        let user_id = UserId::new();

        service.log_email_verified(&ctx, user_id).await.unwrap();

        let events = repo.events();
        assert_eq!(events.len(), 1);

        let event = &events[0];
        assert_eq!(event.action, AuditAction::UserEmailVerified);
        assert_eq!(event.resource_type, ResourceType::User);
        assert_eq!(event.actor_user_id, Some(user_id));
        assert_eq!(event.resource_id, Some(user_id.0));
        assert_eq!(event.request_id, Some(ctx.request_id));
        assert!(event.success);
    }

    #[tokio::test]
    async fn log_session_created_creates_expected_event() {
        let (service, repo) = capturing_service();
        let ctx = Ctx::guest(Uuid::new_v4());
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
        assert_eq!(event.request_id, Some(ctx.request_id));
        assert_eq!(event.actor_ip_address, Some("10.0.0.1".to_string()));
        assert!(event.success);
    }

    #[tokio::test]
    async fn log_password_reset_creates_expected_event() {
        let (service, repo) = capturing_service();
        let ctx = Ctx::guest(Uuid::new_v4());
        let user_id = UserId::new();

        service.log_password_reset(&ctx, user_id).await.unwrap();

        let events = repo.events();
        assert_eq!(events.len(), 1);

        let event = &events[0];
        assert_eq!(event.action, AuditAction::UserPasswordReset);
        assert_eq!(event.resource_type, ResourceType::User);
        assert_eq!(event.actor_user_id, Some(user_id));
        assert_eq!(event.resource_id, Some(user_id.0));
        assert_eq!(event.request_id, Some(ctx.request_id));
        assert!(event.success);
    }

    #[tokio::test]
    async fn log_login_failed_creates_expected_event() {
        let (service, repo) = capturing_service();
        let ctx = Ctx::guest(Uuid::new_v4());

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
        assert_eq!(event.request_id, Some(ctx.request_id));
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
        let ctx = Ctx::guest(Uuid::new_v4());

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
        let ctx = Ctx::guest(Uuid::new_v4());
        let user_id = UserId::new();

        let result = service.log_user_registered(&ctx, user_id, None).await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn try_log_swallows_repo_error() {
        let service = AuditService::new(Arc::new(ErrorRepo));
        let ctx = Ctx::guest(Uuid::new_v4());
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
}
