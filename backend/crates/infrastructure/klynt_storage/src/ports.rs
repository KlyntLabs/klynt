//! Storage port interfaces.

use std::net::IpAddr;
use uuid::Uuid;

use crate::Error;

/// Per-component health check result.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ComponentHealth {
    pub name: String,
    pub healthy: bool,
    pub latency_ms: f64,
    pub error: Option<String>,
}

/// Health-check port for readiness probes.
#[async_trait::async_trait]
pub trait HealthCheck: Send + Sync {
    /// Name of the component being checked (e.g. "postgres.user_repository").
    fn name(&self) -> &str;

    /// Check the component's health, returning timing + status.
    async fn check(&self) -> ComponentHealth;
}

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
