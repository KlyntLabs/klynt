use std::sync::Arc;

use base::testkit::{FakeSessionStore, FakeTenantDesktopLayoutRepository, FakeTokenStore};
use infra_facades::PersistenceFacade;
use session_coordinator::{SessionCoordinator, SessionCoordinatorConfig};

use super::{
    FakeMembershipRepository, FakePermissionRepository, FakeRoleRepository,
    FakeTenantInviteRepository, FakeTenantRepository, StatefulFakeMembershipRepository,
    StatefulFakeRoleRepository, StatefulFakeTenantRepository,
};
use crate::support::user::{FakeUserServiceRepository, StubUserAuditLogger};

#[allow(clippy::too_many_arguments)]
fn build_persistence_facade(
    tenant_repository: Arc<dyn base::ports::repository::TenantRepository>,
    membership_repository: Arc<dyn base::ports::repository::MembershipRepository>,
    user_repository: Arc<dyn base::ports::repository::UserRepository>,
    invite_repository: Arc<dyn base::ports::repository::TenantInviteRepository>,
    permission_repository: Arc<dyn base::ports::PermissionRepository>,
    role_repository: Arc<dyn base::ports::RoleRepository>,
    session_store: Arc<dyn base::ports::session::SessionStore>,
    audit_logger: Arc<dyn base::ports::AuditLogger>,
) -> Arc<PersistenceFacade> {
    Arc::new(PersistenceFacade::new(
        user_repository,
        tenant_repository,
        membership_repository,
        invite_repository,
        permission_repository,
        role_repository,
        Arc::new(FakeTenantDesktopLayoutRepository),
        session_store,
        Arc::new(FakeTokenStore::new()),
        audit_logger,
    ))
}

/// Build a fake tenant service for gateway tests.
pub fn build_test_tenant_service() -> tenant_service::TenantService {
    let session_store = Arc::new(FakeSessionStore::new());
    let session_coordinator = Arc::new(SessionCoordinator::new(
        session_store.clone(),
        SessionCoordinatorConfig::default(),
    ));

    let persistence_facade = build_persistence_facade(
        Arc::new(FakeTenantRepository),
        Arc::new(FakeMembershipRepository),
        Arc::new(FakeUserServiceRepository::default()),
        Arc::new(FakeTenantInviteRepository::default()),
        Arc::new(FakePermissionRepository::default()),
        Arc::new(FakeRoleRepository),
        session_store,
        Arc::new(StubUserAuditLogger),
    );

    tenant_service::TenantService::new(
        tenant_service::TenantConfig::default(),
        tenant_service::Dependencies {
            persistence_facade,
            session_coordinator,
        },
    )
    .expect("valid fake tenant dependencies")
}

/// Build a stateful fake tenant service for gateway tests.
pub fn build_stateful_test_tenant_service(
    tenant_repo: Arc<StatefulFakeTenantRepository>,
    membership_repo: Arc<StatefulFakeMembershipRepository>,
    invite_repo: Arc<FakeTenantInviteRepository>,
    user_repo: Arc<FakeUserServiceRepository>,
) -> tenant_service::TenantService {
    let session_store = Arc::new(FakeSessionStore::new());
    let session_coordinator = Arc::new(SessionCoordinator::new(
        session_store.clone(),
        SessionCoordinatorConfig::default(),
    ));

    let persistence_facade = build_persistence_facade(
        tenant_repo,
        membership_repo,
        user_repo,
        invite_repo,
        Arc::new(FakePermissionRepository::default()),
        Arc::new(StatefulFakeRoleRepository::default()),
        session_store,
        Arc::new(StubUserAuditLogger),
    );

    tenant_service::TenantService::new(
        tenant_service::TenantConfig::default(),
        tenant_service::Dependencies {
            persistence_facade,
            session_coordinator,
        },
    )
    .expect("valid fake tenant dependencies")
}
