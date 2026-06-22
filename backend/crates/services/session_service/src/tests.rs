use std::collections::HashMap;
use std::sync::Mutex;

use async_trait::async_trait;
use chrono::{Duration, Utc};
use klynt_base::ctx::{ExecutionContext, RequestContext};
use klynt_base::ports::session::{Session, SessionError as StoreError, SessionStore, SessionToken};
use klynt_common::util::UserId;

use super::*;

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
        expires_at: chrono::DateTime<Utc>,
    ) -> Result<SessionToken, StoreError> {
        let token = SessionToken::new();
        let session = Session {
            user_id,
            expires_at,
        };
        self.sessions.lock().unwrap().insert(token, session);
        Ok(token)
    }

    async fn find_valid(
        &self,
        _ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<Option<Session>, StoreError> {
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
    ) -> Result<(), StoreError> {
        self.sessions.lock().unwrap().remove(token);
        Ok(())
    }
}

fn test_ctx() -> ExecutionContext {
    ExecutionContext::new(RequestContext::new())
}

#[tokio::test]
async fn validate_returns_session_for_valid_token() {
    let store = Arc::new(FakeSessionStore::default());
    let service = SessionService::new(SessionConfig::default(), store.clone());
    let ctx = test_ctx();
    let user_id = UserId::new();

    let token = service.create(&ctx, user_id).await.unwrap();
    let session = service.validate(&ctx, &token.to_string()).await.unwrap();

    assert_eq!(session.user_id, user_id);
}

#[tokio::test]
async fn validate_returns_invalid_token_for_malformed_input() {
    let service = SessionService::new(
        SessionConfig::default(),
        Arc::new(FakeSessionStore::default()),
    );
    let ctx = test_ctx();

    let result = service.validate(&ctx, "not-a-uuid").await;
    assert!(matches!(result, Err(SessionError::InvalidToken)));
}

#[tokio::test]
async fn validate_returns_invalid_token_for_unknown_token() {
    let service = SessionService::new(
        SessionConfig::default(),
        Arc::new(FakeSessionStore::default()),
    );
    let ctx = test_ctx();

    let result = service
        .validate(&ctx, &SessionToken::new().to_string())
        .await;
    assert!(matches!(result, Err(SessionError::InvalidToken)));
}

#[tokio::test]
async fn create_uses_configured_duration() {
    let store = Arc::new(FakeSessionStore::default());
    let service = SessionService::new(
        SessionConfig {
            session_duration_secs: 7200,
        },
        store.clone(),
    );
    let ctx = test_ctx();
    let user_id = UserId::new();

    let token = service.create(&ctx, user_id).await.unwrap();
    let session = store.find_valid(&ctx, &token).await.unwrap().unwrap();

    let expected_min = Utc::now() + Duration::seconds(7100);
    let expected_max = Utc::now() + Duration::seconds(7300);
    assert!(session.expires_at >= expected_min && session.expires_at <= expected_max);
}

#[tokio::test]
async fn invalidate_removes_session() {
    let store = Arc::new(FakeSessionStore::default());
    let service = SessionService::new(SessionConfig::default(), store.clone());
    let ctx = test_ctx();
    let user_id = UserId::new();

    let token = service.create(&ctx, user_id).await.unwrap();
    service.invalidate(&ctx, &token.to_string()).await.unwrap();

    let session = store.find_valid(&ctx, &token).await.unwrap();
    assert!(session.is_none());
}

#[test]
fn session_error_mapping() {
    use klynt_base::ports::session::SessionError as StoreError;

    assert!(matches!(
        SessionError::from(StoreError::NotFound),
        SessionError::InvalidToken
    ));
    assert!(matches!(
        SessionError::from(StoreError::Expired),
        SessionError::InvalidToken
    ));
    assert!(matches!(
        SessionError::from(StoreError::Database("boom".to_string())),
        SessionError::StoreError(_)
    ));
}
