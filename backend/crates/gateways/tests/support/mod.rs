//! Test support utilities and fake implementations for the gateway.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use auth_service::{
    application::ports::{AuditLogger, EmailSender, UserRepository},
    domain::{Session, SessionStore, SessionToken, TokenKind, TokenStore},
    error::AuthError,
    AuthConfig, AuthService, Dependencies as AuthDependencies,
};
use chrono::{DateTime, Utc};
use klynt_base::ctx::ExecutionContext;
use klynt_base::ports::{Clock, PasswordHashError, PasswordHasher};
use klynt_common::domain::{Email, User, UserRole, UserStatus};
use klynt_common::util::UserId;
use user_service::{
    application::ports::{AuditLogger as UserAuditLogger, UserRepository as UserRepoPort},
    error::UserError,
    Dependencies as UserDependencies, UserConfig, UserService,
};

/// Fixed clock for deterministic tests.
#[derive(Clone)]
pub struct FixedClock {
    pub now: DateTime<Utc>,
}

impl FixedClock {
    pub fn new(now: DateTime<Utc>) -> Self {
        Self { now }
    }
}

impl Clock for FixedClock {
    fn now(&self) -> DateTime<Utc> {
        self.now
    }
}

/// Fake password hasher that accepts any password matching "hash-{password}".
#[derive(Default, Clone)]
pub struct FakePasswordHasher;

#[async_trait]
impl PasswordHasher for FakePasswordHasher {
    async fn hash(&self, password: &str) -> Result<String, PasswordHashError> {
        Ok(format!("hash-{password}"))
    }

    async fn verify(&self, password: &str, hash: &str) -> Result<bool, PasswordHashError> {
        Ok(hash == format!("hash-{password}"))
    }
}

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

#[async_trait]
impl UserRepository for FakeUserRepository {
    async fn find_by_email(
        &self,
        _ctx: &ExecutionContext,
        email: &str,
    ) -> Result<Option<User>, AuthError> {
        Ok(self.users.lock().unwrap().get(email).cloned())
    }

    async fn create_pending_user(
        &self,
        _ctx: &ExecutionContext,
        full_name: Option<String>,
        email: &str,
        password_hash: &str,
    ) -> Result<UserId, AuthError> {
        let user_id = UserId::new();
        let user = User {
            id: user_id,
            email: Email::new(email.to_string()),
            password_hash: password_hash.to_string(),
            full_name,
            status: UserStatus::Pending,
            role: UserRole::Student,
            created_at: Utc::now(),
            updated_at: None,
            deleted_at: None,
        };
        self.users.lock().unwrap().insert(email.to_string(), user);
        Ok(user_id)
    }

    async fn activate_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), AuthError> {
        let mut users = self.users.lock().unwrap();
        for user in users.values_mut() {
            if user.id == user_id {
                user.status = UserStatus::Active;
                return Ok(());
            }
        }
        Err(AuthError::UserNotFound)
    }

    async fn update_password(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        password_hash: &str,
    ) -> Result<(), AuthError> {
        let mut users = self.users.lock().unwrap();
        for user in users.values_mut() {
            if user.id == user_id {
                user.password_hash = password_hash.to_string();
                return Ok(());
            }
        }
        Err(AuthError::UserNotFound)
    }
}

/// Fake session store backed by an in-memory map.
#[derive(Default)]
pub struct FakeSessionStore {
    sessions: Mutex<HashMap<SessionToken, Session>>,
}

#[async_trait]
impl SessionStore for FakeSessionStore {
    async fn create(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        expires_at: DateTime<Utc>,
    ) -> Result<SessionToken, AuthError> {
        let token = SessionToken::new();
        let session = Session {
            token,
            user_id,
            expires_at,
        };
        self.sessions.lock().unwrap().insert(token, session);
        Ok(token)
    }

