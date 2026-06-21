//! Storage-related errors.

use thiserror::Error;

/// Storage error type
#[derive(Error, Debug)]
pub enum StorageError {
    #[error("Database connection failed: {0}")]
    Connection(String),

    #[error("Query failed: {0}")]
    Query(String),

    #[error("Transaction failed: {0}")]
    Transaction(String),

    #[error("Migration failed: {0}")]
    Migration(String),

    #[error("Redis error: {0}")]
    Redis(String),

    #[error("Not found")]
    NotFound,

    #[error("Conflict: {0}")]
    Conflict(String),
}

/// Result type for storage operations
pub type StorageResult<T> = Result<T, StorageError>;
