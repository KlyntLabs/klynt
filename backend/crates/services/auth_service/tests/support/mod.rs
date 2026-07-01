//! Test support utilities and auth-service-specific fake implementations.
//!
//! Cross-cutting test doubles come from [`base::testkit`]; this module
//! keeps only the auth-service-specific fakes.

#![allow(dead_code)]

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;

use auth_service::application::ports::{AuditLogger, EmailSender, MembershipRepository};
use auth_service::{AuthConfig, AuthService, Dependencies};
use base::ctx::ExecutionContext;
use base::ports::audit::{PasswordChangeSnapshot, ProfileUpdateSnapshot, RoleMetadataSnapshot};
use base::ports::email::EmailError;
use base::ports::session::{
    Session, SessionError as BaseSessionError, SessionKind, SessionStore, SessionToken,
};
use base::testkit::{
    sample_user, FakeDesktopAppRepository, FakeSessionStore, FakeTokenStore, FakeUserRepository,
};
use chrono::{DateTime, Utc};
use domain::{
    DomainResult, Email, Membership, PermissionId, RoleId, TenantId, TenantMember, User, UserId,
    UserStatus,
};
use infra_facades::{InfraFacade, PersistenceFacade};
use uuid::Uuid;

pub use session_service::SessionConfig as TestSessionConfig;

pub use base::testkit::{test_ctx, TestClock, TestPasswordHasher};

/// Fake email sender that records sent emails.
#[derive(Default, Clone)]
pub struct FakeEmailSender {
    pub sent: Arc<Mutex<Vec<(String, String, String)>>>,
}

#[async_trait]
impl EmailSender for FakeEmailSender {
    async fn send_verification(
        &self,
        _ctx: &ExecutionContext,
        email: &Email,
        token: &str,
        base_url: &str,
    ) -> Result<(), EmailError> {
        self.sent.lock().unwrap().push((
            "verification".to_string(),
            email.as_str().to_string(),
            format!("{base_url}/verify/{token}"),
        ));
        Ok(())
    }

    async fn send_password_reset(
        &self,
        _ctx: &ExecutionContext,
        email: &Email,
        token: &str,
        base_url: &str,
    ) -> Result<(), EmailError> {
        self.sent.lock().unwrap().push((
            "password_reset".to_string(),
            email.as_str().to_string(),
            format!("{base_url}/reset-password/{token}"),
        ));
        Ok(())
    }
}

/// Stub audit logger that does nothing.
#[derive(Default, Clone)]
pub struct StubAuditLogger;

