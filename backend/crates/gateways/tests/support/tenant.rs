//! Fake tenant service dependencies for gateway tests.

use std::collections::HashMap;
use std::str::FromStr;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::permission::{PermissionRepository, RoleRepository};
use base::ports::repository::{MembershipRepository, TenantRepository};
use base::testkit::FakeSessionStore;
use domain::{
    DomainError, DomainResult, Membership, Permission, PermissionCategory, PermissionId, RoleId,
    Tenant, TenantId, TenantMember, TenantRole, TenantRoleAggregate, TenantSlug, UserId,
};

/// Stub tenant repository that returns empty results.
#[derive(Default)]
pub struct FakeTenantRepository;

#[async_trait]
impl TenantRepository for FakeTenantRepository {
    async fn create(&self, _ctx: &ExecutionContext, tenant: &Tenant) -> DomainResult<Tenant> {
        Ok(tenant.clone())
    }

    async fn find_by_id(
        &self,
        _ctx: &ExecutionContext,
        _id: TenantId,
    ) -> DomainResult<Option<Tenant>> {
        Ok(None)
    }

    async fn find_by_slug(
        &self,
        _ctx: &ExecutionContext,
        _slug: &TenantSlug,
    ) -> DomainResult<Option<Tenant>> {
        Ok(None)
    }

    async fn list_for_user(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
    ) -> DomainResult<Vec<Tenant>> {
        Ok(Vec::new())
    }

    async fn update(&self, _ctx: &ExecutionContext, tenant: &Tenant) -> DomainResult<Tenant> {
        Ok(tenant.clone())
    }

    async fn delete(&self, _ctx: &ExecutionContext, _id: TenantId) -> DomainResult<()> {
        Ok(())
    }

    async fn count_owned_by_user(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
    ) -> DomainResult<i64> {
        Ok(0)
    }
}

/// In-memory tenant repository for stateful gateway tests.
pub struct StatefulFakeTenantRepository {
    tenants: Mutex<HashMap<TenantSlug, Tenant>>,
}

impl Default for StatefulFakeTenantRepository {
    fn default() -> Self {
        Self {
            tenants: Mutex::new(HashMap::new()),
        }
    }
}

impl StatefulFakeTenantRepository {
    /// Insert a tenant into the repository.
    pub fn insert(&self, tenant: Tenant) {
        self.tenants
            .lock()
            .unwrap()
            .insert(tenant.slug.clone(), tenant);
    }

    /// Count active tenants owned by a user.
    fn active_owned_count(&self, user_id: UserId) -> i64 {
        self.tenants
            .lock()
            .unwrap()
            .values()
            .filter(|t| t.owner_id == user_id && t.is_active())
            .count() as i64
    }
}

#[async_trait]
impl TenantRepository for StatefulFakeTenantRepository {
    async fn create(&self, _ctx: &ExecutionContext, tenant: &Tenant) -> DomainResult<Tenant> {
        if self.active_owned_count(tenant.owner_id) >= 2 {
            return Err(DomainError::TenantLimitReached);
        }

        let mut tenants = self.tenants.lock().unwrap();
        if tenants.contains_key(&tenant.slug) {
            return Err(DomainError::conflict("tenant slug already exists"));
        }
        tenants.insert(tenant.slug.clone(), tenant.clone());
        Ok(tenant.clone())
    }

    async fn find_by_id(
        &self,
        _ctx: &ExecutionContext,
        id: TenantId,
    ) -> DomainResult<Option<Tenant>> {
        Ok(self
            .tenants
            .lock()
            .unwrap()
            .values()
            .find(|t| t.id == id)
            .cloned())
    }

    async fn find_by_slug(
        &self,
        _ctx: &ExecutionContext,
        slug: &TenantSlug,
    ) -> DomainResult<Option<Tenant>> {
        Ok(self.tenants.lock().unwrap().get(slug).cloned())
    }

    async fn list_for_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> DomainResult<Vec<Tenant>> {
        Ok(self
            .tenants
            .lock()
            .unwrap()
            .values()
            .filter(|t| t.owner_id == user_id)
            .cloned()
            .collect())
    }

    async fn update(&self, _ctx: &ExecutionContext, tenant: &Tenant) -> DomainResult<Tenant> {
        let mut tenants = self.tenants.lock().unwrap();
        if !tenants.contains_key(&tenant.slug) {
            return Err(DomainError::not_found("tenant"));
        }
        tenants.insert(tenant.slug.clone(), tenant.clone());
        Ok(tenant.clone())
    }

    async fn delete(&self, _ctx: &ExecutionContext, id: TenantId) -> DomainResult<()> {
        let mut tenants = self.tenants.lock().unwrap();
        let slug = tenants
            .values()
            .find(|t| t.id == id)
            .map(|t| t.slug.clone());
        match slug {
            Some(slug) => {
                tenants.remove(&slug);
                Ok(())
            }
            None => Err(DomainError::not_found("tenant")),
        }
    }

    async fn count_owned_by_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> DomainResult<i64> {
        Ok(self.active_owned_count(user_id))
    }
}

/// Stub membership repository that returns empty results.
#[derive(Default)]
pub struct FakeMembershipRepository;

#[async_trait]
impl MembershipRepository for FakeMembershipRepository {
    async fn create(
        &self,
        _ctx: &ExecutionContext,
        membership: &Membership,
    ) -> DomainResult<Membership> {
        Ok(membership.clone())
    }

    async fn find(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _user_id: UserId,
    ) -> DomainResult<Option<Membership>> {
        Ok(None)
    }

