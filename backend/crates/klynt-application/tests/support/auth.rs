#![allow(dead_code)]

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use klynt_application::audit::AuditService;
use klynt_application::auth::AuthService;
use klynt_domain::audit::AuditEvent;
use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::{Email, UserId};
use klynt_domain::ports::{EmailService, SharedEmailService};
use klynt_domain::repositories::{AuditEventRepository, TokenStore};
use klynt_domain::session::{Session, SessionStore, SessionToken};
use klynt_domain::tokens::TokenKind;

use super::user_service;

#[derive(Debug, Default)]
pub struct FakeEmailService {
    pub sent: Mutex<Vec<(Email, String)>>,
}

#[async_trait]
impl EmailService for FakeEmailService {
    async fn send_verification(&self, email: &Email, token: &str) -> Result<(), DomainError> {
        let mut sent = self.sent.lock().unwrap();
        sent.push((email.clone(), token.to_string()));
        Ok(())
    }

    async fn send_password_reset(&self, email: &Email, token: &str) -> Result<(), DomainError> {
        let mut sent = self.sent.lock().unwrap();
        sent.push((email.clone(), token.to_string()));
        Ok(())
    }
}

#[derive(Debug, Default)]
pub struct FakeSessionStore;

#[async_trait]
impl SessionStore for FakeSessionStore {
    async fn create(
        &self,
        _ctx: &Ctx,
        _user_id: UserId,
        _expires_at: DateTime<Utc>,
    ) -> Result<SessionToken, DomainError> {
        Ok(SessionToken::new())
    }

    async fn find_valid(
        &self,
        _ctx: &Ctx,
        _token: &SessionToken,
    ) -> Result<Option<Session>, DomainError> {
        Ok(None)
    }

    async fn revoke(&self, _ctx: &Ctx, _token: &SessionToken) -> Result<(), DomainError> {
        Ok(())
    }
}

type FakeTokenEntry = (UserId, DateTime<Utc>, bool);

#[derive(Debug, Default)]
pub struct FakeTokenStore {
    tokens: Mutex<HashMap<(TokenKind, String), FakeTokenEntry>>,
}

#[async_trait]
impl TokenStore for FakeTokenStore {
    async fn save(
        &self,
        _ctx: &Ctx,
        kind: TokenKind,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError> {
        let mut tokens = self.tokens.lock().unwrap();
        tokens.insert((kind, token_hash.to_string()), (user_id, expires_at, false));
        Ok(())
    }

    async fn consume(
        &self,
        _ctx: &Ctx,
        kind: TokenKind,
        token_hash: &str,
    ) -> Result<UserId, DomainError> {
        let mut tokens = self.tokens.lock().unwrap();
        let key = (kind, token_hash.to_string());
        let Some((user_id, expires_at, used)) = tokens.get_mut(&key) else {
            return Err(DomainError::InvalidToken(
                klynt_domain::errors::TokenError::Invalid,
            ));
        };
        // Mirror the production PgTokenStore: any invalid, expired, or
        // already-used token is reported as Invalid to prevent enumeration.
        if *used || *expires_at <= Utc::now() {
            return Err(DomainError::InvalidToken(
                klynt_domain::errors::TokenError::Invalid,
            ));
        }
        *used = true;
        Ok(*user_id)
    }
}

#[derive(Debug, Default)]
pub struct FakeAuditEventRepository {
    events: Mutex<Vec<AuditEvent>>,
}

#[async_trait]
impl AuditEventRepository for FakeAuditEventRepository {
    async fn log(&self, _ctx: &Ctx, event: AuditEvent) -> Result<(), DomainError> {
        let mut events = self.events.lock().unwrap();
        events.push(event);
        Ok(())
    }
}

pub fn auth_service() -> (
    AuthService,
    Arc<klynt_application::users::UserService>,
    Arc<FakeEmailService>,
) {
    let user_service = Arc::new(user_service());
    let session_store: Arc<dyn SessionStore> = Arc::new(FakeSessionStore);
    let token_store: Arc<dyn TokenStore> = Arc::new(FakeTokenStore::default());
    let email_service_impl = Arc::new(FakeEmailService::default());
    let email_service: SharedEmailService = Arc::clone(&email_service_impl) as SharedEmailService;
    let audit_repo: Arc<dyn AuditEventRepository> = Arc::new(FakeAuditEventRepository::default());
    let audit_service = Arc::new(AuditService::new(audit_repo));
    let auth_service = AuthService::new(
        Arc::clone(&user_service),
        session_store,
        token_store,
        email_service,
        audit_service,
    );
    (auth_service, user_service, email_service_impl)
}
