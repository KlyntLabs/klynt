//! Create a custom tenant role.

use base::ctx::ExecutionContext;
use domain::permission;
use domain::{RoleId, TenantRoleAggregate};

use crate::error::TenantError;
use crate::{CreateRoleRequest, TenantService};

use super::super::shared::{fetch_tenant, require_actor};

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
    request: CreateRoleRequest,
) -> Result<TenantRoleAggregate, TenantError> {
    let user_id = require_actor(ctx)?;
    let tenant = fetch_tenant(service, ctx, slug).await?;

    service
        .authorization()
        .require_permission_with_context(ctx, tenant.id, user_id, permission::tenant::MANAGE_ROLES)
        .await
        .map_err(|e| super::super::shared::map_permission_error(e, TenantError::NotAdmin))?;

    if request.name.trim().is_empty() {
        return Err(TenantError::Domain(domain::DomainError::validation(
            "role name is required",
        )));
    }

    let role = TenantRoleAggregate::new(
        RoleId::new(),
        tenant.id,
        request.name.trim().to_string(),
        request.description,
    )
    .with_permissions(request.permission_ids);

    service
        .internal()
        .persistence_facade
        .role_repository
        .create_role(ctx, role.clone())
        .await
        .map_err(TenantError::Domain)?;

    service
        .internal()
        .persistence_facade
        .audit_logger
        .log_role_created(
            ctx,
            tenant.id,
            role.id,
            &role.name,
            &role.description,
            role.permission_ids.clone(),
        )
        .await;

    Ok(role)
}
