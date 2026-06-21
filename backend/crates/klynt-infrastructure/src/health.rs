use async_trait::async_trait;

use klynt_domain::errors::DomainError;
use klynt_domain::ports::HealthCheck;

use crate::rate_limiter_redis::RedisRateLimiter;
use crate::repositories::pg_session::PgSessionStore;
use crate::repositories::pg_user::PgUserRepository;

#[async_trait]
impl HealthCheck for PgUserRepository {
    async fn check(&self) -> Result<(), DomainError> {
        sqlx::query("SELECT 1")
            .fetch_one(self.pool())
            .await
            .map_err(|e| {
                DomainError::internal_msg(format!(
                    "postgres user repository health check failed: {e}"
                ))
            })?;
        Ok(())
    }
}

#[async_trait]
impl HealthCheck for PgSessionStore {
    async fn check(&self) -> Result<(), DomainError> {
        sqlx::query("SELECT 1")
            .fetch_one(self.pool())
            .await
            .map_err(|e| {
                DomainError::internal_msg(format!(
                    "postgres session store health check failed: {e}"
                ))
            })?;
        Ok(())
    }
}

#[async_trait]
impl HealthCheck for RedisRateLimiter {
    async fn check(&self) -> Result<(), DomainError> {
        let mut conn = self.conn().lock().await;
        let _: () = redis::cmd("PING")
            .query_async(&mut *conn)
            .await
            .map_err(|e| DomainError::internal_msg(format!("redis health check failed: {e}")))?;
        Ok(())
    }
}
