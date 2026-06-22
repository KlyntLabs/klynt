//! Generic observability ports.

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
