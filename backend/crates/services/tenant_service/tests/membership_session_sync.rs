//! End-to-end session-state verification for tenant membership mutations.
//!
//! These tests require `DATABASE_URL` to point at a running PostgreSQL instance.

use domain::TenantRole;
use session_coordinator::SessionCoordinatorConfig;
use tenant_service::CreateTenantRequest;

mod support;

#[tokio::test]
async fn add_update_remove_member_reflected_in_session_memberships() {
    let Some(pool) = support::setup_pool().await else {
        return;
    };

    let session_store = support::build_session_store(pool.clone());
    let service = support::build_service_with_session_store(pool.clone(), session_store.clone());

    let owner_id = support::create_test_user(&pool, "owner-sync").await;
    let member_user_id = support::create_test_user(&pool, "member-sync").await;

    let owner_ctx = support::test_ctx(owner_id);
    let member_ctx = support::test_ctx(member_user_id);

    let member_session_token =
        support::create_session(&session_store, &member_ctx, member_user_id).await;

    let tenant = service
        .create_tenant(
            &owner_ctx,
            CreateTenantRequest {
                slug: format!("sync-{}", owner_id.inner()),
                name: "Sync Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    let member_email = format!("member-sync-{}@example.com", member_user_id.inner());

    service
        .add_member(
            &owner_ctx,
            tenant.slug.as_str(),
            tenant_service::AddMemberRequest {
                email: member_email.clone(),
                role: TenantRole::Member,
            },
        )
        .await
        .unwrap();

    support::assert_session_membership(
        &session_store,
        &member_ctx,
        &member_session_token,
        tenant.id,
        TenantRole::Member,
    )
    .await;

    service
        .update_member_role(
            &owner_ctx,
            tenant.slug.as_str(),
            tenant_service::UpdateMemberRoleRequest {
                email: member_email.clone(),
                role: TenantRole::Admin,
            },
        )
        .await
        .unwrap();

    support::assert_session_membership(
        &session_store,
        &member_ctx,
        &member_session_token,
        tenant.id,
        TenantRole::Admin,
    )
    .await;

    service
        .remove_member(
            &owner_ctx,
            tenant.slug.as_str(),
            tenant_service::RemoveMemberRequest {
                email: member_email,
            },
        )
        .await
        .unwrap();

    support::assert_session_has_no_memberships(&session_store, &member_ctx, &member_session_token)
        .await;

    service
        .delete_tenant(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    support::delete_test_user(&pool, owner_id).await;
    support::delete_test_user(&pool, member_user_id).await;
}

#[tokio::test]
async fn disabled_session_sync_leaves_session_memberships_empty() {
    let Some(pool) = support::setup_pool().await else {
        return;
    };

    let session_store = support::build_session_store(pool.clone());
    let service = support::build_service_with_session_store_and_config(
        pool.clone(),
        session_store.clone(),
        SessionCoordinatorConfig { enabled: false },
    );

    let owner_id = support::create_test_user(&pool, "owner-disabled-sync").await;
    let member_user_id = support::create_test_user(&pool, "member-disabled-sync").await;

    let owner_ctx = support::test_ctx(owner_id);
    let member_ctx = support::test_ctx(member_user_id);

    let member_session_token =
        support::create_session(&session_store, &member_ctx, member_user_id).await;

    let tenant = service
        .create_tenant(
            &owner_ctx,
            CreateTenantRequest {
                slug: format!("disabled-sync-{}", owner_id.inner()),
                name: "Disabled Sync Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    let member_email = format!(
        "member-disabled-sync-{}@example.com",
        member_user_id.inner()
    );

    service
        .add_member(
            &owner_ctx,
            tenant.slug.as_str(),
            tenant_service::AddMemberRequest {
                email: member_email,
                role: TenantRole::Member,
            },
        )
        .await
        .unwrap();

    support::assert_session_has_no_memberships(&session_store, &member_ctx, &member_session_token)
        .await;

    service
        .delete_tenant(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    support::delete_test_user(&pool, owner_id).await;
    support::delete_test_user(&pool, member_user_id).await;
}
