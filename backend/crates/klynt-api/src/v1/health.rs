use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;

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

pub async fn readiness() -> impl IntoResponse {
    // TODO: check database connectivity when database is added
    let status = HealthStatus {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    };
    (StatusCode::OK, Json(status))
}
