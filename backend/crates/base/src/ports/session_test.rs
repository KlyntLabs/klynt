#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::Mutex;

    use async_trait::async_trait;
    use chrono::{DateTime, Duration, Utc};
    use domain::UserId;

    use super::super::*;
    use crate::ctx::{ExecutionContext, RequestContext};

    #[test]
    fn session_token_new_is_unique() {
        let a = SessionToken::new();
        let b = SessionToken::new();
        assert_ne!(a, b);
    }

    #[test]
    fn session_token_default_creates_new() {
        let token: SessionToken = Default::default();
        assert_eq!(token.0.get_version_num(), 4);
    }

    #[test]
    fn session_token_as_str_round_trips() {
        let token = SessionToken::new();
        let parsed = Uuid::parse_str(&token.to_string()).unwrap();
        assert_eq!(parsed, token.0);
    }

    #[test]
    fn session_error_display_messages() {
        assert_eq!(SessionError::NotFound.to_string(), "Session not found");
        assert_eq!(SessionError::Expired.to_string(), "Session expired");
        assert_eq!(
            SessionError::Database("connection lost".to_string()).to_string(),
            "Database error: connection lost"
        );
        assert_eq!(
            SessionError::Internal("oops".to_string()).to_string(),
            "Internal error: oops"
        );
    }

    #[test]
    fn sqlx_error_conversion() {
        let err: SessionError = sqlx::Error::RowNotFound.into();
        assert!(matches!(err, SessionError::NotFound));

        let db_err = sqlx::Error::Database(Box::new(FakeDbError {
            message: "connection lost",
        }));
        let err: SessionError = db_err.into();
        assert!(matches!(
            err,
            SessionError::Database(ref m) if m.contains("connection lost")
        ));
    }

    #[test]
    fn session_store_is_object_safe() {
        let _store: Box<dyn SessionStore> = Box::new(FakeSessionStore::default());
    }

    #[tokio::test]
    async fn fake_session_store_create_and_find_round_trip() {
        let ctx = ExecutionContext::new(RequestContext::new());
        let store = FakeSessionStore::default();
        let user_id = UserId::new();
        let expires_at = Utc::now() + Duration::hours(1);

        let token = store
            .create_with_kind(&ctx, user_id, expires_at, SessionKind::Access, None)
            .await
            .unwrap();
        let session = store.find_valid(&ctx, &token).await.unwrap().unwrap();

        assert_eq!(session.user_id, user_id);
        assert_eq!(session.kind, SessionKind::Access);
        assert!(!session.is_expired());
    }

    #[tokio::test]
    async fn fake_session_store_revoke_removes_session() {
        let ctx = ExecutionContext::new(RequestContext::new());
        let store = FakeSessionStore::default();
        let user_id = UserId::new();
        let expires_at = Utc::now() + Duration::hours(1);

        let token = store
            .create_with_kind(&ctx, user_id, expires_at, SessionKind::Access, None)
            .await
            .unwrap();
        store.revoke(&ctx, &token).await.unwrap();

        let session = store.find_valid(&ctx, &token).await.unwrap();
        assert!(session.is_none());
    }

    #[tokio::test]
    async fn fake_session_store_expired_session_is_not_found() {
        let ctx = ExecutionContext::new(RequestContext::new());
        let store = FakeSessionStore::default();
        let user_id = UserId::new();
        let expires_at = Utc::now() - Duration::hours(1);

        let token = store
            .create_with_kind(&ctx, user_id, expires_at, SessionKind::Access, None)
            .await
            .unwrap();
        let session = store.find_valid(&ctx, &token).await.unwrap();

        assert!(session.is_none());
    }

    #[tokio::test]
    async fn fake_session_store_revoke_pair_removes_paired_session() {
        let ctx = ExecutionContext::new(RequestContext::new());
        let store = FakeSessionStore::default();
        let user_id = UserId::new();
        let pair_id = Uuid::new_v4();
        let expires_at = Utc::now() + Duration::hours(1);

        let access = store
            .create_with_kind(
                &ctx,
                user_id,
                expires_at,
                SessionKind::Access,
                Some(pair_id),
            )
            .await
            .unwrap();
        let refresh = store
            .create_with_kind(
                &ctx,
                user_id,
                expires_at,
                SessionKind::Refresh,
                Some(pair_id),
            )
            .await
            .unwrap();

        store.revoke_pair(&ctx, pair_id, &access).await.unwrap();

        assert!(store.find_valid(&ctx, &refresh).await.unwrap().is_none());
        assert!(store.find_valid(&ctx, &access).await.unwrap().is_some());
    }

    /// In-memory fake for exercising the canonical trait.
    #[derive(Default)]
    struct FakeSessionStore {
        sessions: Mutex<HashMap<SessionToken, Session>>,
    }

    #[async_trait]
    impl SessionStore for FakeSessionStore {
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
            sessions.retain(|token, session| {
                !(session.pair_id == Some(pair_id) && token != except_token)
            });
            Ok(())
        }
    }

    /// Minimal fake database error for `From<sqlx::Error>` tests.
    #[derive(Debug)]
    struct FakeDbError {
        message: &'static str,
    }

    impl std::fmt::Display for FakeDbError {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "{}", self.message)
        }
    }

    impl std::error::Error for FakeDbError {}

    impl sqlx::error::DatabaseError for FakeDbError {
        fn message(&self) -> &str {
            self.message
        }

        fn as_error(&self) -> &(dyn std::error::Error + Send + Sync + 'static) {
            self
        }

        fn as_error_mut(&mut self) -> &mut (dyn std::error::Error + Send + Sync + 'static) {
            self
        }

        fn into_error(self: Box<Self>) -> Box<dyn std::error::Error + Send + Sync + 'static> {
            self
        }

        fn kind(&self) -> sqlx::error::ErrorKind {
            sqlx::error::ErrorKind::Other
        }

        fn constraint(&self) -> Option<&str> {
            None
        }
    }
}
