//! Redis read-through cache for session storage.
//!
//! Postgres remains the authoritative store. Redis is used only to reduce
//! read latency; any Redis failure is logged and falls back to Postgres.
//!
//! # Best-effort invalidation note
//!
//! `revoke` deletes the session from Postgres and then attempts to delete the
//! cached entry from Redis. If Redis is unreachable at revoke time, the cached
//! entry is left in place and will continue to be treated as valid until its
//! TTL expires (currently 15 minutes). Callers should ensure Redis is available
//! for revocation to take immediate effect.

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::session::{
    MembershipSnapshot, Session, SessionError, SessionKind, SessionStore, SessionToken,
};
use chrono::{DateTime, Utc};
use domain::UserId;
use redis::aio::MultiplexedConnection;
use uuid::Uuid;

use super::session::PgSessionStore;

const SESSION_TTL_SECONDS: u64 = 900; // 15 minutes

/// Read-through Redis cache over [`PgSessionStore`].
///
/// See the module-level documentation for important notes on best-effort cache
/// invalidation during `revoke`.
pub struct CachedSessionStore {
    postgres: PgSessionStore,
    redis: Option<MultiplexedConnection>,
}

impl CachedSessionStore {
    /// Create a new cached store from an existing Redis `MultiplexedConnection`.
    ///
    /// Prefer [`CachedSessionStore::connect`] when wiring the composition root.
    pub fn new(postgres: PgSessionStore, redis: MultiplexedConnection) -> Self {
        Self {
            postgres,
            redis: Some(redis),
        }
    }

    /// Connect to Redis at `redis_url` and return a new cached store.
    ///
    /// If the Redis connection cannot be established, the store is created
    /// without a cache and all operations fall back to Postgres. The failure
    /// is logged but does not fail the call.
    pub async fn connect(postgres: PgSessionStore, redis_url: &str) -> Self {
        let client = match redis::Client::open(redis_url) {
            Ok(client) => client,
            Err(e) => {
                tracing::warn!(error = %e, "invalid redis session cache url; falling back to postgres");
                return Self {
                    postgres,
                    redis: None,
                };
            }
        };

        match client.get_multiplexed_async_connection().await {
            Ok(conn) => Self::new(postgres, conn),
            Err(e) => {
                tracing::warn!(error = %e, "failed to connect to redis session cache; falling back to postgres");
                Self {
                    postgres,
                    redis: None,
                }
            }
        }
    }

    fn cache_key(token: &SessionToken) -> String {
        format!("session:{}", token.0)
    }

    async fn read_cache(&self, token: &SessionToken) -> Result<Option<Session>, SessionError> {
        let mut conn = match self.redis.as_ref() {
            Some(conn) => conn.clone(),
            None => {
                return Err(SessionError::Internal(
                    "redis session cache unavailable".to_string(),
                ))
            }
        };

        let key = Self::cache_key(token);
        let value: Option<String> = redis::cmd("GET")
            .arg(&key)
            .query_async(&mut conn)
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
                    kind: cached.kind,
                    pair_id: cached.pair_id,
                    tenant_memberships: cached.tenant_memberships,
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
        let mut conn = match self.redis.as_ref() {
            Some(conn) => conn.clone(),
            None => {
                return Err(SessionError::Internal(
                    "redis session cache unavailable".to_string(),
                ))
            }
        };

        let key = Self::cache_key(token);
        let ttl = SESSION_TTL_SECONDS as usize;
        let cached = CachedSession {
            user_id: session.user_id,
            expires_at: session.expires_at,
            kind: session.kind,
            pair_id: session.pair_id,
            tenant_memberships: session.tenant_memberships.clone(),
        };
        let json = serde_json::to_string(&cached)
            .map_err(|e| SessionError::Internal(format!("serialize: {e}")))?;

        redis::cmd("SETEX")
            .arg(&key)
            .arg(ttl)
            .arg(json)
            .query_async::<()>(&mut conn)
            .await
            .map_err(|e| SessionError::Internal(format!("redis setex: {e}")))?;
        Ok(())
    }

    async fn invalidate_cache(&self, token: &SessionToken) -> Result<(), SessionError> {
        let mut conn = match self.redis.as_ref() {
            Some(conn) => conn.clone(),
            None => {
                return Err(SessionError::Internal(
                    "redis session cache unavailable".to_string(),
                ))
            }
        };

        let key = Self::cache_key(token);
        redis::cmd("DEL")
            .arg(&key)
            .query_async::<()>(&mut conn)
            .await
            .map_err(|e| SessionError::Internal(format!("redis del: {e}")))?;
        Ok(())
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
struct CachedSession {
    user_id: UserId,
    expires_at: DateTime<Utc>,
    kind: SessionKind,
    pair_id: Option<Uuid>,
    tenant_memberships: Vec<MembershipSnapshot>,
}

#[async_trait]
impl SessionStore for CachedSessionStore {
    async fn create_with_kind(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        expires_at: DateTime<Utc>,
        kind: SessionKind,
        pair_id: Option<Uuid>,
    ) -> Result<SessionToken, SessionError> {
        let token = self
            .postgres
            .create_with_kind(ctx, user_id, expires_at, kind, pair_id)
            .await?;

        // Only cache access tokens. Refresh tokens are security-sensitive and
        // low-read; caching them would complicate invalidation (we can't
        // enumerate cached tokens by pair_id). Long-lived access tokens are
        // treated the same way here to keep invalidation simple.
        if kind == SessionKind::Access {
            let session = Session {
                user_id,
                expires_at,
                kind,
                pair_id,
                tenant_memberships: Vec::new(),
            };
            if let Err(e) = self.write_cache(&token, &session).await {
                tracing::warn!(error = %e, "failed to write session to cache");
            }
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
            if s.kind == SessionKind::Access {
                if let Err(e) = self.write_cache(token, s).await {
                    tracing::warn!(error = %e, "failed to write session back to cache");
                }
            }
        }
        Ok(session)
    }

    /// Revoke the session.
    ///
    /// The session is always removed from Postgres. Cache invalidation is
    /// best-effort: if Redis is unreachable, the cached entry will remain
    /// valid until its TTL expires. See the module-level documentation for
    /// security implications.
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

    async fn revoke_pair(
        &self,
        ctx: &ExecutionContext,
        pair_id: Uuid,
        except_token: &SessionToken,
    ) -> Result<(), SessionError> {
        self.postgres
            .revoke_pair(ctx, pair_id, except_token)
            .await?;
        // Cache invalidation for the pair is best-effort. We can't enumerate
        // cached tokens by pair_id in Redis without a secondary index, so we
        // rely on the 15-minute TTL to expire any stale cached pair entries.
        Ok(())
    }

    async fn update_memberships(
        &self,
        ctx: &ExecutionContext,
        token: &SessionToken,
        memberships: Vec<MembershipSnapshot>,
    ) -> Result<(), SessionError> {
        self.postgres
            .update_memberships(ctx, token, memberships)
            .await?;
        if let Err(e) = self.invalidate_cache(token).await {
            tracing::warn!(error = %e, "failed to invalidate session cache after membership update");
        }
        Ok(())
    }

    async fn add_membership(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        membership: MembershipSnapshot,
    ) -> Result<(), SessionError> {
        self.postgres.add_membership(ctx, user_id, membership).await
    }
}
