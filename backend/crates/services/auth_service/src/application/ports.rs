//! Application-layer ports (dependency interfaces).

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use klynt_base::ctx::ExecutionContext;
use klynt_common::util::UserId;

use crate::error::AuthError;
use crate::models::User;

/// Port for user lookups and mutations needed by auth flows.
#[async_trait]
pub trait UserRepository: Send + Sync {
    /// Find a user by email address.
    async fn find_by_email(
        &self,
        ctx: &ExecutionContext,
        email: &str,
    ) -> Result<Option<User>, AuthError>;

    /// Create a new pending user and return their ID.
    async fn create_pending_user(
        &self,
        ctx: &ExecutionContext,
        full_name: Option<String>,
        email: &str,
        password_hash: &str,
    ) -> Result<UserId, AuthError>;

    /// Activate a user account (after email verification).
    async fn activate_user(&self, ctx: &ExecutionContext, user_id: UserId)
        -> Result<(), AuthError>;

    /// Update the user's password hash.
    async fn update_password(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        password_hash: &str,
    ) -> Result<(), AuthError>;
}

/// Port for password hashing operations.
#[async_trait]
pub trait PasswordHasher: Send + Sync {
    /// Hash a plaintext password.
    async fn hash(&self, password: &str) -> Result<String, AuthError>;

    /// Verify a plaintext password against a stored hash.
    async fn verify(&self, password: &str, hash: &str) -> Result<bool, AuthError>;
}

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

/// Port for generating timestamps (injected for testability).
pub trait Clock: Send + Sync {
    fn now(&self) -> DateTime<Utc>;
}

/// Default system clock.
#[derive(Debug, Clone, Default)]
pub struct SystemClock;

impl Clock for SystemClock {
    fn now(&self) -> DateTime<Utc> {
        Utc::now()
    }
}
