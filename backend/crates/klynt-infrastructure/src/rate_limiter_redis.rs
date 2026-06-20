use std::net::IpAddr;
use std::sync::Arc;

use async_trait::async_trait;
use redis::aio::MultiplexedConnection;

use klynt_domain::config::RateLimiterConfig;
use klynt_domain::errors::DomainError;
use klynt_domain::ports::{HealthCheck, RateLimiter as RateLimiterPort};

/// Redis-backed fixed-window rate limiter.
///
/// Keys are scoped per IP address and expire after the configured window.
pub struct RedisRateLimiter {
    config: RateLimiterConfig,
    conn: Arc<tokio::sync::Mutex<MultiplexedConnection>>,
    script: redis::Script,
}

impl RedisRateLimiter {
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
                return 0
            end
            return 1
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
    async fn is_allowed(&self, ip: IpAddr) -> bool {
        if !self.config.enabled {
            return true;
        }

        let mut conn = self.conn.lock().await;
        let result: Result<i64, redis::RedisError> = self
            .script
            .key(self.key(ip))
            .arg(self.config.max_requests as i64)
            .arg(self.config.window_seconds as i64)
            .invoke_async(&mut *conn)
            .await;

        matches!(result, Ok(1))
    }
}

#[async_trait]
impl HealthCheck for RedisRateLimiter {
    async fn check(&self) -> Result<(), DomainError> {
        let mut conn = self.conn.lock().await;
        let _: () = redis::cmd("PING")
            .query_async(&mut *conn)
            .await
            .map_err(|e| DomainError::internal_msg(format!("redis health check failed: {e}")))?;
        Ok(())
    }
}
