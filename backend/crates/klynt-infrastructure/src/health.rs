use async_trait::async_trait;
use std::sync::Mutex;

use klynt_domain::errors::DomainError;
use klynt_domain::ports::HealthCheck;

use crate::rate_limiter::RateLimiter;
use crate::repositories::idempotency::InMemoryIdempotencyStore;
use crate::repositories::in_memory_user::InMemoryUserRepository;
use crate::repositories::session::InMemorySessionStore;
use crate::unit_of_work::InMemoryUnitOfWork;

fn check_lock<T>(name: &'static str, lock: &Mutex<T>) -> Result<(), DomainError> {
    drop(
        lock.lock()
            .map_err(|_| DomainError::internal_msg(format!("{} lock is poisoned", name)))?,
    );
    Ok(())
}

/// Health-check adapter for any dependency whose health can be verified by
/// acquiring a `Mutex`. Poisoned locks surface as `DomainError::Internal`.
pub struct LockHealthCheck<T> {
    name: &'static str,
    inner: Mutex<T>,
}

impl<T> LockHealthCheck<T> {
    pub fn new(name: &'static str, inner: T) -> Self {
        Self {
            name,
            inner: Mutex::new(inner),
        }
    }
}

#[async_trait]
impl<T: Send + Sync + 'static> HealthCheck for LockHealthCheck<T> {
    async fn check(&self) -> Result<(), DomainError> {
        check_lock(self.name, &self.inner)
    }
}

#[async_trait]
impl HealthCheck for InMemoryUserRepository {
    async fn check(&self) -> Result<(), DomainError> {
        check_lock("user repository", &self.users)
    }
}

#[async_trait]
impl<T> HealthCheck for InMemoryIdempotencyStore<T>
where
    T: Clone + Send + Sync + 'static,
{
    async fn check(&self) -> Result<(), DomainError> {
        check_lock("idempotency cache", &self.cache)
    }
}

#[async_trait]
impl HealthCheck for InMemorySessionStore {
    async fn check(&self) -> Result<(), DomainError> {
        check_lock("session store", &self.sessions)
    }
}

#[async_trait]
impl HealthCheck for InMemoryUnitOfWork {
    async fn check(&self) -> Result<(), DomainError> {
        check_lock("unit of work", &self.users)
    }
}

#[async_trait]
impl HealthCheck for RateLimiter {
    async fn check(&self) -> Result<(), DomainError> {
        check_lock("rate limiter", &self.buckets)
    }
}
