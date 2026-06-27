//! In-memory fakes for authorization-related repositories.
//!
//! Supports tenant membership, permission catalog, and tenant role lookups.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;

use crate::ctx::ExecutionContext;
use crate::ports::permission::{PermissionRepository, RoleRepository};
use crate::ports::repository::MembershipRepository;
use domain::membership::{Membership, TenantMember, TenantRole};
use domain::{
    DomainResult, Permission, PermissionId, RoleId, TenantId, TenantRoleAggregate, UserId,
};

/// In-memory membership repository for tests.
#[derive(Clone, Debug, Default)]
pub struct FakeMembershipRepository {
    inner: Arc<Mutex<Inner>>,
}

#[derive(Debug, Default)]
struct Inner {
    memberships: HashMap<(TenantId, UserId), Membership>,
}

impl FakeMembershipRepository {
    /// Create an empty fake repository.
    pub fn new() -> Self {
        Self::default()
    }

    /// Insert a membership into the repository.
    pub fn insert(&self, membership: Membership) {
        let mut inner = self.inner.lock().unwrap();
        inner
            .memberships
            .insert((membership.tenant_id, membership.user_id), membership);
    }
}

#[async_trait]
impl MembershipRepository for FakeMembershipRepository {
    async fn create(
        &self,
        _ctx: &ExecutionContext,
        membership: &Membership,
    ) -> DomainResult<Membership> {
        let mut inner = self.inner.lock().unwrap();
        let key = (membership.tenant_id, membership.user_id);
        inner.memberships.insert(key, membership.clone());
        Ok(membership.clone())
    }

    async fn find(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
    ) -> DomainResult<Option<Membership>> {
        Ok(self
            .inner
            .lock()
            .unwrap()
            .memberships
            .get(&(tenant_id, user_id))
            .cloned())
    }

    async fn list_for_user(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
    ) -> DomainResult<Vec<Membership>> {
        Ok(self
            .inner
            .lock()
            .unwrap()
            .memberships
            .values()
            .cloned()
            .collect())
    }

    async fn list_for_tenant(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
    ) -> DomainResult<Vec<Membership>> {
        Ok(self
            .inner
            .lock()
            .unwrap()
            .memberships
            .values()
            .cloned()
            .collect())
    }

    async fn list_members(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
    ) -> DomainResult<Vec<TenantMember>> {
        Ok(Vec::new())
    }

    async fn update_role(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
        role: TenantRole,
    ) -> DomainResult<()> {
        let mut inner = self.inner.lock().unwrap();
        if let Some(membership) = inner.memberships.get_mut(&(tenant_id, user_id)) {
            membership.role = role;
            Ok(())
        } else {
            Ok(())
        }
    }

    async fn delete(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
    ) -> DomainResult<()> {
        self.inner
            .lock()
            .unwrap()
            .memberships
            .remove(&(tenant_id, user_id));
        Ok(())
    }
}

/// In-memory permission repository for tests.
#[derive(Clone, Debug, Default)]
pub struct FakePermissionRepository {
    inner: Arc<Mutex<PermissionInner>>,
}

#[derive(Debug, Default)]
struct PermissionInner {
    permissions: HashMap<String, Permission>,
}

impl FakePermissionRepository {
    /// Create an empty fake repository.
    pub fn new() -> Self {
        Self::default()
    }

    /// Insert a permission into the repository.
    pub fn insert(&self, permission: Permission) {
        let mut inner = self.inner.lock().unwrap();
        inner
            .permissions
            .insert(permission.name.clone(), permission);
    }
}

#[async_trait]
impl PermissionRepository for FakePermissionRepository {
    async fn list_permissions(&self, _ctx: &ExecutionContext) -> DomainResult<Vec<Permission>> {
        Ok(self
            .inner
            .lock()
            .unwrap()
            .permissions
            .values()
            .cloned()
            .collect())
    }

    async fn find_permission_by_name(
        &self,
        _ctx: &ExecutionContext,
        name: &str,
    ) -> DomainResult<Option<Permission>> {
        Ok(self.inner.lock().unwrap().permissions.get(name).cloned())
    }
}

/// In-memory role repository for tests.
#[derive(Clone, Debug, Default)]
pub struct FakeRoleRepository {
    inner: Arc<Mutex<RoleInner>>,
}

#[derive(Debug, Default)]
struct RoleInner {
    roles: HashMap<(TenantId, String), TenantRoleAggregate>,
    roles_by_id: HashMap<RoleId, TenantRoleAggregate>,
}

impl FakeRoleRepository {
    /// Create an empty fake repository.
    pub fn new() -> Self {
        Self::default()
    }

    /// Insert a role into the repository.
    pub fn insert(&self, role: TenantRoleAggregate) {
        let mut inner = self.inner.lock().unwrap();
        inner
            .roles
            .insert((role.tenant_id, role.name.clone()), role.clone());
        inner.roles_by_id.insert(role.id, role);
    }
}

#[async_trait]
impl RoleRepository for FakeRoleRepository {
    async fn list_roles_for_tenant(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
    ) -> DomainResult<Vec<TenantRoleAggregate>> {
        let inner = self.inner.lock().unwrap();
        Ok(inner
            .roles
            .values()
            .filter(|r| r.tenant_id == tenant_id)
            .cloned()
            .collect())
    }

    async fn find_role_by_name(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        name: &str,
    ) -> DomainResult<Option<TenantRoleAggregate>> {
        Ok(self
            .inner
            .lock()
            .unwrap()
            .roles
            .get(&(tenant_id, name.to_string()))
            .cloned())
    }

    async fn find_role_by_id(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        role_id: RoleId,
    ) -> DomainResult<Option<TenantRoleAggregate>> {
        Ok(self
            .inner
            .lock()
            .unwrap()
            .roles_by_id
            .get(&role_id)
            .cloned())
    }

    async fn create_role(
        &self,
        _ctx: &ExecutionContext,
        role: TenantRoleAggregate,
    ) -> DomainResult<()> {
        let mut inner = self.inner.lock().unwrap();
        inner
            .roles
            .insert((role.tenant_id, role.name.clone()), role.clone());
        inner.roles_by_id.insert(role.id, role);
        Ok(())
    }

    async fn update_role_permissions(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
        permission_ids: Vec<PermissionId>,
    ) -> DomainResult<()> {
        let mut inner = self.inner.lock().unwrap();
        let role_name = inner
            .roles_by_id
            .get(&role_id)
            .map(|role| role.name.clone());

        if let Some(role_name) = role_name {
            inner.roles_by_id.get_mut(&role_id).unwrap().permission_ids = permission_ids.clone();
            if let Some(keyed_role) = inner.roles.get_mut(&(tenant_id, role_name)) {
                keyed_role.permission_ids = permission_ids;
            }
        }
        Ok(())
    }

    async fn delete_role(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
    ) -> DomainResult<()> {
        let mut inner = self.inner.lock().unwrap();
        if let Some(role) = inner.roles_by_id.remove(&role_id) {
            inner.roles.remove(&(tenant_id, role.name));
        }
        Ok(())
    }
}
