//! Update member role use case.

use base::ctx::ExecutionContext;
use domain::permission;
use domain::{DomainError, Email};
use session_coordinator::event::MembershipEvent;

use crate::error::TenantError;
use crate::{TenantService, UpdateMemberRoleRequest};

use super::shared::{fetch_tenant, require_actor};

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
    request: UpdateMemberRoleRequest,
) -> Result<(), TenantError> {
    let actor_id = require_actor(ctx)?;
    let tenant = fetch_tenant(service, ctx, slug).await?;

    service
        .authorization()
        .require_permission_with_context(
            ctx,
            tenant.id,
            actor_id,
            permission::tenant::MANAGE_MEMBERS,
        )
        .await
        .map_err(|e| super::shared::map_permission_error(e, TenantError::NotAdmin))?;

    let email = Email::parse(&request.email).map_err(DomainError::from)?;
    let target_user = service
        .internal()
        .persistence_facade
        .user_repository
        .find_by_email(ctx, &email)
        .await
        .map_err(|e| TenantError::Internal(e.to_string()))?
        .ok_or(TenantError::NotFound)?;

    if target_user.id == tenant.owner_id {
        return Err(TenantError::Internal(
            "cannot change owner role".to_string(),
        ));
    }

    let existing = service
        .internal()
        .persistence_facade
        .membership_repository
        .find(ctx, tenant.id, target_user.id)
        .await?
        .ok_or(TenantError::NotFound)?;

    let old_role = existing.role;

    service
        .internal()
        .persistence_facade
        .membership_repository
        .update_role(ctx, tenant.id, target_user.id, request.role)
        .await?;

    service
        .internal()
        .persistence_facade
        .audit_logger
        .log_member_role_changed(
            ctx,
            tenant.id,
            target_user.id,
            old_role.as_str(),
            request.role.as_str(),
        )
        .await;

    let event = MembershipEvent::Updated {
        tenant_id: tenant.id,
        user_id: target_user.id,
        role: request.role,
    };
    service
        .session_coordinator()
        .handle_membership_event(ctx, event)
        .await
        .map_err(|e| TenantError::SessionCoordinator(e.to_string()))?;

    Ok(())
}
