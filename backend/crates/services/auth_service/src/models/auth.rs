//! Auth-specific models and DTOs.

use chrono::{DateTime, Utc};
use klynt_shared_domain::{UserRole, UserStatus};
use klynt_utils::UserId;

/// Internal user representation (from repository).
#[derive(Debug, Clone)]
pub struct User {
    pub id: UserId,
    pub email: String,
    pub password_hash: String,
    pub full_name: Option<String>,
    pub status: UserStatus,
    pub role: UserRole,
    pub created_at: DateTime<Utc>,
}

impl User {
    pub fn is_active(&self) -> bool {
        matches!(self.status, UserStatus::Active)
    }
}
