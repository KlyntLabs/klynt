use std::net::IpAddr;

use async_trait::async_trait;
use uuid::Uuid;

use crate::errors::DomainError;

/// Per-component health check result.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ComponentHealth {
    pub name: String,
    pub healthy: bool,
    pub latency_ms: f64,
    pub error: Option<String>,
}

/// Health-check port for readiness probes.
#[async_trait]
pub trait HealthCheck: Send + Sync {
    /// Name of the component being checked (e.g. "postgres.user_repository").
    fn name(&self) -> &str;

    /// Check the component's health, returning timing + status.
    async fn check(&self) -> ComponentHealth;
}

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

/// Result of a rate-limit check.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RateLimitDecision {
    pub allowed: bool,
    /// Seconds remaining in the current window. `None` if not rate-limited
    /// or if the backend cannot determine the TTL.
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

#[async_trait]
pub trait RateLimiter: Send + Sync {
    async fn check(&self, ip: IpAddr) -> RateLimitDecision;
}

pub mod email;
pub mod password_hasher;

pub use email::{EmailService, SharedEmailService};
pub use password_hasher::{HashedPassword, PasswordHasher};
