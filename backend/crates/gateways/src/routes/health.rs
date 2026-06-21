//! Health check endpoint.

use axum::{extract::State, response::Json};

use crate::state::Services;

/// GET /health
///
/// Liveness probe. Always returns 200 OK when the gateway is running.
pub async fn health_check(State(_services): State<Services>) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "ok",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "services": {
            "auth": "ok"
        }
    }))
}
