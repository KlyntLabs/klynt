//! Tenant administration helpers.

use base::ctx::ExecutionContext;
use domain::{Tenant, UserId};

use crate::error::TenantError;
use crate::TenantService;

/// Ensure the actor is an owner or admin of the tenant identified by slug.
pub async fn ensure_admin(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
) -> Result<Tenant, TenantError> {
    let user_id = ctx
        .actor_id
        .map(UserId::from_uuid)
        .ok_or(TenantError::AuthenticationRequired)?;
    let tenant = crate::application::use_cases::shared::fetch_tenant(service, ctx, slug).await?;
    let membership = service
        .internal()
        .membership_repository
        .find(ctx, tenant.id, user_id)
        .await?;

    match membership {
        Some(m) if m.role.can_administer() => Ok(tenant),
        Some(_) => Err(TenantError::NotAdmin),
        None => Err(TenantError::NotMember),
    }
}
