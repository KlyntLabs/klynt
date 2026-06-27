//! Update a tenant role's permissions.

use base::ctx::ExecutionContext;
use domain::permission;
use domain::{RoleId, TenantRoleAggregate};

use crate::error::TenantError;
use crate::{TenantService, UpdateRoleRequest};

use super::super::shared::{fetch_tenant, require_actor};

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
    role_id: RoleId,
    request: UpdateRoleRequest,
) -> Result<TenantRoleAggregate, TenantError> {
    let user_id = require_actor(ctx)?;
    let tenant = fetch_tenant(service, ctx, slug).await?;

    service
        .authorization()
        .require_permission_with_context(ctx, tenant.id, user_id, permission::tenant::MANAGE_ROLES)
        .await
        .map_err(|_| TenantError::NotAdmin)?;

    let old_role = service
        .internal()
        .role_repository
        .find_role_by_id(ctx, tenant.id, role_id)
        .await
        .map_err(TenantError::Domain)?
        .ok_or(TenantError::NotFound)?;

    service
        .internal()
        .role_repository
        .update_role_permissions(ctx, tenant.id, role_id, request.permission_ids.clone())
        .await
        .map_err(TenantError::Domain)?;

    let updated_role = service
        .internal()
        .role_repository
        .find_role_by_id(ctx, tenant.id, role_id)
        .await
        .map_err(TenantError::Domain)?
        .ok_or(TenantError::NotFound)?;

    service
        .internal()
        .audit_logger
        .log_role_permissions_updated(
            ctx,
            tenant.id,
            role_id,
            old_role.permission_ids,
            updated_role.permission_ids.clone(),
        )
        .await;

    Ok(updated_role)
}
