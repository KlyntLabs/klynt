//! # Klynt Typed Enums
//!
//! Shared enums and type-safe constants.

use serde::{Deserialize, Serialize};

/// User roles
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    Admin,
    Instructor,
    Student,
}

/// User status
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UserStatus {
    Active,
    Inactive,
    Suspended,
    #[default]
    Pending,
}
