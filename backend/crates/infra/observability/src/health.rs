//! Infrastructure health checks and readiness reporting.

use std::sync::Arc;
use std::time::{Duration, Instant};

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use futures_util::future::join_all;
use sqlx::PgPool;

use crate::ports::{ComponentHealth, HealthCheck};

/// Default timeout for an individual readiness check.
const CHECK_TIMEOUT: Duration = Duration::from_secs(2);

/// Aggregate readiness report returned by [`HealthReporter`].
#[derive(Debug, Clone, serde::Serialize)]
pub struct HealthReport {
    pub healthy: bool,
    pub checked_at: DateTime<Utc>,
    pub components: Vec<ComponentHealth>,
}

/// Reporter that aggregates readiness checks across infrastructure components.
#[async_trait]
pub trait HealthReporter: Send + Sync {
    /// Run all readiness checks and return an aggregate report.
    async fn ready(&self) -> HealthReport;
}

/// Health reporter that runs a collection of individual health checks.
#[derive(Clone)]
pub struct CompositeHealthReporter {
    checks: Vec<Arc<dyn HealthCheck>>,
}

impl CompositeHealthReporter {
    /// Create a reporter from the provided checks.
    pub fn new(checks: Vec<Arc<dyn HealthCheck>>) -> Self {
        Self { checks }
    }
}

#[async_trait]
impl HealthReporter for CompositeHealthReporter {
    async fn ready(&self) -> HealthReport {
        let checked_at = Utc::now();

        let futures = self.checks.iter().map(|check| {
            let check = check.clone();
            async move {
                let name = check.name().to_string();
                match tokio::time::timeout(CHECK_TIMEOUT, check.check()).await {
                    Ok(component) => component,
                    Err(_) => ComponentHealth {
                        name,
                        healthy: false,
                        latency_ms: CHECK_TIMEOUT.as_secs_f64() * 1000.0,
                        error: Some("timeout".to_string()),
                    },
                }
            }
        });

        let components = join_all(futures).await;
        let healthy = components.iter().all(|c| c.healthy);

        HealthReport {
            healthy,
            checked_at,
            components,
        }
    }
}

/// Check that always reports unhealthy.
///
/// Useful as a fallback when an infrastructure client cannot be constructed
/// at startup but the process must still start and report readiness.
#[derive(Clone)]
pub struct AlwaysUnhealthyCheck {
    name: String,
}

impl AlwaysUnhealthyCheck {
    /// Create a check named `name` that always reports unhealthy.
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
        }
    }
}

#[async_trait]
impl HealthCheck for AlwaysUnhealthyCheck {
    fn name(&self) -> &str {
        &self.name
    }

    async fn check(&self) -> ComponentHealth {
        ComponentHealth {
            name: self.name.clone(),
            healthy: false,
            latency_ms: 0.0,
            error: Some("connection failed".to_string()),
        }
    }
}

/// No-op reporter for tests or environments without infrastructure dependencies.
#[derive(Clone, Default)]
pub struct AlwaysReadyHealthReporter;

#[async_trait]
impl HealthReporter for AlwaysReadyHealthReporter {
    async fn ready(&self) -> HealthReport {
        HealthReport {
            healthy: true,
            checked_at: Utc::now(),
            components: vec![ComponentHealth {
                name: "none".to_string(),
                healthy: true,
                latency_ms: 0.0,
                error: None,
            }],
        }
    }
}

/// PostgreSQL readiness check.
#[derive(Clone)]
pub struct PostgresHealthCheck {
    pool: PgPool,
}

impl PostgresHealthCheck {
    /// Create a new Postgres health check backed by `pool`.
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl HealthCheck for PostgresHealthCheck {
    fn name(&self) -> &str {
        "postgres"
    }

    async fn check(&self) -> ComponentHealth {
        let start = Instant::now();
        let result = sqlx::query("SELECT 1").fetch_one(&self.pool).await;
        let latency_ms = start.elapsed().as_secs_f64() * 1000.0;

        match result {
            Ok(_) => ComponentHealth {
                name: self.name().to_string(),
                healthy: true,
                latency_ms,
                error: None,
            },
            Err(e) => {
                tracing::error!(error = %e, "postgres health check failed");
                ComponentHealth {
                    name: self.name().to_string(),
                    healthy: false,
                    latency_ms,
                    error: Some("connection failed".to_string()),
                }
            }
        }
    }
}

/// Redis readiness check.
///
/// Holds a [`redis::Client`] rather than an open connection so that Redis
/// unavailability at startup does not crash the process. The connection is
/// acquired lazily inside [`HealthCheck::check`], allowing readiness to report
/// `503` when Redis is down.
#[derive(Clone)]
pub struct RedisHealthCheck {
    client: redis::Client,
}

impl RedisHealthCheck {
    /// Create a new Redis health check from `client`.
    pub fn new(client: redis::Client) -> Self {
        Self { client }
    }
}

#[async_trait]
impl HealthCheck for RedisHealthCheck {
    fn name(&self) -> &str {
        "redis"
    }

    async fn check(&self) -> ComponentHealth {
        let start = Instant::now();

        let result: Result<(), redis::RedisError> = async {
            let mut conn = self.client.get_multiplexed_async_connection().await?;
            redis::cmd("PING").query_async(&mut conn).await
        }
        .await;

        let latency_ms = start.elapsed().as_secs_f64() * 1000.0;

        match result {
            Ok(_) => ComponentHealth {
                name: self.name().to_string(),
                healthy: true,
                latency_ms,
                error: None,
            },
            Err(e) => {
                tracing::error!(error = %e, "redis health check failed");
                ComponentHealth {
                    name: self.name().to_string(),
                    healthy: false,
                    latency_ms,
                    error: Some("connection failed".to_string()),
                }
            }
        }
    }
}
