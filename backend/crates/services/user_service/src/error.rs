//! User service errors.

use klynt_base::ports::PasswordHashError;
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

/// Result type for user operations.
pub type UserResult<T> = Result<T, UserError>;
