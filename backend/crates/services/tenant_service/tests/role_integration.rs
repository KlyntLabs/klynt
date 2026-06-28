//! Postgres-backed integration tests for tenant roles.
//!
//! These tests require `DATABASE_URL` to point at a running PostgreSQL instance.

use tenant_service::CreateTenantRequest;

mod support;

#[tokio::test]
async fn create_custom_role_exposes_is_custom() {
    let Some(pool) = support::setup_pool().await else {
        return;
    };

    let service = support::build_service(pool.clone()).await;
    let owner_id = support::create_test_user(&pool, "owner-role").await;
    let owner_ctx = support::test_ctx(owner_id);

    let tenant = service
        .create_tenant(
            &owner_ctx,
            CreateTenantRequest {
                slug: format!("role-{}", owner_id.inner()),
                name: "Role Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    let permissions = service.list_permissions(&owner_ctx).await.unwrap();
    let permission_ids: Vec<domain::PermissionId> =
        permissions.iter().take(2).map(|p| p.id).collect();

    let role = service
        .create_role(
            &owner_ctx,
            tenant.slug.as_str(),
            tenant_service::CreateRoleRequest {
                name: "Custom Role".to_string(),
                description: "A custom role".to_string(),
                permission_ids,
            },
        )
        .await
        .unwrap();

    assert!(role.is_custom);
    assert!(!role.is_system);

    let roles = service
        .list_roles(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    assert!(roles.iter().any(|r| r.id == role.id && r.is_custom));

    service
        .delete_tenant(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    support::delete_test_user(&pool, owner_id).await;
}

#[tokio::test]
async fn create_custom_role_with_all_permissions_succeeds() {
    let Some(pool) = support::setup_pool().await else {
        return;
    };

    let service = support::build_service(pool.clone()).await;
    let owner_id = support::create_test_user(&pool, "owner-role-bulk").await;
    let owner_ctx = support::test_ctx(owner_id);

    let tenant = service
        .create_tenant(
            &owner_ctx,
            CreateTenantRequest {
                slug: format!("role-bulk-{}", owner_id.inner()),
                name: "Role Bulk Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    let permissions = service.list_permissions(&owner_ctx).await.unwrap();
    let permission_ids: Vec<domain::PermissionId> = permissions.iter().map(|p| p.id).collect();

    assert!(
        permission_ids.len() > 10,
        "test needs enough permissions to exercise bulk insert"
    );

    let role = service
        .create_role(
            &owner_ctx,
            tenant.slug.as_str(),
            tenant_service::CreateRoleRequest {
                name: "Bulk Permissions Role".to_string(),
                description: "A role with all permissions".to_string(),
                permission_ids: permission_ids.clone(),
            },
        )
        .await
        .unwrap();

    let fetched = service
        .get_role(&owner_ctx, tenant.slug.as_str(), role.id)
        .await
        .unwrap();
    assert_eq!(fetched.permission_ids.len(), permission_ids.len());

    assert_eq!(
        fetched
            .permission_ids
            .iter()
            .copied()
            .collect::<std::collections::HashSet<_>>(),
        permission_ids
            .iter()
            .copied()
            .collect::<std::collections::HashSet<_>>()
    );

    service
        .delete_tenant(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    support::delete_test_user(&pool, owner_id).await;
}
