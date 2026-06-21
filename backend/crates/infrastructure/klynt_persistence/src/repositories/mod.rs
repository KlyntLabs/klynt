//! Repository traits and models.

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::ports::HashedPassword;
use crate::tokens::TokenKind;
use klynt_base::ctx::Ctx;
use klynt_common::domain::{DomainError, User};
use klynt_common::util::{Email, UserId};

pub use klynt_telemetry::audit::types::AuditEventRepository;

pub mod pg_session;
pub mod pg_user;
pub mod redis_idempotency;
pub mod sqlx_audit_repo;
pub mod sqlx_token_repo;

/// Result of attempting to create a user.
pub enum CreateResult {
    Created,
    AlreadyExists(User),
}

/// User repository trait.
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

/// Unified store for issue-once tokens (email verification, password reset).
#[async_trait]
pub trait TokenStore: Send + Sync {
    /// Store a token hash with its expiry.
    async fn save(
        &self,
        ctx: &Ctx,
        kind: TokenKind,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError>;

    /// Atomically consume a token: validate it exists, is unused, is not
    /// expired, and mark it used — all in one step.
    async fn consume(
        &self,
        ctx: &Ctx,
        kind: TokenKind,
        token_hash: &str,
    ) -> Result<UserId, DomainError>;
}
