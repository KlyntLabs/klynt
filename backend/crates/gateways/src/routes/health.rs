//! Health check endpoints.

use axum::{extract::State, http::StatusCode, response::Json};

use crate::state::Services;

/// GET /health
///
/// Legacy health check. Always returns 200 OK when the gateway is running.
pub async fn health_check(State(_services): State<Services>) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "services": {
            "auth": "ok"
        }
    }))
}

/// GET /health/live
///
/// Liveness probe. Always returns 200 OK when the gateway process is running.
pub async fn live_check(State(_services): State<Services>) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "alive",
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }))
}

/// GET /health/ready
///
/// Readiness probe. Returns 200 when all dependencies are healthy, otherwise
/// 503 Service Unavailable.
pub async fn ready_check(
    State(services): State<Services>,
) -> (StatusCode, Json<observability::health::HealthReport>) {
    let report = services.health_reporter.ready().await;
    let status = if report.healthy {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };
    (status, Json(report))
}
