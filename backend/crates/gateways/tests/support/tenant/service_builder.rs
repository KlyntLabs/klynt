use std::sync::Arc;

use base::testkit::FakeSessionStore;

use super::{
    FakeMembershipRepository, FakePermissionRepository, FakeRoleRepository, FakeTenantRepository,
    StatefulFakeMembershipRepository, StatefulFakeRoleRepository, StatefulFakeTenantRepository,
};
use crate::support::user::{FakeUserServiceRepository, StubUserAuditLogger};

/// Build a fake tenant service for gateway tests.
pub fn build_test_tenant_service() -> tenant_service::TenantService {
    tenant_service::TenantService::new(
        tenant_service::TenantConfig::default(),
        tenant_service::Dependencies {
            tenant_repository: Arc::new(FakeTenantRepository),
            membership_repository: Arc::new(FakeMembershipRepository),
            user_repository: Arc::new(FakeUserServiceRepository::default()),
            permission_repository: Arc::new(FakePermissionRepository::default()),
            role_repository: Arc::new(FakeRoleRepository),
            session_store: Arc::new(FakeSessionStore::new()),
            audit_logger: Arc::new(StubUserAuditLogger),
        },
    )
    .expect("valid fake tenant dependencies")
}

/// Build a stateful fake tenant service for gateway tests.
pub fn build_stateful_test_tenant_service(
    tenant_repo: Arc<StatefulFakeTenantRepository>,
    membership_repo: Arc<StatefulFakeMembershipRepository>,
    user_repo: Arc<FakeUserServiceRepository>,
) -> tenant_service::TenantService {
    tenant_service::TenantService::new(
        tenant_service::TenantConfig::default(),
        tenant_service::Dependencies {
            tenant_repository: tenant_repo,
            membership_repository: membership_repo,
            user_repository: user_repo,
            permission_repository: Arc::new(FakePermissionRepository::default()),
            role_repository: Arc::new(StatefulFakeRoleRepository::default()),
            session_store: Arc::new(FakeSessionStore::new()),
            audit_logger: Arc::new(StubUserAuditLogger),
        },
    )
    .expect("valid fake tenant dependencies")
}
