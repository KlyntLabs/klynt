//! Get tenant use case.

use base::ctx::ExecutionContext;
use domain::Tenant;

use crate::error::TenantError;
use crate::TenantService;

use super::shared::{fetch_tenant, require_actor};

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
) -> Result<Tenant, TenantError> {
    let user_id = require_actor(ctx)?;
    let tenant = fetch_tenant(service, ctx, slug).await?;

    let membership = service
        .internal()
        .membership_repository
        .find(ctx, tenant.id, user_id)
        .await?;

    if membership.is_none() {
        return Err(TenantError::NotMember);
    }

    Ok(tenant)
}
