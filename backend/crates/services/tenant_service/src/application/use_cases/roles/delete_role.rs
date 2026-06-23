//! Delete a tenant role.

use base::ctx::ExecutionContext;
use domain::permission;
use domain::RoleId;

use crate::error::TenantError;
use crate::TenantService;

use super::super::shared::{fetch_tenant, require_actor, require_member_permission};

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
    role_id: RoleId,
) -> Result<(), TenantError> {
    let user_id = require_actor(ctx)?;
    let tenant = fetch_tenant(service, ctx, slug).await?;

    require_member_permission(
        service,
        ctx,
        tenant.id,
        user_id,
        permission::tenant::MANAGE_ROLES,
        TenantError::NotAdmin,
    )
    .await?;

    service
        .internal()
        .role_repository
        .delete_role(ctx, tenant.id, role_id)
        .await
        .map_err(TenantError::Domain)
}
