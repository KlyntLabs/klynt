//! Delete a tenant role.

use base::ctx::ExecutionContext;
use domain::permission;
use domain::RoleId;

use crate::error::TenantError;
use crate::TenantService;

use super::super::shared::{fetch_tenant, require_actor};

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
    role_id: RoleId,
) -> Result<(), TenantError> {
    let user_id = require_actor(ctx)?;
    let tenant = fetch_tenant(service, ctx, slug).await?;

    service
        .authorization()
        .require_permission_with_context(ctx, tenant.id, user_id, permission::tenant::MANAGE_ROLES)
        .await
        .map_err(|e| super::super::shared::map_permission_error(e, TenantError::NotAdmin))?;

    let role = service
        .internal()
        .role_repository
        .find_role_by_id(ctx, tenant.id, role_id)
        .await
        .map_err(TenantError::Domain)?
        .ok_or(TenantError::NotFound)?;

    service
        .internal()
        .role_repository
        .delete_role(ctx, tenant.id, role_id)
        .await
        .map_err(TenantError::Domain)?;

    service
        .internal()
        .audit_logger
        .log_role_deleted(
            ctx,
            tenant.id,
            role_id,
            &role.name,
            &role.description,
            role.permission_ids,
        )
        .await;

    Ok(())
}
