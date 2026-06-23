use base::ctx::ExecutionContext;
use domain::{DomainError, TenantId, UserId};

use super::snapshot_to_value;
use super::types::{AuditAction, AuditEvent, ResourceType};
use super::AuditService;

impl AuditService {
    /// Log tenant creation.
    pub async fn log_tenant_created(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
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
        tenant_id: TenantId,
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

    /// Log tenant deletion.
    pub async fn log_tenant_deleted(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
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

    /// Log a member being added to a tenant.
    pub async fn log_member_added(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
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
        tenant_id: TenantId,
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
        tenant_id: TenantId,
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
}
