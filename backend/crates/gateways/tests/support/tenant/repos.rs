use std::collections::HashMap;
use std::sync::Mutex;

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::repository::{
    MembershipRepository, RepositoryError, TenantInviteRepository, TenantRepository,
};
use chrono::Utc;
use domain::{
    membership::TenantRole, DomainError, DomainResult, Membership, Tenant, TenantId, TenantInvite,
    TenantMember, TenantMembershipSummary, TenantSlug, UserId,
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
    ) -> DomainResult<Vec<TenantMembershipSummary>> {
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
    ) -> DomainResult<Vec<TenantMembershipSummary>> {
        Ok(self
            .tenants
            .lock()
            .unwrap()
            .values()
            .filter(|t| t.owner_id == user_id)
            .map(|t| TenantMembershipSummary::new(t.clone(), TenantRole::Owner, t.created_at))
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
        _role: domain::membership::TenantRole,
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
        role: domain::membership::TenantRole,
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

/// In-memory tenant invite repository for gateway tests.
#[derive(Default)]
pub struct FakeTenantInviteRepository {
    invites: Mutex<HashMap<String, TenantInvite>>,
}

impl FakeTenantInviteRepository {
    /// Insert an invite into the fake repository.
    pub fn insert(&self, invite: TenantInvite) {
        self.invites
            .lock()
            .unwrap()
            .insert(invite.token.clone(), invite);
    }
}

#[async_trait]
impl TenantInviteRepository for FakeTenantInviteRepository {
    async fn create(
        &self,
        _ctx: &ExecutionContext,
        invite: TenantInvite,
    ) -> Result<TenantInvite, RepositoryError> {
        self.insert(invite.clone());
        Ok(invite)
    }

    async fn find_by_token(
        &self,
        _ctx: &ExecutionContext,
        token: &str,
    ) -> Result<Option<TenantInvite>, RepositoryError> {
        Ok(self.invites.lock().unwrap().get(token).cloned())
    }

    async fn mark_accepted(
        &self,
        _ctx: &ExecutionContext,
        invite_id: uuid::Uuid,
    ) -> Result<(), RepositoryError> {
        let mut invites = self.invites.lock().unwrap();
        let invite = invites
            .values_mut()
            .find(|i| i.id == invite_id)
            .ok_or(RepositoryError::NotFound)?;
        invite.accepted_at = Some(Utc::now());
        Ok(())
    }
}
