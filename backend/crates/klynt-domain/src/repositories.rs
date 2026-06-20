use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::audit::AuditEvent;
use crate::ctx::Ctx;
use crate::errors::DomainError;
use crate::models::{Email, User, UserId};
use crate::ports::HashedPassword;

pub enum CreateResult {
    Created,
    AlreadyExists(User),
}

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn create_if_not_exists(
        &self,
        ctx: &Ctx,
        email: &Email,
        user: &User,
    ) -> Result<CreateResult, DomainError>;

    async fn find_by_email(&self, ctx: &Ctx, email: &Email) -> Result<Option<User>, DomainError>;

    async fn find_by_id(&self, ctx: &Ctx, id: UserId) -> Result<Option<User>, DomainError>;

    /// Mark the user's email as verified and activate the account.
    async fn set_email_verified(&self, ctx: &Ctx, user_id: UserId) -> Result<(), DomainError>;

    /// Update the user's password hash.
    async fn update_password(
        &self,
        ctx: &Ctx,
        user_id: UserId,
        password_hash: &HashedPassword,
    ) -> Result<(), DomainError>;
}

#[async_trait]
pub trait EmailVerificationTokenRepository: Send + Sync {
    /// Store an email verification token (hash only).
    async fn save(
        &self,
        ctx: &Ctx,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError>;

    /// Find a valid token by hash.
    async fn find_valid(
        &self,
        ctx: &Ctx,
        token_hash: &str,
    ) -> Result<Option<(UserId, DateTime<Utc>)>, DomainError>;

    /// Mark token as used (atomic, single-use).
    async fn mark_used(&self, ctx: &Ctx, token_hash: &str) -> Result<bool, DomainError>;
}

#[async_trait]
pub trait PasswordResetTokenRepository: Send + Sync {
    /// Store a password reset token (hash only).
    async fn save(
        &self,
        ctx: &Ctx,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError>;

    /// Find a valid token by hash.
    async fn find_valid(
        &self,
        ctx: &Ctx,
        token_hash: &str,
    ) -> Result<Option<(UserId, DateTime<Utc>)>, DomainError>;

    /// Mark token as used (atomic, single-use).
    async fn mark_used(&self, ctx: &Ctx, token_hash: &str) -> Result<bool, DomainError>;
}

#[async_trait]
pub trait AuditEventRepository: Send + Sync {
    /// Log an audit event (append-only).
    async fn log(&self, ctx: &Ctx, event: AuditEvent) -> Result<(), DomainError>;
}
