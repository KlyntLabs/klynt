use base::ctx::ExecutionContext;
use base::ports::audit::{PasswordChangeSnapshot, ProfileUpdateSnapshot};
use domain::{DomainError, UserId};

use super::snapshot_to_value;
use super::types::{AuditAction, AuditEvent, ResourceType};
use super::AuditService;

impl AuditService {
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
}
