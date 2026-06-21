pub mod types;

use std::sync::Arc;
use uuid::Uuid;

use klynt_base::ctx::ExecutionContext;
use klynt_common::util::UserId;

use crate::types::{AuditAction, AuditEvent, AuditEventRepository, ResourceType};
use klynt_common::domain::DomainError;

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
        ctx: &ExecutionContext,
        user_id: UserId,
        ip: Option<String>,
    ) -> Result<(), DomainError> {
        let event = AuditEvent::new(AuditAction::UserRegistered, ResourceType::User)
            .with_actor(user_id)
            .with_resource(user_id.inner())
            .with_request_id(ctx.request.request_id.0);

        let event = if let Some(ip) = ip {
            event.with_ip(ip)
        } else {
            event
        };

        self.repo.log(ctx, event).await
    }

    /// Log email verification.
    pub async fn log_email_verified(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), DomainError> {
        let event = AuditEvent::new(AuditAction::UserEmailVerified, ResourceType::User)
            .with_actor(user_id)
            .with_resource(user_id.inner())
            .with_request_id(ctx.request.request_id.0);

        self.repo.log(ctx, event).await
    }

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

    /// Log password reset.
    pub async fn log_password_reset(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), DomainError> {
        let event = AuditEvent::new(AuditAction::UserPasswordReset, ResourceType::User)
            .with_actor(user_id)
            .with_resource(user_id.inner())
            .with_request_id(ctx.request.request_id.0);

        self.repo.log(ctx, event).await
    }

    /// Log profile update.
    pub async fn log_profile_updated(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), DomainError> {
        let event = AuditEvent::new(AuditAction::UserProfileUpdated, ResourceType::User)
            .with_actor(user_id)
            .with_resource(user_id.inner())
            .with_request_id(ctx.request.request_id.0);

        self.repo.log(ctx, event).await
    }

    /// Log password change.
    pub async fn log_password_changed(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), DomainError> {
        let event = AuditEvent::new(AuditAction::UserPasswordChanged, ResourceType::User)
            .with_actor(user_id)
            .with_resource(user_id.inner())
            .with_request_id(ctx.request.request_id.0);

        self.repo.log(ctx, event).await
    }

    /// Log user deletion.
    pub async fn log_user_deleted(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), DomainError> {
        let event = AuditEvent::new(AuditAction::UserDeleted, ResourceType::User)
            .with_actor(user_id)
            .with_resource(user_id.inner())
            .with_request_id(ctx.request.request_id.0);

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

    /// Log an audit event, swallowing any error.
    ///
    /// Audit failures must never fail the request. This method encapsulates
    /// the "log, warn, move on" policy so callers don't replicate the
    /// error-handling boilerplate.
    pub async fn try_log(
        &self,
        ctx: &ExecutionContext,
        action: &str,
        log_fn: impl std::future::Future<Output = Result<(), DomainError>>,
    ) {
        if let Err(e) = log_fn.await {
            tracing::warn!(
                error = %e,
                action = action,
                request_id = ?ctx.request.request_id.0,
                "failed to log audit event"
            );
        }
    }
}

#[cfg(test)]
mod tests;
