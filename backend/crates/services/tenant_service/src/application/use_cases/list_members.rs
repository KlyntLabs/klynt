//! List tenant members use case.

use base::ctx::ExecutionContext;
use domain::TenantMember;

use crate::error::TenantError;
use crate::TenantService;

use super::shared::{fetch_tenant, require_actor};

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
) -> Result<Vec<TenantMember>, TenantError> {
    let user_id = require_actor(ctx)?;
    let tenant = fetch_tenant(service, ctx, slug).await?;

    service
        .internal()
        .membership_repository
        .find(ctx, tenant.id, user_id)
        .await?
        .ok_or(TenantError::NotMember)?;

    let members = service
        .internal()
        .membership_repository
        .list_members(ctx, tenant.id)
        .await?;

    Ok(members)
}
