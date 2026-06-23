//! Shared helpers for tenant use cases.

use base::ctx::ExecutionContext;
use domain::{Tenant, TenantSlug, UserId};

use crate::error::TenantError;
use crate::TenantService;

/// Extract the authenticated user ID from the execution context.
pub fn require_actor(ctx: &ExecutionContext) -> Result<UserId, TenantError> {
    ctx.actor_id
        .map(UserId::from_uuid)
        .ok_or(TenantError::AuthenticationRequired)
}

/// Parse a tenant slug and fetch the tenant, returning a domain error if invalid or missing.
pub async fn fetch_tenant(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
) -> Result<Tenant, TenantError> {
    let slug = TenantSlug::parse(slug)?;

    service
        .internal()
        .tenant_repository
        .find_by_slug(ctx, &slug)
        .await?
        .ok_or(TenantError::NotFound)
}

/// Ensure the actor is a tenant member and has the named permission.
///
/// Returns `TenantError::NotMember` when the user is not a member, and the
/// provided `on_missing_permission` error when the role does not grant it.
pub async fn require_member_permission(
    service: &TenantService,
    ctx: &ExecutionContext,
    tenant_id: domain::TenantId,
    user_id: UserId,
    permission_name: &str,
    on_missing_permission: TenantError,
) -> Result<(), TenantError> {
    let membership = service
        .internal()
        .membership_repository
        .find(ctx, tenant_id, user_id)
        .await?;

    if membership.is_none() {
        return Err(TenantError::NotMember);
    }

    let permitted = service
        .authorization()
        .has_permission(ctx, tenant_id, user_id, permission_name)
        .await?;

    if permitted {
        Ok(())
    } else {
        Err(on_missing_permission)
    }
}
