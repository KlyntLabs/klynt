//! Fake auth service dependencies for gateway tests.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use auth_service::{
    application::ports::{AuditLogger, EmailSender, MembershipRepository},
    core::{TokenError, TokenKind, TokenStore},
    AuthConfig, AuthService, Dependencies as AuthDependencies,
};
use base::ctx::ExecutionContext;
use base::ports::audit::{PasswordChangeSnapshot, ProfileUpdateSnapshot};
use base::ports::email::EmailError;
use base::ports::repository::{RepositoryError, UserRepository};
use base::ports::session::{Session, SessionError, SessionKind, SessionStore, SessionToken};
use chrono::{DateTime, Utc};
use domain::{
    DomainResult, Email, Membership, PaginationRequest, TenantId, User, UserId, UserRole,
    UserStatus,
};
use uuid::Uuid;

use super::{FakePasswordHasher, FixedClock};

/// Fake user repository backed by an in-memory map.
pub struct FakeUserRepository {
    users: Mutex<HashMap<String, User>>,
}

impl Default for FakeUserRepository {
    fn default() -> Self {
        Self {
            users: Mutex::new(HashMap::new()),
        }
    }
}

impl FakeUserRepository {
    /// Insert a user into the fake repository.
    pub fn insert(&self, user: User) {
        self.users
            .lock()
            .unwrap()
            .insert(user.email.as_str().to_string(), user);
    }
}

#[async_trait]
impl UserRepository for FakeUserRepository {
    async fn find_by_email(
        &self,
        _ctx: &ExecutionContext,
        email: &Email,
    ) -> Result<Option<User>, RepositoryError> {
        Ok(self.users.lock().unwrap().get(email.as_str()).cloned())
    }

    async fn find_by_id(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<Option<User>, RepositoryError> {
        Ok(self
            .users
            .lock()
            .unwrap()
            .values()
            .find(|u| u.id == user_id)
            .cloned())
    }

    async fn create_pending_user(
        &self,
        _ctx: &ExecutionContext,
        full_name: String,
        email: Email,
        password_hash: String,
        role: UserRole,
        institution_id: Option<Uuid>,
    ) -> Result<UserId, RepositoryError> {
        if self.users.lock().unwrap().contains_key(email.as_str()) {
            return Err(RepositoryError::Conflict(format!(
                "email already registered: {email}"
            )));
        }

        let now = Utc::now();
        let user_id = UserId::new();
        let user = User {
            id: user_id,
            email,
            password_hash,
            full_name: Some(full_name).filter(|n| !n.is_empty()),
            status: UserStatus::Pending,
            role,
            global_role: None,
            email_verified_at: None,
            institution_id,
            terms_accepted_at: now,
            terms_version: "1.0".to_string(),
            created_at: now,
            updated_at: now,
            deleted_at: None,
        };
        self.users
            .lock()
            .unwrap()
            .insert(user.email.as_str().to_string(), user);
        Ok(user_id)
    }

    async fn activate_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), RepositoryError> {
        let mut users = self.users.lock().unwrap();
        for user in users.values_mut() {
            if user.id == user_id {
                user.status = UserStatus::Active;
                return Ok(());
            }
        }
        Err(RepositoryError::NotFound)
    }

    async fn update_password(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        password_hash: String,
    ) -> Result<(), RepositoryError> {
        let mut users = self.users.lock().unwrap();
        for user in users.values_mut() {
            if user.id == user_id {
                user.password_hash = password_hash;
                return Ok(());
            }
        }
        Err(RepositoryError::NotFound)
    }

    async fn update(&self, _ctx: &ExecutionContext, user: User) -> Result<User, RepositoryError> {
        let mut users = self.users.lock().unwrap();
        if !users.contains_key(user.email.as_str()) {
            return Err(RepositoryError::NotFound);
        }
        users.insert(user.email.as_str().to_string(), user.clone());
        Ok(user)
    }

    async fn delete(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), RepositoryError> {
        let mut users = self.users.lock().unwrap();
        for user in users.values_mut() {
            if user.id == user_id {
                user.deleted_at = Some(Utc::now());
                return Ok(());
            }
        }
        Err(RepositoryError::NotFound)
    }

    async fn list(
        &self,
        _ctx: &ExecutionContext,
        pagination: PaginationRequest,
    ) -> Result<(Vec<User>, u64), RepositoryError> {
        let users: Vec<User> = self
            .users
            .lock()
            .unwrap()
            .values()
            .filter(|u| !u.is_deleted())
            .cloned()
            .collect();

        let total = users.len() as u64;
        let offset = pagination.offset() as usize;
        let limit = pagination.page_size as usize;
        let items = users.into_iter().skip(offset).take(limit).collect();

        Ok((items, total))
    }
}

/// Fake session store backed by an in-memory map.
#[derive(Default)]
pub struct FakeSessionStore {
    sessions: Mutex<HashMap<SessionToken, Session>>,
}

#[async_trait]
impl SessionStore for FakeSessionStore {
    async fn create_with_kind(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        expires_at: DateTime<Utc>,
        kind: SessionKind,
        pair_id: Option<Uuid>,
    ) -> Result<SessionToken, SessionError> {
        let token = SessionToken::new();
        let session = Session {
            user_id,
            expires_at,
            kind,
            pair_id,
            tenant_memberships: Vec::new(),
        };
        self.sessions.lock().unwrap().insert(token, session);
        Ok(token)
    }

    async fn find_valid(
        &self,
        _ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<Option<Session>, SessionError> {
        Ok(self
            .sessions
            .lock()
            .unwrap()
            .get(token)
            .filter(|s| !s.is_expired())
            .cloned())
    }

    async fn revoke(
        &self,
        _ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<(), SessionError> {
        self.sessions.lock().unwrap().remove(token);
        Ok(())
    }

    async fn revoke_pair(
        &self,
        _ctx: &ExecutionContext,
        pair_id: Uuid,
        except_token: &SessionToken,
    ) -> Result<(), SessionError> {
        let mut sessions = self.sessions.lock().unwrap();
        sessions
            .retain(|token, session| !(session.pair_id == Some(pair_id) && token != except_token));
        Ok(())
    }
}

type TokenEntry = (UserId, DateTime<Utc>, bool);

/// Fake token store backed by an in-memory map.
#[derive(Default)]
pub struct FakeTokenStore {
    tokens: Mutex<HashMap<(TokenKind, String), TokenEntry>>,
}

#[async_trait]
impl TokenStore for FakeTokenStore {
    async fn save(
        &self,
        _ctx: &ExecutionContext,
        kind: TokenKind,
        user_id: UserId,
        token_hash: String,
        expires_at: DateTime<Utc>,
    ) -> Result<(), TokenError> {
        self.tokens
            .lock()
            .unwrap()
            .insert((kind, token_hash), (user_id, expires_at, false));
        Ok(())
    }

    async fn consume(
        &self,
        _ctx: &ExecutionContext,
        kind: TokenKind,
        token_hash: String,
    ) -> Result<UserId, TokenError> {
        let mut tokens = self.tokens.lock().unwrap();
        match tokens.get_mut(&(kind, token_hash)) {
            Some((user_id, expires_at, used)) => {
                if *used || *expires_at <= Utc::now() {
                    return Err(TokenError::Invalid);
                }
                *used = true;
                Ok(*user_id)
            }
            None => Err(TokenError::Invalid),
        }
    }
}

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

/// Build a fake auth service for tests.
pub fn build_test_auth_service() -> (AuthService, Arc<FakeUserRepository>, Arc<FakeEmailSender>) {
    build_test_auth_service_with_session_store(Arc::new(FakeSessionStore::default()))
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
