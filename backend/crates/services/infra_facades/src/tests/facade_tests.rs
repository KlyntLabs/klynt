use std::sync::Arc;

use base::testkit::{
    FakeAuditLogger, FakeDesktopAppRepository, FakeEmailSender, FakeMembershipRepository,
    FakePermissionRepository, FakeRoleRepository, FakeSessionStore,
    FakeTenantDesktopLayoutRepository, FakeTenantInviteRepository, FakeTenantRepository,
    FakeTokenStore, FakeUserRepository, TestClock, TestPasswordHasher,
};

use crate::{InfraFacade, PersistenceFacade};

#[test]
fn persistence_facade_stores_adapters() {
    let user_repository: Arc<dyn base::ports::UserRepository> = Arc::new(FakeUserRepository::new());
    let tenant_repository: Arc<dyn base::ports::repository::TenantRepository> =
        Arc::new(FakeTenantRepository);
    let membership_repository: Arc<dyn base::ports::repository::MembershipRepository> =
        Arc::new(FakeMembershipRepository::new());
    let invite_repository: Arc<dyn base::ports::repository::TenantInviteRepository> =
        Arc::new(FakeTenantInviteRepository::new());
    let permission_repository: Arc<dyn base::ports::permission::PermissionRepository> =
        Arc::new(FakePermissionRepository::new());
    let role_repository: Arc<dyn base::ports::permission::RoleRepository> =
        Arc::new(FakeRoleRepository::new());
    let layout_repository: Arc<dyn base::ports::repository::TenantDesktopLayoutRepository> =
        Arc::new(FakeTenantDesktopLayoutRepository);
    let app_repository: Arc<dyn base::ports::repository::DesktopAppRepository> =
        Arc::new(FakeDesktopAppRepository::new());
    let session_store: Arc<dyn base::ports::SessionStore> = Arc::new(FakeSessionStore::new());
    let token_store: Arc<dyn base::ports::TokenStore> = Arc::new(FakeTokenStore::new());
    let audit_logger: Arc<dyn base::ports::AuditLogger> = Arc::new(FakeAuditLogger);

    let facade = PersistenceFacade::new(
        user_repository.clone(),
        tenant_repository.clone(),
        membership_repository.clone(),
        invite_repository.clone(),
        permission_repository.clone(),
        role_repository.clone(),
        layout_repository.clone(),
        app_repository.clone(),
        session_store.clone(),
        token_store.clone(),
        audit_logger.clone(),
    );

    assert!(Arc::ptr_eq(&facade.user_repository, &user_repository));
    assert!(Arc::ptr_eq(&facade.tenant_repository, &tenant_repository));
    assert!(Arc::ptr_eq(
        &facade.membership_repository,
        &membership_repository
    ));
    assert!(Arc::ptr_eq(&facade.invite_repository, &invite_repository));
    assert!(Arc::ptr_eq(
        &facade.permission_repository,
        &permission_repository
    ));
    assert!(Arc::ptr_eq(&facade.role_repository, &role_repository));
    assert!(Arc::ptr_eq(&facade.layout_repository, &layout_repository));
    assert!(Arc::ptr_eq(&facade.app_repository, &app_repository));
    assert!(Arc::ptr_eq(&facade.session_store, &session_store));
    assert!(Arc::ptr_eq(&facade.token_store, &token_store));
    assert!(Arc::ptr_eq(&facade.audit_logger, &audit_logger));
}

#[test]
fn infra_facade_stores_adapters() {
    let password_hasher: Arc<dyn base::ports::PasswordHasher> = Arc::new(TestPasswordHasher::new());
    let email_sender: Arc<dyn base::ports::EmailSender> = Arc::new(FakeEmailSender::new());
    let clock: Arc<dyn base::ports::Clock> = Arc::new(TestClock::new());

    let facade = InfraFacade::new(password_hasher.clone(), email_sender.clone(), clock.clone());

    assert!(Arc::ptr_eq(&facade.password_hasher, &password_hasher));
    assert!(Arc::ptr_eq(&facade.email_sender, &email_sender));
    assert!(Arc::ptr_eq(&facade.clock, &clock));
}
