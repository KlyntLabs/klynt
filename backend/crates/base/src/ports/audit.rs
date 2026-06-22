//! Canonical audit logging interface.

use async_trait::async_trait;
use domain::UserId;

use crate::ctx::ExecutionContext;

/// Canonical audit logging interface.
///
/// Consolidates auth and user service audit events into a single interface.
#[async_trait]
pub trait AuditLogger: Send + Sync {
    // Auth events

    /// Log a successful login.
    async fn log_login_success(&self, ctx: &ExecutionContext, user_id: UserId);

    /// Log a failed login attempt.
    async fn log_login_failed(&self, ctx: &ExecutionContext, email: &str, error: &str);

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
        session_id: String,
    );

    // User management events

    /// Log a profile update.
    async fn log_profile_updated(&self, ctx: &ExecutionContext, user_id: UserId);

    /// Log a password change.
    async fn log_password_changed(&self, ctx: &ExecutionContext, user_id: UserId);

    /// Log user deletion.
    async fn log_user_deleted(&self, ctx: &ExecutionContext, user_id: UserId);
}
