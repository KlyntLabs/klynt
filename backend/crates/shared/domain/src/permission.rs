//! Permission and authorization policy types.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::DomainError;

/// Unique identifier for a permission.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct PermissionId(pub Uuid);

impl PermissionId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    pub fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid)
    }
}

impl Default for PermissionId {
    fn default() -> Self {
        Self::new()
    }
}

/// Permission category for grouping and UI organization.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PermissionCategory {
    Tenant,
    Member,
    Role,
    Content,
    Platform,
}

impl std::fmt::Display for PermissionCategory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Tenant => f.write_str("tenant"),
            Self::Member => f.write_str("member"),
            Self::Role => f.write_str("role"),
            Self::Content => f.write_str("content"),
            Self::Platform => f.write_str("platform"),
        }
    }
}

impl std::str::FromStr for PermissionCategory {
    type Err = DomainError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "tenant" => Ok(Self::Tenant),
            "member" => Ok(Self::Member),
            "role" => Ok(Self::Role),
            "content" => Ok(Self::Content),
            "platform" => Ok(Self::Platform),
            _ => Err(DomainError::validation("unknown permission category")),
        }
    }
}

/// A granular permission in the system.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Permission {
    pub id: PermissionId,
    pub name: String,
    pub description: String,
    pub category: PermissionCategory,
}

impl Permission {
    pub fn new(id: PermissionId, name: impl Into<String>, description: impl Into<String>) -> Self {
        Self {
            id,
            name: name.into(),
            description: description.into(),
            category: PermissionCategory::Tenant,
        }
    }

    pub fn with_category(mut self, category: PermissionCategory) -> Self {
        self.category = category;
        self
    }
}

/// Well-known tenant-level permissions.
pub mod tenant {
    pub const VIEW: &str = "tenant.view";
    pub const MANAGE_SETTINGS: &str = "tenant.manage_settings";
    pub const MANAGE_MEMBERS: &str = "tenant.manage_members";
    pub const MANAGE_ROLES: &str = "tenant.manage_roles";
    pub const DELETE: &str = "tenant.delete";
}

/// Well-known content-level permissions.
pub mod content {
    pub const VIEW: &str = "content.view";
    pub const CREATE: &str = "content.create";
    pub const EDIT: &str = "content.edit";
    pub const DELETE: &str = "content.delete";
    pub const PUBLISH: &str = "content.publish";
}

/// Well-known platform-level permissions.
pub mod platform {
    pub const MANAGE_USERS: &str = "platform.manage_users";
    pub const MANAGE_TENANTS: &str = "platform.manage_tenants";
    pub const VIEW_ANALYTICS: &str = "platform.view_analytics";
    pub const MANAGE_BILLING: &str = "platform.manage_billing";
}

/// All well-known permission names.
pub fn all_permission_names() -> Vec<&'static str> {
    vec![
        tenant::VIEW,
        tenant::MANAGE_SETTINGS,
        tenant::MANAGE_MEMBERS,
        tenant::MANAGE_ROLES,
        tenant::DELETE,
        content::VIEW,
        content::CREATE,
        content::EDIT,
        content::DELETE,
        content::PUBLISH,
        platform::MANAGE_USERS,
        platform::MANAGE_TENANTS,
        platform::VIEW_ANALYTICS,
        platform::MANAGE_BILLING,
    ]
}
