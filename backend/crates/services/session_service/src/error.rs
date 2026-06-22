use thiserror::Error;

#[derive(Debug, Error)]
pub enum SessionError {
    #[error("Invalid or expired session token")]
    InvalidToken,

    #[error("Session store error: {0}")]
    StoreError(String),
}

impl From<klynt_base::ports::session::SessionError> for SessionError {
    fn from(err: klynt_base::ports::session::SessionError) -> Self {
        match err {
            klynt_base::ports::session::SessionError::NotFound => SessionError::InvalidToken,
            klynt_base::ports::session::SessionError::Expired => SessionError::InvalidToken,
            _ => SessionError::StoreError(err.to_string()),
        }
    }
}

pub type SessionResult<T> = Result<T, SessionError>;
