use std::net::IpAddr;

use async_trait::async_trait;
use uuid::Uuid;

use crate::errors::DomainError;

/// A generic idempotency cache.
///
/// The store is parameterized by the payload type so the same port can be
/// reused across different use cases and endpoints.
#[async_trait]
pub trait IdempotencyStore<T>: Send + Sync
where
    T: Clone + Send + Sync + 'static,
{
    async fn get(&self, key: Uuid) -> Result<Option<T>, DomainError>;
    async fn set(&self, key: Uuid, value: T) -> Result<(), DomainError>;

    /// Insert `value` only if `key` is absent. Returns the existing value when one is present.
    async fn get_or_insert(&self, key: Uuid, value: T) -> Result<Option<T>, DomainError>;
}

pub trait RateLimiter: Send + Sync {
    fn is_allowed(&self, ip: IpAddr) -> bool;
}