    async fn find_valid(
        &self,
        _ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<Option<Session>, AuthError> {
        Ok(self
            .sessions
            .lock()
            .unwrap()
            .get(token)
            .filter(|s| !s.is_expired())
            .cloned())
    }

    async fn revoke(&self, _ctx: &ExecutionContext, token: &SessionToken) -> Result<(), AuthError> {
        self.sessions.lock().unwrap().remove(token);
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
        kind: TokenKind,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), AuthError> {
        self.tokens
            .lock()
            .unwrap()
            .insert((kind, token_hash.to_string()), (user_id, expires_at, false));
        Ok(())
    }

    async fn consume(&self, kind: TokenKind, token_hash: &str) -> Result<UserId, AuthError> {
        let mut tokens = self.tokens.lock().unwrap();
        match tokens.get_mut(&(kind, token_hash.to_string())) {
            Some((user_id, expires_at, used)) => {
                if *used || *expires_at <= Utc::now() {
                    return Err(AuthError::InvalidToken);
                }
                *used = true;
                Ok(*user_id)
            }
            None => Err(AuthError::InvalidToken),
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
        email: &str,
        token: &str,
        base_url: &str,
    ) -> Result<(), AuthError> {
        self.sent.lock().unwrap().push((
            "verification".to_string(),
            email.to_string(),
            format!("{base_url}/verify/{token}"),
        ));
        Ok(())
    }

    async fn send_password_reset(
        &self,
        _ctx: &ExecutionContext,
        email: &str,
        token: &str,
        base_url: &str,
    ) -> Result<(), AuthError> {
        self.sent.lock().unwrap().push((
            "password_reset".to_string(),
            email.to_string(),
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
    async fn log_login_failed(&self, _ctx: &ExecutionContext, _email: &str, _error: String) {}
    async fn log_user_registered(&self, _ctx: &ExecutionContext, _user_id: UserId) {}
    async fn log_email_verified(&self, _ctx: &ExecutionContext, _user_id: UserId) {}
    async fn log_password_reset(&self, _ctx: &ExecutionContext, _user_id: UserId) {}
    async fn log_session_created(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
        _session_id: uuid::Uuid,
    ) {
    }
}

/// Build a fake auth service for tests.
pub fn build_test_auth_service() -> (AuthService, Arc<FakeUserRepository>, Arc<FakeEmailSender>) {
    let email_sender = Arc::new(FakeEmailSender::default());
    let user_repository = Arc::new(FakeUserRepository::default());
    let service = AuthService::new(
        AuthConfig::default(),
        AuthDependencies {
            user_repository: user_repository.clone(),
            session_store: Arc::new(FakeSessionStore::default()),
            token_store: Arc::new(FakeTokenStore::default()),
            email_sender: email_sender.clone(),
            audit_logger: Arc::new(StubAuditLogger),
            password_hasher: Arc::new(FakePasswordHasher),
            clock: Arc::new(FixedClock::new(Utc::now())),
        },
    )
    .expect("valid test dependencies");

    (service, user_repository, email_sender)
}

/// Fake persistence session store for middleware tests.
#[derive(Default)]
pub struct FakePersistenceSessionStore {
    sessions: Mutex<
        HashMap<klynt_persistence::session::SessionToken, klynt_persistence::session::Session>,
    >,
}

#[async_trait]
impl klynt_persistence::session::SessionStore for FakePersistenceSessionStore {
    async fn create(
        &self,
        _ctx: &ExecutionContext,
        user_id: klynt_common::util::UserId,
        expires_at: DateTime<Utc>,
    ) -> Result<klynt_persistence::session::SessionToken, klynt_common::domain::DomainError> {
        let token = klynt_persistence::session::SessionToken::new();
        let session = klynt_persistence::session::Session {
            token,
            user_id,
            expires_at,
        };
        self.sessions.lock().unwrap().insert(token, session);
        Ok(token)
    }

    async fn find_valid(
        &self,
        _ctx: &ExecutionContext,
        token: &klynt_persistence::session::SessionToken,
    ) -> Result<Option<klynt_persistence::session::Session>, klynt_common::domain::DomainError>
    {
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
        token: &klynt_persistence::session::SessionToken,
    ) -> Result<(), klynt_common::domain::DomainError> {
        self.sessions.lock().unwrap().remove(token);
        Ok(())
    }
}

/// Fake user repository for user_service tests.
#[derive(Default)]
pub struct FakeUserServiceRepository {
    users: Mutex<HashMap<klynt_common::util::UserId, User>>,
}

impl FakeUserServiceRepository {
    /// Insert a user into the fake repository.
    pub fn insert(&self, user: User) {
        self.users.lock().unwrap().insert(user.id, user);
    }
}

#[async_trait]
impl UserRepoPort for FakeUserServiceRepository {
    async fn find_by_id(
        &self,
        _ctx: &ExecutionContext,
        id: klynt_common::util::UserId,
    ) -> Result<Option<User>, UserError> {
        Ok(self.users.lock().unwrap().get(&id).cloned())
    }

    async fn update(&self, _ctx: &ExecutionContext, user: &User) -> Result<(), UserError> {
        self.users.lock().unwrap().insert(user.id, user.clone());
        Ok(())
    }

    async fn delete(
        &self,
        _ctx: &ExecutionContext,
        id: klynt_common::util::UserId,
    ) -> Result<(), UserError> {
        let mut users = self.users.lock().unwrap();
        let mut user = users.get(&id).ok_or(UserError::NotFound)?.clone();
        user.deleted_at = Some(Utc::now());
        users.insert(id, user);
        Ok(())
    }

    async fn list(
        &self,
        _ctx: &ExecutionContext,
        pagination: klynt_common::domain::PaginationRequest,
    ) -> Result<(Vec<User>, u64), UserError> {
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

/// Stub audit logger for user_service tests.
#[derive(Default, Clone)]
pub struct StubUserAuditLogger;

#[async_trait]
impl UserAuditLogger for StubUserAuditLogger {
    async fn log_profile_updated(
        &self,
        _ctx: &ExecutionContext,
        _user_id: klynt_common::util::UserId,
    ) {
    }
    async fn log_password_changed(
        &self,
        _ctx: &ExecutionContext,
        _user_id: klynt_common::util::UserId,
    ) {
    }
    async fn log_user_deleted(
        &self,
        _ctx: &ExecutionContext,
        _user_id: klynt_common::util::UserId,
    ) {
    }
}

/// Fake password hasher for user_service tests.
#[derive(Default, Clone)]
pub struct FakeUserPasswordHasher;

#[async_trait]
impl PasswordHasher for FakeUserPasswordHasher {
    async fn verify(&self, password: &str, hash: &str) -> Result<bool, PasswordHashError> {
        Ok(password == hash)
    }

    async fn hash(&self, password: &str) -> Result<String, PasswordHashError> {
        Ok(password.to_string())
    }
}

/// Fixed clock for user_service tests.
#[derive(Clone)]
pub struct FixedUserClock {
    pub now: DateTime<Utc>,
}

impl Clock for FixedUserClock {
    fn now(&self) -> DateTime<Utc> {
        self.now
    }
}

/// Build a fake user service and its backing repository for tests.
pub fn build_test_user_service() -> (UserService, Arc<FakeUserServiceRepository>) {
    let repo = Arc::new(FakeUserServiceRepository::default());
    let service = UserService::new(
        UserConfig::default(),
        UserDependencies {
            user_repository: repo.clone(),
            audit_logger: Arc::new(StubUserAuditLogger),
            password_hasher: Arc::new(FakeUserPasswordHasher),
            clock: Arc::new(FixedUserClock { now: Utc::now() }),
        },
    )
    .expect("valid test dependencies");

    (service, repo)
}

/// Build test gateway services with exposed fakes for protected route tests.
pub fn build_test_services_with_fakes() -> (
    gateways::state::Services,
    Arc<FakePersistenceSessionStore>,
    Arc<FakeUserServiceRepository>,
) {
    let (auth_service, _, _) = build_test_auth_service();
    let session_store = Arc::new(FakePersistenceSessionStore::default());
    let (user_service, user_repo) = build_test_user_service();

    let services = gateways::state::Services {
        auth: Arc::new(auth_service),
        user: Arc::new(user_service),
        session_store: session_store.clone(),
    };

    (services, session_store, user_repo)
}

/// Build test gateway services.
pub fn build_test_services() -> gateways::state::Services {
    let (services, _, _) = build_test_services_with_fakes();
    services
}

/// Default test configuration.
pub fn test_config() -> gateways::Config {
    gateways::Config::default()
}
