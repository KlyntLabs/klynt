//! Fake persistence session store for gateway tests.

use std::collections::HashMap;
use std::sync::Mutex;

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::session::{Session, SessionError, SessionKind, SessionStore, SessionToken};
use chrono::{DateTime, Utc};
use domain::session::SessionSummary;
use domain::UserId;
use uuid::Uuid;

/// Fake persistence session store for middleware tests.
#[derive(Default)]
pub struct FakePersistenceSessionStore {
    sessions: Mutex<HashMap<SessionToken, Session>>,
}

#[async_trait]
impl SessionStore for FakePersistenceSessionStore {
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

    async fn list_active_by_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<Vec<SessionSummary>, SessionError> {
        let sessions = self.sessions.lock().unwrap();
        Ok(sessions
            .iter()
            .filter(|(_, s)| s.user_id == user_id && !s.is_expired())
            .map(|(token, s)| SessionSummary {
                id: token.0,
                user_id: s.user_id,
                kind: s.kind.as_str().to_string(),
                created_at: Utc::now(),
                expires_at: s.expires_at,
                user_agent: None,
                ip_address: None,
            })
            .collect())
    }
}
