//! Test support utilities and fake implementations.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use auth_service::application::ports::{
    AuditLogger, Clock, EmailSender, PasswordHasher, UserRepository,
};
use auth_service::domain::{Session, SessionToken, TokenKind};
use auth_service::domain::{SessionStore, TokenStore};
use auth_service::error::AuthError;
use auth_service::models::User;
use auth_service::{AuthConfig, AuthService, Dependencies};
use klynt_core::ctx::{ExecutionContext, RequestContext};
use klynt_shared_domain::{UserRole, UserStatus};
use klynt_utils::UserId;

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
    async fn hash(&self, password: &str) -> Result<String, AuthError> {
        Ok(format!("hash-{password}"))
    }

    async fn verify(&self, password: &str, hash: &str) -> Result<bool, AuthError> {
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

impl FakeUserRepository {
    pub fn insert(&self, email: &str, user: User) {
        self.users.lock().unwrap().insert(email.to_string(), user);
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
            email: email.to_string(),
            password_hash: password_hash.to_string(),
            full_name,
            status: UserStatus::Pending,
            role: UserRole::Student,
            created_at: Utc::now(),
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

type TokenKey = (TokenKind, String);
type TokenEntry = (UserId, DateTime<Utc>, bool);

/// Fake token store backed by an in-memory map.
#[derive(Default)]
pub struct FakeTokenStore {
    tokens: Mutex<HashMap<TokenKey, TokenEntry>>,
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

/// Build a test auth service with default fake dependencies.
pub fn build_test_service() -> (AuthService, Arc<FakeUserRepository>, Arc<FakeEmailSender>) {
    let email_sender = Arc::new(FakeEmailSender::default());
    let user_repository = Arc::new(FakeUserRepository::default());
    let service = AuthService::new(
        AuthConfig::default(),
        Dependencies {
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

/// Build a test execution context.
pub fn test_ctx() -> ExecutionContext {
    ExecutionContext::new(RequestContext::new())
}

/// Create a test user model.
pub fn test_user(email: &str, password: &str, status: UserStatus) -> User {
    User {
        id: UserId::new(),
        email: email.to_string(),
        password_hash: format!("hash-{password}"),
        full_name: Some("Test User".to_string()),
        status,
        role: UserRole::Student,
        created_at: Utc::now(),
    }
}
