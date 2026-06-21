//! Error handling middleware.

use axum::{extract::Request, middleware::Next, response::Response};

/// Error handling middleware.
///
/// Gateway handlers return [`crate::GatewayError`], which implements
/// [`axum::response::IntoResponse`]. This middleware currently just passes
/// responses through; centralized logging and fallback formatting can be added
/// here without touching route handlers.
pub async fn error_handler_middleware(request: Request, next: Next) -> Response {
    next.run(request).await
}
