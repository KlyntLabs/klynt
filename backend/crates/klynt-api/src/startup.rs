use std::sync::Arc;
use std::time::Duration;

use axum::{
    http::{HeaderName, HeaderValue, Method, StatusCode},
    middleware, Router,
};
use tower_http::{
    compression::CompressionLayer, cors::CorsLayer, timeout::TimeoutLayer, trace::TraceLayer,
};

use crate::middleware::ctx_resolve;
use crate::rate_limit::rate_limit;
use crate::request_context::request_context;
use crate::response::mw_map_response;
use crate::state::AppState;
use crate::v1;

const ALLOWED_METHODS: [Method; 4] = [Method::GET, Method::POST, Method::PUT, Method::DELETE];

const ALLOWED_HEADERS: [HeaderName; 4] = [
    HeaderName::from_static("content-type"),
    HeaderName::from_static("idempotency-key"),
    HeaderName::from_static("x-request-id"),
    HeaderName::from_static("authorization"),
];

/// Build the application router with the full middleware stack.
///
/// Layer order (outermost → innermost at runtime):
/// CORS → Timeout → Compression → Trace → (health: raw | api: request_context → rate_limit → ctx_resolve → map_response → handler)
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

    // --- Health router: NO envelope, NO request_context, NO logging ---
    let health = Router::new()
        .nest("/api/v1", v1::health_router())
        .with_state(Arc::clone(&state));

    // --- API router: full middleware stack including envelope ---
    // Layers are applied innermost-first: map_response wraps the handler,
    // then ctx_resolve, rate_limit, and request_context sit outside it.
    let api = Router::new()
        .nest("/api/v1", v1::router())
        .with_state(Arc::clone(&state))
        .layer(middleware::map_response(mw_map_response))
        .layer(middleware::from_fn_with_state(
            Arc::clone(&state),
            ctx_resolve,
        ))
        .layer(middleware::from_fn_with_state(
            Arc::clone(&state),
            rate_limit,
        ))
        .layer(middleware::from_fn_with_state(
            Arc::clone(&state),
            request_context,
        ));

    // Merge health + API under shared outer layers.
    Router::new()
        .merge(health)
        .merge(api)
        .layer(TraceLayer::new_for_http())
        .layer(CompressionLayer::new())
        .layer(TimeoutLayer::with_status_code(
            StatusCode::REQUEST_TIMEOUT,
            Duration::from_secs(30),
        ))
        .layer(cors)
}
