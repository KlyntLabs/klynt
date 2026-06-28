//! Tenant membership aggregate and role definitions.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::DomainError;
use crate::tenant::TenantId;
use crate::user::UserId;

/// Role of a user within a tenant.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TenantRole {
    Owner,
    Admin,
    Member,
    Guest,
}

impl TenantRole {
    /// Parse a tenant role from its string representation.
    pub fn parse(raw: &str) -> Result<Self, DomainError> {
        match raw.to_lowercase().as_str() {
            "owner" => Ok(Self::Owner),
            "admin" => Ok(Self::Admin),
            "member" => Ok(Self::Member),
            "guest" => Ok(Self::Guest),
            _ => Err(DomainError::validation("unknown tenant role")),
        }
    }

    /// Return the canonical string representation.
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Owner => "owner",
            Self::Admin => "admin",
            Self::Member => "member",
            Self::Guest => "guest",
        }
    }

    /// Whether this role can administer the tenant.
    pub fn can_administer(self) -> bool {
        matches!(self, Self::Owner | Self::Admin)
    }
}

impl std::fmt::Display for TenantRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl std::str::FromStr for TenantRole {
    type Err = DomainError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::parse(s)
    }
}

/// Membership links a user to a tenant with a specific role.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct Membership {
    pub tenant_id: TenantId,
    pub user_id: UserId,
    pub role: TenantRole,
    pub joined_at: DateTime<Utc>,
}

impl Membership {
    /// Create a new membership.
    pub fn new(tenant_id: TenantId, user_id: UserId, role: TenantRole) -> Self {
        Self {
            tenant_id,
            user_id,
            role,
            joined_at: Utc::now(),
        }
    }

    /// Change the member's role.
    pub fn set_role(&mut self, role: TenantRole) {
        self.role = role;
    }

    /// Convert to session-compatible snapshot format.
    pub fn to_session_snapshot(&self) -> SessionMembershipSnapshot {
        SessionMembershipSnapshot {
            tenant_id: self.tenant_id.inner(),
            role: self.role,
        }
    }

    /// Reconstruct from a session snapshot.
    pub fn from_session_snapshot(
        snapshot: SessionMembershipSnapshot,
        user_id: UserId,
        joined_at: DateTime<Utc>,
    ) -> Self {
        Self {
            tenant_id: TenantId(snapshot.tenant_id),
            user_id,
            role: snapshot.role,
            joined_at,
        }
    }
}

/// Session-compatible membership representation (for serialization).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SessionMembershipSnapshot {
    /// Tenant the user belongs to.
    pub tenant_id: Uuid,
    /// Role the user has within the tenant.
    pub role: TenantRole,
}

/// A tenant member with their user details and role.
///
/// This is a read-model intended for member-list queries; it is not an
/// aggregate root.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct TenantMember {
    pub user_id: UserId,
    pub email: String,
    pub full_name: Option<String>,
    pub role: TenantRole,
    pub joined_at: DateTime<Utc>,
}

#[cfg(test)]
#[path = "membership_test.rs"]
mod tests;
