use std::sync::Arc;

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;

use klynt_domain::ports::ComponentHealth;

use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct HealthStatus {
    pub status: String,
    pub version: String,
}

#[derive(Debug, Serialize)]
pub struct ReadinessReport {
    pub status: String,
    pub version: String,
    pub components: Vec<ComponentHealth>,
}

pub async fn liveness() -> impl IntoResponse {
    let status = HealthStatus {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    };
    (StatusCode::OK, Json(status))
}

pub async fn readiness(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let components = state.check_health().await;
    let all_healthy = components.iter().all(|c| c.healthy);

    let (status_code, status_str) = if all_healthy {
        (StatusCode::OK, "ok")
    } else {
        (StatusCode::SERVICE_UNAVAILABLE, "degraded")
    };

    (
        status_code,
        Json(ReadinessReport {
            status: status_str.to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            components,
        }),
    )
}
