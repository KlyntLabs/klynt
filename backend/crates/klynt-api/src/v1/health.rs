use std::sync::Arc;

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;

use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct HealthStatus {
    pub status: String,
    pub version: String,
}

pub async fn liveness() -> impl IntoResponse {
    let status = HealthStatus {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    };
    (StatusCode::OK, Json(status))
}

pub async fn readiness(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    for check in &state.health_checks {
        if check.check().await.is_err() {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(HealthStatus {
                    status: "not_ready".to_string(),
                    version: env!("CARGO_PKG_VERSION").to_string(),
                }),
            );
        }
    }

    (
        StatusCode::OK,
        Json(HealthStatus {
            status: "ok".to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
        }),
    )
}
