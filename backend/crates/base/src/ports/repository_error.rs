//! Canonical repository error type.
//!
//! Centralized error type for all repository operations.
//! Services map this to their domain-specific errors.

use thiserror::Error;

/// Canonical repository error type.
///
/// Centralized error type for all repository operations.
/// Services map this to their domain-specific errors.
#[derive(Debug, Error)]
pub enum RepositoryError {
    /// Requested user was not found.
    #[error("User not found")]
    NotFound,

    /// User already exists with a conflicting identifier.
    #[error("User already exists ({0})")]
    Conflict(String),

    /// Input validation failed.
    #[error("Validation error: {0}")]
    Validation(String),

    /// Underlying database error.
    #[error("Database error: {0}")]
    Database(String),

    /// Internal unexpected error.
    #[error("Internal error: {0}")]
    Internal(String),
}

// Convert from sqlx::Error for repository implementations.
impl From<sqlx::Error> for RepositoryError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => RepositoryError::NotFound,
            sqlx::Error::Database(db_err) => {
                if db_err.is_unique_violation() {
                    RepositoryError::Conflict(db_err.constraint().unwrap_or("unknown").to_string())
                } else if db_err.is_foreign_key_violation() {
                    RepositoryError::Validation(
                        db_err.constraint().unwrap_or("unknown").to_string(),
                    )
                } else {
                    RepositoryError::Database(db_err.to_string())
                }
            }
            _ => RepositoryError::Internal(err.to_string()),
        }
    }
}
