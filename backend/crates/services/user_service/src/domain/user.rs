//! User domain logic.

use chrono::{DateTime, Utc};
use klynt_shared_domain::{Email, UserRole, UserStatus};
use klynt_utils::UserId;

use crate::error::UserError;

/// User aggregate root.
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
    /// Check if user is active.
    pub fn is_active(&self) -> bool {
        self.status == UserStatus::Active && self.deleted_at.is_none()
    }

    /// Check if user is deleted.
    pub fn is_deleted(&self) -> bool {
        self.deleted_at.is_some()
    }

    /// Check if user can be deleted.
    pub fn can_delete(&self) -> bool {
        !self.is_deleted() && self.role != UserRole::Admin
    }

    /// Soft delete the user.
    pub fn delete(&mut self, now: DateTime<Utc>) -> Result<(), UserError> {
        if !self.can_delete() {
            return Err(UserError::CannotDeleteAdmin);
        }
        self.deleted_at = Some(now);
        Ok(())
    }

    /// Update profile.
    pub fn update_profile(&mut self, full_name: Option<String>) -> Result<(), UserError> {
        if self.is_deleted() {
            return Err(UserError::UserDeleted);
        }
        self.full_name = full_name;
        self.updated_at = Some(Utc::now());
        Ok(())
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
    fn cannot_delete_admin() {
        let mut user = sample_user();
        user.role = UserRole::Admin;
        assert!(matches!(
            user.delete(Utc::now()),
            Err(UserError::CannotDeleteAdmin)
        ));
    }

    #[test]
    fn soft_delete_sets_deleted_at() {
        let mut user = sample_user();
        let now = Utc::now();
        user.delete(now).unwrap();
        assert_eq!(user.deleted_at, Some(now));
    }

    #[test]
    fn update_profile_changes_full_name() {
        let mut user = sample_user();
        user.update_profile(Some("New Name".to_string())).unwrap();
        assert_eq!(user.full_name, Some("New Name".to_string()));
        assert!(user.updated_at.is_some());
    }

    #[test]
    fn cannot_update_deleted_user_profile() {
        let mut user = sample_user();
        user.deleted_at = Some(Utc::now());
        assert!(matches!(
            user.update_profile(Some("Name".to_string())),
            Err(UserError::UserDeleted)
        ));
    }
}
