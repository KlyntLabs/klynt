use std::marker::PhantomData;
use std::sync::Arc;

use async_trait::async_trait;
use redis::aio::MultiplexedConnection;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use uuid::Uuid;

use klynt_shared_domain::DomainError;
use klynt_storage::ports::IdempotencyStore;

/// Redis-backed idempotency store.
///
/// Keys are written with a TTL so stale entries expire automatically. Values are
/// serialized as JSON, making the store reusable for any serializable payload
/// type.
pub struct RedisIdempotencyStore<T> {
    conn: Arc<Mutex<MultiplexedConnection>>,
    ttl_seconds: u64,
    _phantom: PhantomData<T>,
}

impl<T> RedisIdempotencyStore<T> {
    /// Connects to Redis and returns a new store with the given entry TTL.
    pub async fn new(redis_url: &str, ttl_seconds: u64) -> Result<Self, DomainError> {
        let client = redis::Client::open(redis_url)
            .map_err(|e| DomainError::internal_msg(format!("invalid redis url: {e}")))?;
        let conn = client
            .get_multiplexed_async_connection()
            .await
            .map_err(|e| DomainError::internal_msg(format!("redis connection failed: {e}")))?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
            ttl_seconds,
            _phantom: PhantomData,
        })
    }

    fn key(idempotency_key: Uuid) -> String {
        format!("idempotency:{idempotency_key}")
    }
}

#[async_trait]
impl<T> IdempotencyStore<T> for RedisIdempotencyStore<T>
where
    T: Clone + Send + Sync + 'static + Serialize + for<'de> Deserialize<'de>,
{
    async fn get(&self, key: Uuid) -> Result<Option<T>, DomainError> {
        let mut conn = self.conn.lock().await;
        let raw: Option<String> = redis::cmd("GET")
            .arg(Self::key(key))
            .query_async(&mut *conn)
            .await
            .map_err(|e| DomainError::internal_msg(format!("idempotency get failed: {e}")))?;

        raw.map(|value| {
            serde_json::from_str(&value).map_err(|e| {
                DomainError::internal_msg(format!("idempotency deserialize failed: {e}"))
            })
        })
        .transpose()
    }

    async fn set(&self, key: Uuid, value: T) -> Result<(), DomainError> {
        let raw = serde_json::to_string(&value)
            .map_err(|e| DomainError::internal_msg(format!("idempotency serialize failed: {e}")))?;

        let mut conn = self.conn.lock().await;
        redis::cmd("SET")
            .arg(Self::key(key))
            .arg(raw)
            .arg("EX")
            .arg(self.ttl_seconds)
            .query_async::<()>(&mut *conn)
            .await
            .map_err(|e| DomainError::internal_msg(format!("idempotency set failed: {e}")))?;

        Ok(())
    }

    async fn get_or_insert(&self, key: Uuid, value: T) -> Result<Option<T>, DomainError> {
        let raw = serde_json::to_string(&value)
            .map_err(|e| DomainError::internal_msg(format!("idempotency serialize failed: {e}")))?;

        let mut conn = self.conn.lock().await;

        // Try to set the key only if it does not exist, with a TTL.
        let was_set: bool = redis::cmd("SET")
            .arg(Self::key(key))
            .arg(raw)
            .arg("NX")
            .arg("EX")
            .arg(self.ttl_seconds)
            .query_async(&mut *conn)
            .await
            .map(|reply: Option<String>| reply.is_some())
            .map_err(|e| {
                DomainError::internal_msg(format!("idempotency get_or_insert failed: {e}"))
            })?;

        if was_set {
            return Ok(None);
        }

        // Key already existed; return the stored value.
        let stored: String = redis::cmd("GET")
            .arg(Self::key(key))
            .query_async(&mut *conn)
            .await
            .map_err(|e| DomainError::internal_msg(format!("idempotency get failed: {e}")))?;

        serde_json::from_str(&stored)
            .map(Some)
            .map_err(|e| DomainError::internal_msg(format!("idempotency deserialize failed: {e}")))
    }
}
