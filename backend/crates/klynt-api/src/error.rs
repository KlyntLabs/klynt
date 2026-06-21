use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::Value;
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
    RateLimited { retry_after_seconds: Option<u32> },
    #[error("internal server error")]
    Internal(#[source] std::sync::Arc<dyn std::error::Error + Send + Sync>),
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

impl ErrorSeverity {
    pub fn as_str(&self) -> &'static str {
        match self {
            ErrorSeverity::Low => "Low",
            ErrorSeverity::Medium => "Medium",
            ErrorSeverity::High => "High",
            ErrorSeverity::Critical => "Critical",
        }
    }
}

/// Category used to classify errors for observability.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorCategory {
    Authentication,
    Authorization,
    Validation,
    Infrastructure,
}

impl ErrorCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            ErrorCategory::Authentication => "Authentication",
            ErrorCategory::Authorization => "Authorization",
            ErrorCategory::Validation => "Validation",
            ErrorCategory::Infrastructure => "Infrastructure",
        }
    }
}

/// Uniform error abstraction for all API-layer errors.
///
/// Any error type implementing this trait can flow through the centralized
/// response mapper (`mw_map_response`) and the structured logging path
/// without needing dedicated match arms. The trait provides:
/// - HTTP status code
/// - Stable error code string for the client
/// - Severity (drives log level)
/// - Category (drives observability dashboards)
/// - Client-safe message (internal details are sanitized)
/// - Optional structured details (e.g. validation field errors)
/// - Optional Retry-After hint for rate limiting
pub trait ServiceError: std::error::Error + Send + Sync {
    fn status_code(&self) -> StatusCode;
    fn error_code(&self) -> String;
    fn severity(&self) -> ErrorSeverity;
    fn category(&self) -> ErrorCategory;
    fn client_message(&self) -> String;
    fn details(&self) -> Option<Value> {
        None
    }
    fn retry_after_seconds(&self) -> Option<u32> {
        None
    }
    fn should_log(&self) -> bool {
        self.severity() != ErrorSeverity::Low
    }
}

impl ServiceError for AppErrorKind {
    fn status_code(&self) -> StatusCode {
        match self {
            AppErrorKind::NotFound => StatusCode::NOT_FOUND,
            AppErrorKind::BadRequest(_) => StatusCode::BAD_REQUEST,
            AppErrorKind::Conflict(_) => StatusCode::CONFLICT,
            AppErrorKind::Unauthorized => StatusCode::UNAUTHORIZED,
            AppErrorKind::RateLimited { .. } => StatusCode::TOO_MANY_REQUESTS,
            AppErrorKind::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_code(&self) -> String {
        AppErrorKind::error_code(self).to_string()
    }

    fn severity(&self) -> ErrorSeverity {
        AppErrorKind::severity(self)
    }

    fn category(&self) -> ErrorCategory {
        AppErrorKind::category(self)
    }

    fn client_message(&self) -> String {
        match self {
            AppErrorKind::Internal(_) => "something went wrong".to_string(),
            other => other.to_string(),
        }
    }

    fn retry_after_seconds(&self) -> Option<u32> {
        AppErrorKind::retry_after_seconds(self)
    }
}

impl AppErrorKind {
    /// HTTP-facing uppercase error code string (e.g. `"NOT_FOUND"`).
    pub fn error_code(&self) -> &'static str {
        match self {
            AppErrorKind::NotFound => "NOT_FOUND",
            AppErrorKind::BadRequest(_) => "BAD_REQUEST",
            AppErrorKind::Conflict(_) => "CONFLICT",
            AppErrorKind::Unauthorized => "AUTHENTICATION_REQUIRED",
            AppErrorKind::RateLimited { .. } => "RATE_LIMITED",
            AppErrorKind::Internal(_) => "INTERNAL_ERROR",
        }
    }

    pub fn severity(&self) -> ErrorSeverity {
        match self {
            AppErrorKind::NotFound
            | AppErrorKind::BadRequest(_)
            | AppErrorKind::Conflict(_)
            | AppErrorKind::Unauthorized => ErrorSeverity::Low,
            AppErrorKind::RateLimited { .. } => ErrorSeverity::Medium,
            AppErrorKind::Internal(_) => ErrorSeverity::High,
        }
    }

    pub fn category(&self) -> ErrorCategory {
        match self {
            AppErrorKind::Unauthorized => ErrorCategory::Authentication,
            AppErrorKind::RateLimited { .. } => ErrorCategory::Authorization,
            AppErrorKind::NotFound | AppErrorKind::BadRequest(_) | AppErrorKind::Conflict(_) => {
                ErrorCategory::Validation
            }
            AppErrorKind::Internal(_) => ErrorCategory::Infrastructure,
        }
    }

    pub fn retry_after_seconds(&self) -> Option<u32> {
        match self {
            AppErrorKind::RateLimited {
                retry_after_seconds,
            } => *retry_after_seconds,
            _ => None,
        }
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
                    ErrorKind::RateLimited => AppErrorKind::RateLimited {
                        retry_after_seconds: None,
                    },
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

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.kind)
    }
}

impl std::error::Error for AppError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        self.kind.source()
    }
}

impl ServiceError for AppError {
    fn status_code(&self) -> StatusCode {
        ServiceError::status_code(&self.kind)
    }
    fn error_code(&self) -> String {
        ServiceError::error_code(&self.kind)
    }
    fn severity(&self) -> ErrorSeverity {
        ServiceError::severity(&self.kind)
    }
    fn category(&self) -> ErrorCategory {
        ServiceError::category(&self.kind)
    }
    fn client_message(&self) -> String {
        ServiceError::client_message(&self.kind)
    }
    fn details(&self) -> Option<Value> {
        ServiceError::details(&self.kind)
    }
    fn retry_after_seconds(&self) -> Option<u32> {
        ServiceError::retry_after_seconds(&self.kind)
    }
    fn should_log(&self) -> bool {
        ServiceError::should_log(&self.kind)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = ServiceError::status_code(&self.kind);

        let mut response = status.into_response();
        // Mark the response as JSON so mw_map_response will envelope it.
        response.headers_mut().insert(
            axum::http::header::CONTENT_TYPE,
            "application/json".parse().unwrap(),
        );

        // Add Retry-After header for rate-limited responses.
        if let Some(secs) = self.kind.retry_after_seconds() {
            response.headers_mut().insert(
                axum::http::header::RETRY_AFTER,
                axum::http::HeaderValue::from_str(&secs.to_string())
                    .expect("u32 seconds are always a valid Retry-After value"),
            );
        }

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
mod classification_tests;

#[cfg(test)]
mod conversion_tests;
