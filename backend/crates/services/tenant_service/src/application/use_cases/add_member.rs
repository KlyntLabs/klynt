//! Add member to tenant use case.

use base::ctx::ExecutionContext;
use domain::permission;
use domain::{DomainError, Email, Membership};
use session_coordinator::event::MembershipEvent;

use crate::error::TenantError;
use crate::{AddMemberRequest, TenantService};

use super::shared::{fetch_tenant, require_actor, require_member_permission};

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
    request: AddMemberRequest,
) -> Result<Membership, TenantError> {
    let actor_id = require_actor(ctx)?;
    let tenant = fetch_tenant(service, ctx, slug).await?;

    require_member_permission(
        service,
        ctx,
        tenant.id,
        actor_id,
        permission::tenant::MANAGE_MEMBERS,
        TenantError::NotAdmin,
    )
    .await?;

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
            "cannot change owner membership".to_string(),
        ));
    }

    let membership = Membership::new(tenant.id, target_user.id, request.role);

    let created = service
        .internal()
        .membership_repository
        .create(ctx, &membership)
        .await?;

    service
        .internal()
        .audit_logger
        .log_member_added(ctx, tenant.id, target_user.id)
        .await;

    let event = MembershipEvent::Added {
        tenant_id: tenant.id,
        user_id: target_user.id,
        role: request.role,
    };
    service
        .session_coordinator()
        .handle_membership_event(ctx, event)
        .await
        .map_err(|e| TenantError::Internal(e.to_string()))?;

    Ok(created)
}
