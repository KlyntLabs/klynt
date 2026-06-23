//! Create tenant use case.

use base::ctx::ExecutionContext;
use domain::Tenant;

use crate::error::TenantError;
use crate::CreateTenantRequest;
use crate::TenantService;

use super::shared::require_actor;

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    request: CreateTenantRequest,
) -> Result<Tenant, TenantError> {
    let owner_id = require_actor(ctx)?;
    let slug = domain::TenantSlug::parse(&request.slug)?;

    let tenant = Tenant::create(slug, request.name, owner_id)?;

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

    Ok(created)
}
