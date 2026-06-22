#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::Mutex;

    use async_trait::async_trait;
    use chrono::{DateTime, Duration, Utc};
    use klynt_common::util::UserId;

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
        let parsed = Uuid::parse_str(&token.as_str()).unwrap();
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

        let token = store.create(&ctx, user_id, expires_at).await.unwrap();
        let session = store.find_valid(&ctx, &token).await.unwrap().unwrap();

        assert_eq!(session.user_id, user_id);
        assert!(!session.is_expired());
    }

    #[tokio::test]
    async fn fake_session_store_revoke_removes_session() {
        let ctx = ExecutionContext::new(RequestContext::new());
        let store = FakeSessionStore::default();
        let user_id = UserId::new();
        let expires_at = Utc::now() + Duration::hours(1);

        let token = store.create(&ctx, user_id, expires_at).await.unwrap();
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

        let token = store.create(&ctx, user_id, expires_at).await.unwrap();
        let session = store.find_valid(&ctx, &token).await.unwrap();

        assert!(session.is_none());
    }

    /// In-memory fake for exercising the canonical trait.
    #[derive(Default)]
    struct FakeSessionStore {
        sessions: Mutex<HashMap<SessionToken, Session>>,
    }

    #[async_trait]
    impl SessionStore for FakeSessionStore {
        async fn create(
            &self,
            _ctx: &ExecutionContext,
            user_id: UserId,
            expires_at: DateTime<Utc>,
        ) -> Result<SessionToken, SessionError> {
            let token = SessionToken::new();
            let session = Session {
                user_id,
                expires_at,
                created_at: Utc::now(),
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