#[async_trait]
impl AuditLogger for StubAuditLogger {
    async fn log_login_success(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_login_failed(&self, _ctx: &ExecutionContext, _email: &str, _error: &str) {}

    async fn log_user_registered(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_email_verified(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_password_reset(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_session_created(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
        _session_id: String,
    ) {
    }

    async fn log_profile_updated(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
        _before: ProfileUpdateSnapshot,
        _after: ProfileUpdateSnapshot,
    ) {
    }

    async fn log_password_changed(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
        _before: PasswordChangeSnapshot,
        _after: PasswordChangeSnapshot,
    ) {
    }

    async fn log_user_deleted(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_tenant_created(&self, _ctx: &ExecutionContext, _tenant_id: TenantId) {}

    async fn log_tenant_updated(&self, _ctx: &ExecutionContext, _tenant_id: TenantId) {}

    async fn log_tenant_deleted(&self, _ctx: &ExecutionContext, _tenant_id: TenantId) {}

    async fn log_member_added(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _user_id: UserId,
    ) {
    }

    async fn log_member_invited(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _email: &str,
        _role_name: &str,
    ) {
    }

    async fn log_member_role_changed(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _user_id: UserId,
        _old_role: &str,
        _new_role: &str,
    ) {
    }

    async fn log_member_removed(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _user_id: UserId,
    ) {
    }

    async fn log_role_created(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _role_id: RoleId,
        _name: &str,
        _description: &str,
        _permission_ids: Vec<PermissionId>,
    ) {
    }

    async fn log_role_updated(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _role_id: RoleId,
        _before: RoleMetadataSnapshot,
        _after: RoleMetadataSnapshot,
    ) {
    }

    async fn log_role_permissions_updated(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _role_id: RoleId,
        _before_permission_ids: Vec<PermissionId>,
        _after_permission_ids: Vec<PermissionId>,
    ) {
    }

    async fn log_role_deleted(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _role_id: RoleId,
        _before_name: &str,
        _before_description: &str,
        _before_permission_ids: Vec<PermissionId>,
    ) {
    }
}

/// Stub membership repository that returns empty lists and NotFound errors.
#[derive(Default, Clone)]
pub struct StubMembershipRepository;

#[async_trait]
impl MembershipRepository for StubMembershipRepository {
    async fn create(
        &self,
        _ctx: &ExecutionContext,
        _membership: &Membership,
    ) -> DomainResult<Membership> {
        Err(domain::DomainError::not_found("membership"))
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
        Err(domain::DomainError::not_found("membership"))
    }

    async fn delete(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _user_id: UserId,
    ) -> DomainResult<()> {
        Err(domain::DomainError::not_found("membership"))
    }
}

/// Build a test auth service with default fake dependencies.
pub fn build_test_service() -> (AuthService, Arc<FakeUserRepository>, Arc<FakeEmailSender>) {
    let (service, user_repository, email_sender, _) = build_test_service_with_clock();
    (service, user_repository, email_sender)
}

/// Build a test auth service and return the frozen test clock for assertions.
pub fn build_test_service_with_clock() -> (
    AuthService,
    Arc<FakeUserRepository>,
    Arc<FakeEmailSender>,
    Arc<TestClock>,
) {
    let email_sender = Arc::new(FakeEmailSender::default());
    let user_repository = Arc::new(FakeUserRepository::new());
    let clock = Arc::new(TestClock::new());
    let session_store: Arc<dyn SessionStore> = Arc::new(FakeSessionStore::new());
    let session_service = Arc::new(session_service::SessionService::with_clock(
        TestSessionConfig::default(),
        session_store.clone(),
        clock.clone(),
    ));

    let persistence_facade = Arc::new(PersistenceFacade::new(
        user_repository.clone(),
        Arc::new(base::testkit::FakeTenantRepository),
        Arc::new(StubMembershipRepository),
        Arc::new(base::testkit::FakeTenantInviteRepository::new()),
        Arc::new(base::testkit::FakePermissionRepository::new()),
        Arc::new(base::testkit::FakeRoleRepository::new()),
        Arc::new(base::testkit::FakeTenantDesktopLayoutRepository),
        Arc::new(FakeDesktopAppRepository::default()),
        session_store.clone(),
        Arc::new(FakeTokenStore::new()),
        Arc::new(StubAuditLogger),
    ));
    let infra_facade = Arc::new(InfraFacade::new(
        Arc::new(TestPasswordHasher::new()),
        email_sender.clone(),
        clock.clone(),
    ));

    let service = AuthService::new(
        AuthConfig::default(),
        Dependencies {
            persistence_facade,
            infra_facade,
            session_service,
        },
    )
    .expect("valid test dependencies");

    (service, user_repository, email_sender, clock)
}

/// Build a test auth service with a custom session store.
pub fn build_test_service_with_session_store(
    session_store: Arc<dyn SessionStore>,
) -> (
    AuthService,
    Arc<FakeUserRepository>,
    Arc<FakeEmailSender>,
    Arc<TestClock>,
) {
    let email_sender = Arc::new(FakeEmailSender::default());
    let user_repository = Arc::new(FakeUserRepository::new());
    let clock = Arc::new(TestClock::new());
    let session_service = Arc::new(session_service::SessionService::with_clock(
        TestSessionConfig::default(),
        session_store.clone(),
        clock.clone(),
    ));

    let persistence_facade = Arc::new(PersistenceFacade::new(
        user_repository.clone(),
        Arc::new(base::testkit::FakeTenantRepository),
        Arc::new(StubMembershipRepository),
        Arc::new(base::testkit::FakeTenantInviteRepository::new()),
        Arc::new(base::testkit::FakePermissionRepository::new()),
        Arc::new(base::testkit::FakeRoleRepository::new()),
        Arc::new(base::testkit::FakeTenantDesktopLayoutRepository),
        Arc::new(FakeDesktopAppRepository::default()),
        session_store.clone(),
        Arc::new(FakeTokenStore::new()),
        Arc::new(StubAuditLogger),
    ));
    let infra_facade = Arc::new(InfraFacade::new(
        Arc::new(TestPasswordHasher::new()),
        email_sender.clone(),
        clock.clone(),
    ));

    let service = AuthService::new(
        AuthConfig::default(),
        Dependencies {
            persistence_facade,
            infra_facade,
            session_service,
        },
    )
    .expect("valid test dependencies");

    (service, user_repository, email_sender, clock)
}

/// Session store that fails every `create` after `successes_before_failure`.
#[derive(Default, Clone)]
pub struct FailingSessionStore {
    inner: Arc<Mutex<FailingSessionStoreInner>>,
}

#[derive(Default)]
struct FailingSessionStoreInner {
    sessions: HashMap<SessionToken, Session>,
    remaining_successes: usize,
}

impl FailingSessionStore {
    pub fn new(successes_before_failure: usize) -> Self {
        Self {
            inner: Arc::new(Mutex::new(FailingSessionStoreInner {
                sessions: HashMap::new(),
                remaining_successes: successes_before_failure,
            })),
        }
    }

    pub fn session_count(&self) -> usize {
        self.inner.lock().unwrap().sessions.len()
    }
}

#[async_trait]
impl SessionStore for FailingSessionStore {
    async fn create_with_kind(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        expires_at: DateTime<Utc>,
        kind: SessionKind,
        pair_id: Option<Uuid>,
    ) -> Result<SessionToken, BaseSessionError> {
        let mut inner = self.inner.lock().unwrap();
        if inner.remaining_successes == 0 {
            return Err(BaseSessionError::Internal(
                "refresh create failed".to_string(),
            ));
        }
        inner.remaining_successes -= 1;
        let token = SessionToken::new();
        inner.sessions.insert(
            token,
            Session {
                user_id,
                expires_at,
                kind,
                pair_id,
                tenant_memberships: Vec::new(),
            },
        );
        Ok(token)
    }

    async fn find_valid(
        &self,
        _ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<Option<Session>, BaseSessionError> {
        let inner = self.inner.lock().unwrap();
        Ok(inner
            .sessions
            .get(token)
            .filter(|s| !s.is_expired())
            .cloned())
    }

    async fn revoke(
        &self,
        _ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<(), BaseSessionError> {
        let mut inner = self.inner.lock().unwrap();
        inner.sessions.remove(token);
        Ok(())
    }

    async fn revoke_pair(
        &self,
        _ctx: &ExecutionContext,
        pair_id: Uuid,
        except_token: &SessionToken,
    ) -> Result<(), BaseSessionError> {
        let mut inner = self.inner.lock().unwrap();
        inner
            .sessions
            .retain(|token, session| !(session.pair_id == Some(pair_id) && token != except_token));
        Ok(())
    }

    async fn revoke_by_id(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
        _session_id: Uuid,
    ) -> Result<(), BaseSessionError> {
        let mut inner = self.inner.lock().unwrap();
        if inner.remaining_successes == 0 {
            return Err(BaseSessionError::Internal(
                "revoke_by_id failed".to_string(),
            ));
        }
        inner.remaining_successes -= 1;
        Ok(())
    }
}

/// Create a test user model pre-hashed for the default [`TestPasswordHasher`].
pub fn test_user(email: &str, password: &str, status: UserStatus) -> User {
    sample_user(email, "Test User", &format!("hash-{password}"), status)
}
