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

#[derive(Clone, Debug)]
struct StoredSession {
    session: Session,
    public_id: Uuid,
}

/// Fake persistence session store for middleware tests.
#[derive(Default)]
pub struct FakePersistenceSessionStore {
    sessions: Mutex<HashMap<SessionToken, StoredSession>>,
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
        let public_id = Uuid::new_v4();
        let session = Session {
            user_id,
            expires_at,
            kind,
            pair_id,
            tenant_memberships: Vec::new(),
        };
        self.sessions
            .lock()
            .unwrap()
            .insert(token, StoredSession { session, public_id });
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
            .map(|stored| &stored.session)
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
        sessions.retain(|token, stored| {
            !(stored.session.pair_id == Some(pair_id) && token != except_token)
        });
        Ok(())
    }

    async fn list_active_by_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<Vec<SessionSummary>, SessionError> {
        let sessions = self.sessions.lock().unwrap();
        Ok(sessions
            .values()
            .filter(|stored| stored.session.user_id == user_id && !stored.session.is_expired())
            .map(|stored| SessionSummary {
                id: stored.public_id,
                user_id: stored.session.user_id,
                kind: stored.session.kind.as_str().to_string(),
                created_at: Utc::now(),
                expires_at: stored.session.expires_at,
            })
            .collect())
    }

    async fn revoke_by_id(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        session_id: Uuid,
    ) -> Result<(), SessionError> {
        let mut sessions = self.sessions.lock().unwrap();
        let token = sessions
            .iter()
            .find(|(_, stored)| {
                stored.public_id == session_id
                    && stored.session.user_id == user_id
                    && !stored.session.is_expired()
            })
            .map(|(token, _)| *token)
            .ok_or(SessionError::Forbidden)?;
        sessions.remove(&token);
        Ok(())
    }
}
