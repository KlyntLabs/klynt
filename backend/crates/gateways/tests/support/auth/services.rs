use std::sync::Arc;

use auth_service::{AuthConfig, AuthService, Dependencies as AuthDependencies};
use base::ports::session::SessionStore;
use chrono::Utc;

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
    let service = AuthService::new(
        AuthConfig::default(),
        AuthDependencies {
            user_repository: user_repository.clone(),
            session_service,
            session_store,
            token_store: Arc::new(FakeTokenStore::default()),
            email_sender: email_sender.clone(),
            audit_logger: Arc::new(StubAuditLogger),
            password_hasher: Arc::new(FakePasswordHasher),
            membership_repository: Arc::new(StubMembershipRepository),
            clock: Arc::new(FixedClock::new(Utc::now())),
        },
    )
    .expect("valid test dependencies");

    (service, user_repository, email_sender)
}
