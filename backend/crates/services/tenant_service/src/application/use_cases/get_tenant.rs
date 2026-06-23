//! Get tenant use case.

use base::ctx::ExecutionContext;
use domain::Tenant;

use crate::error::TenantError;
use crate::TenantService;

use domain::permission;

use super::shared::{fetch_tenant, require_actor, require_member_permission};

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
) -> Result<Tenant, TenantError> {
    let user_id = require_actor(ctx)?;
    let tenant = fetch_tenant(service, ctx, slug).await?;

    require_member_permission(
        service,
        ctx,
        tenant.id,
        user_id,
        permission::tenant::VIEW,
        TenantError::NotMember,
    )
    .await?;

    Ok(tenant)
}
