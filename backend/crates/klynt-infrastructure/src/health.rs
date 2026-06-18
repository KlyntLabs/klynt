use async_trait::async_trait;

use klynt_domain::errors::DomainError;
use klynt_domain::ports::HealthCheck;

use crate::rate_limiter::RateLimiter;
use crate::repositories::idempotency::InMemoryIdempotencyStore;
use crate::repositories::in_memory_user::InMemoryUserRepository;
use crate::repositories::session::InMemorySessionStore;
use crate::unit_of_work::InMemoryUnitOfWork;

#[async_trait]
impl HealthCheck for InMemoryUserRepository {
    async fn check(&self) -> Result<(), DomainError> {
        // Acquiring the lock verifies the store is not poisoned.
        drop(self.users.lock().map_err(|_| {
            DomainError::Internal(anyhow::anyhow!("user repository lock is poisoned"))
        })?);
        Ok(())
    }
}

#[async_trait]
impl<T> HealthCheck for InMemoryIdempotencyStore<T>
where
    T: Clone + Send + Sync + 'static,
{
    async fn check(&self) -> Result<(), DomainError> {
        drop(self.cache.lock().map_err(|_| {
            DomainError::Internal(anyhow::anyhow!("idempotency cache lock is poisoned"))
        })?);
        Ok(())
    }
}

#[async_trait]
impl HealthCheck for InMemorySessionStore {
    async fn check(&self) -> Result<(), DomainError> {
        drop(self.sessions.lock().map_err(|_| {
            DomainError::Internal(anyhow::anyhow!("session store lock is poisoned"))
        })?);
        Ok(())
    }
}

#[async_trait]
impl HealthCheck for InMemoryUnitOfWork {
    async fn check(&self) -> Result<(), DomainError> {
        drop(self.users.lock().map_err(|_| {
            DomainError::Internal(anyhow::anyhow!("unit of work lock is poisoned"))
        })?);
        Ok(())
    }
}

#[async_trait]
impl HealthCheck for RateLimiter {
    async fn check(&self) -> Result<(), DomainError> {
        drop(self.buckets.lock().map_err(|_| {
            DomainError::Internal(anyhow::anyhow!("rate limiter lock is poisoned"))
        })?);
        Ok(())
    }
}
