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
