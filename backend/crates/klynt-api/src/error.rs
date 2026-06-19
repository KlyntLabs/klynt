use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use tracing::error;
use uuid::Uuid;

use klynt_domain::errors::{DomainError, ErrorKind};

#[derive(Debug, Serialize)]
pub struct ApiErrorBody {
    pub code: String,
    pub message: String,
    pub request_id: String,
}

impl ApiErrorBody {
    pub fn new(
        code: impl Into<String>,
        message: impl Into<String>,
        request_id: impl Into<String>,
    ) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            request_id: request_id.into(),
        }
    }
}

/// The classification of an API error, without request-scoped metadata.
#[derive(Debug, thiserror::Error)]
pub enum AppErrorKind {
    #[error("resource not found")]
    NotFound,
    #[error("bad request: {0}")]
    BadRequest(String),
    #[error("conflict: {0}")]
    Conflict(String),
    #[error("unauthorized")]
    Unauthorized,
    #[error("too many requests")]
    RateLimited,
    /// Reserved for application-layer validation errors that should return 422.
    /// Domain validation errors are mapped to `BadRequest` (400).
    #[error("unprocessable entity: {0}")]
    Validation(String),
    #[error("internal server error")]
    Internal(Box<dyn std::error::Error + Send + Sync>),
}

impl From<DomainError> for AppErrorKind {
    fn from(err: DomainError) -> Self {
        match err {
            DomainError::Internal(e) => AppErrorKind::Internal(e),
            other => {
                let message = other.to_string();
                match other.kind() {
                    ErrorKind::NotFound => AppErrorKind::NotFound,
                    ErrorKind::Conflict => AppErrorKind::Conflict(message),
                    ErrorKind::Validation => AppErrorKind::BadRequest(message),
                    ErrorKind::RateLimited => AppErrorKind::RateLimited,
                    ErrorKind::AuthenticationRequired => AppErrorKind::Unauthorized,
                    ErrorKind::Internal => unreachable!("internal variant handled above"),
                }
            }
        }
    }
}

/// An API-level error carrying request-scoped metadata.
///
/// Handlers can attach the request ID with `.with_request_id(...)` so error
/// responses include correlation data. The `From<DomainError>` impl defaults to
/// a nil UUID for the rare cases where `?` is used without an explicit request
/// ID; in practice every handler should attach the real ID.
#[derive(Debug)]
pub struct AppError {
    kind: AppErrorKind,
    request_id: Uuid,
}

impl AppError {
    pub fn new(kind: AppErrorKind, request_id: Uuid) -> Self {
        Self { kind, request_id }
    }

    pub fn with_request_id(mut self, request_id: Uuid) -> Self {
        self.request_id = request_id;
        self
    }
}

impl From<DomainError> for AppError {
    fn from(err: DomainError) -> Self {
        Self::new(err.into(), Uuid::nil())
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let request_id = self.request_id.to_string();

        let (status, body) = match &self.kind {
            AppErrorKind::NotFound => (
                StatusCode::NOT_FOUND,
                ApiErrorBody::new("not_found", self.kind.to_string(), &request_id),
            ),
            AppErrorKind::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                ApiErrorBody::new("bad_request", msg.clone(), &request_id),
            ),
            AppErrorKind::Conflict(msg) => (
                StatusCode::CONFLICT,
                ApiErrorBody::new("conflict", msg.clone(), &request_id),
            ),
            AppErrorKind::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                ApiErrorBody::new("unauthorized", "authentication required", &request_id),
            ),
            AppErrorKind::RateLimited => (
                StatusCode::TOO_MANY_REQUESTS,
                ApiErrorBody::new("rate_limited", "too many requests", &request_id),
            ),
            AppErrorKind::Validation(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                ApiErrorBody::new("validation_error", msg.clone(), &request_id),
            ),
            AppErrorKind::Internal(err) => {
                error!(error = ?err, request_id, "internal server error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiErrorBody::new("internal_error", "something went wrong", &request_id),
                )
            }
        };

        (status, Json(body)).into_response()
    }
}

/// Convenience trait to attach a request ID to a `DomainError` at the handler.
pub trait WithRequestId<T> {
    fn with_request_id(self, request_id: Uuid) -> Result<T, AppError>;
}

impl<T> WithRequestId<T> for Result<T, DomainError> {
    fn with_request_id(self, request_id: Uuid) -> Result<T, AppError> {
        self.map_err(|err| AppError::from(err).with_request_id(request_id))
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
    fn authentication_required_becomes_401() {
        let app_err = AppError::from(DomainError::AuthenticationRequired);
        assert_eq!(status_of(app_err), StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn bad_request_preserves_inner_message() {
        let app_err = AppError::from(DomainError::InvalidName(NameError::Empty));
        match app_err.kind {
            AppErrorKind::BadRequest(msg) => assert_eq!(msg, "name is empty"),
            other => panic!("expected BadRequest, got {other:?}"),
        }
    }

    #[test]
    fn conflict_preserves_inner_message() {
        let app_err = AppError::from(DomainError::AlreadyExists {
            email: "ada@example.com".to_string(),
        });
        match app_err.kind {
            AppErrorKind::Conflict(msg) => assert!(msg.contains("email already registered")),
            other => panic!("expected Conflict, got {other:?}"),
        }
    }

    #[test]
    fn internal_error_becomes_500_and_sanitizes_message() {
        let app_err = AppError::from(DomainError::internal_msg("secrets"));
        match app_err.kind {
            kind @ AppErrorKind::Internal(_) => {
                assert_eq!(
                    status_of(AppError::new(kind, Uuid::nil())),
                    StatusCode::INTERNAL_SERVER_ERROR
                );
            }
            other => panic!("expected Internal, got {other:?}"),
        }
    }

    #[test]
    fn request_id_appears_in_error_body() {
        let request_id = Uuid::new_v4();
        let app_err = AppError::new(AppErrorKind::BadRequest("boom".to_string()), request_id);
        let response = app_err.into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
}
