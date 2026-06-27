//! Session coordinator errors.

use thiserror::Error;

/// Errors from session coordination operations.
#[derive(Debug, Error)]
pub enum SessionCoordinatorError {
    #[error("Session store error: {0}")]
    SessionStore(String),
}
