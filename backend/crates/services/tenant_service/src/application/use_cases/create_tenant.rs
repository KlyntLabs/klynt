//! Create tenant use case.

use base::ctx::ExecutionContext;
use domain::{Tenant, TenantMembershipSummary};
use session_coordinator::event::MembershipEvent;

use crate::error::TenantError;
use crate::CreateTenantRequest;
use crate::TenantService;

use super::shared::require_actor;

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    request: CreateTenantRequest,
) -> Result<TenantMembershipSummary, TenantError> {
    let owner_id = require_actor(ctx)?;
    let slug = domain::TenantSlug::parse(&request.slug)?;

    let tenant = Tenant::create(slug, request.name, owner_id)?;
    let joined_at = tenant.created_at;

    let created = service
        .internal()
        .tenant_repository
        .create(ctx, &tenant)
        .await?;

    service
        .internal()
        .audit_logger
        .log_tenant_created(ctx, created.id)
        .await;

    let event = MembershipEvent::Added {
        tenant_id: created.id,
        user_id: owner_id,
        role: domain::membership::TenantRole::Owner,
    };
    service
        .session_coordinator()
        .handle_membership_event(ctx, event)
        .await
        .map_err(|e| TenantError::SessionCoordinator(e.to_string()))?;

    Ok(TenantMembershipSummary::new(
        created,
        domain::membership::TenantRole::Owner,
        joined_at,
    ))
}
