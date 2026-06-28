//! Behavioral tests for the facade-based auth service builder.

use std::sync::Arc;

use auth_service::{AuthConfig, AuthService};
use base::ports::repository::UserRepository;
use base::ports::session::SessionStore;
use base::testkit::{
    FakePermissionRepository, FakeRoleRepository, FakeSessionStore,
    FakeTenantDesktopLayoutRepository, FakeTenantInviteRepository, FakeTenantRepository,
    FakeTokenStore, FakeUserRepository, TestClock, TestPasswordHasher,
};
use domain::contracts::auth::RegistrationRequest;
use domain::UserRole;
use infra_facades::{InfraFacade, PersistenceFacade};

mod support;

fn build_facades(
    user_repository: Arc<FakeUserRepository>,
    session_store: Arc<dyn SessionStore>,
    email_sender: Arc<support::FakeEmailSender>,
) -> (Arc<PersistenceFacade>, Arc<InfraFacade>) {
    let persistence_facade = Arc::new(PersistenceFacade::new(
        user_repository,
        Arc::new(FakeTenantRepository),
        Arc::new(support::StubMembershipRepository),
        Arc::new(FakeTenantInviteRepository::new()),
        Arc::new(FakePermissionRepository::new()),
        Arc::new(FakeRoleRepository::new()),
        Arc::new(FakeTenantDesktopLayoutRepository),
        session_store,
        Arc::new(FakeTokenStore::new()),
        Arc::new(support::StubAuditLogger),
    ));
    let clock = Arc::new(TestClock::new());
    let infra_facade = Arc::new(InfraFacade::new(
        Arc::new(TestPasswordHasher::new()),
        email_sender,
        clock,
    ));
    (persistence_facade, infra_facade)
}

#[tokio::test]
async fn builder_with_facades_registers_user() {
    let user_repository = Arc::new(FakeUserRepository::new());
    let email_sender = Arc::new(support::FakeEmailSender::default());
    let session_store: Arc<dyn SessionStore> = Arc::new(FakeSessionStore::new());
    let (persistence_facade, infra_facade) =
        build_facades(user_repository.clone(), session_store, email_sender.clone());

    let service = AuthService::builder()
        .with_config(AuthConfig::default())
        .with_persistence_facade(persistence_facade)
        .with_infra_facade(infra_facade)
        .build()
        .expect("auth service should build from facades");

    let ctx = support::test_ctx();
    let user_id = service
        .register(
            &ctx,
            RegistrationRequest {
                email: "builder@example.com".to_string(),
                username: "builder".to_string(),
                password: "Str0ng!Pass#123".to_string(),
                full_name: Some("Builder Test".to_string()),
                role: UserRole::Student,
                institution_id: None,
            },
        )
        .await
        .expect("registration should succeed");

    let stored = user_repository
        .find_by_id(&ctx, user_id)
        .await
        .expect("lookup should succeed")
        .expect("user should be stored");
    assert_eq!(stored.email.as_str(), "builder@example.com");

    let sent = email_sender.sent.lock().unwrap();
    assert!(sent.iter().any(|(kind, _, _)| kind == "verification"));
}
