pub mod logger_impl;
pub mod types;

use std::sync::Arc;
use uuid::Uuid;

use base::ctx::ExecutionContext;
use base::ports::audit::{PasswordChangeSnapshot, ProfileUpdateSnapshot};
use domain::{DomainError, UserId};
use serde::Serialize;

use crate::types::{AuditAction, AuditEvent, AuditEventRepository, ResourceType};

/// Serialize an audit snapshot into a JSON value.
///
/// Audit snapshots are simple, derive-`Serialize` structs, so this should
/// never fail in practice. The helper keeps callers concise.
fn snapshot_to_value<T: Serialize>(snapshot: T) -> serde_json::Value {
    serde_json::to_value(snapshot).unwrap_or_else(|e| {
        tracing::warn!(error = %e, "failed to serialize audit snapshot");
        serde_json::Value::Null
    })
}

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
        before: ProfileUpdateSnapshot,
        after: ProfileUpdateSnapshot,
    ) -> Result<(), DomainError> {
        let event = AuditEvent::new(AuditAction::UserProfileUpdated, ResourceType::User)
            .with_actor(user_id)
            .with_resource(user_id.inner())
            .with_request_id(ctx.request.request_id.0)
            .with_before(snapshot_to_value(before))
            .with_after(snapshot_to_value(after));

        self.repo.log(ctx, event).await
    }

    /// Log password change.
    pub async fn log_password_changed(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        before: PasswordChangeSnapshot,
        after: PasswordChangeSnapshot,
    ) -> Result<(), DomainError> {
        let event = AuditEvent::new(AuditAction::UserPasswordChanged, ResourceType::User)
            .with_actor(user_id)
            .with_resource(user_id.inner())
            .with_request_id(ctx.request.request_id.0)
            .with_before(snapshot_to_value(before))
            .with_after(snapshot_to_value(after));

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

    /// Log tenant creation.
    pub async fn log_tenant_created(
        &self,
        ctx: &ExecutionContext,
        tenant_id: domain::TenantId,
    ) -> Result<(), DomainError> {
        let mut event = AuditEvent::new(AuditAction::TenantCreated, ResourceType::Tenant)
            .with_resource(tenant_id.inner())
            .with_tenant(tenant_id.inner())
            .with_request_id(ctx.request.request_id.0);

        if let Some(actor_id) = ctx.actor_id {
            event = event.with_actor(UserId::from_uuid(actor_id));
        }

        self.repo.log(ctx, event).await
    }

    /// Log tenant update.
    pub async fn log_tenant_updated(
        &self,
        ctx: &ExecutionContext,
        tenant_id: domain::TenantId,
    ) -> Result<(), DomainError> {
        let mut event = AuditEvent::new(AuditAction::TenantUpdated, ResourceType::Tenant)
            .with_resource(tenant_id.inner())
            .with_tenant(tenant_id.inner())
            .with_request_id(ctx.request.request_id.0);

        if let Some(actor_id) = ctx.actor_id {
            event = event.with_actor(UserId::from_uuid(actor_id));
        }

        self.repo.log(ctx, event).await
    }

    /// Log a member being added to a tenant.
    pub async fn log_member_added(
        &self,
        ctx: &ExecutionContext,
        tenant_id: domain::TenantId,
        user_id: UserId,
    ) -> Result<(), DomainError> {
        let mut event = AuditEvent::new(AuditAction::MemberAdded, ResourceType::Membership)
            .with_resource(user_id.inner())
            .with_tenant(tenant_id.inner())
            .with_request_id(ctx.request.request_id.0);

        if let Some(actor_id) = ctx.actor_id {
            event = event.with_actor(UserId::from_uuid(actor_id));
        }

        self.repo.log(ctx, event).await
    }

    /// Log a member's role being changed within a tenant.
    pub async fn log_member_role_changed(
        &self,
        ctx: &ExecutionContext,
        tenant_id: domain::TenantId,
        user_id: UserId,
        old_role: &str,
        new_role: &str,
    ) -> Result<(), DomainError> {
        let mut event = AuditEvent::new(AuditAction::MemberRoleChanged, ResourceType::Membership)
            .with_resource(user_id.inner())
            .with_tenant(tenant_id.inner())
            .with_request_id(ctx.request.request_id.0)
            .with_before(snapshot_to_value(serde_json::json!({ "role": old_role })))
            .with_after(snapshot_to_value(serde_json::json!({ "role": new_role })));

        if let Some(actor_id) = ctx.actor_id {
            event = event.with_actor(UserId::from_uuid(actor_id));
        }

        self.repo.log(ctx, event).await
    }

    /// Log a member being removed from a tenant.
    pub async fn log_member_removed(
        &self,
        ctx: &ExecutionContext,
        tenant_id: domain::TenantId,
        user_id: UserId,
    ) -> Result<(), DomainError> {
        let mut event = AuditEvent::new(AuditAction::MemberRemoved, ResourceType::Membership)
            .with_resource(user_id.inner())
            .with_tenant(tenant_id.inner())
            .with_request_id(ctx.request.request_id.0);

        if let Some(actor_id) = ctx.actor_id {
            event = event.with_actor(UserId::from_uuid(actor_id));
        }

        self.repo.log(ctx, event).await
    }

    /// Log tenant deletion.
    pub async fn log_tenant_deleted(
        &self,
        ctx: &ExecutionContext,
        tenant_id: domain::TenantId,
    ) -> Result<(), DomainError> {
        let mut event = AuditEvent::new(AuditAction::TenantDeleted, ResourceType::Tenant)
            .with_resource(tenant_id.inner())
            .with_tenant(tenant_id.inner())
            .with_request_id(ctx.request.request_id.0);

        if let Some(actor_id) = ctx.actor_id {
            event = event.with_actor(UserId::from_uuid(actor_id));
        }

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
