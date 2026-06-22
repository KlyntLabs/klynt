//! Rate-limit middleware for auth endpoints.

use std::net::{IpAddr, SocketAddr};

use axum::extract::{ConnectInfo, Request, State};
use axum::middleware::Next;
use axum::response::Response;
use persistence::ports::{RateLimitAction, RateLimitScope};

use crate::state::Services;

/// Middleware that rate-limits login attempts.
pub async fn rate_limit_login(
    State(services): State<Services>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request,
    next: Next,
) -> Result<Response, crate::GatewayError> {
    check(services, addr.ip(), RateLimitAction::Login).await?;
    Ok(next.run(request).await)
}

/// Middleware that rate-limits registration attempts.
pub async fn rate_limit_register(
    State(services): State<Services>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request,
    next: Next,
) -> Result<Response, crate::GatewayError> {
    check(services, addr.ip(), RateLimitAction::Register).await?;
    Ok(next.run(request).await)
}

async fn check(
    services: Services,
    ip: IpAddr,
    action: RateLimitAction,
) -> Result<(), crate::GatewayError> {
    let decision = services
        .rate_limiter
        .check(RateLimitScope { ip, action })
        .await;

    if decision.allowed {
        Ok(())
    } else {
        let retry_after = decision.retry_after_seconds.unwrap_or(60);
        Err(crate::GatewayError::RateLimited(retry_after))
    }
}
