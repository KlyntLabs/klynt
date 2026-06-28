//! Postgres-backed integration tests for creating tenant invites.

use tenant_service::{CreateTenantInviteRequest, CreateTenantRequest};

mod support;

#[tokio::test]
async fn owner_can_create_invite() {
    let Some(pool) = support::setup_pool().await else {
        return;
    };

    let service = support::build_service(pool.clone()).await;
    let (owner_id, _) = support::create_test_user_with_email(&pool, "invite-owner").await;
    let (invited_id, invited_email) = support::create_test_user_with_email(&pool, "invited").await;
    let owner_ctx = support::test_ctx(owner_id);

    let tenant = service
        .create_tenant(
            &owner_ctx,
            CreateTenantRequest {
                slug: format!("invite-{}", owner_id.inner()),
                name: "Invite Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    let invite = service
        .create_invite(
            &owner_ctx,
            tenant.slug.as_str(),
            CreateTenantInviteRequest {
                email: invited_email.clone(),
                role: domain::membership::TenantRole::Admin,
            },
        )
        .await
        .unwrap();

    assert_eq!(invite.email.as_str(), invited_email);
    assert_eq!(invite.role_name, "admin");
    assert!(!invite.token.is_empty());
    assert!(invite.expires_at > invite.created_at);

    sqlx::query("DELETE FROM tenant_invites WHERE tenant_id = $1")
        .bind(tenant.id.inner())
        .execute(&pool)
        .await
        .ok();
    service
        .delete_tenant(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    support::delete_test_user(&pool, owner_id).await;
    support::delete_test_user(&pool, invited_id).await;
}

#[tokio::test]
async fn member_without_manage_members_cannot_create_invite() {
    let Some(pool) = support::setup_pool().await else {
        return;
    };

    let service = support::build_service(pool.clone()).await;
    let (owner_id, _) =
        support::create_test_user_with_email(&pool, "invite-owner-restricted").await;
    let (member_id, member_email) =
        support::create_test_user_with_email(&pool, "invite-member-restricted").await;
    let owner_ctx = support::test_ctx(owner_id);
    let member_ctx = support::test_ctx(member_id);

    let tenant = service
        .create_tenant(
            &owner_ctx,
            CreateTenantRequest {
                slug: format!("invite-restricted-{}", owner_id.inner()),
                name: "Restricted Invite Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    service
        .add_member(
            &owner_ctx,
            tenant.slug.as_str(),
            tenant_service::AddMemberRequest {
                email: member_email.clone(),
                role: domain::membership::TenantRole::Member,
            },
        )
        .await
        .unwrap();

    let result = service
        .create_invite(
            &member_ctx,
            tenant.slug.as_str(),
            CreateTenantInviteRequest {
                email: "someone@example.com".to_string(),
                role: domain::membership::TenantRole::Member,
            },
        )
        .await;

    assert!(matches!(result, Err(tenant_service::TenantError::NotAdmin)));

    service
        .delete_tenant(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    support::delete_test_user(&pool, owner_id).await;
    support::delete_test_user(&pool, member_id).await;
}
