//! Behavioral tests for the facade-based user service builder.

use std::sync::Arc;

use base::testkit::{
    FakeDesktopAppRepository, FakeMembershipRepository, FakePermissionRepository,
    FakeRoleRepository, FakeSessionStore, FakeTenantDesktopLayoutRepository,
    FakeTenantInviteRepository, FakeTenantRepository, FakeTokenStore, FakeUserRepository,
    TestClock, TestPasswordHasher,
};
use domain::UserId;
use infra_facades::{InfraFacade, PersistenceFacade};
use user_service::{UserConfig, UserService};

mod support;

#[tokio::test]
async fn builder_with_facades_gets_user() {
    let repo = Arc::new(FakeUserRepository::new());
    let clock = Arc::new(TestClock::new());
    let persistence_facade = Arc::new(PersistenceFacade::new(
        repo.clone(),
        Arc::new(FakeTenantRepository),
        Arc::new(FakeMembershipRepository::new()),
        Arc::new(FakeTenantInviteRepository::new()),
        Arc::new(FakePermissionRepository::new()),
        Arc::new(FakeRoleRepository::new()),
        Arc::new(FakeTenantDesktopLayoutRepository),
        Arc::new(FakeDesktopAppRepository::default()),
        Arc::new(FakeSessionStore::new()),
        Arc::new(FakeTokenStore::new()),
        Arc::new(support::TestAuditLogger::new()),
    ));
    let infra_facade = Arc::new(InfraFacade::new(
        Arc::new(TestPasswordHasher::with_prefix("")),
        Arc::new(base::testkit::FakeEmailSender::new()),
        clock,
    ));

    let service = UserService::builder()
        .with_config(UserConfig::default())
        .with_persistence_facade(persistence_facade)
        .with_infra_facade(infra_facade)
        .build()
        .expect("user service should build from facades");

    let user_id = UserId::new();
    let mut user = support::sample_user("builder@example.com", "Builder", "hash-password");
    user.id = user_id;
    repo.insert(user);

    let ctx = support::test_ctx();
    let profile = service
        .get_user(&ctx, user_id)
        .await
        .expect("user should exist");

    assert_eq!(profile.email, "builder@example.com");
    assert_eq!(profile.full_name, Some("Builder".to_string()));
}
