//! List tenant members use case.

use base::ctx::ExecutionContext;
use domain::permission;
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
        .authorization()
        .require_permission_with_context(ctx, tenant.id, user_id, permission::tenant::VIEW)
        .await
        .map_err(|e| super::shared::map_permission_error(e, TenantError::NotMember))?;

    let members = service
        .internal()
        .persistence_facade
        .membership_repository
        .list_members(ctx, tenant.id)
        .await?;

    Ok(members)
}
