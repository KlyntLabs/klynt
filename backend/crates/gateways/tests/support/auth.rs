//! Fake auth service dependencies for gateway tests.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use auth_service::{
    application::ports::{AuditLogger, EmailSender},
    domain::{
        Session, SessionError, SessionStore, SessionToken, TokenError, TokenKind, TokenStore,
    },
    AuthConfig, AuthService, Dependencies as AuthDependencies,
};
use chrono::{DateTime, Utc};
use klynt_base::ctx::ExecutionContext;
use klynt_base::ports::email::EmailError;
use klynt_base::ports::repository::{RepositoryError, UserRepository};
use klynt_common::domain::{Email, PaginationRequest, User, UserRole, UserStatus};
use klynt_common::util::UserId;

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
    ) -> Result<UserId, RepositoryError> {
        if self.users.lock().unwrap().contains_key(email.as_str()) {
            return Err(RepositoryError::Conflict(format!(
                "email already registered: {email}"
            )));
        }

        let user_id = UserId::new();
        let user = User {
            id: user_id,
            email,
            password_hash,
            full_name: Some(full_name).filter(|n| !n.is_empty()),
            status: UserStatus::Pending,
            role: UserRole::Student,
            created_at: Utc::now(),
            updated_at: None,
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
    async fn create(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        expires_at: DateTime<Utc>,
    ) -> Result<SessionToken, SessionError> {
        let token = SessionToken::new();
        let session = Session {
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

    async fn log_profile_updated(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_password_changed(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_user_deleted(&self, _ctx: &ExecutionContext, _user_id: UserId) {}
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
