//! Auth service errors.

use axum::http::StatusCode;

use klynt_base::ports::{HttpError, PasswordHashError, RepositoryError, SessionError, TokenError};
use klynt_common::domain::DomainError;

use crate::domain::PasswordPolicyError;

/// Auth service-specific error type.
#[derive(thiserror::Error, Debug)]
pub enum AuthError {
    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Account inactive")]
    AccountInactive,

    #[error("Account locked")]
    AccountLocked,

    #[error("Password reset required")]
    PasswordResetRequired,

    #[error("Token expired or invalid")]
    InvalidToken,

    #[error("Password policy violation: {0}")]
    PasswordPolicy(String),

    #[error("User not found")]
    UserNotFound,

    #[error("Too many attempts")]
    RateLimited,

    #[error("Internal error: {0}")]
    Internal(String),

    // Domain errors wrapped
    #[error("Domain error: {0}")]
    Domain(#[from] DomainError),
}

impl From<PasswordPolicyError> for AuthError {
    fn from(err: PasswordPolicyError) -> Self {
        Self::PasswordPolicy(err.to_string())
    }
}

impl From<PasswordHashError> for AuthError {
    fn from(err: PasswordHashError) -> Self {
        match err {
            PasswordHashError::Internal(msg) => Self::Domain(DomainError::internal_msg(msg)),
        }
    }
}

impl From<RepositoryError> for AuthError {
    fn from(err: RepositoryError) -> Self {
        match err {
            RepositoryError::NotFound => Self::UserNotFound,
            RepositoryError::Conflict(msg) => Self::Domain(DomainError::Conflict(msg)),
            RepositoryError::Validation(msg) => Self::Domain(DomainError::InvalidInput(msg)),
            RepositoryError::Database(msg) | RepositoryError::Internal(msg) => Self::Internal(msg),
        }
    }
}

impl From<SessionError> for AuthError {
    fn from(err: SessionError) -> Self {
        match err {
            SessionError::NotFound | SessionError::Expired => Self::InvalidToken,
            SessionError::Database(msg) | SessionError::Internal(msg) => Self::Internal(msg),
        }
    }
}

impl From<TokenError> for AuthError {
    fn from(err: TokenError) -> Self {
        match err {
            TokenError::Invalid | TokenError::AlreadyUsed => Self::InvalidToken,
            TokenError::Database(msg) | TokenError::Internal(msg) => Self::Internal(msg),
        }
    }
}

impl AuthError {
    /// Constructor helpers.
    pub fn invalid_credentials() -> Self {
        Self::InvalidCredentials
    }

    pub fn account_inactive() -> Self {
        Self::AccountInactive
    }

    pub fn validation(msg: String) -> Self {
        Self::PasswordPolicy(msg)
    }

    pub fn internal(msg: String) -> Self {
        Self::Internal(msg)
    }
}

impl HttpError for AuthError {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::InvalidCredentials
            | Self::AccountInactive
            | Self::AccountLocked
            | Self::PasswordResetRequired => StatusCode::UNAUTHORIZED,
            Self::InvalidToken | Self::PasswordPolicy(_) => StatusCode::BAD_REQUEST,
            Self::UserNotFound => StatusCode::NOT_FOUND,
            Self::RateLimited => StatusCode::TOO_MANY_REQUESTS,
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Self::Domain(err) => err.status_code(),
        }
    }

    fn error_code(&self) -> &'static str {
        match self {
            Self::InvalidCredentials => "INVALID_CREDENTIALS",
            Self::AccountInactive => "ACCOUNT_INACTIVE",
            Self::AccountLocked => "ACCOUNT_LOCKED",
            Self::PasswordResetRequired => "PASSWORD_RESET_REQUIRED",
            Self::InvalidToken => "INVALID_TOKEN",
            Self::PasswordPolicy(_) => "PASSWORD_POLICY_VIOLATION",
            Self::UserNotFound => "USER_NOT_FOUND",
            Self::RateLimited => "RATE_LIMITED",
            Self::Internal(_) => "INTERNAL_SERVER_ERROR",
            Self::Domain(err) => err.error_code(),
        }
    }
}

/// Result type for auth operations.
pub type AuthResult<T> = Result<T, AuthError>;
