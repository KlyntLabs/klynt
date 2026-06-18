use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::errors::{EmailError, PasswordError, RoleError};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct UserId(pub Uuid);

impl UserId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for UserId {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Email(String);

impl Email {
    pub fn parse(raw: &str) -> Result<Self, EmailError> {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            return Err(EmailError::Empty);
        }

        let parts: Vec<&str> = trimmed.split('@').collect();
        if parts.len() != 2 {
            return Err(EmailError::InvalidFormat);
        }
        let local = parts[0];
        let domain = parts[1];
        if local.is_empty()
            || domain.is_empty()
            || !domain.contains('.')
            || domain.starts_with('.')
            || domain.ends_with('.')
        {
            return Err(EmailError::InvalidFormat);
        }

        Ok(Self(trimmed.to_lowercase()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

pub fn validate_password(raw: &str) -> Result<(), PasswordError> {
    if raw.len() < 12 {
        return Err(PasswordError::TooShort);
    }
    Ok(())
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    Student,
    Teacher,
    Admin,
    Parent,
}

impl Role {
    pub fn parse(raw: &str) -> Result<Self, RoleError> {
        match raw.to_lowercase().as_str() {
            "student" => Ok(Self::Student),
            "teacher" => Ok(Self::Teacher),
            "admin" => Ok(Self::Admin),
            "parent" => Ok(Self::Parent),
            _ => Err(RoleError::Unknown),
        }
    }

    pub fn requires_institution(self) -> bool {
        matches!(self, Role::Teacher | Role::Admin)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UserStatus {
    PendingVerification,
    Active,
    Suspended,
}

#[derive(Debug, Clone)]
pub struct User {
    pub id: UserId,
    pub name: String,
    pub email: Email,
    pub role: Role,
    pub institution_id: Option<Uuid>,
    pub status: UserStatus,
    pub password_hash: String,
    pub terms_accepted_at: DateTime<Utc>,
    pub terms_version: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct UserDto {
    pub id: UserId,
    pub name: String,
    pub email: String,
    pub role: Role,
    pub status: UserStatus,
    pub created_at: DateTime<Utc>,
}

impl From<&User> for UserDto {
    fn from(user: &User) -> Self {
        Self {
            id: user.id,
            name: user.name.clone(),
            email: user.email.as_str().to_string(),
            role: user.role,
            status: user.status,
            created_at: user.created_at,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn email_parses_valid_address() {
        let email = Email::parse("Ada@Example.COM").unwrap();
        assert_eq!(email.as_str(), "ada@example.com");
    }

    #[test]
    fn email_preserves_plus_addressing() {
        let a = Email::parse("ada+tag@example.com").unwrap();
        let b = Email::parse("ada@example.com").unwrap();
        assert_ne!(a, b);
    }

    #[test]
    fn email_rejects_invalid_addresses() {
        assert_eq!(Email::parse(""), Err(EmailError::Empty));
        assert_eq!(Email::parse("  "), Err(EmailError::Empty));
        assert_eq!(Email::parse("ada"), Err(EmailError::InvalidFormat));
        assert_eq!(Email::parse("ada@"), Err(EmailError::InvalidFormat));
        assert_eq!(Email::parse("@example.com"), Err(EmailError::InvalidFormat));
        assert_eq!(Email::parse("ada@example"), Err(EmailError::InvalidFormat));
    }

    #[test]
    fn password_must_be_at_least_12_chars() {
        assert_eq!(validate_password("short1!"), Err(PasswordError::TooShort));
        assert!(validate_password("long-enough-pass").is_ok());
    }

    #[test]
    fn role_parses_known_roles() {
        assert_eq!(Role::parse("student").unwrap(), Role::Student);
        assert_eq!(Role::parse("Teacher").unwrap(), Role::Teacher);
        assert_eq!(Role::parse("ADMIN").unwrap(), Role::Admin);
        assert_eq!(Role::parse("parent").unwrap(), Role::Parent);
        assert_eq!(Role::parse("guest"), Err(RoleError::Unknown));
    }

    #[test]
    fn teacher_and_admin_require_institution() {
        assert!(Role::Teacher.requires_institution());
        assert!(Role::Admin.requires_institution());
        assert!(!Role::Student.requires_institution());
        assert!(!Role::Parent.requires_institution());
    }
}
