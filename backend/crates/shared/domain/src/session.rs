//! Session domain types.

use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::user::UserId;

/// Public summary of an authenticated session.
///
/// Returned by session-management endpoints. Intentionally omits the raw
/// bearer token and tenant membership snapshots; callers see only stable
/// metadata they need to identify and revoke their own sessions.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SessionSummary {
    /// Stable public session identifier (exposes the database `id` column).
    pub id: Uuid,

    /// User this session belongs to.
    pub user_id: UserId,

    /// Session kind: `access`, `long_lived`, or `refresh`.
    pub kind: String,

    /// When the session was created.
    pub created_at: DateTime<Utc>,

    /// When the session expires.
    pub expires_at: DateTime<Utc>,
}
