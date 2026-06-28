use thiserror::Error;

/// Errors that can occur when using the session service.
#[derive(Debug, Error)]
pub enum SessionError {
    /// The session token is invalid or expired.
    #[error("Invalid or expired session token")]
    InvalidToken,

    /// The session store encountered an unexpected error.
    #[error("Session store error: {0}")]
    StoreError(String),
}

impl From<base::ports::session::SessionError> for SessionError {
    fn from(err: base::ports::session::SessionError) -> Self {
        match err {
            base::ports::session::SessionError::NotFound => SessionError::InvalidToken,
            base::ports::session::SessionError::Expired => SessionError::InvalidToken,
            base::ports::session::SessionError::Forbidden => {
                SessionError::StoreError("forbidden".to_string())
            }
            base::ports::session::SessionError::Database(msg) => SessionError::StoreError(msg),
            base::ports::session::SessionError::Internal(msg) => SessionError::StoreError(msg),
        }
    }
}

/// Result type for session service operations.
pub type SessionResult<T> = Result<T, SessionError>;
