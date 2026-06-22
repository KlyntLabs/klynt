//! Canonical in-memory fake for [`SessionStore`].

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::ctx::ExecutionContext;
use crate::ports::session::{Session, SessionError, SessionKind, SessionStore, SessionToken};
use domain::UserId;
use uuid::Uuid;

/// In-memory session store for tests.
#[derive(Clone, Debug, Default)]
pub struct FakeSessionStore {
    sessions: Arc<Mutex<HashMap<SessionToken, Session>>>,
}

impl FakeSessionStore {
    /// Create an empty fake session store.
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl SessionStore for FakeSessionStore {
    async fn create(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        kind: SessionKind,
        pair_id: Option<Uuid>,
        expires_at: DateTime<Utc>,
    ) -> Result<SessionToken, SessionError> {
        let token = SessionToken::new();
        let session = Session {
            user_id,
            expires_at,
            kind,
            pair_id,
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ctx::{ExecutionContext, RequestContext};

    fn ctx() -> ExecutionContext {
        ExecutionContext::new(RequestContext::new())
    }

    #[tokio::test]
    async fn create_and_find_round_trip() {
        let store = FakeSessionStore::new();
        let user_id = UserId::new();
        let expires_at = Utc::now() + chrono::Duration::hours(1);

        let token = store
            .create(&ctx(), user_id, SessionKind::Access, None, expires_at)
            .await
            .unwrap();
        let session = store.find_valid(&ctx(), &token).await.unwrap().unwrap();

        assert_eq!(session.user_id, user_id);
        assert_eq!(session.kind, SessionKind::Access);
        assert!(!session.is_expired());
    }

    #[tokio::test]
    async fn revoke_removes_session() {
        let store = FakeSessionStore::new();
        let user_id = UserId::new();
        let expires_at = Utc::now() + chrono::Duration::hours(1);

        let token = store
            .create(&ctx(), user_id, SessionKind::Access, None, expires_at)
            .await
            .unwrap();
        store.revoke(&ctx(), &token).await.unwrap();

        assert!(store.find_valid(&ctx(), &token).await.unwrap().is_none());
    }

    #[tokio::test]
    async fn expired_session_is_not_found() {
        let store = FakeSessionStore::new();
        let user_id = UserId::new();
        let expires_at = Utc::now() - chrono::Duration::hours(1);

        let token = store
            .create(&ctx(), user_id, SessionKind::Access, None, expires_at)
            .await
            .unwrap();

        assert!(store.find_valid(&ctx(), &token).await.unwrap().is_none());
    }
}
