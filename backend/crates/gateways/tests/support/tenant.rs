//! Fake tenant service dependencies for gateway tests.

use std::sync::Arc;

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::repository::{MembershipRepository, TenantRepository};
use domain::{DomainResult, Membership, Tenant, TenantId, TenantRole, TenantSlug, UserId};

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

/// Build a fake tenant service for gateway tests.
pub fn build_test_tenant_service() -> tenant_service::TenantService {
    tenant_service::TenantService::new(
        tenant_service::TenantConfig::default(),
        tenant_service::Dependencies {
            tenant_repository: Arc::new(FakeTenantRepository),
            membership_repository: Arc::new(FakeMembershipRepository),
            audit_logger: Arc::new(super::user::StubUserAuditLogger),
        },
    )
    .expect("valid fake tenant dependencies")
}
