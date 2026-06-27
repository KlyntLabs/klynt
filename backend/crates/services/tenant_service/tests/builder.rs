//! Behavioral tests for the facade-based tenant service builder.

use std::sync::Arc;

use base::ctx::{ActorType, ExecutionContext, RequestContext};
use base::ports::SystemClock;
use base::testkit::{
    FakeEmailSender, FakePermissionRepository, FakeRoleRepository, FakeSessionStore,
    FakeTenantDesktopLayoutRepository, FakeTenantInviteRepository, FakeTenantRepository,
    FakeTokenStore, FakeUserRepository, TestPasswordHasher,
};
use infra_facades::{InfraFacade, PersistenceFacade};
use session_coordinator::{SessionCoordinator, SessionCoordinatorConfig};
use tenant_service::{CreateTenantRequest, TenantService};

mod support;

fn test_ctx(user_id: domain::UserId) -> ExecutionContext {
    ExecutionContext::new(RequestContext::new()).with_actor(user_id.inner(), ActorType::User)
}

#[tokio::test]
async fn builder_with_facades_creates_tenant() {
    let user_repository = Arc::new(FakeUserRepository::new());
    let session_store: Arc<dyn base::ports::session::SessionStore> =
        Arc::new(FakeSessionStore::new());
    let persistence_facade = Arc::new(PersistenceFacade::new(
        user_repository.clone(),
        Arc::new(FakeTenantRepository),
        Arc::new(base::testkit::FakeMembershipRepository::new()),
        Arc::new(FakeTenantInviteRepository::new()),
        Arc::new(FakePermissionRepository::new()),
        Arc::new(FakeRoleRepository::new()),
        Arc::new(FakeTenantDesktopLayoutRepository),
        session_store.clone(),
        Arc::new(FakeTokenStore::new()),
        Arc::new(base::testkit::FakeAuditLogger),
    ));
    let infra_facade = Arc::new(InfraFacade::new(
        Arc::new(TestPasswordHasher::new()),
        Arc::new(FakeEmailSender::new()),
        Arc::new(SystemClock),
    ));
    let session_coordinator = Arc::new(SessionCoordinator::new(
        session_store,
        SessionCoordinatorConfig::default(),
    ));

    let service = TenantService::builder()
        .with_persistence_facade(persistence_facade)
        .with_infra_facade(infra_facade)
        .with_session_coordinator(session_coordinator)
        .build()
        .expect("tenant service should build from facades");

    let owner_id = domain::UserId::new();
    let mut owner = base::testkit::sample_user(
        "owner@example.com",
        "Owner",
        "hash-password",
        domain::UserStatus::Active,
    );
    owner.id = owner_id;
    user_repository.insert(owner);

    let ctx = test_ctx(owner_id);
    let summary = service
        .create_tenant(
            &ctx,
            CreateTenantRequest {
                slug: "facade-tenant".to_string(),
                name: "Facade Tenant".to_string(),
            },
        )
        .await
        .expect("tenant should be created");

    assert_eq!(summary.slug.as_str(), "facade-tenant");
    assert_eq!(summary.name, "Facade Tenant");
}
