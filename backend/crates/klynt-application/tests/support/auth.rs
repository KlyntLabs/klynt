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
use klynt_domain::repositories::{
    AuditEventRepository, EmailVerificationTokenRepository, PasswordResetTokenRepository,
};
use klynt_domain::session::{Session, SessionStore, SessionToken};
use uuid::Uuid;

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

type TokenEntry = (UserId, DateTime<Utc>, bool);

#[derive(Debug, Default)]
pub struct FakeEmailVerificationTokenRepository {
    tokens: Mutex<HashMap<String, TokenEntry>>,
}

#[async_trait]
impl EmailVerificationTokenRepository for FakeEmailVerificationTokenRepository {
    async fn save(
        &self,
        _ctx: &Ctx,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError> {
        let mut tokens = self.tokens.lock().unwrap();
        tokens.insert(token_hash.to_string(), (user_id, expires_at, false));
        Ok(())
    }

    async fn find_valid(
        &self,
        _ctx: &Ctx,
        token_hash: &str,
    ) -> Result<Option<(UserId, DateTime<Utc>)>, DomainError> {
        let tokens = self.tokens.lock().unwrap();
        Ok(tokens
            .get(token_hash)
            .and_then(|(user_id, expires_at, used)| {
                if *used || *expires_at <= Utc::now() {
                    return None;
                }
                Some((*user_id, *expires_at))
            }))
    }

    async fn mark_used(&self, _ctx: &Ctx, token_hash: &str) -> Result<bool, DomainError> {
        let mut tokens = self.tokens.lock().unwrap();
        let Some((_, _, used)) = tokens.get_mut(token_hash) else {
            return Ok(false);
        };
        if *used {
            return Ok(false);
        }
        *used = true;
        Ok(true)
    }
}

#[derive(Debug, Default)]
pub struct FakePasswordResetTokenRepository {
    tokens: Mutex<HashMap<String, TokenEntry>>,
}

#[async_trait]
impl PasswordResetTokenRepository for FakePasswordResetTokenRepository {
    async fn save(
        &self,
        _ctx: &Ctx,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError> {
        let mut tokens = self.tokens.lock().unwrap();
        tokens.insert(token_hash.to_string(), (user_id, expires_at, false));
        Ok(())
    }

    async fn find_valid(
        &self,
        _ctx: &Ctx,
        token_hash: &str,
    ) -> Result<Option<(UserId, DateTime<Utc>)>, DomainError> {
        let tokens = self.tokens.lock().unwrap();
        Ok(tokens
            .get(token_hash)
            .and_then(|(user_id, expires_at, used)| {
                if *used || *expires_at <= Utc::now() {
                    return None;
                }
                Some((*user_id, *expires_at))
            }))
    }

    async fn mark_used(&self, _ctx: &Ctx, token_hash: &str) -> Result<bool, DomainError> {
        let mut tokens = self.tokens.lock().unwrap();
        let Some((_, _, used)) = tokens.get_mut(token_hash) else {
            return Ok(false);
        };
        if *used {
            return Ok(false);
        }
        *used = true;
        Ok(true)
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

    async fn find_by_user(
        &self,
        _ctx: &Ctx,
        user_id: UserId,
        limit: usize,
    ) -> Result<Vec<AuditEvent>, DomainError> {
        let events = self.events.lock().unwrap();
        Ok(events
            .iter()
            .filter(|e| e.actor_user_id == Some(user_id))
            .take(limit)
            .cloned()
            .collect())
    }

    async fn find_by_resource(
        &self,
        _ctx: &Ctx,
        resource_type: &str,
        resource_id: Uuid,
        limit: usize,
    ) -> Result<Vec<AuditEvent>, DomainError> {
        let events = self.events.lock().unwrap();
        Ok(events
            .iter()
            .filter(|e| {
                e.resource_type.to_string().to_lowercase() == resource_type.to_lowercase()
                    && e.resource_id == Some(resource_id)
            })
            .take(limit)
            .cloned()
            .collect())
    }
}

pub fn auth_service() -> (
    AuthService,
    Arc<klynt_application::users::UserService>,
    Arc<FakeEmailService>,
) {
    let user_service = Arc::new(user_service());
    let session_store: Arc<dyn SessionStore> = Arc::new(FakeSessionStore);
    let email_verification_repo: Arc<dyn EmailVerificationTokenRepository> =
        Arc::new(FakeEmailVerificationTokenRepository::default());
    let password_reset_repo: Arc<dyn PasswordResetTokenRepository> =
        Arc::new(FakePasswordResetTokenRepository::default());
    let email_service_impl = Arc::new(FakeEmailService::default());
    let email_service: SharedEmailService = Arc::clone(&email_service_impl) as SharedEmailService;
    let audit_repo: Arc<dyn AuditEventRepository> = Arc::new(FakeAuditEventRepository::default());
    let audit_service = Arc::new(AuditService::new(audit_repo));
    let auth_service = AuthService::new(
        Arc::clone(&user_service),
        session_store,
        email_verification_repo,
        password_reset_repo,
        email_service,
        audit_service,
    );
    (auth_service, user_service, email_service_impl)
}
