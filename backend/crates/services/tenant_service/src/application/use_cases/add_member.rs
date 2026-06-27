//! Add member to tenant use case.

use base::ctx::ExecutionContext;
use domain::permission;
use domain::{DomainError, Email, Membership};
use session_coordinator::event::MembershipEvent;

use crate::error::TenantError;
use crate::{AddMemberRequest, TenantService};

use super::shared::{fetch_tenant, require_actor};

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
    request: AddMemberRequest,
) -> Result<Membership, TenantError> {
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
            "cannot change owner membership".to_string(),
        ));
    }

    let membership = Membership::new(tenant.id, target_user.id, request.role);

    let created = service
        .internal()
        .persistence_facade
        .membership_repository
        .create(ctx, &membership)
        .await?;

    service
        .internal()
        .persistence_facade
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
        .map_err(|e| TenantError::SessionCoordinator(e.to_string()))?;

    Ok(created)
}
