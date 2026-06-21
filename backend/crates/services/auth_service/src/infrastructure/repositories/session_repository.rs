//! Adapter from legacy session store to auth_service `SessionStore` port.

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use klynt_core::ctx::ExecutionContext;
use klynt_utils::UserId;

use crate::domain::{Session, SessionStore as AuthSessionStore, SessionToken};
use crate::error::AuthError;
use crate::infrastructure::conversion::{to_legacy_ctx, to_legacy_user_id};

/// Adapter wrapping a legacy [`klynt_storage::session::SessionStore`].
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
    T: klynt_storage::session::SessionStore,
{
    async fn create(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        expires_at: DateTime<Utc>,
    ) -> Result<SessionToken, AuthError> {
        let legacy_ctx = to_legacy_ctx(ctx);
        let legacy_user_id = to_legacy_user_id(user_id);

        self.inner
            .create(&legacy_ctx, legacy_user_id, expires_at)
            .await
            .map(|token| SessionToken(token.0))
            .map_err(map_legacy_error)
    }

    async fn find_valid(
        &self,
        ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<Option<Session>, AuthError> {
        let legacy_ctx = to_legacy_ctx(ctx);
        let legacy_token = klynt_storage::session::SessionToken(token.0);

        self.inner
            .find_valid(&legacy_ctx, &legacy_token)
            .await
            .map(|maybe_session| maybe_session.map(map_session))
            .map_err(map_legacy_error)
    }

    async fn revoke(&self, ctx: &ExecutionContext, token: &SessionToken) -> Result<(), AuthError> {
        let legacy_ctx = to_legacy_ctx(ctx);
        let legacy_token = klynt_storage::session::SessionToken(token.0);

        self.inner
            .revoke(&legacy_ctx, &legacy_token)
            .await
            .map_err(map_legacy_error)
    }
}

fn map_session(session: klynt_storage::session::Session) -> Session {
    Session {
        token: SessionToken(session.token.0),
        user_id: klynt_utils::UserId::from_uuid(session.user_id.0),
        expires_at: session.expires_at,
    }
}

fn map_legacy_error(err: klynt_shared_domain::DomainError) -> AuthError {
    AuthError::Domain(klynt_shared_domain::DomainError::Internal(err.to_string()))
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::Mutex;

    use super::*;

    struct FakeLegacySessionStore {
        sessions:
            Mutex<HashMap<klynt_storage::session::SessionToken, klynt_storage::session::Session>>,
    }

    impl Default for FakeLegacySessionStore {
        fn default() -> Self {
            Self {
                sessions: Mutex::new(HashMap::new()),
            }
        }
    }

    #[async_trait]
    impl klynt_storage::session::SessionStore for FakeLegacySessionStore {
        async fn create(
            &self,
            _ctx: &klynt_core::ctx::Ctx,
            user_id: klynt_utils::UserId,
            expires_at: DateTime<Utc>,
        ) -> Result<klynt_storage::session::SessionToken, klynt_shared_domain::DomainError>
        {
            let token = klynt_storage::session::SessionToken::new();
            let session = klynt_storage::session::Session {
                token,
                user_id,
                expires_at,
            };
            self.sessions.lock().unwrap().insert(token, session);
            Ok(token)
        }

        async fn find_valid(
            &self,
            _ctx: &klynt_core::ctx::Ctx,
            token: &klynt_storage::session::SessionToken,
        ) -> Result<Option<klynt_storage::session::Session>, klynt_shared_domain::DomainError>
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
            _ctx: &klynt_core::ctx::Ctx,
            token: &klynt_storage::session::SessionToken,
        ) -> Result<(), klynt_shared_domain::DomainError> {
            self.sessions.lock().unwrap().remove(token);
            Ok(())
        }
    }

    use klynt_core::ctx::RequestContext;

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
