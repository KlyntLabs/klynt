//! Prometheus metrics endpoint.
//!
//! # Security note
//!
//! `GET /metrics` is currently exposed on the public router without
//! authentication. This is acceptable for local development and trusted
//! networks, but must be restricted before production. Acceptable controls
//! include:
//!
//! - Binding the metrics endpoint to a separate internal port or admin router.
//! - Requiring admin-scoped authentication (e.g. a service token).
//! - Enforcing network policies so only the monitoring stack can reach it.

use axum::{extract::State, http::StatusCode, response::Response};

use crate::state::Services;

/// GET /metrics
///
/// Expose Prometheus metrics in exposition format.
pub async fn metrics(State(services): State<Services>) -> Response<String> {
    Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "text/plain; version=0.0.4")
        .body(services.metrics_handle.render())
        .unwrap()
}
