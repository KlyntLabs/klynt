//! Add member to tenant use case.

use base::ctx::ExecutionContext;
use base::ports::session::MembershipSnapshot;
use domain::{DomainError, Email, Membership};

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

    let actor_membership = service
        .internal()
        .membership_repository
        .find(ctx, tenant.id, actor_id)
        .await?;

    match actor_membership {
        Some(m) if m.role.can_administer() => {}
        Some(_) => return Err(TenantError::NotAdmin),
        None => return Err(TenantError::NotMember),
    }

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

    service
        .session_store()
        .add_membership(
            ctx,
            target_user.id,
            MembershipSnapshot {
                tenant_id: tenant.id.inner(),
                role: request.role,
            },
        )
        .await
        .map_err(TenantError::Session)?;

    Ok(created)
}
