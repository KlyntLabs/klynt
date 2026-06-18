use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use tracing::error;

use klynt_domain::errors::{DomainError, ErrorKind};

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
    /// Reserved for application-layer validation errors that should return 422.
    /// Domain validation errors are mapped to `BadRequest` (400).
    #[error("unprocessable entity: {0}")]
    Validation(String),
    #[error("internal server error")]
    Internal(#[from] anyhow::Error),
}

impl From<DomainError> for AppError {
    fn from(err: DomainError) -> Self {
        match err {
            DomainError::Internal(e) => AppError::Internal(e),
            other => {
                let message = other.to_string();
                match other.kind() {
                    ErrorKind::NotFound => AppError::NotFound,
                    ErrorKind::Conflict => AppError::Conflict(message),
                    ErrorKind::Validation => AppError::BadRequest(message),
                    ErrorKind::RateLimited => AppError::RateLimited,
                    ErrorKind::Internal => unreachable!("internal variant handled above"),
                }
            }
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let request_id = ""; // TODO: populate from request extension in production

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

#[cfg(test)]
mod conversion_tests {
    use super::*;
    use klynt_domain::errors::{DomainError, NameError, PasswordError};

    fn status_of(err: AppError) -> StatusCode {
        let response = err.into_response();
        response.status()
    }

    #[test]
    fn conflict_error_becomes_409() {
        let app_err = AppError::from(DomainError::AlreadyExists {
            email: "ada@example.com".to_string(),
        });
        assert_eq!(status_of(app_err), StatusCode::CONFLICT);
    }

    #[test]
    fn validation_error_becomes_400() {
        let app_err = AppError::from(DomainError::WeakPassword(PasswordError::TooShort));
        assert_eq!(status_of(app_err), StatusCode::BAD_REQUEST);
    }

    #[test]
    fn not_found_becomes_404() {
        let app_err = AppError::from(DomainError::NotFound);
        assert_eq!(status_of(app_err), StatusCode::NOT_FOUND);
    }

    #[test]
    fn rate_limited_becomes_429() {
        let app_err = AppError::from(DomainError::RateLimited);
        assert_eq!(status_of(app_err), StatusCode::TOO_MANY_REQUESTS);
    }

    #[test]
    fn bad_request_preserves_inner_message() {
        let app_err = AppError::from(DomainError::InvalidName(NameError::Empty));
        match app_err {
            AppError::BadRequest(msg) => assert_eq!(msg, "name is empty"),
            other => panic!("expected BadRequest, got {other:?}"),
        }
    }

    #[test]
    fn conflict_preserves_inner_message() {
        let app_err = AppError::from(DomainError::AlreadyExists {
            email: "ada@example.com".to_string(),
        });
        match app_err {
            AppError::Conflict(msg) => assert!(msg.contains("email already registered")),
            other => panic!("expected Conflict, got {other:?}"),
        }
    }

    #[test]
    fn internal_error_becomes_500_and_sanitizes_message() {
        let app_err = AppError::from(DomainError::Internal(anyhow::anyhow!("secrets")));
        match app_err {
            app_err @ AppError::Internal(_) => {
                assert_eq!(status_of(app_err), StatusCode::INTERNAL_SERVER_ERROR);
            }
            other => panic!("expected Internal, got {other:?}"),
        }
    }
}
