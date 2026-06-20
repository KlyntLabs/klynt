use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::audit::AuditEvent;
use crate::ctx::Ctx;
use crate::errors::DomainError;
use crate::models::{Email, User, UserId};

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

    /// Query audit events by user.
    async fn find_by_user(
        &self,
        ctx: &Ctx,
        user_id: UserId,
        limit: usize,
    ) -> Result<Vec<AuditEvent>, DomainError>;

    /// Query audit events by resource.
    async fn find_by_resource(
        &self,
        ctx: &Ctx,
        resource_type: &str,
        resource_id: Uuid,
        limit: usize,
    ) -> Result<Vec<AuditEvent>, DomainError>;
}
