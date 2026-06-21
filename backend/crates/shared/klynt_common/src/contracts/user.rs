//! User-related contracts.

use crate::domain::User;
use crate::util::id::UserId;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use validator::Validate;

/// User profile (read-only).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: UserId,
    pub email: String,
    pub full_name: Option<String>,
    pub role: crate::domain::UserRole,
    pub status: crate::domain::UserStatus,
    pub created_at: DateTime<Utc>,
}

impl From<User> for UserProfile {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            email: user.email.inner().to_string(),
            full_name: user.full_name,
            role: user.role,
            status: user.status,
            created_at: user.created_at,
        }
    }
}

/// Profile update request.
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct ProfileUpdate {
    #[validate(length(min = 1, max = 100))]
    pub full_name: Option<String>,
}
