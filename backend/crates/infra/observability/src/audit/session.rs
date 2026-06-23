use base::ctx::ExecutionContext;
use domain::{DomainError, UserId};
use uuid::Uuid;

use super::types::{AuditAction, AuditEvent, ResourceType};
use super::AuditService;

impl AuditService {
    /// Log session creation.
    pub async fn log_session_created(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        session_id: Uuid,
        ip: Option<String>,
    ) -> Result<(), DomainError> {
        let event = AuditEvent::new(AuditAction::SessionCreated, ResourceType::Session)
            .with_actor(user_id)
            .with_resource(session_id)
            .with_request_id(ctx.request.request_id.0);

        let event = if let Some(ip) = ip {
            event.with_ip(ip)
        } else {
            event
        };

        self.repo.log(ctx, event).await
    }

    /// Log failed authentication attempt.
    pub async fn log_login_failed(
        &self,
        ctx: &ExecutionContext,
        email: &str,
        ip: Option<String>,
        error: String,
    ) -> Result<(), DomainError> {
        let event = AuditEvent::new(AuditAction::LoginFailed, ResourceType::User)
            .with_error(error)
            .with_request_id(ctx.request.request_id.0)
            .with_after(serde_json::json!({ "attempted_email": email }));

        let event = if let Some(ip) = ip {
            event.with_ip(ip)
        } else {
            event
        };

        self.repo.log(ctx, event).await
    }
}
