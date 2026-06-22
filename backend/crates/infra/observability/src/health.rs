//! Infrastructure health checks and readiness reporting.

use std::sync::Arc;
use std::time::Instant;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use redis::aio::MultiplexedConnection;
use sqlx::PgPool;

use crate::ports::{ComponentHealth, HealthCheck};

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
        let mut components = Vec::with_capacity(self.checks.len());

        for check in &self.checks {
            components.push(check.check().await);
        }

        let healthy = components.iter().all(|c| c.healthy);

        HealthReport {
            healthy,
            checked_at,
            components,
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
            Err(e) => ComponentHealth {
                name: self.name().to_string(),
                healthy: false,
                latency_ms,
                error: Some(e.to_string()),
            },
        }
    }
}

/// Redis readiness check.
#[derive(Clone)]
pub struct RedisHealthCheck {
    conn: MultiplexedConnection,
}

impl RedisHealthCheck {
    /// Create a new Redis health check backed by `conn`.
    pub fn new(conn: MultiplexedConnection) -> Self {
        Self { conn }
    }
}

#[async_trait]
impl HealthCheck for RedisHealthCheck {
    fn name(&self) -> &str {
        "redis"
    }

    async fn check(&self) -> ComponentHealth {
        let start = Instant::now();
        let mut conn = self.conn.clone();
        let result: Result<(), redis::RedisError> = redis::cmd("PING").query_async(&mut conn).await;
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
