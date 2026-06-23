//! Tenant-scoped authorization policy engine.

use std::sync::Arc;

use base::ctx::ExecutionContext;
use base::ports::permission::{PermissionRepository, RoleRepository};
use base::ports::repository::MembershipRepository;
use domain::{DomainError, DomainResult, TenantId, UserId};

/// Authorization decisions for tenant-scoped actions.
///
/// Resolves a user's membership role into the corresponding tenant role
/// aggregate and checks whether that role grants a named permission.
pub struct AuthorizationService {
    membership_repository: Arc<dyn MembershipRepository>,
    permission_repository: Arc<dyn PermissionRepository>,
    role_repository: Arc<dyn RoleRepository>,
}

impl AuthorizationService {
    /// Create a new authorization service from its required repositories.
    pub fn new(
        membership_repository: Arc<dyn MembershipRepository>,
        permission_repository: Arc<dyn PermissionRepository>,
        role_repository: Arc<dyn RoleRepository>,
    ) -> Self {
        Self {
            membership_repository,
            permission_repository,
            role_repository,
        }
    }

    /// Return `Ok(())` if the user has `permission_name` within the tenant.
    pub async fn ensure_permission(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
        permission_name: &str,
    ) -> DomainResult<()> {
        let permitted = self
            .has_permission(ctx, tenant_id, user_id, permission_name)
            .await?;

        if permitted {
            Ok(())
        } else {
            Err(DomainError::NotPermitted(format!(
                "missing permission: {permission_name}"
            )))
        }
    }

    /// Return whether the user has `permission_name` within the tenant.
    pub async fn has_permission(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
        permission_name: &str,
    ) -> DomainResult<bool> {
        let membership = self
            .membership_repository
            .find(ctx, tenant_id, user_id)
            .await?;

        let membership = match membership {
            Some(m) => m,
            None => return Ok(false),
        };

        let role = self
            .role_repository
            .find_role_by_name(ctx, tenant_id, membership.role.as_str())
            .await?;

        let role = match role {
            Some(r) => r,
            None => return Ok(false),
        };

        let permission = self
            .permission_repository
            .find_permission_by_name(ctx, permission_name)
            .await?;

        let permission_id = match permission {
            Some(p) => p.id,
            None => return Ok(false),
        };

        Ok(role.permission_ids.contains(&permission_id))
    }
}
