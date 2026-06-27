//! Shared helpers for tenant use cases.

use base::ctx::ExecutionContext;
use domain::{DomainError, Tenant, TenantSlug, UserId};

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

/// Map an authorization-domain error to the tenant-level error expected by callers.
///
/// Missing membership becomes [`TenantError::NotMember`], an explicit permission
/// denial becomes the caller-supplied `permission_error`, and everything else
/// (validation, repository, or infrastructure failures) is preserved as a domain
/// error so it is not misreported as a permission problem.
pub fn map_permission_error(err: DomainError, permission_error: TenantError) -> TenantError {
    match err {
        DomainError::NotFound(_) => TenantError::NotMember,
        DomainError::NotPermitted(_) => permission_error,
        other => TenantError::Domain(other),
    }
}
