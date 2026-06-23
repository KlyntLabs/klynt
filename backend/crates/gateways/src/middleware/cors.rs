//! CORS middleware.

use axum::http::{
    header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE, ORIGIN},
    HeaderValue, Method,
};
use tower_http::cors::CorsLayer;

/// Build a CORS layer from the gateway configuration.
///
/// If `allowed_origins` is empty, the layer allows any origin without
/// credentials. In production, origins should be explicitly configured and
/// credentials enabled.
pub fn cors_layer(allowed_origins: &[String]) -> CorsLayer {
    let origins: Vec<HeaderValue> = allowed_origins
        .iter()
        .filter_map(|origin| HeaderValue::from_str(origin).ok())
        .collect();

    let methods = [
        Method::GET,
        Method::POST,
        Method::PUT,
        Method::PATCH,
        Method::DELETE,
        Method::OPTIONS,
    ];

    if origins.is_empty() {
        CorsLayer::new()
            .allow_methods(methods)
            .allow_headers([AUTHORIZATION, CONTENT_TYPE, ACCEPT, ORIGIN])
            .allow_origin(tower_http::cors::Any)
    } else {
        CorsLayer::new()
            .allow_methods(methods)
            .allow_headers([AUTHORIZATION, CONTENT_TYPE, ACCEPT, ORIGIN])
            .allow_origin(origins)
            .allow_credentials(true)
    }
}
