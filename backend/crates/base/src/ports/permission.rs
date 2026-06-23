//! Permission and role repository ports.

use async_trait::async_trait;
use domain::{DomainResult, Permission, PermissionId, RoleId, TenantId, TenantRoleAggregate};

use crate::ctx::ExecutionContext;

#[async_trait]
pub trait PermissionRepository: Send + Sync {
    async fn list_permissions(&self, ctx: &ExecutionContext) -> DomainResult<Vec<Permission>>;

    async fn find_permission_by_name(
        &self,
        ctx: &ExecutionContext,
        name: &str,
    ) -> DomainResult<Option<Permission>>;
}

#[async_trait]
pub trait RoleRepository: Send + Sync {
    async fn list_roles_for_tenant(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
    ) -> DomainResult<Vec<TenantRoleAggregate>>;

    async fn find_role_by_name(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        name: &str,
    ) -> DomainResult<Option<TenantRoleAggregate>>;

    async fn find_role_by_id(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
    ) -> DomainResult<Option<TenantRoleAggregate>>;

    async fn create_role(
        &self,
        ctx: &ExecutionContext,
        role: TenantRoleAggregate,
    ) -> DomainResult<()>;

    async fn update_role_permissions(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
        permission_ids: Vec<PermissionId>,
    ) -> DomainResult<()>;

    async fn delete_role(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
    ) -> DomainResult<()>;
}
