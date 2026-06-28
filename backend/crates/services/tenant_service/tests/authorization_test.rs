//! AuthorizationService deep interface tests.

use std::sync::Arc;

use base::testkit::{
    test_ctx, FakeMembershipRepository, FakePermissionRepository, FakeRoleRepository,
};
use domain::{
    membership::TenantRole, permission, Permission, PermissionId, RoleId, TenantId,
    TenantRoleAggregate, UserId,
};
use tenant_service::application::AuthorizationService;

#[tokio::test]
async fn test_authorization_service_deep_interface() {
    let ctx = test_ctx();
    let tenant_id = TenantId::new();
    let user_id = UserId::new();

    let membership_repo = Arc::new(FakeMembershipRepository::new());
    let permission_repo = Arc::new(FakePermissionRepository::new());
    let role_repo = Arc::new(FakeRoleRepository::new());

    // Setup: add membership with role
    membership_repo.insert(domain::membership::Membership::new(
        tenant_id,
        user_id,
        TenantRole::Admin,
    ));

    // Setup: add permission
    let permission = Permission::new(
        PermissionId::new(),
        permission::tenant::MANAGE_MEMBERS,
        "manage members",
    );
    let permission_id = permission.id;
    permission_repo.insert(permission);

    // Setup: add role with permission
    let role = TenantRoleAggregate::system(
        RoleId::new(),
        tenant_id,
        TenantRole::Admin.as_str(),
        "admin role",
        vec![permission_id],
    );
    role_repo.insert(role);

    let auth = AuthorizationService::new(membership_repo, permission_repo, role_repo);

    // Test: has_permission returns true
    let permitted = auth
        .has_permission(&ctx, tenant_id, user_id, permission::tenant::MANAGE_MEMBERS)
        .await
        .unwrap();

    assert!(permitted, "User should have permission");
}
