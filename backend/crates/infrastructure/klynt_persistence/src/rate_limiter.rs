use std::net::IpAddr;
use std::sync::Arc;

use async_trait::async_trait;
use redis::aio::MultiplexedConnection;

use klynt_config::RateLimiterConfig;
use klynt_domain::DomainError;

use crate::ports::{RateLimitDecision, RateLimiter as RateLimiterPort};

/// Redis-backed fixed-window rate limiter.
///
/// Keys are scoped per IP address and expire after the configured window.
pub struct RedisRateLimiter {
    config: RateLimiterConfig,
    conn: Arc<tokio::sync::Mutex<MultiplexedConnection>>,
    script: redis::Script,
}

impl RedisRateLimiter {
    /// Returns the underlying Redis connection so other infrastructure
    /// components (e.g. health checks) can reuse it.
    pub(crate) fn conn(&self) -> &Arc<tokio::sync::Mutex<MultiplexedConnection>> {
        &self.conn
    }

    pub async fn new(config: RateLimiterConfig, redis_url: &str) -> Result<Self, DomainError> {
        let client = redis::Client::open(redis_url)
            .map_err(|e| DomainError::internal_msg(format!("invalid redis url: {e}")))?;
        let conn = client
            .get_multiplexed_async_connection()
            .await
            .map_err(|e| DomainError::internal_msg(format!("redis connection failed: {e}")))?;

        let script = redis::Script::new(
            r#"
            local key = KEYS[1]
            local limit = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            local current = redis.call('INCR', key)
            if current == 1 then
                redis.call('EXPIRE', key, window)
            end
            if current > limit then
                local ttl = redis.call('TTL', key)
                return {0, ttl}
            end
            return {1, 0}
            "#,
        );

        Ok(Self {
            config,
            conn: Arc::new(tokio::sync::Mutex::new(conn)),
            script,
        })
    }

    fn key(&self, ip: IpAddr) -> String {
        format!("rate_limit:{}", ip)
    }
}

#[async_trait]
impl RateLimiterPort for RedisRateLimiter {
    async fn check(&self, ip: IpAddr) -> RateLimitDecision {
        if !self.config.enabled {
            return RateLimitDecision::allowed();
        }

        let mut conn = self.conn.lock().await;
        let result: Result<(i64, i64), redis::RedisError> = self
            .script
            .key(self.key(ip))
            .arg(self.config.max_requests as i64)
            .arg(self.config.window_seconds as i64)
            .invoke_async(&mut *conn)
            .await;

        match result {
            Ok((1, _)) => RateLimitDecision::allowed(),
            Ok((0, ttl)) => {
                let retry_after = if ttl > 0 {
                    ttl as u32
                } else {
                    self.config.window_seconds as u32
                };
                RateLimitDecision::denied(retry_after)
            }
            Ok((_, _)) => {
                // Unexpected script result; fail open.
                tracing::warn!("redis rate limiter returned unexpected result, failing open");
                RateLimitDecision::allowed()
            }
            Err(_) => {
                // On Redis errors, allow the request (fail-open).
                tracing::warn!("redis rate limiter error, failing open");
                RateLimitDecision::allowed()
            }
        }
    }
}
