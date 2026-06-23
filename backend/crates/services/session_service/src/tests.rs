use std::collections::HashMap;
use std::sync::Mutex;

use async_trait::async_trait;
use base::ctx::{ExecutionContext, RequestContext};
use base::ports::session::{
    Session, SessionError as StoreError, SessionKind, SessionStore, SessionToken,
};
use base::testkit::clock::TestClock;
use chrono::{DateTime, Duration, Utc};
use domain::UserId;
use uuid::Uuid;

use super::*;

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
    ) -> Result<SessionToken, StoreError> {
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

    async fn revoke_pair(
        &self,
        _ctx: &ExecutionContext,
        pair_id: Uuid,
        except_token: &SessionToken,
    ) -> Result<(), StoreError> {
        let mut sessions = self.sessions.lock().unwrap();
        sessions
            .retain(|token, session| !(session.pair_id == Some(pair_id) && token != except_token));
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

    let created = service.create(&ctx, user_id).await.unwrap();
    let session = service.validate(&ctx, &created.token).await.unwrap();

    assert_eq!(session.user_id, user_id);
}

#[tokio::test]
async fn validate_returns_invalid_token_for_unknown_token() {
    let service = SessionService::new(
        SessionConfig::default(),
        Arc::new(FakeSessionStore::default()),
    );
    let ctx = test_ctx();

    let result = service.validate(&ctx, &SessionToken::new()).await;
    assert!(matches!(result, Err(SessionError::InvalidToken)));
}

#[tokio::test]
async fn validate_access_rejects_refresh_token() {
    let store = Arc::new(FakeSessionStore::default());
    let service = SessionService::new(SessionConfig::default(), store.clone());
    let ctx = test_ctx();
    let user_id = UserId::new();

    let refresh = service.create_refresh(&ctx, user_id, None).await.unwrap();
    let result = service.validate_access(&ctx, &refresh.token).await;

    assert!(matches!(result, Err(SessionError::InvalidToken)));
}

#[tokio::test]
async fn validate_access_accepts_long_lived_token() {
    let store = Arc::new(FakeSessionStore::default());
    let service = SessionService::new(SessionConfig::default(), store.clone());
    let ctx = test_ctx();
    let user_id = UserId::new();

    let access = service
        .create_access(&ctx, user_id, true, None)
        .await
        .unwrap();
    let session = service.validate_access(&ctx, &access.token).await.unwrap();

    assert_eq!(session.kind, SessionKind::LongLived);
}

#[tokio::test]
async fn create_uses_configured_duration() {
    let now = Utc::now();
    let clock = TestClock::new();
    clock.freeze_at(now);
    let store = Arc::new(FakeSessionStore::default());
    let service = SessionService::with_clock(
        SessionConfig {
            session_duration_secs: 7200,
            long_session_duration_secs: 86400,
            refresh_duration_secs: 604800,
        },
        store.clone(),
        Arc::new(clock),
    );
    let ctx = test_ctx();
    let user_id = UserId::new();

    let created = service.create(&ctx, user_id).await.unwrap();
    let session = store
        .find_valid(&ctx, &created.token)
        .await
        .unwrap()
        .unwrap();

    assert_eq!(session.expires_at, now + Duration::seconds(7200));
}

#[tokio::test]
async fn invalidate_removes_session() {
    let store = Arc::new(FakeSessionStore::default());
    let service = SessionService::new(SessionConfig::default(), store.clone());
    let ctx = test_ctx();
    let user_id = UserId::new();

    let created = service.create(&ctx, user_id).await.unwrap();
    service.invalidate(&ctx, &created.token).await.unwrap();

    let session = store.find_valid(&ctx, &created.token).await.unwrap();
    assert!(session.is_none());
}

#[tokio::test]
async fn invalidate_pair_removes_paired_session() {
    let store = Arc::new(FakeSessionStore::default());
    let service = SessionService::new(SessionConfig::default(), store.clone());
    let ctx = test_ctx();
    let user_id = UserId::new();
    let pair_id = Uuid::new_v4();

    let access = service
        .create_access(&ctx, user_id, false, Some(pair_id))
        .await
        .unwrap();
    let refresh = service
        .create_refresh(&ctx, user_id, Some(pair_id))
        .await
        .unwrap();

    service.invalidate_pair(&ctx, &access.token).await.unwrap();

    assert!(store
        .find_valid(&ctx, &refresh.token)
        .await
        .unwrap()
        .is_none());
    assert!(store
        .find_valid(&ctx, &access.token)
        .await
        .unwrap()
        .is_none());
}

#[test]
fn session_error_mapping() {
    use base::ports::session::SessionError as BaseError;

    assert!(matches!(
        SessionError::from(BaseError::NotFound),
        SessionError::InvalidToken
    ));
    assert!(matches!(
        SessionError::from(BaseError::Expired),
        SessionError::InvalidToken
    ));
    assert!(matches!(
        SessionError::from(BaseError::Database("boom".to_string())),
        SessionError::StoreError(_)
    ));
    assert!(matches!(
        SessionError::from(BaseError::Internal("oops".to_string())),
        SessionError::StoreError(_)
    ));
}
