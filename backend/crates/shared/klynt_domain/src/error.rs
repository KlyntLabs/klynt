//! Shared domain errors.

use thiserror::Error;

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
}

/// Result type for domain operations
pub type DomainResult<T> = Result<T, DomainError>;
