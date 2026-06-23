//! Update tenant use case.

use base::ctx::ExecutionContext;
use domain::Tenant;

use crate::error::TenantError;
use crate::TenantService;

use super::shared::{fetch_tenant, require_actor};

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
    name: String,
) -> Result<Tenant, TenantError> {
    let user_id = require_actor(ctx)?;
    let mut tenant = fetch_tenant(service, ctx, slug).await?;

    let membership = service
        .internal()
        .membership_repository
        .find(ctx, tenant.id, user_id)
        .await?;

    match membership {
        Some(m) if m.role.can_administer() => {}
        Some(_) => return Err(TenantError::NotAdmin),
        None => return Err(TenantError::NotMember),
    }

    tenant.rename(name)?;

    let updated = service
        .internal()
        .tenant_repository
        .update(ctx, &tenant)
        .await?;

    service
        .internal()
        .audit_logger
        .log_tenant_updated(ctx, updated.id)
        .await;

    Ok(updated)
}
