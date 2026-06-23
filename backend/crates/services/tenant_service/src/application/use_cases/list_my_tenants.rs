//! List my tenants use case.

use base::ctx::ExecutionContext;
use domain::Tenant;

use crate::error::TenantError;
use crate::TenantService;

use super::shared::require_actor;

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
) -> Result<Vec<Tenant>, TenantError> {
    let user_id = require_actor(ctx)?;

    service
        .internal()
        .tenant_repository
        .list_for_user(ctx, user_id)
        .await
        .map_err(TenantError::Domain)
}
