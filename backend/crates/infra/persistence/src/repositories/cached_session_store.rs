//! Redis read-through cache for session storage.
//!
//! Postgres remains the authoritative store. Redis is used only to reduce
//! read latency; any Redis failure is logged and falls back to Postgres.

use std::sync::Arc;

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::session::{Session, SessionError, SessionStore, SessionToken};
use chrono::{DateTime, Utc};
use domain::UserId;
use redis::aio::MultiplexedConnection;
use tokio::sync::Mutex;

use super::session::PgSessionStore;

const SESSION_TTL_SECONDS: u64 = 900; // 15 minutes

/// Read-through Redis cache over [`PgSessionStore`].
pub struct CachedSessionStore {
    postgres: PgSessionStore,
    redis: Arc<Mutex<MultiplexedConnection>>,
}

impl CachedSessionStore {
    /// Create a new cached store backed by `postgres` and `redis`.
    pub fn new(postgres: PgSessionStore, redis: MultiplexedConnection) -> Self {
        Self {
            postgres,
            redis: Arc::new(Mutex::new(redis)),
        }
    }

    fn cache_key(token: &SessionToken) -> String {
        format!("session:{}", token.0)
    }

    async fn read_cache(&self, token: &SessionToken) -> Result<Option<Session>, SessionError> {
        let mut conn = self.redis.lock().await;
        let key = Self::cache_key(token);
        let value: Option<String> = redis::cmd("GET")
            .arg(&key)
            .query_async(&mut *conn)
            .await
            .map_err(|e| SessionError::Internal(format!("redis get: {e}")))?;

        match value {
            Some(json) => {
                let cached: CachedSession = serde_json::from_str(&json)
                    .map_err(|e| SessionError::Internal(format!("deserialize: {e}")))?;
                if cached.expires_at <= Utc::now() {
                    return Ok(None);
                }
                Ok(Some(Session {
                    user_id: cached.user_id,
                    expires_at: cached.expires_at,
                }))
            }
            None => Ok(None),
        }
    }

    async fn write_cache(
        &self,
        token: &SessionToken,
        session: &Session,
    ) -> Result<(), SessionError> {
        let mut conn = self.redis.lock().await;
        let key = Self::cache_key(token);
        let ttl = SESSION_TTL_SECONDS as usize;
        let cached = CachedSession {
            user_id: session.user_id,
            expires_at: session.expires_at,
        };
        let json = serde_json::to_string(&cached)
            .map_err(|e| SessionError::Internal(format!("serialize: {e}")))?;

        redis::cmd("SETEX")
            .arg(&key)
            .arg(ttl)
            .arg(json)
            .query_async::<()>(&mut *conn)
            .await
            .map_err(|e| SessionError::Internal(format!("redis setex: {e}")))?;
        Ok(())
    }

    async fn invalidate_cache(&self, token: &SessionToken) -> Result<(), SessionError> {
        let mut conn = self.redis.lock().await;
        let key = Self::cache_key(token);
        redis::cmd("DEL")
            .arg(&key)
            .query_async::<()>(&mut *conn)
            .await
            .map_err(|e| SessionError::Internal(format!("redis del: {e}")))?;
        Ok(())
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
struct CachedSession {
    user_id: UserId,
    expires_at: DateTime<Utc>,
}

#[async_trait]
impl SessionStore for CachedSessionStore {
    async fn create(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        expires_at: DateTime<Utc>,
    ) -> Result<SessionToken, SessionError> {
        let token = self.postgres.create(ctx, user_id, expires_at).await?;
        let session = Session {
            user_id,
            expires_at,
        };
        // Best-effort cache write; don't fail the request if Redis is down.
        if let Err(e) = self.write_cache(&token, &session).await {
            tracing::warn!(error = %e, "failed to write session to cache");
        }
        Ok(token)
    }

    async fn find_valid(
        &self,
        ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<Option<Session>, SessionError> {
        match self.read_cache(token).await {
            Ok(Some(session)) => return Ok(Some(session)),
            Ok(None) => {}
            Err(e) => {
                tracing::warn!(error = %e, "session cache read failed, falling back to postgres");
            }
        }

        let session = self.postgres.find_valid(ctx, token).await?;
        if let Some(ref s) = session {
            if let Err(e) = self.write_cache(token, s).await {
                tracing::warn!(error = %e, "failed to write session back to cache");
            }
        }
        Ok(session)
    }

    async fn revoke(
        &self,
        ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<(), SessionError> {
        self.postgres.revoke(ctx, token).await?;
        if let Err(e) = self.invalidate_cache(token).await {
            tracing::warn!(error = %e, "failed to invalidate session cache");
        }
        Ok(())
    }
}
