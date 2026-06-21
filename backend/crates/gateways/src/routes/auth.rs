//! Authentication HTTP handlers.

use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};

use klynt_base::ctx::{ExecutionContext, RequestContext};
use klynt_common::contracts::auth::{LoginRequest, RegistrationRequest};

use crate::response::SuccessResponse;
use crate::state::Services;

/// Auth router — handles login, register, password reset, etc.
pub fn routes() -> axum::Router<Services> {
    axum::Router::new()
        .route("/login", axum::routing::post(login))
        .route("/register", axum::routing::post(register))
        .route("/verify-email", axum::routing::post(verify_email))
        .route(
            "/request-password-reset",
            axum::routing::post(request_password_reset),
        )
        .route("/reset-password", axum::routing::post(reset_password))
        .route("/logout", axum::routing::post(logout))
}

fn execution_context() -> ExecutionContext {
    ExecutionContext::new(RequestContext::new())
}

/// POST /api/v1/auth/login
///
/// Authenticate a user and return a session token.
async fn login(
    State(services): State<Services>,
    Json(request): Json<LoginRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let response = services
        .auth
        .login(&execution_context(), request)
        .await
        .map_err(crate::GatewayError::from)?;

    Ok((StatusCode::OK, Json(SuccessResponse::ok(response))))
}

/// POST /api/v1/auth/register
///
/// Register a new user.
async fn register(
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
async fn verify_email(
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
struct VerifyEmailRequest {
    token: String,
}

/// POST /api/v1/auth/request-password-reset
///
/// Request password reset email.
async fn request_password_reset(
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
struct RequestPasswordResetRequest {
    email: String,
}

/// POST /api/v1/auth/reset-password
///
/// Reset password with token.
async fn reset_password(
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
struct ResetPasswordRequest {
    token: String,
    new_password: String,
}

/// POST /api/v1/auth/logout
///
/// Logout and invalidate session.
async fn logout(
    State(services): State<Services>,
    Json(request): Json<LogoutRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    services
        .auth
        .logout(&execution_context(), &request.session_token)
        .await
        .map_err(crate::GatewayError::from)?;

    Ok(Json(SuccessResponse::message("Logged out successfully")))
}

#[derive(serde::Deserialize)]
struct LogoutRequest {
    session_token: String,
}
