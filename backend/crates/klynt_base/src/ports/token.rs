//! Canonical token storage port for the Klynt platform.
//!
//! This port defines the boundary between authentication services and the
//! underlying token store for email verification and password reset tokens.

use async_trait::async_trait;
use chrono::{DateTime, Duration, Utc};
use klynt_common::util::UserId;

use crate::ctx::ExecutionContext;

/// Which kind of one-time token — determines TTL and target table.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum TokenKind {
    /// Token sent to verify an email address.
    EmailVerification,

    /// Token sent to authorize a password reset.
    PasswordReset,
}

impl TokenKind {
    /// Token lifetime before expiry.
    pub const fn ttl(self) -> Duration {
        match self {
            Self::EmailVerification => Duration::hours(24),
            Self::PasswordReset => Duration::minutes(30),
        }
    }
}

/// Outbound port for token storage.
#[async_trait]
pub trait TokenStore: Send + Sync {
    /// Store a token hash with its expiry.
    async fn save(
        &self,
        ctx: &ExecutionContext,
        kind: TokenKind,
        user_id: UserId,
        token_hash: String,
        expires_at: DateTime<Utc>,
    ) -> Result<(), TokenError>;

    /// Atomically consume a token: validate it exists, is unused, is not
    /// expired, and mark it used — all in one step.
    ///
    /// Returns the user_id on success, or an error if the token is
    /// invalid/expired/already-used.
    async fn consume(
        &self,
        ctx: &ExecutionContext,
        kind: TokenKind,
        token_hash: String,
    ) -> Result<UserId, TokenError>;
}

/// Errors that can occur when interacting with a token store.
#[derive(Debug, thiserror::Error)]
pub enum TokenError {
    /// Token not found or expired.
    #[error("Token not found or expired")]
    Invalid,

    /// Token has already been used.
    #[error("Token already used")]
    AlreadyUsed,

    /// Underlying database error.
    #[error("Database error: {0}")]
    Database(String),

    /// Internal unexpected error.
    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<sqlx::Error> for TokenError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => TokenError::Invalid,
            sqlx::Error::Database(db_err) => TokenError::Database(db_err.to_string()),
            _ => TokenError::Internal(err.to_string()),
        }
    }
}

#[cfg(test)]
#[path = "token_test.rs"]
mod token_test;
