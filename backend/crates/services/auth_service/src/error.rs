//! Auth service errors.

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

/// Result type for auth operations.
pub type AuthResult<T> = Result<T, AuthError>;