    async fn list_for_user(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
    ) -> DomainResult<Vec<Membership>> {
        Ok(Vec::new())
    }

    async fn list_for_tenant(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
    ) -> DomainResult<Vec<Membership>> {
        Ok(Vec::new())
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
        _tenant_id: TenantId,
        _user_id: UserId,
        _role: TenantRole,
    ) -> DomainResult<()> {
        Ok(())
    }

    async fn delete(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _user_id: UserId,
    ) -> DomainResult<()> {
        Ok(())
    }
}

/// In-memory membership repository for stateful gateway tests.
#[derive(Default)]
pub struct StatefulFakeMembershipRepository {
    memberships: Mutex<HashMap<(TenantId, UserId), Membership>>,
}

impl StatefulFakeMembershipRepository {
    /// Insert a membership into the repository.
    pub fn insert(&self, membership: Membership) {
        self.memberships
            .lock()
            .unwrap()
            .insert((membership.tenant_id, membership.user_id), membership);
    }
}

#[async_trait]
impl MembershipRepository for StatefulFakeMembershipRepository {
    async fn create(
        &self,
        _ctx: &ExecutionContext,
        membership: &Membership,
    ) -> DomainResult<Membership> {
        self.insert(membership.clone());
        Ok(membership.clone())
    }

    async fn find(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
    ) -> DomainResult<Option<Membership>> {
        Ok(self
            .memberships
            .lock()
            .unwrap()
            .get(&(tenant_id, user_id))
            .cloned())
    }

    async fn list_for_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> DomainResult<Vec<Membership>> {
        Ok(self
            .memberships
            .lock()
            .unwrap()
            .values()
            .filter(|m| m.user_id == user_id)
            .cloned()
            .collect())
    }

    async fn list_for_tenant(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
    ) -> DomainResult<Vec<Membership>> {
        Ok(self
            .memberships
            .lock()
            .unwrap()
            .values()
            .filter(|m| m.tenant_id == tenant_id)
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
        let mut memberships = self.memberships.lock().unwrap();
        let mut membership = memberships
            .get(&(tenant_id, user_id))
            .cloned()
            .ok_or_else(|| DomainError::not_found("membership"))?;
        membership.set_role(role);
        memberships.insert((tenant_id, user_id), membership);
        Ok(())
    }

    async fn delete(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
    ) -> DomainResult<()> {
        self.memberships
            .lock()
            .unwrap()
            .remove(&(tenant_id, user_id));
        Ok(())
    }
}

/// In-memory permission repository for gateway tests.
///
/// Returns a deterministic catalog seeded from the well-known permission names.
#[derive(Clone)]
pub struct FakePermissionRepository {
    permissions: std::collections::HashMap<String, Permission>,
}

impl Default for FakePermissionRepository {
    fn default() -> Self {
        use domain::all_permission_names;

        let mut permissions = std::collections::HashMap::new();
        for (index, name) in all_permission_names().into_iter().enumerate() {
            let category = name.split('.').next().unwrap_or("tenant");
            let category =
                PermissionCategory::from_str(category).unwrap_or(PermissionCategory::Tenant);
            let permission = Permission {
                id: PermissionId::from_uuid(uuid::Uuid::from_u128(index as u128 + 1)),
                name: name.to_string(),
                description: String::new(),
                category,
            };
            permissions.insert(name.to_string(), permission);
        }
        Self { permissions }
    }
}

#[async_trait]
impl PermissionRepository for FakePermissionRepository {
    async fn list_permissions(&self, _ctx: &ExecutionContext) -> DomainResult<Vec<Permission>> {
        Ok(self.permissions.values().cloned().collect())
    }

    async fn find_permission_by_name(
        &self,
        _ctx: &ExecutionContext,
        name: &str,
    ) -> DomainResult<Option<Permission>> {
        Ok(self.permissions.get(name).cloned())
    }
}

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

/// Build a fake tenant service for gateway tests.
pub fn build_test_tenant_service() -> tenant_service::TenantService {
    tenant_service::TenantService::new(
        tenant_service::TenantConfig::default(),
        tenant_service::Dependencies {
            tenant_repository: Arc::new(FakeTenantRepository),
            membership_repository: Arc::new(FakeMembershipRepository),
            user_repository: Arc::new(super::user::FakeUserServiceRepository::default()),
            permission_repository: Arc::new(FakePermissionRepository::default()),
            role_repository: Arc::new(FakeRoleRepository),
            session_store: Arc::new(FakeSessionStore::new()),
            audit_logger: Arc::new(super::user::StubUserAuditLogger),
        },
    )
    .expect("valid fake tenant dependencies")
}

/// Build a stateful fake tenant service for gateway tests.
pub fn build_stateful_test_tenant_service(
    tenant_repo: Arc<StatefulFakeTenantRepository>,
    membership_repo: Arc<StatefulFakeMembershipRepository>,
    user_repo: Arc<super::user::FakeUserServiceRepository>,
) -> tenant_service::TenantService {
    tenant_service::TenantService::new(
        tenant_service::TenantConfig::default(),
        tenant_service::Dependencies {
            tenant_repository: tenant_repo,
            membership_repository: membership_repo,
            user_repository: user_repo,
            permission_repository: Arc::new(FakePermissionRepository::default()),
            role_repository: Arc::new(FakeRoleRepository),
            session_store: Arc::new(FakeSessionStore::new()),
            audit_logger: Arc::new(super::user::StubUserAuditLogger),
        },
    )
    .expect("valid fake tenant dependencies")
}
