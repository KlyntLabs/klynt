//! Delete tenant use case.

use base::ctx::ExecutionContext;
use domain::permission;

use crate::error::TenantError;
use crate::TenantService;

use super::shared::{fetch_tenant, require_actor};

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
) -> Result<(), TenantError> {
    let user_id = require_actor(ctx)?;
    let tenant = fetch_tenant(service, ctx, slug).await?;

    service
        .authorization()
        .require_permission_with_context(ctx, tenant.id, user_id, permission::tenant::DELETE)
        .await
        .map_err(|_| TenantError::NotOwner)?;

    service
        .internal()
        .tenant_repository
        .delete(ctx, tenant.id)
        .await?;

    service
        .internal()
        .audit_logger
        .log_tenant_deleted(ctx, tenant.id)
        .await;

    Ok(())
}
