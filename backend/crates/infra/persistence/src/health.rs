use std::time::Instant;

use async_trait::async_trait;

use telemetry::ports::{ComponentHealth, HealthCheck};

use crate::rate_limiter::RedisRateLimiter;
use crate::repositories::pg_session::PgSessionStore;
use crate::repositories::pg_user::PgUserRepository;

#[async_trait]
impl HealthCheck for PgUserRepository {
    fn name(&self) -> &str {
        "postgres.user_repository"
    }

    async fn check(&self) -> ComponentHealth {
        let start = Instant::now();
        let result = sqlx::query("SELECT 1").fetch_one(self.pool()).await;
        let latency_ms = start.elapsed().as_secs_f64() * 1000.0;

        match result {
            Ok(_) => ComponentHealth {
                name: self.name().to_string(),
                healthy: true,
                latency_ms,
                error: None,
            },
            Err(e) => ComponentHealth {
                name: self.name().to_string(),
                healthy: false,
                latency_ms,
                error: Some(e.to_string()),
            },
        }
    }
}

#[async_trait]
impl HealthCheck for PgSessionStore {
    fn name(&self) -> &str {
        "postgres.session_store"
    }

    async fn check(&self) -> ComponentHealth {
        let start = Instant::now();
        let result = sqlx::query("SELECT 1").fetch_one(self.pool()).await;
        let latency_ms = start.elapsed().as_secs_f64() * 1000.0;

        match result {
            Ok(_) => ComponentHealth {
                name: self.name().to_string(),
                healthy: true,
                latency_ms,
                error: None,
            },
            Err(e) => ComponentHealth {
                name: self.name().to_string(),
                healthy: false,
                latency_ms,
                error: Some(e.to_string()),
            },
        }
    }
}

#[async_trait]
impl HealthCheck for RedisRateLimiter {
    fn name(&self) -> &str {
        "redis.rate_limiter"
    }

    async fn check(&self) -> ComponentHealth {
        let start = Instant::now();
        let mut conn = self.conn().lock().await;
        let result: Result<(), redis::RedisError> =
            redis::cmd("PING").query_async(&mut *conn).await;
        let latency_ms = start.elapsed().as_secs_f64() * 1000.0;

        match result {
            Ok(_) => ComponentHealth {
                name: self.name().to_string(),
                healthy: true,
                latency_ms,
                error: None,
            },
            Err(e) => ComponentHealth {
                name: self.name().to_string(),
                healthy: false,
                latency_ms,
                error: Some(e.to_string()),
            },
        }
    }
}
