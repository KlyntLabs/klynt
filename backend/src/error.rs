use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use tracing::error;

use crate::domain::errors::DomainError;

#[derive(Debug, Serialize)]
pub struct ApiErrorBody {
    pub code: String,
    pub message: String,
}

impl ApiErrorBody {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("resource not found")]
    NotFound,
    #[error("bad request: {0}")]
    BadRequest(String),
    #[error("conflict: {0}")]
    Conflict(String),
    #[error("too many requests")]
    RateLimited,
    #[error("unprocessable entity: {0}")]
    Validation(String),
    #[error("internal server error")]
    Internal(#[from] anyhow::Error),
}

impl From<DomainError> for AppError {
    fn from(err: DomainError) -> Self {
        match err {
            DomainError::NotFound => AppError::NotFound,
            DomainError::AlreadyExists { email } => {
                AppError::Conflict(format!("email already registered: {email}"))
            }
            DomainError::InvalidEmail(e) => AppError::BadRequest(e.to_string()),
            DomainError::WeakPassword(e) => AppError::BadRequest(e.to_string()),
            DomainError::InvalidRole(e) => AppError::BadRequest(e.to_string()),
            DomainError::InstitutionRequired(role) => {
                AppError::BadRequest(format!("institution_id is required for role {:?}", role))
            }
            DomainError::TermsNotAccepted => {
                AppError::BadRequest("terms must be accepted".to_string())
            }
            DomainError::Internal(e) => AppError::Internal(e),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let request_id = ""; // populated via extension in production

        let (status, body) = match &self {
            AppError::NotFound => (
                StatusCode::NOT_FOUND,
                ApiErrorBody::new("not_found", self.to_string()),
            ),
            AppError::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                ApiErrorBody::new("bad_request", msg.clone()),
            ),
            AppError::Conflict(msg) => (
                StatusCode::CONFLICT,
                ApiErrorBody::new("conflict", msg.clone()),
            ),
            AppError::RateLimited => (
                StatusCode::TOO_MANY_REQUESTS,
                ApiErrorBody::new("rate_limited", "too many requests"),
            ),
            AppError::Validation(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                ApiErrorBody::new("validation_error", msg.clone()),
            ),
            AppError::Internal(err) => {
                error!(error = ?err, request_id, "internal server error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiErrorBody::new("internal_error", "something went wrong"),
                )
            }
        };

        (status, Json(body)).into_response()
    }
}
