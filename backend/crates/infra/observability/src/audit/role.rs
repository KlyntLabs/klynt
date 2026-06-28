use base::ctx::ExecutionContext;
use base::ports::audit::RoleMetadataSnapshot;
use domain::{DomainError, PermissionId, RoleId, TenantId, UserId};

use super::snapshot_to_value;
use super::types::{AuditAction, AuditEvent, ResourceType};
use super::AuditService;

impl AuditService {
    /// Log a custom role being created within a tenant.
    pub async fn log_role_created(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
        name: &str,
        description: &str,
        permission_ids: &[PermissionId],
    ) -> Result<(), DomainError> {
        let after = snapshot_to_value(serde_json::json!({
            "id": role_id,
            "name": name,
            "description": description,
            "permission_ids": permission_ids,
        }));

        let mut event = AuditEvent::new(AuditAction::RoleCreated, ResourceType::Role)
            .with_resource(role_id.0)
            .with_tenant(tenant_id.inner())
            .with_request_id(ctx.request.request_id.0)
            .with_after(after);

        if let Some(actor_id) = ctx.actor_id {
            event = event.with_actor(UserId::from_uuid(actor_id));
        }

        self.repo.log(ctx, event).await
    }

    /// Log a role's name or description being changed.
    pub async fn log_role_updated(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
        before: RoleMetadataSnapshot,
        after: RoleMetadataSnapshot,
    ) -> Result<(), DomainError> {
        let before = snapshot_to_value(before);
        let after = snapshot_to_value(after);

        let mut event = AuditEvent::new(AuditAction::RoleUpdated, ResourceType::Role)
            .with_resource(role_id.0)
            .with_tenant(tenant_id.inner())
            .with_request_id(ctx.request.request_id.0)
            .with_before(before)
            .with_after(after);

        if let Some(actor_id) = ctx.actor_id {
            event = event.with_actor(UserId::from_uuid(actor_id));
        }

        self.repo.log(ctx, event).await
    }

    /// Log a role's permission set being changed.
    pub async fn log_role_permissions_updated(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
        before_permission_ids: &[PermissionId],
        after_permission_ids: &[PermissionId],
    ) -> Result<(), DomainError> {
        let before = snapshot_to_value(serde_json::json!({
            "permission_ids": before_permission_ids,
        }));
        let after = snapshot_to_value(serde_json::json!({
            "permission_ids": after_permission_ids,
        }));

        let mut event = AuditEvent::new(AuditAction::RolePermissionsUpdated, ResourceType::Role)
            .with_resource(role_id.0)
            .with_tenant(tenant_id.inner())
            .with_request_id(ctx.request.request_id.0)
            .with_before(before)
            .with_after(after);

        if let Some(actor_id) = ctx.actor_id {
            event = event.with_actor(UserId::from_uuid(actor_id));
        }

        self.repo.log(ctx, event).await
    }

    /// Log a custom role being deleted.
    pub async fn log_role_deleted(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
        before_name: &str,
        before_description: &str,
        before_permission_ids: &[PermissionId],
    ) -> Result<(), DomainError> {
        let before = snapshot_to_value(serde_json::json!({
            "id": role_id,
            "name": before_name,
            "description": before_description,
            "permission_ids": before_permission_ids,
        }));

        let mut event = AuditEvent::new(AuditAction::RoleDeleted, ResourceType::Role)
            .with_resource(role_id.0)
            .with_tenant(tenant_id.inner())
            .with_request_id(ctx.request.request_id.0)
            .with_before(before);

        if let Some(actor_id) = ctx.actor_id {
            event = event.with_actor(UserId::from_uuid(actor_id));
        }

        self.repo.log(ctx, event).await
    }
}
