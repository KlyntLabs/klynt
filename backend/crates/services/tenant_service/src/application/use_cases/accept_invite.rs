//! Accept a tenant invite use case.

use base::ctx::ExecutionContext;
use base::ports::session::MembershipSnapshot;
use chrono::Utc;
use domain::{DomainError, Membership, TenantRole};

use crate::error::TenantError;
use crate::TenantService;

use super::shared::require_actor;

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    token: &str,
) -> Result<domain::Tenant, TenantError> {
    let actor_id = require_actor(ctx)?;

    let invite = service
        .internal()
        .invite_repository
        .find_by_token(ctx, token)
        .await
        .map_err(|e| TenantError::Internal(e.to_string()))?
        .ok_or_else(|| TenantError::Domain(DomainError::not_found("invite")))?;

    if invite.accepted_at.is_some() || invite.expires_at < Utc::now() {
        return Err(TenantError::Domain(DomainError::validation(
            "invite expired or already accepted",
        )));
    }

    let actor = service
        .internal()
        .user_repository
        .find_by_id(ctx, actor_id)
        .await
        .map_err(|e| TenantError::Internal(e.to_string()))?
        .ok_or(TenantError::AuthenticationRequired)?;

    if actor.email != invite.email {
        return Err(TenantError::Domain(DomainError::NotPermitted(
            "invite email mismatch".to_string(),
        )));
    }

    let role = TenantRole::parse(&invite.role_name)?;
    let membership = Membership::new(invite.tenant_id, actor_id, role);

    let created = service
        .internal()
        .membership_repository
        .create_with_role_id(ctx, &membership, invite.role_id)
        .await?;

    service
        .internal()
        .invite_repository
        .mark_accepted(ctx, invite.id)
        .await
        .map_err(|e| TenantError::Internal(e.to_string()))?;

    service
        .internal()
        .audit_logger
        .log_member_added(ctx, invite.tenant_id, actor_id)
        .await;

    service
        .session_store()
        .add_membership(
            ctx,
            actor_id,
            MembershipSnapshot {
                tenant_id: invite.tenant_id.inner(),
                role: created.role,
            },
        )
        .await
        .map_err(TenantError::Session)?;

    let tenant = service
        .internal()
        .tenant_repository
        .find_by_id(ctx, invite.tenant_id)
        .await?
        .ok_or(TenantError::NotFound)?;

    Ok(tenant)
}
