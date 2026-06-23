//! Authentication HTTP handlers.

use axum::{
    body::Bytes,
    extract::{FromRequest, Request, State},
    http::{header, StatusCode},
    response::{IntoResponse, Json},
};
use chrono::Utc;
use tower_cookies::{Cookie, Cookies};

use base::ctx::{ExecutionContext, RequestContext};
use domain::contracts::auth::{LoginRequest, RegistrationRequest};

use crate::constants::SESSION_TOKEN_COOKIE;
use crate::response::SuccessResponse;
use crate::state::Services;

fn execution_context() -> ExecutionContext {
    ExecutionContext::new(RequestContext::new())
}

/// Apply common cookie attributes. The `Domain` attribute is omitted when the
/// configured `cookie_domain` is empty so that browsers use the current host,
/// which is required for local development on `localhost`.
fn apply_cookie_attributes(cookie: &mut Cookie, services: &Services) {
    if !services.config.cookie_domain.is_empty() {
        cookie.set_domain(services.config.cookie_domain.clone());
    }
    cookie.set_path("/");
    cookie.set_http_only(true);
    cookie.set_secure(services.config.cookie_secure);
    cookie.set_same_site(tower_cookies::cookie::SameSite::Lax);
}

/// POST /api/v1/auth/login
///
/// Authenticate a user and return a session token.
pub(crate) async fn login(
    State(services): State<Services>,
    cookies: Cookies,
    Json(request): Json<LoginRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let response = services
        .auth
        .login(&execution_context(), request)
        .await
        .map_err(crate::GatewayError::from)?;

    let mut cookie = Cookie::new(SESSION_TOKEN_COOKIE, response.access_token.clone());
    apply_cookie_attributes(&mut cookie, &services);

    let ttl_seconds = response
        .expires_at
        .signed_duration_since(Utc::now())
        .num_seconds()
        .max(0);
    cookie.set_max_age(tower_cookies::cookie::time::Duration::seconds(ttl_seconds));

    cookies.add(cookie);

    Ok((StatusCode::OK, Json(SuccessResponse::ok(response))))
}

/// POST /api/v1/auth/register
///
/// Register a new user.
pub(crate) async fn register(
    State(services): State<Services>,
    Json(request): Json<RegistrationRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let user_id = services
        .auth
        .register(&execution_context(), request)
        .await
        .map_err(crate::GatewayError::from)?;

    Ok((
        StatusCode::CREATED,
        Json(SuccessResponse::ok(user_id.to_string())),
    ))
}

/// POST /api/v1/auth/verify-email
///
/// Verify email with token.
pub(crate) async fn verify_email(
    State(services): State<Services>,
    Json(request): Json<VerifyEmailRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    services
        .auth
        .verify_email(&execution_context(), &request.token)
        .await
        .map_err(crate::GatewayError::from)?;

    Ok(Json(SuccessResponse::message(
        "Email verified successfully",
    )))
}

#[derive(serde::Deserialize)]
pub(crate) struct VerifyEmailRequest {
    token: String,
}

/// POST /api/v1/auth/request-password-reset
///
/// Request password reset email.
pub(crate) async fn request_password_reset(
    State(services): State<Services>,
    Json(request): Json<RequestPasswordResetRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    services
        .auth
        .request_password_reset(&execution_context(), &request.email)
        .await
        .map_err(crate::GatewayError::from)?;

    // Always return OK to prevent email enumeration
    Ok(Json(SuccessResponse::message(
        "If the email exists, a password reset link has been sent",
    )))
}

#[derive(serde::Deserialize)]
pub(crate) struct RequestPasswordResetRequest {
    email: String,
}

/// POST /api/v1/auth/reset-password
///
/// Reset password with token.
pub(crate) async fn reset_password(
    State(services): State<Services>,
    Json(request): Json<ResetPasswordRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    services
        .auth
        .reset_password(&execution_context(), &request.token, &request.new_password)
        .await
        .map_err(crate::GatewayError::from)?;

    Ok(Json(SuccessResponse::message(
        "Password reset successfully",
    )))
}

#[derive(serde::Deserialize)]
pub(crate) struct ResetPasswordRequest {
    token: String,
    new_password: String,
}

/// POST /api/v1/auth/logout
///
/// Logout and invalidate session. Uses the session token from the JSON body if
/// provided, otherwise falls back to the `session_token` cookie. The cookie is
/// cleared on success.
pub(crate) async fn logout(
    State(services): State<Services>,
    cookies: Cookies,
    OptionalJson(request): OptionalJson<LogoutRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let token = request
        .and_then(|r| r.session_token)
        .or_else(|| {
            cookies
                .get(SESSION_TOKEN_COOKIE)
                .map(|c| c.value().to_string())
        })
        .ok_or_else(|| crate::GatewayError::BadRequest("Missing session token".to_string()))?;

    services
        .auth
        .logout(&execution_context(), &token)
        .await
        .map_err(crate::GatewayError::from)?;

    let mut removal = Cookie::new(SESSION_TOKEN_COOKIE, "");
    apply_cookie_attributes(&mut removal, &services);
    cookies.remove(removal);

    Ok(Json(SuccessResponse::message("Logged out successfully")))
}

#[derive(serde::Deserialize)]
pub(crate) struct LogoutRequest {
    session_token: Option<String>,
}

/// JSON body extractor that returns `None` when the body is missing, empty, or
/// the content-type is not `application/json`.
///
/// This is useful for endpoints that accept an optional JSON payload while also
/// reading state from cookies or headers.
pub(crate) struct OptionalJson<T>(Option<T>);

impl<T, S> FromRequest<S> for OptionalJson<T>
where
    T: serde::de::DeserializeOwned + Send + Sync,
    S: Send + Sync,
{
    type Rejection = crate::GatewayError;

    async fn from_request(req: Request, state: &S) -> Result<Self, Self::Rejection> {
        let content_type = req
            .headers()
            .get(header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok());
        let is_json = content_type
            .map(|ct| ct.starts_with("application/json"))
            .unwrap_or(false);
        if !is_json {
            return Ok(OptionalJson(None));
        }

        let bytes = Bytes::from_request(req, state)
            .await
            .map_err(|_| crate::GatewayError::BadRequest("Failed to read body".to_string()))?;
        if bytes.is_empty() {
            return Ok(OptionalJson(None));
        }

        let value = serde_json::from_slice(&bytes)
            .map_err(|_| crate::GatewayError::BadRequest("Invalid JSON body".to_string()))?;
        Ok(OptionalJson(Some(value)))
    }
}
