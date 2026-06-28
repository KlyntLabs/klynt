use std::collections::HashMap;
use std::str::FromStr;

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::permission::PermissionRepository;
use domain::{DomainResult, Permission, PermissionCategory, PermissionId};

/// In-memory permission repository for gateway tests.
///
/// Returns a deterministic catalog seeded from the well-known permission names.
#[derive(Clone)]
pub struct FakePermissionRepository {
    permissions: HashMap<String, Permission>,
}

impl Default for FakePermissionRepository {
    fn default() -> Self {
        use domain::all_permission_names;

        let mut permissions = HashMap::new();
        for (index, name) in all_permission_names().into_iter().enumerate() {
            let category = name.split('.').next().unwrap_or("tenant");
            let category =
                PermissionCategory::from_str(category).unwrap_or(PermissionCategory::Tenant);
            let permission = Permission {
                id: PermissionId::from_uuid(uuid::Uuid::from_u128(index as u128 + 1)),
                name: name.to_string(),
                description: String::new(),
                category,
            };
            permissions.insert(name.to_string(), permission);
        }
        Self { permissions }
    }
}

#[async_trait]
impl PermissionRepository for FakePermissionRepository {
    async fn list_permissions(&self, _ctx: &ExecutionContext) -> DomainResult<Vec<Permission>> {
        Ok(self.permissions.values().cloned().collect())
    }

    async fn find_permission_by_name(
        &self,
        _ctx: &ExecutionContext,
        name: &str,
    ) -> DomainResult<Option<Permission>> {
        Ok(self.permissions.get(name).cloned())
    }
}
