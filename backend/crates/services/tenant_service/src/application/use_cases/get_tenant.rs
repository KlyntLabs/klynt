//! Get tenant use case.

use base::ctx::ExecutionContext;
use domain::{TenantMembershipSummary, TenantRole};

use crate::error::TenantError;
use crate::TenantService;

use domain::permission;

use super::shared::{fetch_tenant, require_actor};

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
) -> Result<TenantMembershipSummary, TenantError> {
    let user_id = require_actor(ctx)?;
    let tenant = fetch_tenant(service, ctx, slug).await?;

    service
        .authorization()
        .require_permission_with_context(ctx, tenant.id, user_id, permission::tenant::VIEW)
        .await
        .map_err(|e| super::shared::map_permission_error(e, TenantError::NotMember))?;

    let membership = service
        .internal()
        .persistence_facade
        .membership_repository
        .find(ctx, tenant.id, user_id)
        .await
        .map_err(TenantError::Domain)?;

    let role = membership.map(|m| m.role).unwrap_or(TenantRole::Member);

    let joined_at = tenant.created_at;
    Ok(TenantMembershipSummary::new(tenant, role, joined_at))
}
