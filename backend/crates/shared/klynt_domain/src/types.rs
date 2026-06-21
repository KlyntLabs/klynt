//! Shared domain types.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Email address wrapper
#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Email(String);

impl Email {
    /// Create new email (does not validate)
    pub fn new(email: String) -> Self {
        Self(email.to_lowercase())
    }

    /// Get inner value
    pub fn inner(&self) -> &str {
        &self.0
    }

    /// Validate email format
    pub fn validate(&self) -> bool {
        // Simple email validation
        self.0.contains('@') && self.0.contains('.')
    }
}

impl std::fmt::Display for Email {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Timestamp wrapper
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Timestamp(DateTime<Utc>);

impl Timestamp {
    /// Create from UTC datetime
    pub fn new(dt: DateTime<Utc>) -> Self {
        Self(dt)
    }

    /// Get current timestamp
    pub fn now() -> Self {
        Self(Utc::now())
    }

    /// Get inner datetime
    pub fn inner(&self) -> DateTime<Utc> {
        self.0
    }

    /// Check if in the past
    pub fn is_past(&self) -> bool {
        self.0 < Utc::now()
    }
}

impl Default for Timestamp {
    fn default() -> Self {
        Self::now()
    }
}

/// Pagination request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationRequest {
    pub page: u32,
    pub page_size: u32,
}

impl PaginationRequest {
    /// Create new pagination request
    pub fn new(page: u32, page_size: u32) -> Self {
        Self {
            page: page.max(1),
            page_size: page_size.clamp(1, 100),
        }
    }

    /// Get default (first page)
    pub fn first() -> Self {
        Self::new(1, 20)
    }

    /// Calculate offset
    pub fn offset(&self) -> u32 {
        (self.page - 1) * self.page_size
    }
}

/// Paginated response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total_count: u64,
    pub page: u32,
    pub page_size: u32,
    pub total_pages: u32,
}

impl<T> PaginatedResponse<T> {
    /// Create new paginated response
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

    /// Create empty response
    pub fn empty(page: u32, page_size: u32) -> Self {
        Self::new(vec![], 0, page, page_size)
    }
}

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
