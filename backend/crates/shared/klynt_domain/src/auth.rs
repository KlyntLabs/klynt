//! Session domain types.

use chrono::{DateTime, Utc};

use crate::user::UserId;

/// An authenticated session.
#[derive(Debug, Clone)]
pub struct Session {
    pub user_id: UserId,
    pub expires_at: DateTime<Utc>,
}
