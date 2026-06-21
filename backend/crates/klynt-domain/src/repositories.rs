use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::audit::AuditEvent;
use crate::ctx::Ctx;
use crate::errors::DomainError;
use crate::models::{Email, User, UserId};
use crate::ports::HashedPassword;
use crate::tokens::TokenKind;

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

/// Unified store for issue-once tokens (email verification, password reset).
///
/// Behind this interface sits the CSPRNG-hash-persist-consume lifecycle.
/// The `kind` parameter selects the target table.
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
    ///
    /// Returns the user_id on success, or an error if the token is
    /// invalid/expired/already-used.
    async fn consume(
        &self,
        ctx: &Ctx,
        kind: TokenKind,
        token_hash: &str,
    ) -> Result<UserId, DomainError>;
}

#[async_trait]
pub trait AuditEventRepository: Send + Sync {
    /// Log an audit event (append-only).
    async fn log(&self, ctx: &Ctx, event: AuditEvent) -> Result<(), DomainError>;
}
