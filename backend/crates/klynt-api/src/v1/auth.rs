use std::sync::Arc;

use axum::{extract::State, http::StatusCode, response::IntoResponse, Extension, Json};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::Email;

use crate::error::{AppError, WithRequestId};
use crate::middleware::RequestId;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct RegisterBody {
    pub name: String,
    pub email: String,
    pub password: String,
    pub terms_accepted: bool,
    pub terms_version: String,
}

#[derive(Debug, Serialize)]
pub struct RegisterResponse {
    pub user_id: Uuid,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct VerifyEmailBody {
    pub token: String,
}

#[derive(Debug, Serialize)]
pub struct VerifyEmailResponse {
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct RequestPasswordResetBody {
    pub email: String,
}

#[derive(Debug, Serialize)]
pub struct RequestPasswordResetResponse {
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct ResetPasswordBody {
    pub token: String,
    pub new_password: String,
}

#[derive(Debug, Serialize)]
pub struct ResetPasswordResponse {
    pub message: String,
}

/// POST /api/v1/auth/register
pub async fn register(
    State(state): State<Arc<AppState>>,
    Extension(request_id): Extension<RequestId>,
    Json(body): Json<RegisterBody>,
) -> Result<impl IntoResponse, AppError> {
    let email = Email::parse(&body.email)
        .map_err(|e| AppError::from(DomainError::InvalidEmail(e)).with_request_id(request_id.0))?;

    let ctx = Ctx::guest(request_id.0);
    let user_id = state
        .auth_service()
        .register(
            &ctx,
            body.name,
            &email,
            &body.password,
            body.terms_accepted,
            body.terms_version,
        )
        .await
        .with_request_id(request_id.0)?;

    Ok((
        StatusCode::CREATED,
        Json(RegisterResponse {
            user_id: user_id.0,
            message: "Registration successful. Please check your email to verify your account."
                .to_string(),
        }),
    ))
}

/// POST /api/v1/auth/verify-email
pub async fn verify_email(
    State(state): State<Arc<AppState>>,
    Extension(request_id): Extension<RequestId>,
    Json(body): Json<VerifyEmailBody>,
) -> Result<impl IntoResponse, AppError> {
    let ctx = Ctx::guest(request_id.0);
    // The user ID is intentionally omitted from the response; the client only
    // needs confirmation that the email address was verified.
    let _user_id = state
        .auth_service()
        .verify_email(&ctx, &body.token)
        .await
        .with_request_id(request_id.0)?;

    Ok(Json(VerifyEmailResponse {
        message: "Email verified successfully. You can now log in.".to_string(),
    }))
}

/// POST /api/v1/auth/request-password-reset
///
/// Request a password reset email.
pub async fn request_password_reset(
    State(state): State<Arc<AppState>>,
    Extension(request_id): Extension<RequestId>,
    Json(body): Json<RequestPasswordResetBody>,
) -> Result<impl IntoResponse, AppError> {
    let email = Email::parse(&body.email)
        .map_err(|e| AppError::from(DomainError::InvalidEmail(e)).with_request_id(request_id.0))?;

    let ctx = Ctx::guest(request_id.0);
    state
        .auth_service()
        .request_password_reset(&ctx, &email)
        .await
        .with_request_id(request_id.0)?;

    // Always return success to prevent email enumeration
    Ok(Json(RequestPasswordResetResponse {
        message: "If an account exists with this email, a password reset link has been sent."
            .to_string(),
    }))
}

/// POST /api/v1/auth/reset-password
///
/// Reset password using token from email.
pub async fn reset_password(
    State(state): State<Arc<AppState>>,
    Extension(request_id): Extension<RequestId>,
    Json(body): Json<ResetPasswordBody>,
) -> Result<impl IntoResponse, AppError> {
    let ctx = Ctx::guest(request_id.0);
    state
        .auth_service()
        .reset_password(&ctx, &body.token, &body.new_password)
        .await
        .with_request_id(request_id.0)?;

    Ok(Json(ResetPasswordResponse {
        message: "Password reset successfully. You can now log in with your new password."
            .to_string(),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn register_response_serializes() {
        let response = RegisterResponse {
            user_id: Uuid::new_v4(),
            message: "test".to_string(),
        };
        assert!(serde_json::to_string(&response).is_ok());
    }

    #[test]
    fn verify_response_serializes() {
        let response = VerifyEmailResponse {
            message: "test".to_string(),
        };
        assert!(serde_json::to_string(&response).is_ok());
    }

    #[test]
    fn request_password_reset_response_serializes() {
        let response = RequestPasswordResetResponse {
            message: "test".to_string(),
        };
        assert!(serde_json::to_string(&response).is_ok());
    }

    #[test]
    fn reset_password_response_serializes() {
        let response = ResetPasswordResponse {
            message: "test".to_string(),
        };
        assert!(serde_json::to_string(&response).is_ok());
    }
}
