//! List tenant roles use case.

use base::ctx::ExecutionContext;
use domain::permission;

use crate::error::TenantError;
use crate::TenantService;

use super::super::shared::{fetch_tenant, require_actor};

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
) -> Result<Vec<domain::TenantRoleAggregate>, TenantError> {
    let user_id = require_actor(ctx)?;
    let tenant = fetch_tenant(service, ctx, slug).await?;

    service
        .authorization()
        .require_permission_with_context(ctx, tenant.id, user_id, permission::tenant::MANAGE_ROLES)
        .await
        .map_err(|e| super::super::shared::map_permission_error(e, TenantError::NotAdmin))?;

    service
        .internal()
        .persistence_facade
        .role_repository
        .list_roles_for_tenant(ctx, tenant.id)
        .await
        .map_err(TenantError::Domain)
}
