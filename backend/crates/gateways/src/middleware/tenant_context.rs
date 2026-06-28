//! Tenant context middleware.

use axum::{
    extract::{FromRequestParts, Path, Request},
    middleware::Next,
    response::Response,
};
use base::ctx::ExecutionContext;
use domain::{TenantSlug, UserId};
use std::collections::HashMap;

use crate::state::Services;

const TENANTS_PATH_PREFIX: &str = "/api/v1/tenants/";

/// Execution context with an active tenant resolved from the URL.
#[derive(Debug, Clone)]
pub struct TenantContext(pub ExecutionContext);

impl FromRequestParts<Services> for TenantContext {
    type Rejection = crate::GatewayError;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        state: &Services,
    ) -> Result<Self, Self::Rejection> {
        let ctx = parts
            .extensions
            .get::<ExecutionContext>()
            .cloned()
            .ok_or_else(|| {
                crate::GatewayError::Unauthorized("Authentication required".to_string())
            })?;

        let Path(params): Path<HashMap<String, String>> = Path::from_request_parts(parts, state)
            .await
            .map_err(|e| crate::GatewayError::BadRequest(e.to_string()))?;

        let slug = params
            .get("tenant_slug")
            .ok_or_else(|| crate::GatewayError::BadRequest("Missing tenant slug".to_string()))?;

        let slug =
            TenantSlug::parse(slug).map_err(|e| crate::GatewayError::BadRequest(e.to_string()))?;

        let tenant = state
            .tenant
            .get_by_slug(&ctx, &slug)
            .await?
            .ok_or_else(|| crate::GatewayError::NotFound(format!("Tenant not found: {slug}")))?;

        Ok(Self(ctx.with_tenant(tenant.id)))
    }
}

/// Middleware that resolves the tenant from the URL and verifies membership.
///
/// Routes are nested under `/api/v1/tenants/:tenant_slug`. The tenant slug is
/// parsed from the request URI, the tenant is looked up, and the authenticated
/// actor is checked for membership. On success the request extension is updated
/// with `ctx.with_tenant(tenant.id)`.
pub async fn require_tenant_membership(
    axum::extract::State(services): axum::extract::State<Services>,
    request: Request,
    next: Next,
) -> Result<Response, crate::GatewayError> {
    let (parts, body) = request.into_parts();

    let ctx = parts
        .extensions
        .get::<ExecutionContext>()
        .cloned()
        .ok_or_else(|| crate::GatewayError::Unauthorized("Authentication required".to_string()))?;

    let actor_id = ctx
        .actor_id
        .ok_or_else(|| crate::GatewayError::Unauthorized("Authentication required".to_string()))?;

    let slug = extract_tenant_slug(parts.uri.path())
        .ok_or_else(|| crate::GatewayError::BadRequest("Missing tenant slug".to_string()))?;

    let slug =
        TenantSlug::parse(slug).map_err(|e| crate::GatewayError::BadRequest(e.to_string()))?;

    let tenant = services
        .tenant
        .get_by_slug(&ctx, &slug)
        .await?
        .ok_or_else(|| crate::GatewayError::NotFound(format!("Tenant not found: {slug}")))?;

    services
        .tenant
        .ensure_member(&ctx, tenant.id, UserId::from_uuid(actor_id))
        .await?;

    let mut request = Request::from_parts(parts, body);
    request.extensions_mut().insert(ctx.with_tenant(tenant.id));
    Ok(next.run(request).await)
}

/// Extract the first path segment after `/api/v1/tenants/`.
///
/// Handles both the full request URI path and the path as seen by a nested
/// router (which may already have the prefix stripped).
fn extract_tenant_slug(path: &str) -> Option<&str> {
    let after_prefix = path.strip_prefix(TENANTS_PATH_PREFIX).unwrap_or(path);
    let without_leading_slash = after_prefix.strip_prefix('/').unwrap_or(after_prefix);
    let end = without_leading_slash
        .find('/')
        .unwrap_or(without_leading_slash.len());
    let slug = &without_leading_slash[..end];
    if slug.is_empty() {
        return None;
    }
    Some(slug)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_tenant_slug_variants() {
        assert_eq!(extract_tenant_slug("/api/v1/tenants/acme"), Some("acme"));
        assert_eq!(
            extract_tenant_slug("/api/v1/tenants/acme/members"),
            Some("acme")
        );
        assert_eq!(extract_tenant_slug("/api/v1/tenants/"), None);
        assert_eq!(extract_tenant_slug("/api/v1/users/me"), Some("api"));
        assert_eq!(extract_tenant_slug("acme"), Some("acme"));
        assert_eq!(extract_tenant_slug("acme/members"), Some("acme"));
    }
}
