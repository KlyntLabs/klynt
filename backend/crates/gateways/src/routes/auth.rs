//! Authentication HTTP handlers.

use axum::{body::Bytes, extract::State, http::StatusCode, response::IntoResponse, Json};
use tower_cookies::{Cookie, Cookies};

use base::ctx::{ExecutionContext, RequestContext};
use domain::contracts::auth::{LoginRequest, RegistrationRequest};

use crate::response::SuccessResponse;
use crate::state::Services;

fn execution_context() -> ExecutionContext {
    ExecutionContext::new(RequestContext::new())
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

    let mut cookie = Cookie::new("session_token", response.access_token.clone());
    cookie.set_domain(services.config.cookie_domain.clone());
    cookie.set_path("/");
    cookie.set_http_only(true);
    cookie.set_secure(services.config.cookie_secure);
    cookie.set_same_site(tower_cookies::cookie::SameSite::Lax);
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
    body: Bytes,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let request: Option<LogoutRequest> = if body.is_empty() {
        None
    } else {
        Some(
            serde_json::from_slice(&body)
                .map_err(|_| crate::GatewayError::BadRequest("Invalid JSON body".to_string()))?,
        )
    };

    let token = request
        .and_then(|r| r.session_token)
        .or_else(|| cookies.get("session_token").map(|c| c.value().to_string()))
        .ok_or_else(|| crate::GatewayError::BadRequest("Missing session token".to_string()))?;

    services
        .auth
        .logout(&execution_context(), &token)
        .await
        .map_err(crate::GatewayError::from)?;

    let mut removal = Cookie::new("session_token", "");
    removal.set_domain(services.config.cookie_domain.clone());
    removal.set_path("/");
    cookies.remove(removal);

    Ok(Json(SuccessResponse::message("Logged out successfully")))
}

#[derive(serde::Deserialize)]
pub(crate) struct LogoutRequest {
    session_token: Option<String>,
}
