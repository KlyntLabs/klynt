//! Authentication middleware: resolve `Ctx` from session token, gate protected routes.

use std::sync::Arc;

use axum::{
    body::Body,
    extract::{FromRequestParts, Request, State},
    http::{request::Parts, HeaderMap, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};

use uuid::Uuid;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::session::{SessionStore, SessionToken};

use crate::error::AppError;
use crate::request_context::RequestId;
use crate::state::AppState;

const AUTHORIZATION_HEADER: &str = "authorization";
const BEARER_PREFIX: &str = "Bearer ";

/// HTTP-facing wrapper around the domain `Ctx`.
///
/// Implements Axum's `FromRequestParts` so handlers can extract the resolved
/// context without knowing how it was built.
#[derive(Debug, Clone, Copy)]
pub struct CtxW(pub Ctx);

impl<S: Send + Sync> FromRequestParts<S> for CtxW {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<Ctx>()
            .copied()
            .map(CtxW)
            .ok_or_else(|| AppError::from(DomainError::internal_msg("Ctx missing")))
    }
}

/// Resolves `Ctx` from the session token (if any) and stores it in extensions.
///
/// Missing or invalid tokens result in a guest context rather than an error, so
/// public routes can coexist with protected routes on the same router.
pub async fn ctx_resolve(
    State(state): State<Arc<AppState>>,
    mut req: Request,
    next: Next,
) -> Response {
    let request_id = req
        .extensions()
        .get::<RequestId>()
        .map(|r| r.0)
        .unwrap_or_else(Uuid::new_v4);
    let ctx = resolve_ctx(state.session_store(), request_id, req.headers()).await;
    req.extensions_mut().insert(ctx);
    next.run(req).await
}

async fn resolve_ctx(
    session_store: &dyn SessionStore,
    request_id: Uuid,
    headers: &HeaderMap,
) -> Ctx {
    let token = extract_bearer_token(headers);

    match token {
        Some(Ok(token)) => match session_store
            .find_valid(&Ctx::guest(request_id), &token)
            .await
        {
            Ok(Some(session)) => Ctx::authenticated(request_id, session.user_id),
            Ok(None) => Ctx::guest(request_id),
            Err(_) => Ctx::guest(request_id),
        },
        _ => Ctx::guest(request_id),
    }
}

fn extract_bearer_token(headers: &HeaderMap) -> Option<Result<SessionToken, DomainError>> {
    let header = headers.get(AUTHORIZATION_HEADER)?;
    let text = header.to_str().ok()?;
    let token = text.strip_prefix(BEARER_PREFIX)?;
    Some(SessionToken::parse(token))
}

/// Rejects requests that do not have an authenticated `Ctx`.
pub async fn ctx_require(ctx: Result<CtxW, AppError>, req: Request<Body>, next: Next) -> Response {
    match ctx {
        Ok(CtxW(ctx)) if ctx.is_authenticated() => next.run(req).await,
        Ok(_) => (
            StatusCode::UNAUTHORIZED,
            AppError::from(DomainError::AuthenticationRequired),
        )
            .into_response(),
        Err(err) => err.into_response(),
    }
}
