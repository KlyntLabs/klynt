use std::collections::HashMap;
use std::sync::Mutex;

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::UserId;
use klynt_domain::session::{Session, SessionStore, SessionToken};

#[derive(Debug, Default)]
pub struct InMemorySessionStore {
    pub(crate) sessions: Mutex<HashMap<SessionToken, Session>>,
}

impl InMemorySessionStore {
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl SessionStore for InMemorySessionStore {
    async fn create(
        &self,
        _ctx: &Ctx,
        user_id: UserId,
        expires_at: DateTime<Utc>,
    ) -> Result<SessionToken, DomainError> {
        let token = SessionToken::new();
        let session = Session {
            token,
            user_id,
            expires_at,
        };
        let mut sessions = self.sessions.lock().unwrap();
        sessions.insert(token, session);
        Ok(token)
    }

    async fn find_valid(
        &self,
        _ctx: &Ctx,
        token: &SessionToken,
    ) -> Result<Option<Session>, DomainError> {
        let sessions = self.sessions.lock().unwrap();
        Ok(sessions.get(token).filter(|s| !s.is_expired()).cloned())
    }

    async fn revoke(&self, _ctx: &Ctx, token: &SessionToken) -> Result<(), DomainError> {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.remove(token);
        Ok(())
    }
}
