//! Adapter from persistence session store to auth_service `SessionStore` port.

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use klynt_base::ctx::ExecutionContext;
use klynt_common::util::UserId;

use crate::domain::{Session, SessionStore as AuthSessionStore, SessionToken};
use crate::error::AuthError;

/// Adapter wrapping a [`klynt_persistence::session::SessionStore`].
pub struct SessionRepositoryAdapter<T> {
    inner: T,
}

impl<T> SessionRepositoryAdapter<T> {
    pub fn new(inner: T) -> Self {
        Self { inner }
    }
}

#[async_trait]
impl<T> AuthSessionStore for SessionRepositoryAdapter<T>
where
    T: klynt_persistence::session::SessionStore,
{
    async fn create(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        expires_at: DateTime<Utc>,
    ) -> Result<SessionToken, AuthError> {
        self.inner
            .create(ctx, user_id, expires_at)
            .await
            .map(|token| SessionToken(token.0))
            .map_err(map_persistence_error)
    }

    async fn find_valid(
        &self,
        ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<Option<Session>, AuthError> {
        let persistence_token = klynt_persistence::session::SessionToken(token.0);

        self.inner
            .find_valid(ctx, &persistence_token)
            .await
            .map(|maybe_session| maybe_session.map(map_session))
            .map_err(map_persistence_error)
    }

    async fn revoke(&self, ctx: &ExecutionContext, token: &SessionToken) -> Result<(), AuthError> {
        let persistence_token = klynt_persistence::session::SessionToken(token.0);

        self.inner
            .revoke(ctx, &persistence_token)
            .await
            .map_err(map_persistence_error)
    }
}

fn map_session(session: klynt_persistence::session::Session) -> Session {
    Session {
        token: SessionToken(session.token.0),
        user_id: session.user_id,
        expires_at: session.expires_at,
    }
}

fn map_persistence_error(err: klynt_common::domain::DomainError) -> AuthError {
    AuthError::Domain(klynt_common::domain::DomainError::Internal(err.to_string()))
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::Mutex;

    use super::*;

    struct FakeLegacySessionStore {
        sessions: Mutex<
            HashMap<klynt_persistence::session::SessionToken, klynt_persistence::session::Session>,
        >,
    }

    impl Default for FakeLegacySessionStore {
        fn default() -> Self {
            Self {
                sessions: Mutex::new(HashMap::new()),
            }
        }
    }

    #[async_trait]
    impl klynt_persistence::session::SessionStore for FakeLegacySessionStore {
        async fn create(
            &self,
            _ctx: &ExecutionContext,
            user_id: klynt_common::util::UserId,
            expires_at: DateTime<Utc>,
        ) -> Result<klynt_persistence::session::SessionToken, klynt_common::domain::DomainError>
        {
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

    use klynt_base::ctx::RequestContext;

    #[tokio::test]
    async fn create_returns_session_token() {
        let adapter = SessionRepositoryAdapter::new(FakeLegacySessionStore::default());
        let ctx = ExecutionContext::new(RequestContext::new());
        let user_id = UserId::new();
        let expires_at = Utc::now() + chrono::Duration::hours(1);

        let token = adapter.create(&ctx, user_id, expires_at).await.unwrap();
        assert_ne!(token.0, uuid::Uuid::nil());
    }

    #[tokio::test]
    async fn find_valid_round_trips_session() {
        let adapter = SessionRepositoryAdapter::new(FakeLegacySessionStore::default());
        let ctx = ExecutionContext::new(RequestContext::new());
        let user_id = UserId::new();
        let expires_at = Utc::now() + chrono::Duration::hours(1);

        let token = adapter.create(&ctx, user_id, expires_at).await.unwrap();
        let session = adapter.find_valid(&ctx, &token).await.unwrap().unwrap();

        assert_eq!(session.token, token);
        assert_eq!(session.user_id, user_id);
    }

    #[tokio::test]
    async fn revoke_removes_session() {
        let adapter = SessionRepositoryAdapter::new(FakeLegacySessionStore::default());
        let ctx = ExecutionContext::new(RequestContext::new());
        let user_id = UserId::new();
        let expires_at = Utc::now() + chrono::Duration::hours(1);

        let token = adapter.create(&ctx, user_id, expires_at).await.unwrap();
        adapter.revoke(&ctx, &token).await.unwrap();

        let session = adapter.find_valid(&ctx, &token).await.unwrap();
        assert!(session.is_none());
    }
}
