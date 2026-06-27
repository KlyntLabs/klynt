//! Session coordinator errors.

use base::ports::session::SessionError;
use thiserror::Error;

/// Errors from session coordination operations.
#[derive(Debug, Error)]
pub enum SessionCoordinatorError {
    /// Underlying session store error.
    #[error("Session store error: {0}")]
    SessionStore(#[from] SessionError),
}
