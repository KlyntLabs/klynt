//! Update tenant use case.

use base::ctx::ExecutionContext;
use domain::permission;
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

    service
        .authorization()
        .require_permission_with_context(
            ctx,
            tenant.id,
            user_id,
            permission::tenant::MANAGE_SETTINGS,
        )
        .await
        .map_err(|_| TenantError::NotAdmin)?;

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
