//! HTTP route definitions.

pub mod auth;
pub mod health;
pub mod openapi;

use axum::Router;

use crate::state::{Config, Services};

/// Create the complete router with all routes and middleware.
pub fn create_router(config: Config, services: Services) -> Router {
    let hsts_enabled = config.hsts_enabled;
    let allowed_origins = config.allowed_origins.clone();

    Router::new()
        // Health check (no auth required)
        .route("/health", axum::routing::get(health::health_check))
        // OpenAPI spec
        .route("/openapi.json", axum::routing::get(openapi::openapi_spec))
        // API v1 routes
        .nest("/api/v1", api_v1_routes())
        // CORS (applies to all routes)
        .layer(crate::middleware::cors::cors_layer(&allowed_origins))
        // Security headers
        .layer(axum::middleware::from_fn(move |req, next| {
            crate::middleware::security_headers::security_headers(hsts_enabled, req, next)
        }))
        // Request ID (applies to all routes)
        .layer(axum::middleware::from_fn(
            crate::middleware::request_id::request_id_middleware,
        ))
        // Error handler
        .layer(axum::middleware::from_fn(
            crate::middleware::error_handler::error_handler_middleware,
        ))
        .with_state(services)
}

/// API v1 routes.
fn api_v1_routes() -> Router<Services> {
    Router::new()
        // Auth routes (no authentication required)
        .nest("/auth", auth::routes())
    // Protected routes (require authentication)
    // .nest("/users", user_routes()) // Future
}
