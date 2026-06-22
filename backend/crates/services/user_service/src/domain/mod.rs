//! User domain logic.

use chrono::{DateTime, Utc};
pub use klynt_domain::User;

use crate::error::UserError;

/// Service-specific operations on the shared [`User`] aggregate.
pub trait UserExt {
    /// Soft delete the user.
    fn delete(&mut self, now: DateTime<Utc>) -> Result<(), UserError>;

    /// Update the user's profile.
    fn update_profile(&mut self, full_name: Option<String>) -> Result<(), UserError>;
}

impl UserExt for User {
    fn delete(&mut self, now: DateTime<Utc>) -> Result<(), UserError> {
        if !self.can_delete() {
            return Err(UserError::CannotDeleteAdmin);
        }
        self.deleted_at = Some(now);
        Ok(())
    }

    fn update_profile(&mut self, full_name: Option<String>) -> Result<(), UserError> {
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
    use klynt_domain::{Email, UserId, UserRole, UserStatus};

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
