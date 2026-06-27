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
        let membership = match self.resolve_membership(ctx, tenant_id, user_id).await? {
            Some(m) => m,
            None => return Ok(false),
        };

        let role = match self.resolve_role(ctx, tenant_id, &membership.role).await? {
            Some(r) => r,
            None => return Ok(false),
        };

        let permission = match self.resolve_permission(ctx, permission_name).await? {
            Some(p) => p,
            None => return Ok(false),
        };

        Ok(self.role_has_permission(&role, &permission.id))
    }

    /// Ensure user has permission within tenant, returning domain error on failure.
    pub(crate) async fn require_permission_with_context(
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

    /// Private: resolve membership or return not-permitted.
    async fn resolve_membership(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
    ) -> DomainResult<Option<domain::Membership>> {
        self.membership_repository
            .find(ctx, tenant_id, user_id)
            .await
    }

    /// Private: resolve role aggregate or return not-permitted.
    async fn resolve_role(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        role: &domain::membership::TenantRole,
    ) -> DomainResult<Option<domain::TenantRoleAggregate>> {
        self.role_repository
            .find_role_by_name(ctx, tenant_id, role.as_str())
            .await
    }

    /// Private: resolve permission or return not-permitted.
    async fn resolve_permission(
        &self,
        ctx: &ExecutionContext,
        permission_name: &str,
    ) -> DomainResult<Option<domain::Permission>> {
        self.permission_repository
            .find_permission_by_name(ctx, permission_name)
            .await
    }

    /// Private: check if role grants permission.
    fn role_has_permission(
        &self,
        role: &domain::TenantRoleAggregate,
        permission_id: &domain::PermissionId,
    ) -> bool {
        role.permission_ids.contains(permission_id)
    }
}
