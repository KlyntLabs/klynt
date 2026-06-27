use std::sync::Arc;

use auth_service::{AuthConfig, AuthService, Dependencies as AuthDependencies};
use base::ports::session::SessionStore;
use base::testkit::{
    FakePermissionRepository, FakeRoleRepository, FakeTenantDesktopLayoutRepository,
    FakeTenantInviteRepository, FakeTenantRepository,
};
use chrono::Utc;
use infra_facades::{InfraFacade, PersistenceFacade};

use super::{
    FakeEmailSender, FakeTokenStore, FakeUserRepository, StubAuditLogger, StubMembershipRepository,
};
use crate::support::{FakePasswordHasher, FixedClock};

/// Build a fake auth service for tests.
pub fn build_test_auth_service() -> (AuthService, Arc<FakeUserRepository>, Arc<FakeEmailSender>) {
    build_test_auth_service_with_session_store(Arc::new(super::FakeSessionStore::default()))
}

/// Build a fake auth service with a shared session store.
pub fn build_test_auth_service_with_session_store(
    session_store: Arc<dyn SessionStore>,
) -> (AuthService, Arc<FakeUserRepository>, Arc<FakeEmailSender>) {
    let email_sender = Arc::new(FakeEmailSender::default());
    let user_repository = Arc::new(FakeUserRepository::default());
    let session_service = Arc::new(session_service::SessionService::new(
        session_service::SessionConfig::default(),
        session_store.clone(),
    ));
    let clock = Arc::new(FixedClock::new(Utc::now()));
    let persistence_facade = Arc::new(PersistenceFacade::new(
        user_repository.clone(),
        Arc::new(FakeTenantRepository),
        Arc::new(StubMembershipRepository),
        Arc::new(FakeTenantInviteRepository::new()),
        Arc::new(FakePermissionRepository::new()),
        Arc::new(FakeRoleRepository::new()),
        Arc::new(FakeTenantDesktopLayoutRepository),
        session_store,
        Arc::new(FakeTokenStore::default()),
        Arc::new(StubAuditLogger),
    ));
    let infra_facade = Arc::new(InfraFacade::new(
        Arc::new(FakePasswordHasher),
        email_sender.clone(),
        clock,
    ));
    let service = AuthService::new(
        AuthConfig::default(),
        AuthDependencies {
            persistence_facade,
            infra_facade,
            session_service,
        },
    )
    .expect("valid test dependencies");

    (service, user_repository, email_sender)
}
