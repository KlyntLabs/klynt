pub mod types;

use std::sync::Arc;
use uuid::Uuid;

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::audit::AuditLogger;
use domain::{DomainError, UserId};

use crate::types::{AuditAction, AuditEvent, AuditEventRepository, ResourceType};

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

#[async_trait]
impl AuditLogger for AuditService {
    async fn log_login_success(&self, _ctx: &ExecutionContext, _user_id: UserId) {
        // Preserved from previous behavior: login success is recorded via
        // `log_session_created` after the session is created.
    }

    async fn log_login_failed(&self, ctx: &ExecutionContext, email: &str, error: &str) {
        self.try_log(
            ctx,
            "login_failed",
            self.log_login_failed(ctx, email, ctx.request.client_ip.clone(), error.to_string()),
        )
        .await;
    }

    async fn log_user_registered(&self, ctx: &ExecutionContext, user_id: UserId) {
        self.try_log(
            ctx,
            "user_registered",
            self.log_user_registered(ctx, user_id, ctx.request.client_ip.clone()),
        )
        .await;
    }

    async fn log_email_verified(&self, ctx: &ExecutionContext, user_id: UserId) {
        self.try_log(ctx, "email_verified", self.log_email_verified(ctx, user_id))
            .await;
    }

    async fn log_password_reset(&self, ctx: &ExecutionContext, user_id: UserId) {
        self.try_log(ctx, "password_reset", self.log_password_reset(ctx, user_id))
            .await;
    }

    async fn log_session_created(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        session_id: String,
    ) {
        let session_id = match uuid::Uuid::parse_str(&session_id) {
            Ok(id) => id,
            Err(e) => {
                tracing::warn!(
                    error = %e,
                    session_id = %session_id,
                    "failed to parse session_id for audit log"
                );
                return;
            }
        };

        self.try_log(
            ctx,
            "session_created",
            self.log_session_created(ctx, user_id, session_id, ctx.request.client_ip.clone()),
        )
        .await;
    }

    async fn log_profile_updated(&self, ctx: &ExecutionContext, user_id: UserId) {
        self.try_log(
            ctx,
            "user_profile_updated",
            self.log_profile_updated(ctx, user_id),
        )
        .await;
    }

    async fn log_password_changed(&self, ctx: &ExecutionContext, user_id: UserId) {
        self.try_log(
            ctx,
            "user_password_changed",
            self.log_password_changed(ctx, user_id),
        )
        .await;
    }

    async fn log_user_deleted(&self, ctx: &ExecutionContext, user_id: UserId) {
        self.try_log(ctx, "user_deleted", self.log_user_deleted(ctx, user_id))
            .await;
    }
}

#[cfg(test)]
mod tests;
