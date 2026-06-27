//! Canonical session storage port for the Klynt platform.
//!
//! This port defines the boundary between authentication services and the
//! underlying session store. Implementations live in the persistence crate;
//! services depend only on this trait.

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use domain::membership::SessionMembershipSnapshot;
use domain::session::SessionSummary;
use domain::UserId;
use uuid::Uuid;

use crate::ctx::ExecutionContext;

/// Opaque bearer token used to authenticate requests.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct SessionToken(pub Uuid);

impl SessionToken {
    /// Generate a new random session token.
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for SessionToken {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for SessionToken {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Classification of a session token.
///
/// Implementations use this to apply different lifetimes, rotation rules,
/// and authorization policies. `Access` and `LongLived` tokens may authorize
/// API requests; `Refresh` tokens may not.
#[derive(Clone, Copy, Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionKind {
    /// Short-lived token used to authorize API requests.
    Access,
    /// Extended access token used when "remember me" is requested.
    LongLived,
    /// Long-lived token used to obtain new access tokens.
    Refresh,
}

impl SessionKind {
    /// Returns true if this kind may be used to authorize API requests.
    pub fn is_access(self) -> bool {
        matches!(self, Self::Access | Self::LongLived)
    }

    /// Returns the database representation of this kind.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Access => "access",
            Self::LongLived => "long_lived",
            Self::Refresh => "refresh",
        }
    }
}

impl TryFrom<&str> for SessionKind {
    type Error = String;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "access" => Ok(Self::Access),
            "long_lived" => Ok(Self::LongLived),
            "refresh" => Ok(Self::Refresh),
            _ => Err(format!("unknown session kind: {value}")),
        }
    }
}

/// Snapshot of a tenant membership stored on a session.
///
/// This is a re-export of the domain's session-compatible membership
/// representation so the session port and the domain model share one type.
pub type MembershipSnapshot = SessionMembershipSnapshot;

/// An authenticated session.
#[derive(Clone, Debug)]
pub struct Session {
    pub user_id: UserId,
    pub expires_at: DateTime<Utc>,
    pub kind: SessionKind,
    pub pair_id: Option<Uuid>,
    pub tenant_memberships: Vec<MembershipSnapshot>,
}

impl Session {
    /// Check if the session has expired.
    pub fn is_expired(&self) -> bool {
        Utc::now() >= self.expires_at
    }
}

/// Outbound port for session storage.
#[async_trait]
pub trait SessionStore: Send + Sync {
    /// Create a new session for `user_id` and return its bearer token.
    ///
    /// Defaults to an access session with no pair. Implementations must override
    /// [`create_with_kind`](Self::create_with_kind); this method exists for
    /// backward-compatible callers.
    async fn create(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        expires_at: DateTime<Utc>,
    ) -> Result<SessionToken, SessionError> {
        self.create_with_kind(ctx, user_id, expires_at, SessionKind::Access, None)
            .await
    }

    /// Create a new session of a specific kind and return its bearer token.
    async fn create_with_kind(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        expires_at: DateTime<Utc>,
        kind: SessionKind,
        pair_id: Option<Uuid>,
    ) -> Result<SessionToken, SessionError>;

    /// Find a non-expired session by token.
    async fn find_valid(
        &self,
        ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<Option<Session>, SessionError>;

    /// Revoke a session by token.
    async fn revoke(
        &self,
        ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<(), SessionError>;

    /// Revoke a session by its public id after verifying ownership.
    async fn revoke_by_id(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        session_id: Uuid,
    ) -> Result<(), SessionError>;

    /// Revoke all sessions belonging to the same pair.
    async fn revoke_pair(
        &self,
        ctx: &ExecutionContext,
        pair_id: Uuid,
        except_token: &SessionToken,
    ) -> Result<(), SessionError>;

    /// List all active sessions for a user.
    ///
    /// Default implementation returns an empty vector for fakes that do not
    /// track sessions by user.
    async fn list_active_by_user(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
    ) -> Result<Vec<SessionSummary>, SessionError> {
        Ok(Vec::new())
    }

    /// Replace the membership snapshot on a single session.
    ///
    /// Default implementation is a no-op for fakes that do not need to track
    /// tenant memberships.
    async fn update_memberships(
        &self,
        _ctx: &ExecutionContext,
        _token: &SessionToken,
        _memberships: Vec<MembershipSnapshot>,
    ) -> Result<(), SessionError> {
        Ok(())
    }

    /// Append a membership snapshot to all active sessions for a user.
    ///
    /// Default implementation is a no-op for fakes that do not need to track
    /// tenant memberships.
    async fn add_membership(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
        _membership: MembershipSnapshot,
    ) -> Result<(), SessionError> {
        Ok(())
    }

    /// Update a membership snapshot across all active sessions for a user.
    ///
    /// This is used when a user's role within a tenant changes. The snapshot
    /// for the matching tenant is replaced and any cached sessions are
    /// invalidated so the next request re-hydrates from Postgres.
    ///
    /// Default implementation is a no-op for fakes that do not need to track
    /// tenant memberships.
    async fn update_membership_for_user(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
        _membership: MembershipSnapshot,
    ) -> Result<(), SessionError> {
        Ok(())
    }

    /// Update a membership snapshot across all active sessions for a user.
    ///
    /// Semantically identical to [`Self::update_membership_for_user`]; provided
    /// as the canonical name for new callers. The default implementation
    /// delegates to [`Self::update_membership_for_user`] so existing stores
    /// continue to work unchanged.
    async fn update_membership(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        membership: MembershipSnapshot,
    ) -> Result<(), SessionError> {
        self.update_membership_for_user(ctx, user_id, membership)
            .await
    }

    /// Remove a membership snapshot from all active sessions for a user.
    ///
    /// Default implementation is a no-op for fakes that do not need to track
    /// tenant memberships.
    async fn remove_membership(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
        _tenant_id: domain::TenantId,
    ) -> Result<(), SessionError> {
        Ok(())
    }
}

/// Errors that can occur when interacting with a session store.
#[derive(Debug, thiserror::Error)]
pub enum SessionError {
    /// Session not found.
    #[error("Session not found")]
    NotFound,

    /// Session has expired.
    #[error("Session expired")]
    Expired,

    /// Caller is not allowed to access or modify the session.
    #[error("Forbidden")]
    Forbidden,

    /// Underlying database error.
    #[error("Database error: {0}")]
    Database(String),

    /// Internal unexpected error.
    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<sqlx::Error> for SessionError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => SessionError::NotFound,
            sqlx::Error::Database(db_err) => SessionError::Database(db_err.to_string()),
            _ => SessionError::Internal(err.to_string()),
        }
    }
}

#[cfg(test)]
#[path = "session_test.rs"]
mod session_test;
