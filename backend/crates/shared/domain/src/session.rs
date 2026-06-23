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
    /// Stable session identifier (exposes the database `token` UUID).
    pub id: Uuid,

    /// User this session belongs to.
    pub user_id: UserId,

    /// Session kind: `access`, `long_lived`, or `refresh`.
    pub kind: String,

    /// When the session was created.
    pub created_at: DateTime<Utc>,

    /// When the session expires.
    pub expires_at: DateTime<Utc>,

    /// Client user agent, if recorded.
    pub user_agent: Option<String>,

    /// Client IP address, if recorded.
    pub ip_address: Option<String>,
}
