//! Prometheus metrics endpoint.

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
