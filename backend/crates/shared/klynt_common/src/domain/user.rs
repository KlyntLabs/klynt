//! User aggregate root.

use chrono::{DateTime, Utc};

use crate::domain::{Email, UserRole, UserStatus};
use crate::util::UserId;

/// User aggregate root — canonical domain model shared across services.
#[derive(Debug, Clone)]
pub struct User {
    pub id: UserId,
    pub email: Email,
    pub full_name: Option<String>,
    pub password_hash: String,
    pub status: UserStatus,
    pub role: UserRole,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
    pub deleted_at: Option<DateTime<Utc>>,
}

impl User {
    /// Check if the user is active (not suspended, pending, or soft-deleted).
    pub fn is_active(&self) -> bool {
        self.status == UserStatus::Active && self.deleted_at.is_none()
    }

    /// Check if the user has been soft-deleted.
    pub fn is_deleted(&self) -> bool {
        self.deleted_at.is_some()
    }

    /// Check if the user can be deleted.
    pub fn can_delete(&self) -> bool {
        !self.is_deleted() && self.role != UserRole::Admin
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_user() -> User {
        User {
            id: UserId::new(),
            email: Email::new("ada@example.com".to_string()),
            full_name: Some("Ada".to_string()),
            password_hash: "hash".to_string(),
            status: UserStatus::Active,
            role: UserRole::Student,
            created_at: Utc::now(),
            updated_at: None,
            deleted_at: None,
        }
    }

    #[test]
    fn active_user_is_active() {
        let user = sample_user();
        assert!(user.is_active());
        assert!(!user.is_deleted());
    }

    #[test]
    fn deleted_user_is_not_active() {
        let mut user = sample_user();
        user.deleted_at = Some(Utc::now());
        assert!(!user.is_active());
        assert!(user.is_deleted());
    }

    #[test]
    fn suspended_user_is_not_active() {
        let mut user = sample_user();
        user.status = UserStatus::Suspended;
        assert!(!user.is_active());
    }

    #[test]
    fn admin_cannot_be_deleted() {
        let mut user = sample_user();
        user.role = UserRole::Admin;
        assert!(!user.can_delete());
    }
}
