//! Canonical email sending interface.

use async_trait::async_trait;
use domain::Email;

use crate::ctx::ExecutionContext;

/// Canonical email sending interface.
#[async_trait]
pub trait EmailSender: Send + Sync {
    /// Send a verification email.
    async fn send_verification(
        &self,
        ctx: &ExecutionContext,
        email: &Email,
        token: &str,
        base_url: &str,
    ) -> Result<(), EmailError>;

    /// Send a password reset email.
    async fn send_password_reset(
        &self,
        ctx: &ExecutionContext,
        email: &Email,
        token: &str,
        base_url: &str,
    ) -> Result<(), EmailError>;
}

/// Errors that can occur when sending email.
#[derive(Debug, thiserror::Error)]
pub enum EmailError {
    #[error("Failed to send email: {0}")]
    SendFailed(String),
}
