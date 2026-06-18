use std::sync::Arc;
use std::time::Duration;

use axum::{
    http::{HeaderValue, Method, StatusCode},
    Router,
};
use tower_http::{
    compression::CompressionLayer,
    cors::{Any, CorsLayer},
    timeout::TimeoutLayer,
    trace::TraceLayer,
};

use crate::state::AppState;
use crate::v1;

pub fn build_router(state: Arc<AppState>) -> Router {
    let origins: Vec<HeaderValue> = state
        .config
        .api
        .allowed_origins
        .iter()
        .filter_map(|o| o.parse().ok())
        .collect();

    let cors = if origins.is_empty() {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
            .allow_headers(Any)
    } else {
        CorsLayer::new()
            .allow_origin(origins)
            .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
            .allow_headers(Any)
    };

    Router::new()
        .nest("/api/v1", v1::router())
        .layer(TraceLayer::new_for_http())
        .layer(CompressionLayer::new())
        .layer(TimeoutLayer::with_status_code(
            StatusCode::REQUEST_TIMEOUT,
            Duration::from_secs(30),
        ))
        .layer(cors)
        .with_state(state)
}
