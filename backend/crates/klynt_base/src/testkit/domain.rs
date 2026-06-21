//! Helpers for creating sample domain models in tests.

use chrono::Utc;

use klynt_common::domain::{Email, User, UserRole, UserStatus};
use klynt_common::util::UserId;

/// Create a sample user for tests with full control over fields.
pub fn sample_user(email: &str, full_name: &str, password_hash: &str, status: UserStatus) -> User {
    User {
        id: UserId::new(),
        email: Email::new(email.to_string()),
        full_name: Some(full_name.to_string()),
        password_hash: password_hash.to_string(),
        status,
        role: UserRole::Student,
        created_at: Utc::now(),
        updated_at: None,
        deleted_at: None,
    }
}

/// Create an active sample user with a deterministic password hash.
pub fn sample_active_user(email: &str, full_name: &str) -> User {
    sample_user(email, full_name, "hash-password", UserStatus::Active)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sample_user_has_expected_email_and_status() {
        let user = sample_user("ada@example.com", "Ada", "hash", UserStatus::Pending);
        assert_eq!(user.email.inner(), "ada@example.com");
        assert_eq!(user.status, UserStatus::Pending);
        assert_eq!(user.role, UserRole::Student);
    }

    #[test]
    fn sample_active_user_is_active() {
        let user = sample_active_user("ada@example.com", "Ada");
        assert!(user.is_active());
    }
}
