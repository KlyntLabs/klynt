use std::sync::Arc;
use std::time::Duration;

use axum::{
    http::{HeaderName, HeaderValue, Method, StatusCode},
    middleware, Router,
};
use tower_http::{
    compression::CompressionLayer, cors::CorsLayer, timeout::TimeoutLayer, trace::TraceLayer,
};

use crate::middleware::{ctx_resolve, propagate_request_id};
use crate::rate_limit::rate_limit;
use crate::state::AppState;
use crate::v1;

const ALLOWED_METHODS: [Method; 4] = [Method::GET, Method::POST, Method::PUT, Method::DELETE];

const ALLOWED_HEADERS: [HeaderName; 4] = [
    HeaderName::from_static("content-type"),
    HeaderName::from_static("idempotency-key"),
    HeaderName::from_static("x-request-id"),
    HeaderName::from_static("authorization"),
];

pub fn build_router(state: Arc<AppState>) -> Router {
    let origins: Vec<HeaderValue> = state
        .config()
        .api
        .allowed_origins
        .iter()
        .filter_map(|origin| origin.parse().ok())
        .collect();

    let cors = CorsLayer::new()
        .allow_origin(origins)
        .allow_methods(ALLOWED_METHODS)
        .allow_headers(ALLOWED_HEADERS);

    Router::new()
        .nest("/api/v1", v1::router())
        .nest("/api/v1", v1::health_router())
        .with_state(Arc::clone(&state))
        .layer(middleware::from_fn_with_state(
            Arc::clone(&state),
            ctx_resolve,
        ))
        .layer(middleware::from_fn_with_state(
            Arc::clone(&state),
            rate_limit,
        ))
        .layer(middleware::from_fn(propagate_request_id))
        .layer(TraceLayer::new_for_http())
        .layer(CompressionLayer::new())
        .layer(TimeoutLayer::with_status_code(
            StatusCode::REQUEST_TIMEOUT,
            Duration::from_secs(30),
        ))
        .layer(cors)
}
