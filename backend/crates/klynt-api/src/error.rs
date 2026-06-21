use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use uuid::Uuid;

use klynt_domain::errors::{DomainError, ErrorKind};

/// The classification of an API error, without request-scoped metadata.
#[derive(Debug, Clone, thiserror::Error)]
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
    #[error("internal server error")]
    Internal(std::sync::Arc<dyn std::error::Error + Send + Sync>),
}

/// Severity used to drive log levels for errors.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorSeverity {
    /// Expected errors — auth failures, validation, not-found.
    Low,
    /// Business logic errors — rate limiting.
    Medium,
    /// Infrastructure problems — internal server errors.
    High,
    /// Gateway/data-corruption failures (reserved for future use).
    Critical,
}

/// Category used to classify errors for observability.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorCategory {
    Authentication,
    Authorization,
    Validation,
    Infrastructure,
}

impl AppErrorKind {
    /// HTTP-facing uppercase error code string (e.g. `"NOT_FOUND"`).
    pub fn error_code(&self) -> &'static str {
        match self {
            AppErrorKind::NotFound => "NOT_FOUND",
            AppErrorKind::BadRequest(_) => "BAD_REQUEST",
            AppErrorKind::Conflict(_) => "CONFLICT",
            AppErrorKind::Unauthorized => "AUTHENTICATION_REQUIRED",
            AppErrorKind::RateLimited => "RATE_LIMITED",
            AppErrorKind::Internal(_) => "INTERNAL_ERROR",
        }
    }

    pub fn severity(&self) -> ErrorSeverity {
        match self {
            AppErrorKind::NotFound
            | AppErrorKind::BadRequest(_)
            | AppErrorKind::Conflict(_)
            | AppErrorKind::Unauthorized => ErrorSeverity::Low,
            AppErrorKind::RateLimited => ErrorSeverity::Medium,
            AppErrorKind::Internal(_) => ErrorSeverity::High,
        }
    }

    pub fn category(&self) -> ErrorCategory {
        match self {
            AppErrorKind::Unauthorized => ErrorCategory::Authentication,
            AppErrorKind::RateLimited => ErrorCategory::Authorization,
            AppErrorKind::NotFound | AppErrorKind::BadRequest(_) | AppErrorKind::Conflict(_) => {
                ErrorCategory::Validation
            }
            AppErrorKind::Internal(_) => ErrorCategory::Infrastructure,
        }
    }

    /// Hook for future `Retry-After` header emission. `None` for all current variants.
    pub fn retry_after_seconds(&self) -> Option<u32> {
        let _ = self;
        None
    }
}

impl From<DomainError> for AppErrorKind {
    fn from(err: DomainError) -> Self {
        match err {
            DomainError::Internal(e) => AppErrorKind::Internal(std::sync::Arc::from(e)),
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
#[derive(Debug, Clone)]
pub struct AppError {
    pub kind: AppErrorKind,
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
        let status = match &self.kind {
            AppErrorKind::NotFound => StatusCode::NOT_FOUND,
            AppErrorKind::BadRequest(_) => StatusCode::BAD_REQUEST,
            AppErrorKind::Conflict(_) => StatusCode::CONFLICT,
            AppErrorKind::Unauthorized => StatusCode::UNAUTHORIZED,
            AppErrorKind::RateLimited => StatusCode::TOO_MANY_REQUESTS,
            AppErrorKind::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };

        let mut response = status.into_response();
        // Mark the response as JSON so mw_map_response will envelope it.
        response.headers_mut().insert(
            axum::http::header::CONTENT_TYPE,
            "application/json".parse().unwrap(),
        );
        // Insert the error into extensions so mw_map_response can read it.
        response.extensions_mut().insert(self);
        response
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
    fn internal_error_becomes_500() {
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
    fn request_id_attached_via_extensions() {
        let request_id = Uuid::new_v4();
        let app_err = AppError::new(AppErrorKind::BadRequest("boom".to_string()), request_id);
        let response = app_err.into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let attached = response
            .extensions()
            .get::<AppError>()
            .expect("AppError in extensions");
        assert_eq!(attached.request_id, request_id);
    }
}

#[cfg(test)]
mod classification_tests {
    use super::*;

    #[test]
    fn not_found_classification() {
        assert_eq!(AppErrorKind::NotFound.severity(), ErrorSeverity::Low);
        assert_eq!(AppErrorKind::NotFound.category(), ErrorCategory::Validation);
        assert_eq!(AppErrorKind::NotFound.error_code(), "NOT_FOUND");
        assert_eq!(AppErrorKind::NotFound.retry_after_seconds(), None);
    }

    #[test]
    fn bad_request_classification() {
        let kind = AppErrorKind::BadRequest("msg".to_string());
        assert_eq!(kind.severity(), ErrorSeverity::Low);
        assert_eq!(kind.category(), ErrorCategory::Validation);
        assert_eq!(kind.error_code(), "BAD_REQUEST");
    }

    #[test]
    fn conflict_classification() {
        let kind = AppErrorKind::Conflict("msg".to_string());
        assert_eq!(kind.severity(), ErrorSeverity::Low);
        assert_eq!(kind.category(), ErrorCategory::Validation);
        assert_eq!(kind.error_code(), "CONFLICT");
    }

    #[test]
    fn unauthorized_classification() {
        assert_eq!(AppErrorKind::Unauthorized.severity(), ErrorSeverity::Low);
        assert_eq!(
            AppErrorKind::Unauthorized.category(),
            ErrorCategory::Authentication
        );
        assert_eq!(
            AppErrorKind::Unauthorized.error_code(),
            "AUTHENTICATION_REQUIRED"
        );
    }

    #[test]
    fn rate_limited_classification() {
        assert_eq!(AppErrorKind::RateLimited.severity(), ErrorSeverity::Medium);
        assert_eq!(
            AppErrorKind::RateLimited.category(),
            ErrorCategory::Authorization
        );
        assert_eq!(AppErrorKind::RateLimited.error_code(), "RATE_LIMITED");
    }

    #[test]
    fn internal_classification() {
        let kind = AppErrorKind::Internal(std::sync::Arc::new(std::io::Error::other("boom")));
        assert_eq!(kind.severity(), ErrorSeverity::High);
        assert_eq!(kind.category(), ErrorCategory::Infrastructure);
        assert_eq!(kind.error_code(), "INTERNAL_ERROR");
    }
}
