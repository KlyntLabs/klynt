//! Tenant role aggregate.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::permission::PermissionId;
use crate::tenant::TenantId;

/// Unique identifier for a tenant-scoped role.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct RoleId(pub Uuid);

impl RoleId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    pub fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid)
    }
}

impl Default for RoleId {
    fn default() -> Self {
        Self::new()
    }
}

/// A role within a tenant. System roles are created automatically for every
/// tenant; custom roles can be created by tenant owners/admins.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantRoleAggregate {
    pub id: RoleId,
    pub tenant_id: TenantId,
    pub name: String,
    pub description: String,
    pub is_custom: bool,
    pub is_system: bool,
    pub permission_ids: Vec<PermissionId>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl TenantRoleAggregate {
    pub fn new(
        id: RoleId,
        tenant_id: TenantId,
        name: impl Into<String>,
        description: impl Into<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id,
            tenant_id,
            name: name.into(),
            description: description.into(),
            is_custom: true,
            is_system: false,
            permission_ids: Vec::new(),
            created_at: now,
            updated_at: now,
        }
    }

    pub fn system(
        id: RoleId,
        tenant_id: TenantId,
        name: impl Into<String>,
        description: impl Into<String>,
        permission_ids: Vec<PermissionId>,
    ) -> Self {
        let mut role = Self::new(id, tenant_id, name, description);
        role.is_system = true;
        role.is_custom = false;
        role.permission_ids = permission_ids;
        role
    }

    pub fn set_permissions(&mut self, permission_ids: Vec<PermissionId>) {
        self.permission_ids = permission_ids;
        self.updated_at = Utc::now();
    }

    pub fn with_permissions(mut self, permission_ids: Vec<PermissionId>) -> Self {
        self.set_permissions(permission_ids);
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn custom_role_defaults_to_is_custom() {
        let role =
            TenantRoleAggregate::new(RoleId::new(), TenantId::new(), "custom", "a custom role");
        assert!(role.is_custom);
        assert!(!role.is_system);
    }

    #[test]
    fn system_role_is_not_custom() {
        let role = TenantRoleAggregate::system(
            RoleId::new(),
            TenantId::new(),
            "owner",
            "system role",
            Vec::new(),
        );
        assert!(!role.is_custom);
        assert!(role.is_system);
    }
}
