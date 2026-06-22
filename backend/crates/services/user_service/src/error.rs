//! User service errors.

use axum::http::StatusCode;

use klynt_base::ports::{HttpError, PasswordHashError, RepositoryError};
use klynt_common::domain::DomainError;

/// User service-specific error type.
#[derive(thiserror::Error, Debug)]
pub enum UserError {
    #[error("User not found")]
    NotFound,

    #[error("User is deleted")]
    UserDeleted,

    #[error("Cannot delete admin user")]
    CannotDeleteAdmin,

    #[error("Self-delete is not allowed")]
    SelfDeleteNotAllowed,

    #[error("Invalid password")]
    InvalidPassword,

    #[error("Validation failed: {0}")]
    Validation(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Domain error: {0}")]
    Domain(#[from] DomainError),
}

impl From<PasswordHashError> for UserError {
    fn from(err: PasswordHashError) -> Self {
        match err {
            PasswordHashError::Internal(msg) => Self::Domain(DomainError::internal_msg(msg)),
        }
    }
}

impl From<RepositoryError> for UserError {
    fn from(err: RepositoryError) -> Self {
        match err {
            RepositoryError::NotFound => Self::NotFound,
            RepositoryError::Conflict(msg) => Self::Domain(DomainError::Conflict(msg)),
            RepositoryError::Validation(msg) => Self::Validation(msg),
            RepositoryError::Database(msg) | RepositoryError::Internal(msg) => Self::Internal(msg),
        }
    }
}

impl UserError {
    /// Constructor for internal errors.
    pub fn internal(msg: impl Into<String>) -> Self {
        Self::Internal(msg.into())
    }

    /// Constructor for validation errors.
    pub fn validation(msg: impl Into<String>) -> Self {
        Self::Validation(msg.into())
    }

    /// Constructor for invalid password.
    pub fn invalid_password() -> Self {
        Self::InvalidPassword
    }
}

impl HttpError for UserError {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::NotFound => StatusCode::NOT_FOUND,
            Self::UserDeleted | Self::CannotDeleteAdmin | Self::SelfDeleteNotAllowed => {
                StatusCode::FORBIDDEN
            }
            Self::InvalidPassword => StatusCode::UNAUTHORIZED,
            Self::Validation(_) => StatusCode::BAD_REQUEST,
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Self::Domain(err) => err.status_code(),
        }
    }

    fn error_code(&self) -> &'static str {
        match self {
            Self::NotFound => "NOT_FOUND",
            Self::UserDeleted => "USER_DELETED",
            Self::CannotDeleteAdmin => "CANNOT_DELETE_ADMIN",
            Self::SelfDeleteNotAllowed => "SELF_DELETE_NOT_ALLOWED",
            Self::InvalidPassword => "INVALID_PASSWORD",
            Self::Validation(_) => "VALIDATION_ERROR",
            Self::Internal(_) => "INTERNAL_SERVER_ERROR",
            Self::Domain(err) => err.error_code(),
        }
    }
}

/// Result type for user operations.
pub type UserResult<T> = Result<T, UserError>;
