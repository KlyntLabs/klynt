//! Repository traits and models.

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::tokens::TokenKind;
use klynt_base::ctx::ExecutionContext;
use klynt_common::domain::DomainError;
use klynt_common::util::UserId;

pub use klynt_telemetry::audit::types::AuditEventRepository;

pub mod pg_session;
pub mod pg_user;
pub mod redis_idempotency;
pub mod sqlx_audit_repo;
pub mod sqlx_token_repo;

/// Unified store for issue-once tokens (email verification, password reset).
#[async_trait]
pub trait TokenStore: Send + Sync {
    /// Store a token hash with its expiry.
    async fn save(
        &self,
        ctx: &ExecutionContext,
        kind: TokenKind,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError>;

    /// Atomically consume a token: validate it exists, is unused, is not
    /// expired, and mark it used — all in one step.
    async fn consume(
        &self,
        ctx: &ExecutionContext,
        kind: TokenKind,
        token_hash: &str,
    ) -> Result<UserId, DomainError>;
}
