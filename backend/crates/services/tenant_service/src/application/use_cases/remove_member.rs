//! Remove member from tenant use case.

use base::ctx::ExecutionContext;
use domain::permission;
use domain::{DomainError, Email};
use session_coordinator::event::MembershipEvent;

use crate::error::TenantError;
use crate::{RemoveMemberRequest, TenantService};

use super::shared::{fetch_tenant, require_actor};

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
    request: RemoveMemberRequest,
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
        .map_err(|_| TenantError::NotAdmin)?;

    let email = Email::parse(&request.email).map_err(DomainError::from)?;
    let target_user = service
        .internal()
        .user_repository
        .find_by_email(ctx, &email)
        .await
        .map_err(|e| TenantError::Internal(e.to_string()))?
        .ok_or(TenantError::NotFound)?;

    if target_user.id == tenant.owner_id {
        return Err(TenantError::Internal(
            "cannot remove owner from tenant".to_string(),
        ));
    }

    service
        .internal()
        .membership_repository
        .delete(ctx, tenant.id, target_user.id)
        .await?;

    service
        .internal()
        .audit_logger
        .log_member_removed(ctx, tenant.id, target_user.id)
        .await;

    let event = MembershipEvent::Removed {
        tenant_id: tenant.id,
        user_id: target_user.id,
    };
    service
        .session_coordinator()
        .handle_membership_event(ctx, event)
        .await
        .map_err(|e| TenantError::SessionCoordinator(e.to_string()))?;

    Ok(())
}
