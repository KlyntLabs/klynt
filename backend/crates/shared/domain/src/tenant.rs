//! Tenant aggregate root and supporting domain types.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::DomainError;
use crate::user::UserId;

/// Unique identifier for a tenant.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct TenantId(pub Uuid);

impl TenantId {
    /// Create a new random tenant ID.
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

impl Default for TenantId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for TenantId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::str::FromStr for TenantId {
    type Err = uuid::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self(Uuid::parse_str(s)?))
    }
}

/// Human-readable tenant slug used in URLs.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct TenantSlug(String);

impl TenantSlug {
    /// Parse and validate a tenant slug.
    pub fn parse(raw: &str) -> Result<Self, DomainError> {
        let lower = raw.to_lowercase();
        if lower.len() < 3 || lower.len() > 63 {
            return Err(DomainError::validation("slug must be 3-63 characters"));
        }
        if !lower.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
            return Err(DomainError::validation(
                "slug may only contain a-z, 0-9, and hyphens",
            ));
        }
        if lower.starts_with('-') || lower.ends_with('-') {
            return Err(DomainError::validation(
                "slug may not start or end with a hyphen",
            ));
        }
        Ok(Self(lower))
    }

    /// Get the canonical slug string.
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl std::fmt::Display for TenantSlug {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::str::FromStr for TenantSlug {
    type Err = DomainError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::parse(s)
    }
}

/// Lifecycle status of a tenant.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TenantStatus {
    Active,
    Suspended,
}

impl TenantStatus {
    /// Return the canonical string representation.
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Suspended => "suspended",
        }
    }
}

impl std::fmt::Display for TenantStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl std::str::FromStr for TenantStatus {
    type Err = DomainError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "active" => Ok(Self::Active),
            "suspended" => Ok(Self::Suspended),
            _ => Err(DomainError::validation("invalid tenant status")),
        }
    }
}

const DEFAULT_MAX_MEMBERS: i32 = 100;
const DEFAULT_MAX_OWNERS: i32 = 1;

/// A lightweight read-model for a tenant plus the authenticated actor's
/// membership details.
///
/// Returned by list-my-tenants and create/accept-invite flows so the frontend
/// can render the tenant and the user's role in a single payload.
#[derive(Debug, Clone, Serialize)]
pub struct TenantMembershipSummary {
    pub id: TenantId,
    pub slug: TenantSlug,
    pub name: String,
    pub role: crate::membership::TenantRole,
    pub joined_at: DateTime<Utc>,
}

impl TenantMembershipSummary {
    /// Build a summary from a tenant, role, and join timestamp.
    pub fn new(
        tenant: Tenant,
        role: crate::membership::TenantRole,
        joined_at: DateTime<Utc>,
    ) -> Self {
        Self {
            id: tenant.id,
            slug: tenant.slug,
            name: tenant.name,
            role,
            joined_at,
        }
    }
}

/// A tenant / organization in the platform.
#[derive(Debug, Clone, Serialize)]
pub struct Tenant {
    pub id: TenantId,
    pub slug: TenantSlug,
    pub name: String,
    pub owner_id: UserId,
    pub max_members: i32,
    pub max_owners: i32,
    pub settings: serde_json::Value,
    pub status: TenantStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Tenant {
    /// Create a new active tenant.
    pub fn create(slug: TenantSlug, name: String, owner_id: UserId) -> Result<Self, DomainError> {
        if name.trim().is_empty() {
            return Err(DomainError::validation("tenant name is required"));
        }
        let now = Utc::now();
        Ok(Self {
            id: TenantId::new(),
            slug,
            name,
            owner_id,
            max_members: DEFAULT_MAX_MEMBERS,
            max_owners: DEFAULT_MAX_OWNERS,
            settings: serde_json::Value::Object(serde_json::Map::new()),
            status: TenantStatus::Active,
            created_at: now,
            updated_at: now,
        })
    }

    /// Rename the tenant.
    pub fn rename(&mut self, name: String) -> Result<(), DomainError> {
        if name.trim().is_empty() {
            return Err(DomainError::validation("tenant name is required"));
        }
        self.name = name;
        self.updated_at = Utc::now();
        Ok(())
    }

    /// Whether the tenant is currently active.
    pub fn is_active(&self) -> bool {
        matches!(self.status, TenantStatus::Active)
    }
}

#[cfg(test)]
#[path = "tenant_test.rs"]
mod tests;
