//! Shared domain errors.

use thiserror::Error;

use crate::util::role::Role;

/// Base error type for domain operations
#[derive(Error, Debug)]
pub enum DomainError {
    #[error("Entity not found: {0}")]
    NotFound(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Validation failed: {0}")]
    Validation(String),

    #[error("Operation not permitted: {0}")]
    NotPermitted(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("{0}")]
    InvalidEmail(#[from] EmailError),

    #[error("{0}")]
    InvalidRole(#[from] RoleError),

    #[error("{0}")]
    InvalidToken(#[from] TokenError),

    #[error("{0}")]
    InvalidName(#[from] NameError),

    #[error("institution_id is required for role {0:?}")]
    InstitutionRequired(Role),

    #[error("terms must be accepted")]
    TermsNotAccepted,

    #[error("too many requests")]
    RateLimited,

    #[error("invalid session token")]
    InvalidSessionToken,

    #[error("authentication required")]
    AuthenticationRequired,
}

impl DomainError {
    /// Create not found error
    pub fn not_found(entity: &str) -> Self {
        Self::NotFound(entity.to_string())
    }

    /// Create conflict error
    pub fn conflict(msg: &str) -> Self {
        Self::Conflict(msg.to_string())
    }

    /// Create validation error
    pub fn validation(msg: &str) -> Self {
        Self::Validation(msg.to_string())
    }

    /// Create an internal error from a boxed error.
    pub fn internal<E>(error: E) -> Self
    where
        E: std::error::Error + Send + Sync + 'static,
    {
        Self::Internal(error.to_string())
    }

    /// Create an internal error from a message.
    pub fn internal_msg<S: Into<String>>(message: S) -> Self {
        Self::Internal(message.into())
    }
}

/// Result type for domain operations
pub type DomainResult<T> = Result<T, DomainError>;

/// Email validation error.
#[derive(Debug, Error, PartialEq)]
pub enum EmailError {
    #[error("email is empty")]
    Empty,
    #[error("invalid email format")]
    InvalidFormat,
}

/// Name validation error.
#[derive(Debug, Error, PartialEq)]
pub enum NameError {
    #[error("name is empty")]
    Empty,
    #[error("name is too long")]
    TooLong,
}

/// Role parsing error.
#[derive(Debug, Error, PartialEq)]
pub enum RoleError {
    #[error("unknown role")]
    Unknown,
}

/// Token validation error.
#[derive(Debug, Error, PartialEq)]
pub enum TokenError {
    #[error("token is expired")]
    Expired,
    #[error("invalid token")]
    Invalid,
    #[error("token not found")]
    NotFound,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn domain_error_constructors() {
        let err = DomainError::not_found("user");
        assert!(err.to_string().contains("user"));

        let err = DomainError::conflict("duplicate");
        assert!(err.to_string().contains("duplicate"));

        let err = DomainError::validation("bad input");
        assert!(err.to_string().contains("bad input"));

        let err = DomainError::internal_msg("boom");
        assert!(err.to_string().contains("boom"));

        let io_err = std::io::Error::other("io fail");
        let err = DomainError::internal(io_err);
        assert!(err.to_string().contains("io fail"));
    }

    #[test]
    fn domain_error_variants_display() {
        assert!(DomainError::InvalidEmail(EmailError::Empty)
            .to_string()
            .contains("empty"));
        assert!(DomainError::InvalidRole(RoleError::Unknown)
            .to_string()
            .contains("unknown role"));
        assert!(DomainError::InvalidToken(TokenError::Expired)
            .to_string()
            .contains("expired"));
        assert!(DomainError::InvalidName(NameError::TooLong)
            .to_string()
            .contains("too long"));

        assert!(DomainError::InstitutionRequired(Role::Teacher)
            .to_string()
            .contains("Teacher"));
        assert!(DomainError::TermsNotAccepted.to_string().contains("terms"));
        assert!(DomainError::RateLimited.to_string().contains("requests"));
        assert!(DomainError::InvalidSessionToken
            .to_string()
            .contains("session"));
        assert!(DomainError::AuthenticationRequired
            .to_string()
            .contains("authentication"));
    }
}
