//! Platform-wide authorization roles.
//!
//! `Role` is the platform-wide authorization role (student, teacher, admin,
//! parent) used for institution-scoped checks.

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Role parsing error.
#[derive(Debug, Error, PartialEq)]
pub enum RoleError {
    #[error("unknown role")]
    Unknown,
}

/// Platform-specific user role (education context).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    Student,
    Teacher,
    Admin,
    Parent,
}

impl Role {
    /// Parse a platform role from its string representation.
    pub fn parse(raw: &str) -> Result<Self, RoleError> {
        match raw.to_lowercase().as_str() {
            "student" => Ok(Self::Student),
            "teacher" => Ok(Self::Teacher),
            "admin" => Ok(Self::Admin),
            "parent" => Ok(Self::Parent),
            _ => Err(RoleError::Unknown),
        }
    }

    /// Whether this role requires an institution association.
    pub fn requires_institution(self) -> bool {
        matches!(self, Role::Teacher | Role::Admin)
    }

    /// Return the canonical string representation.
    pub fn as_str(&self) -> &'static str {
        match self {
            Role::Student => "student",
            Role::Teacher => "teacher",
            Role::Admin => "admin",
            Role::Parent => "parent",
        }
    }
}

impl std::fmt::Display for Role {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

/// Platform-wide role (multi-tenant context).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum GlobalRole {
    Owner,
    Admin,
    #[default]
    User,
}

impl GlobalRole {
    /// Parse a global role from its string representation.
    pub fn parse(raw: &str) -> Result<Self, RoleError> {
        match raw.to_lowercase().as_str() {
            "owner" => Ok(Self::Owner),
            "admin" => Ok(Self::Admin),
            "user" => Ok(Self::User),
            _ => Err(RoleError::Unknown),
        }
    }

    /// Return the canonical string representation.
    pub fn as_str(&self) -> &'static str {
        match self {
            GlobalRole::Owner => "owner",
            GlobalRole::Admin => "admin",
            GlobalRole::User => "user",
        }
    }
}

impl std::fmt::Display for GlobalRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn role_parse_accepts_known_values() {
        assert_eq!(Role::parse("student").unwrap(), Role::Student);
        assert_eq!(Role::parse("TEACHER").unwrap(), Role::Teacher);
        assert_eq!(Role::parse("Admin").unwrap(), Role::Admin);
        assert_eq!(Role::parse("PARENT").unwrap(), Role::Parent);
    }

    #[test]
    fn role_parse_rejects_unknown_value() {
        assert_eq!(Role::parse("guest").unwrap_err(), RoleError::Unknown);
    }

    #[test]
    fn role_requires_institution_only_for_teacher_and_admin() {
        assert!(!Role::Student.requires_institution());
        assert!(Role::Teacher.requires_institution());
        assert!(Role::Admin.requires_institution());
        assert!(!Role::Parent.requires_institution());
    }

    #[test]
    fn role_as_str_and_display_match() {
        for role in [Role::Student, Role::Teacher, Role::Admin, Role::Parent] {
            assert_eq!(role.as_str(), role.to_string());
        }
    }

    #[test]
    fn global_role_parse_accepts_known_values() {
        assert_eq!(GlobalRole::parse("owner").unwrap(), GlobalRole::Owner);
        assert_eq!(GlobalRole::parse("ADMIN").unwrap(), GlobalRole::Admin);
        assert_eq!(GlobalRole::parse("User").unwrap(), GlobalRole::User);
    }

    #[test]
    fn global_role_default_is_user() {
        let role: GlobalRole = Default::default();
        assert_eq!(role, GlobalRole::User);
    }

    #[test]
    fn global_role_as_str_and_display_match() {
        for role in [GlobalRole::Owner, GlobalRole::Admin, GlobalRole::User] {
            assert_eq!(role.as_str(), role.to_string());
        }
    }
}
