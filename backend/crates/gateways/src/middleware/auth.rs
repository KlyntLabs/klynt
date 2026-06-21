//! Authentication middleware.

use axum::{
    extract::{FromRequestParts, Request},
    http::{header::AUTHORIZATION, request::Parts, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};

use klynt_base::ctx::{ActorType, ExecutionContext, RequestContext, RequestId};
use klynt_persistence::session::SessionToken;

use crate::state::Services;

const BEARER_PREFIX: &str = "Bearer ";

/// Authenticated request context.
///
/// Handlers on protected routes can extract this to access the authenticated
/// actor. If the middleware has not run or authentication failed, extraction
/// rejects with 401.
#[derive(Debug, Clone)]
pub struct AuthContext(pub ExecutionContext);

impl<S: Send + Sync> FromRequestParts<S> for AuthContext {
    type Rejection = crate::GatewayError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<ExecutionContext>()
            .cloned()
            .map(AuthContext)
            .ok_or_else(|| crate::GatewayError::Unauthorized("Authentication required".to_string()))
    }
}

/// Middleware that requires a valid bearer session token.
///
/// On success, the resolved [`ExecutionContext`] is inserted into request
/// extensions for handlers to extract. On failure, a 401 response is returned.
pub async fn require_auth(
    axum::extract::State(services): axum::extract::State<Services>,
    mut request: Request,
    next: Next,
) -> Result<Response, crate::GatewayError> {
    let request_id = request
        .extensions()
        .get::<RequestId>()
        .copied()
        .unwrap_or_default();

    let token = extract_bearer_token(request.headers())
        .ok_or_else(|| crate::GatewayError::Unauthorized("Missing bearer token".to_string()))?;

    let ctx = ExecutionContext::new(RequestContext::with_request_id(RequestId(request_id.0)));

    let session = services
        .session_store
        .find_valid(&ctx, &token)
        .await
        .map_err(|e| crate::GatewayError::Internal(format!("Session lookup failed: {e}")))?
        .ok_or_else(|| {
            crate::GatewayError::Unauthorized("Invalid or expired session".to_string())
        })?;

    let ctx = ctx.with_actor(session.user_id.0, ActorType::User);

    request.extensions_mut().insert(ctx);
    Ok(next.run(request).await)
}

fn extract_bearer_token(headers: &axum::http::HeaderMap) -> Option<SessionToken> {
    let header = headers.get(AUTHORIZATION)?;
    let text = header.to_str().ok()?;
    let token = text.strip_prefix(BEARER_PREFIX)?;
    SessionToken::parse(token).ok()
}

/// Rejection response used when authentication is required.
pub async fn unauthorized_response() -> impl IntoResponse {
    (
        StatusCode::UNAUTHORIZED,
        crate::GatewayError::Unauthorized("Authentication required".to_string()),
    )
}
