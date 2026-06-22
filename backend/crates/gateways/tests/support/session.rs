//! Fake persistence session store for gateway tests.

use std::collections::HashMap;
use std::sync::Mutex;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use klynt_base::ctx::ExecutionContext;

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
