use std::sync::Arc;

use axum::{routing::get, Router};

use crate::state::AppState;

pub mod health;
pub mod users;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/health/live", get(health::liveness))
        .route("/health/ready", get(health::readiness))
}
