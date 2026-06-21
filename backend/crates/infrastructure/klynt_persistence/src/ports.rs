//! Storage port interfaces.

use std::net::IpAddr;
use uuid::Uuid;

use crate::Error;

pub use klynt_telemetry::ports::{ComponentHealth, HealthCheck};

/// A generic idempotency cache.
#[async_trait::async_trait]
pub trait IdempotencyStore<T>: Send + Sync
where
    T: Clone + Send + Sync + 'static,
{
    async fn get(&self, key: Uuid) -> Result<Option<T>, Error>;
    async fn set(&self, key: Uuid, value: T) -> Result<(), Error>;
    async fn get_or_insert(&self, key: Uuid, value: T) -> Result<Option<T>, Error>;
}

/// Result of a rate-limit check.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RateLimitDecision {
    pub allowed: bool,
    pub retry_after_seconds: Option<u32>,
}

impl RateLimitDecision {
    pub fn allowed() -> Self {
        Self {
            allowed: true,
            retry_after_seconds: None,
        }
    }

    pub fn denied(retry_after: u32) -> Self {
        Self {
            allowed: false,
            retry_after_seconds: Some(retry_after),
        }
    }
}

#[async_trait::async_trait]
pub trait RateLimiter: Send + Sync {
    async fn check(&self, ip: IpAddr) -> RateLimitDecision;
}

pub mod email;
pub mod password_hasher;

pub use email::{EmailService, SharedEmailService};
pub use password_hasher::{HashedPassword, PasswordHasher};
