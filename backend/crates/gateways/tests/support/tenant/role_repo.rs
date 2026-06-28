use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::permission::{PermissionRepository, RoleRepository};
use domain::{DomainResult, PermissionId, RoleId, TenantId, TenantRoleAggregate};

use super::FakePermissionRepository;

/// Permissive role repository for gateway tests.
///
/// Every membership role is treated as having all known permissions, which is
/// sufficient for the existing gateway route tests that only exercise owners.
#[derive(Default, Clone)]
pub struct FakeRoleRepository;

#[async_trait]
impl RoleRepository for FakeRoleRepository {
    async fn list_roles_for_tenant(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
    ) -> DomainResult<Vec<TenantRoleAggregate>> {
        Ok(Vec::new())
    }

    async fn find_role_by_name(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        name: &str,
    ) -> DomainResult<Option<TenantRoleAggregate>> {
        let permission_ids = FakePermissionRepository::default()
            .list_permissions(ctx)
            .await?
            .into_iter()
            .map(|p| p.id)
            .collect();

        Ok(Some(TenantRoleAggregate {
            id: RoleId::from_uuid(uuid::Uuid::from_u128(1)),
            tenant_id,
            name: name.to_string(),
            description: String::new(),
            is_custom: false,
            is_system: true,
            permission_ids,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        }))
    }

    async fn find_role_by_id(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _role_id: RoleId,
    ) -> DomainResult<Option<TenantRoleAggregate>> {
        Ok(None)
    }

    async fn create_role(
        &self,
        _ctx: &ExecutionContext,
        _role: TenantRoleAggregate,
    ) -> DomainResult<()> {
        Ok(())
    }

    async fn update_role_permissions(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _role_id: RoleId,
        _permission_ids: Vec<PermissionId>,
    ) -> DomainResult<()> {
        Ok(())
    }

    async fn delete_role(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _role_id: RoleId,
    ) -> DomainResult<()> {
        Ok(())
    }
}

/// Stateful fake role repository that remembers created roles.
#[derive(Default, Clone)]
pub struct StatefulFakeRoleRepository {
    roles: Arc<Mutex<Vec<TenantRoleAggregate>>>,
}

impl StatefulFakeRoleRepository {
    pub fn insert(&self, role: TenantRoleAggregate) {
        self.roles.lock().unwrap().push(role);
    }
}

#[async_trait]
impl RoleRepository for StatefulFakeRoleRepository {
    async fn list_roles_for_tenant(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
    ) -> DomainResult<Vec<TenantRoleAggregate>> {
        Ok(self
            .roles
            .lock()
            .unwrap()
            .iter()
            .filter(|r| r.tenant_id == tenant_id)
            .cloned()
            .collect())
    }

    async fn find_role_by_name(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        name: &str,
    ) -> DomainResult<Option<TenantRoleAggregate>> {
        if let Some(role) = self
            .roles
            .lock()
            .unwrap()
            .iter()
            .find(|r| r.tenant_id == tenant_id && r.name == name)
            .cloned()
        {
            return Ok(Some(role));
        }

        // Fallback: owners and tests that haven't seeded a role yet are
        // treated as having all permissions.
        let permission_ids = FakePermissionRepository::default()
            .list_permissions(ctx)
            .await?
            .into_iter()
            .map(|p| p.id)
            .collect();

        Ok(Some(TenantRoleAggregate {
            id: RoleId::from_uuid(uuid::Uuid::from_u128(1)),
            tenant_id,
            name: name.to_string(),
            description: String::new(),
            is_custom: false,
            is_system: true,
            permission_ids,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        }))
    }

    async fn find_role_by_id(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
    ) -> DomainResult<Option<TenantRoleAggregate>> {
        Ok(self
            .roles
            .lock()
            .unwrap()
            .iter()
            .find(|r| r.tenant_id == tenant_id && r.id == role_id)
            .cloned())
    }

    async fn create_role(
        &self,
        _ctx: &ExecutionContext,
        role: TenantRoleAggregate,
    ) -> DomainResult<()> {
        self.roles.lock().unwrap().push(role);
        Ok(())
    }

    async fn update_role_permissions(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
        permission_ids: Vec<PermissionId>,
    ) -> DomainResult<()> {
        let mut roles = self.roles.lock().unwrap();
        if let Some(role) = roles
            .iter_mut()
            .find(|r| r.tenant_id == tenant_id && r.id == role_id)
        {
            role.permission_ids = permission_ids;
            role.updated_at = chrono::Utc::now();
        }
        Ok(())
    }

    async fn delete_role(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
    ) -> DomainResult<()> {
        let mut roles = self.roles.lock().unwrap();
        roles.retain(|r| !(r.tenant_id == tenant_id && r.id == role_id));
        Ok(())
    }
}
