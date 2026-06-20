#![allow(dead_code)]

use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use klynt_application::auth::AuthService;
use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::{Email, UserId};
use klynt_domain::ports::{EmailService, SharedEmailService};
use klynt_domain::session::{Session, SessionStore, SessionToken};
use klynt_infrastructure::repositories::in_memory_token::InMemoryEmailVerificationTokenRepository;

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

    async fn send_password_reset(&self, _email: &Email, _token: &str) -> Result<(), DomainError> {
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

pub fn auth_service() -> (
    AuthService,
    Arc<klynt_application::users::UserService>,
    Arc<FakeEmailService>,
) {
    let user_service = Arc::new(user_service());
    let session_store: Arc<dyn SessionStore> = Arc::new(FakeSessionStore);
    let email_verification_repo = Arc::new(InMemoryEmailVerificationTokenRepository::new());
    let email_service_impl = Arc::new(FakeEmailService::default());
    let email_service: SharedEmailService = Arc::clone(&email_service_impl) as SharedEmailService;
    let auth_service = AuthService::new(
        Arc::clone(&user_service),
        session_store,
        email_verification_repo
            as Arc<dyn klynt_domain::repositories::EmailVerificationTokenRepository>,
        email_service,
    );
    (auth_service, user_service, email_service_impl)
}
