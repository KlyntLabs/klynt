use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    extract::{ConnectInfo, Request, State},
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

use klynt_domain::errors::DomainError;

use crate::error::AppError;
use crate::middleware::RequestId;
use crate::state::AppState;

/// Axum middleware that rejects requests once the client IP exceeds the rate limit.
pub async fn rate_limit(
    State(state): State<Arc<AppState>>,
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    let request_id = request
        .extensions()
        .get::<RequestId>()
        .map(|r| r.0)
        .unwrap_or_else(Uuid::new_v4);

    let allowed = request
        .extensions()
        .get::<ConnectInfo<SocketAddr>>()
        .map(|ConnectInfo(addr)| state.rate_limiter().is_allowed(addr.ip()))
        .unwrap_or(true);

    if !allowed {
        return Err(AppError::from(DomainError::RateLimited).with_request_id(request_id));
    }

    Ok(next.run(request).await)
}
