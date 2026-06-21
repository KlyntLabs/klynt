//! User service errors.

use klynt_shared_domain::DomainError;

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
