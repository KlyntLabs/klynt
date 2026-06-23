//! Delete tenant use case.

use base::ctx::ExecutionContext;

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

    let membership = service
        .internal()
        .membership_repository
        .find(ctx, tenant.id, user_id)
        .await?;

    match membership {
        Some(m) if m.role == domain::TenantRole::Owner => {}
        Some(_) => return Err(TenantError::NotOwner),
        None => return Err(TenantError::NotMember),
    }

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
