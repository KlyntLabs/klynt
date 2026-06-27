//! User aggregate root and supporting domain types.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::EmailError;
use crate::role::{GlobalRole, RoleError};

/// User ID wrapper — stable, globally unique identifier.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct UserId(pub Uuid);

impl UserId {
    /// Create a new random user ID.
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    /// Create from an existing UUID.
    pub fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid)
    }

    /// Get the inner UUID.
    pub fn inner(&self) -> Uuid {
        self.0
    }
}

impl Default for UserId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for UserId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::str::FromStr for UserId {
    type Err = uuid::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self(Uuid::parse_str(s)?))
    }
}

/// Email address wrapper with validation.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Email(String);

impl Email {
    /// Parse and validate an email address.
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

    /// Get the inner string.
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Get the inner string (alias for [`as_str`]).
    pub fn inner(&self) -> &str {
        &self.0
    }

    /// Create an email address without validating it.
    ///
    /// Prefer [`Email::parse`] for untrusted input.
    pub fn new(email: String) -> Self {
        Self(email.to_lowercase())
    }
}

impl std::fmt::Display for Email {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Role stored on the [`User`] aggregate.
///
/// This is the role persisted on the user aggregate. It maps to and from the
/// platform-wide [`Role`](crate::role::Role) at the persistence boundary.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    Admin,
    Instructor,
    #[default]
    Student,
}

impl UserRole {
    /// Parse a user role from its string representation.
    pub fn parse(raw: &str) -> Result<Self, RoleError> {
        match raw.to_lowercase().as_str() {
            "student" => Ok(Self::Student),
            "teacher" | "instructor" => Ok(Self::Instructor),
            "admin" => Ok(Self::Admin),
            _ => Err(RoleError::Unknown),
        }
    }

    /// Whether this role requires an institution association.
    pub fn requires_institution(self) -> bool {
        matches!(self, UserRole::Instructor | UserRole::Admin)
    }

    /// Return the canonical string representation.
    pub fn as_str(&self) -> &'static str {
        match self {
            UserRole::Student => "student",
            UserRole::Instructor => "instructor",
            UserRole::Admin => "admin",
        }
    }
}

impl std::fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl std::str::FromStr for UserRole {
    type Err = RoleError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::parse(s)
    }
}

/// User account status.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UserStatus {
    Active,
    Inactive,
    Suspended,
    #[default]
    Pending,
}

impl UserStatus {
    /// Return the canonical string representation.
    pub fn as_str(&self) -> &'static str {
        match self {
            UserStatus::Active => "active",
            UserStatus::Inactive => "inactive",
            UserStatus::Suspended => "suspended",
            UserStatus::Pending => "pending",
        }
    }
}

impl std::fmt::Display for UserStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

/// User aggregate root — canonical domain model shared across services.
#[derive(Debug, Clone, PartialEq)]
pub struct User {
    pub id: UserId,
    pub email: Email,
    pub username: String,
    pub full_name: Option<String>,
    pub password_hash: String,
    pub status: UserStatus,
    pub role: UserRole,
    pub global_role: Option<GlobalRole>,
    pub email_verified_at: Option<DateTime<Utc>>,
    pub institution_id: Option<Uuid>,
    pub terms_accepted_at: DateTime<Utc>,
    pub terms_version: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

impl User {
    /// Create a new user.
    pub fn new(
        email: Email,
        username: String,
        password_hash: String,
        full_name: Option<String>,
        role: UserRole,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: UserId::new(),
            email,
            username,
            full_name,
            password_hash,
            status: UserStatus::default(),
            role,
            global_role: None,
            email_verified_at: None,
            institution_id: None,
            terms_accepted_at: now,
            terms_version: "1.0".to_string(),
            created_at: now,
            updated_at: now,
            deleted_at: None,
        }
    }

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

/// Pagination request.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PaginationRequest {
    pub page: u32,
    pub page_size: u32,
}

impl PaginationRequest {
    /// Create a new pagination request with clamped values.
    pub fn new(page: u32, page_size: u32) -> Self {
        Self {
            page: page.max(1),
            page_size: page_size.clamp(1, 100),
        }
    }

    /// Return the first page with a sensible default page size.
    pub fn first() -> Self {
        Self::new(1, 20)
    }

    /// Calculate the SQL offset.
    pub fn offset(&self) -> u32 {
        (self.page - 1) * self.page_size
    }
}

/// Paginated response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total_count: u64,
    pub page: u32,
    pub page_size: u32,
    pub total_pages: u32,
}

impl<T> PaginatedResponse<T> {
    /// Create a new paginated response.
    pub fn new(items: Vec<T>, total_count: u64, page: u32, page_size: u32) -> Self {
        let total_pages = ((total_count as f64) / (page_size as f64)).ceil() as u32;
        Self {
            items,
            total_count,
            page,
            page_size,
            total_pages: total_pages.max(1),
        }
    }

    /// Create an empty paginated response.
    pub fn empty(page: u32, page_size: u32) -> Self {
        Self::new(vec![], 0, page, page_size)
    }
}

#[cfg(test)]
#[path = "user_test.rs"]
mod tests;
