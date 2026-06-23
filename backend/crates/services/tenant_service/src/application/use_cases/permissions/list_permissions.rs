//! List the global permission catalog.

use base::ctx::ExecutionContext;
use domain::Permission;

use crate::error::TenantError;
use crate::TenantService;

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
) -> Result<Vec<Permission>, TenantError> {
    service
        .internal()
        .permission_repository
        .list_permissions(ctx)
        .await
        .map_err(TenantError::Domain)
}
