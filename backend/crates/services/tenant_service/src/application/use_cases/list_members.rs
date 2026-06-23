//! List tenant members use case.

use base::ctx::ExecutionContext;
use domain::permission;
use domain::TenantMember;

use crate::error::TenantError;
use crate::TenantService;

use super::shared::{fetch_tenant, require_actor, require_member_permission};

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
) -> Result<Vec<TenantMember>, TenantError> {
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

    let members = service
        .internal()
        .membership_repository
        .list_members(ctx, tenant.id)
        .await?;

    Ok(members)
}
