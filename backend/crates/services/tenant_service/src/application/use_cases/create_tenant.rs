//! Create tenant use case.

use base::ctx::ExecutionContext;
use base::ports::session::MembershipSnapshot;
use domain::{Tenant, TenantMembershipSummary};

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

    service
        .session_store()
        .add_membership(
            ctx,
            owner_id,
            MembershipSnapshot {
                tenant_id: created.id.inner(),
                role: domain::membership::TenantRole::Owner,
            },
        )
        .await
        .map_err(TenantError::Session)?;

    Ok(TenantMembershipSummary::new(
        created,
        domain::membership::TenantRole::Owner,
        joined_at,
    ))
}
