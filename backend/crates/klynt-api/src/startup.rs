use std::sync::Arc;
use std::time::Duration;

use axum::{
    http::{HeaderName, HeaderValue, Method, Request, StatusCode},
    middleware, Router,
};
use tower_http::{
    compression::CompressionLayer, cors::CorsLayer, timeout::TimeoutLayer, trace::TraceLayer,
};

use crate::middleware::ctx_resolve;
use crate::middleware::security_headers::security_headers;
use crate::rate_limit::rate_limit;
use crate::request_context::{request_context, REQUEST_ID_HEADER};
use crate::response::mw_map_response;
use crate::state::AppState;
use crate::v1;

const ALLOWED_METHODS: [Method; 4] = [Method::GET, Method::POST, Method::PUT, Method::DELETE];

const ALLOWED_HEADERS: [HeaderName; 4] = [
    HeaderName::from_static("content-type"),
    HeaderName::from_static("idempotency-key"),
    HeaderName::from_static(REQUEST_ID_HEADER),
    HeaderName::from_static("authorization"),
];

/// Build the application router with the full middleware stack.
///
/// Layer order (outermost → innermost at runtime):
/// CORS → security_headers → Timeout → Compression → Trace → (health: raw | api: request_context → rate_limit → ctx_resolve → map_response → handler)
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

    let hsts_enabled = state.config().hsts_enabled;

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
        .layer(
            TraceLayer::new_for_http().make_span_with(|req: &Request<_>| {
                let request_id = req
                    .headers()
                    .get(REQUEST_ID_HEADER)
                    .and_then(|v| v.to_str().ok())
                    .unwrap_or("-");
                tracing::debug_span!(
                    "http.request",
                    method = %req.method(),
                    uri = %req.uri(),
                    version = ?req.version(),
                    request_id = %request_id,
                    trace_id = tracing::field::Empty,
                )
            }),
        )
        .layer(CompressionLayer::new())
        .layer(TimeoutLayer::with_status_code(
            StatusCode::REQUEST_TIMEOUT,
            Duration::from_secs(30),
        ))
        .layer(middleware::from_fn(move |req, next| {
            security_headers(hsts_enabled, req, next)
        }))
        .layer(cors)
}
