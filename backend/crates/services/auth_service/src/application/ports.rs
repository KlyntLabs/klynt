//! Application-layer ports (dependency interfaces).

use async_trait::async_trait;

use klynt_base::ctx::ExecutionContext;
use klynt_common::util::UserId;

use crate::error::AuthError;

// Canonical user repository port from klynt_base.
pub use klynt_base::ports::repository::UserRepository;

/// Port for audit logging.
#[async_trait]
pub trait AuditLogger: Send + Sync {
    /// Log a successful login.
    async fn log_login_success(&self, ctx: &ExecutionContext, user_id: UserId);

    /// Log a failed login attempt.
    async fn log_login_failed(&self, ctx: &ExecutionContext, email: &str, error: String);

    /// Log user registration.
    async fn log_user_registered(&self, ctx: &ExecutionContext, user_id: UserId);

    /// Log email verification.
    async fn log_email_verified(&self, ctx: &ExecutionContext, user_id: UserId);

    /// Log password reset.
    async fn log_password_reset(&self, ctx: &ExecutionContext, user_id: UserId);

    /// Log session creation.
    async fn log_session_created(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        session_id: uuid::Uuid,
    );
}

/// Port for sending transactional emails.
#[async_trait]
pub trait EmailSender: Send + Sync {
    /// Send a verification email.
    async fn send_verification(
        &self,
        ctx: &ExecutionContext,
        email: &str,
        token: &str,
        base_url: &str,
    ) -> Result<(), AuthError>;

    /// Send a password reset email.
    async fn send_password_reset(
        &self,
        ctx: &ExecutionContext,
        email: &str,
        token: &str,
        base_url: &str,
    ) -> Result<(), AuthError>;
}
