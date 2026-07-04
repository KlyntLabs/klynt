//! Postgres-backed integration tests for the tenant service.
//!
//! These tests require `DATABASE_URL` to point at a running PostgreSQL instance.

use base::ctx::{ExecutionContext, RequestContext};
use base::ports::repository::MembershipRepository;
use domain::{Membership, TenantRole, UserId};
use tenant_service::{CreateTenantRequest, TenantError};

mod support;

async fn add_member(
    pool: &sqlx::PgPool,
    tenant_id: domain::TenantId,
    user_id: UserId,
    role: TenantRole,
) {
    let repo = persistence::repositories::membership::PgMembershipRepository::new(pool.clone());
    let ctx = support::test_ctx(user_id);
    let membership = Membership::new(tenant_id, user_id, role);

    repo.create(&ctx, &membership)
        .await
        .expect("membership should insert");
}

async fn assert_membership_role_id(
    pool: &sqlx::PgPool,
    tenant_id: domain::TenantId,
    user_id: UserId,
    expected_role_name: &str,
) {
    let role_id: Option<uuid::Uuid> = sqlx::query_scalar!(
        r#"
        SELECT tenant_role_id
        FROM user_tenant_memberships
        WHERE tenant_id = $1 AND user_id = $2
        "#,
        tenant_id.inner(),
        user_id.inner(),
    )
    .fetch_one(pool)
    .await
    .ok()
    .flatten();

    assert!(role_id.is_some(), "membership should have a tenant_role_id");

    let role_name: String = sqlx::query_scalar!(
        r#"
        SELECT name FROM tenant_roles WHERE id = $1
        "#,
        role_id.unwrap(),
    )
    .fetch_one(pool)
    .await
    .expect("role should exist");

    assert_eq!(role_name, expected_role_name);
}

#[tokio::test]
async fn create_tenant_as_authenticated_user() {
    let Some(pool) = support::setup_pool().await else {
        return;
    };

    let service = support::build_service(pool.clone()).await;
    let owner_id = support::create_test_user(&pool, "owner-create").await;
    let ctx = support::test_ctx(owner_id);

    let request = CreateTenantRequest {
        slug: format!("create-{}", owner_id.inner()),
        name: "Created Tenant".to_string(),
    };

    let tenant = service.create_tenant(&ctx, request).await.unwrap();

    assert_eq!(tenant.slug.as_str(), format!("create-{}", owner_id.inner()));
    assert_eq!(tenant.name, "Created Tenant");
    assert_eq!(tenant.role, TenantRole::Owner);

    service
        .delete_tenant(&ctx, tenant.slug.as_str())
        .await
        .unwrap();
    support::delete_test_user(&pool, owner_id).await;
}

#[tokio::test]
async fn list_my_tenants() {
    let Some(pool) = support::setup_pool().await else {
        return;
    };

    let service = support::build_service(pool.clone()).await;
    let owner_id = support::create_test_user(&pool, "owner-list").await;
    let other_id = support::create_test_user(&pool, "other-list").await;

    let owner_ctx = support::test_ctx(owner_id);
    let other_ctx = support::test_ctx(other_id);

    let owner_tenant = service
        .create_tenant(
            &owner_ctx,
            CreateTenantRequest {
                slug: format!("list-owner-{}", owner_id.inner()),
                name: "Owner Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    let other_tenant = service
        .create_tenant(
            &other_ctx,
            CreateTenantRequest {
                slug: format!("list-other-{}", other_id.inner()),
                name: "Other Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    let owner_list = service.list_my_tenants(&owner_ctx).await.unwrap();
    assert!(owner_list
        .iter()
        .any(|t| t.id == owner_tenant.id && t.role == TenantRole::Owner));
    assert!(!owner_list.iter().any(|t| t.id == other_tenant.id));

    service
        .delete_tenant(&owner_ctx, owner_tenant.slug.as_str())
        .await
        .unwrap();
    service
        .delete_tenant(&other_ctx, other_tenant.slug.as_str())
        .await
        .unwrap();
    support::delete_test_user(&pool, owner_id).await;
    support::delete_test_user(&pool, other_id).await;
}

#[tokio::test]
async fn get_tenant_by_slug() {
    let Some(pool) = support::setup_pool().await else {
        return;
    };

    let service = support::build_service(pool.clone()).await;
    let owner_id = support::create_test_user(&pool, "owner-get").await;
    let stranger_id = support::create_test_user(&pool, "stranger-get").await;

    let owner_ctx = support::test_ctx(owner_id);
    let stranger_ctx = support::test_ctx(stranger_id);

    let tenant = service
        .create_tenant(
            &owner_ctx,
            CreateTenantRequest {
                slug: format!("get-{}", owner_id.inner()),
                name: "Get Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    let found = service
        .get_tenant(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    assert_eq!(found.id, tenant.id);
    assert_eq!(found.slug, tenant.slug);
    assert_eq!(found.name, tenant.name);
    assert_eq!(found.role, domain::membership::TenantRole::Owner);

    let result = service
        .get_tenant(&stranger_ctx, tenant.slug.as_str())
        .await;
    assert!(matches!(result, Err(TenantError::NotMember)));

    let unauthenticated_ctx = ExecutionContext::new(RequestContext::new());
    let result = service.get_tenant(&unauthenticated_ctx, "missing").await;
    assert!(matches!(result, Err(TenantError::AuthenticationRequired)));

    service
        .delete_tenant(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    support::delete_test_user(&pool, owner_id).await;
    support::delete_test_user(&pool, stranger_id).await;
}

#[tokio::test]
async fn update_tenant_requires_admin_or_owner() {
    let Some(pool) = support::setup_pool().await else {
        return;
    };

    let service = support::build_service(pool.clone()).await;
    let owner_id = support::create_test_user(&pool, "owner-update").await;
    let admin_id = support::create_test_user(&pool, "admin-update").await;
    let member_id = support::create_test_user(&pool, "member-update").await;
    let guest_id = support::create_test_user(&pool, "guest-update").await;

    let owner_ctx = support::test_ctx(owner_id);
    let admin_ctx = support::test_ctx(admin_id);
    let member_ctx = support::test_ctx(member_id);
    let guest_ctx = support::test_ctx(guest_id);

    let tenant = service
        .create_tenant(
            &owner_ctx,
            CreateTenantRequest {
                slug: format!("update-{}", owner_id.inner()),
                name: "Update Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    add_member(&pool, tenant.id, admin_id, TenantRole::Admin).await;
    add_member(&pool, tenant.id, member_id, TenantRole::Member).await;
    add_member(&pool, tenant.id, guest_id, TenantRole::Guest).await;

    let updated = service
        .update_tenant(
            &owner_ctx,
            tenant.slug.as_str(),
            "Owner Updated".to_string(),
        )
        .await
        .unwrap();
    assert_eq!(updated.name, "Owner Updated");

    let updated = service
        .update_tenant(
            &admin_ctx,
            tenant.slug.as_str(),
            "Admin Updated".to_string(),
        )
        .await
        .unwrap();
    assert_eq!(updated.name, "Admin Updated");

    let result = service
        .update_tenant(
            &member_ctx,
            tenant.slug.as_str(),
            "Member Updated".to_string(),
        )
        .await;
    assert!(matches!(result, Err(TenantError::NotAdmin)));

    let result = service
        .update_tenant(
            &guest_ctx,
            tenant.slug.as_str(),
            "Guest Updated".to_string(),
        )
        .await;
    assert!(matches!(result, Err(TenantError::NotAdmin)));

    service
        .delete_tenant(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    support::delete_test_user(&pool, owner_id).await;
    support::delete_test_user(&pool, admin_id).await;
    support::delete_test_user(&pool, member_id).await;
    support::delete_test_user(&pool, guest_id).await;
}

#[tokio::test]
async fn delete_tenant_requires_owner() {
    let Some(pool) = support::setup_pool().await else {
        return;
    };

    let service = support::build_service(pool.clone()).await;
    let owner_id = support::create_test_user(&pool, "owner-delete").await;
    let admin_id = support::create_test_user(&pool, "admin-delete").await;
    let member_id = support::create_test_user(&pool, "member-delete").await;

    let owner_ctx = support::test_ctx(owner_id);
    let admin_ctx = support::test_ctx(admin_id);
    let member_ctx = support::test_ctx(member_id);

    let tenant = service
        .create_tenant(
            &owner_ctx,
            CreateTenantRequest {
                slug: format!("delete-{}", owner_id.inner()),
                name: "Delete Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    add_member(&pool, tenant.id, admin_id, TenantRole::Admin).await;
    add_member(&pool, tenant.id, member_id, TenantRole::Member).await;

    let result = service
        .delete_tenant(&admin_ctx, tenant.slug.as_str())
        .await;
    assert!(matches!(result, Err(TenantError::NotOwner)));

    let result = service
        .delete_tenant(&member_ctx, tenant.slug.as_str())
        .await;
    assert!(matches!(result, Err(TenantError::NotOwner)));

    service
        .delete_tenant(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();

    let result = service.get_tenant(&owner_ctx, tenant.slug.as_str()).await;
    assert!(matches!(result, Err(TenantError::NotFound)));

    support::delete_test_user(&pool, owner_id).await;
    support::delete_test_user(&pool, admin_id).await;
    support::delete_test_user(&pool, member_id).await;
}

#[tokio::test]
async fn enforce_two_tenant_ownership_limit() {
    let Some(pool) = support::setup_pool().await else {
        return;
    };

    let service = support::build_service(pool.clone()).await;
    let owner_id = support::create_test_user(&pool, "owner-limit").await;
    let ctx = support::test_ctx(owner_id);

    for i in 0..2 {
        let request = CreateTenantRequest {
            slug: format!("limit-{}-{}", i, owner_id.inner()),
            name: format!("Limit Tenant {i}"),
        };
        service.create_tenant(&ctx, request).await.unwrap();
    }

    let request = CreateTenantRequest {
        slug: format!("limit-exceed-{}", owner_id.inner()),
        name: "Exceed Tenant".to_string(),
    };
    let result = service.create_tenant(&ctx, request).await;
    assert!(
        matches!(
            result,
            Err(TenantError::Domain(domain::DomainError::TenantLimitReached))
        ),
        "expected TenantLimitReached, got {result:?}"
    );

    let tenants = service.list_my_tenants(&ctx).await.unwrap();
    assert_eq!(tenants.len(), 2);

    for tenant in tenants {
        service
            .delete_tenant(&ctx, tenant.slug.as_str())
            .await
            .unwrap();
    }
    support::delete_test_user(&pool, owner_id).await;
}

#[tokio::test]
async fn list_members_requires_membership() {
    let Some(pool) = support::setup_pool().await else {
        return;
    };

    let service = support::build_service(pool.clone()).await;
    let owner_id = support::create_test_user(&pool, "owner-members").await;
    let stranger_id = support::create_test_user(&pool, "stranger-members").await;

    let owner_ctx = support::test_ctx(owner_id);
    let stranger_ctx = support::test_ctx(stranger_id);

    let tenant = service
        .create_tenant(
            &owner_ctx,
            CreateTenantRequest {
                slug: format!("members-{}", owner_id.inner()),
                name: "Members Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    let members = service
        .list_members(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    assert_eq!(members.len(), 1);
    assert_eq!(members[0].user_id, owner_id);

    let result = service
        .list_members(&stranger_ctx, tenant.slug.as_str())
        .await;
    assert!(matches!(result, Err(TenantError::NotMember)));

    service
        .delete_tenant(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    support::delete_test_user(&pool, owner_id).await;
    support::delete_test_user(&pool, stranger_id).await;
}

#[tokio::test]
async fn add_update_remove_member_flow() {
    let Some(pool) = support::setup_pool().await else {
        return;
    };

    let service = support::build_service(pool.clone()).await;
    let owner_id = support::create_test_user(&pool, "owner-mgmt").await;
    let member_user_id = support::create_test_user(&pool, "member-mgmt").await;
    let guest_user_id = support::create_test_user(&pool, "guest-mgmt").await;

    let owner_ctx = support::test_ctx(owner_id);

    let tenant = service
        .create_tenant(
            &owner_ctx,
            CreateTenantRequest {
                slug: format!("mgmt-{}", owner_id.inner()),
                name: "Management Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    let member_email = format!("member-mgmt-{}@example.com", member_user_id.inner());

    let membership = service
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

    assert_eq!(membership.user_id, member_user_id);
    assert_eq!(membership.role, TenantRole::Member);
    assert_membership_role_id(&pool, tenant.id, member_user_id, "member").await;

    let members = service
        .list_members(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    assert_eq!(members.len(), 2);

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

    assert_membership_role_id(&pool, tenant.id, member_user_id, "admin").await;

    let members = service
        .list_members(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    let member = members
        .iter()
        .find(|m| m.user_id == member_user_id)
        .expect("member should exist");
    assert_eq!(member.role, TenantRole::Admin);

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

    let members = service
        .list_members(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    assert_eq!(members.len(), 1);

    let guest_email = format!("guest-mgmt-{}@example.com", guest_user_id.inner());
    let result = service
        .add_member(
            &support::test_ctx(member_user_id),
            tenant.slug.as_str(),
            tenant_service::AddMemberRequest {
                email: guest_email.clone(),
                role: TenantRole::Guest,
            },
        )
        .await;
    assert!(matches!(result, Err(TenantError::NotMember)));

    service
        .delete_tenant(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    support::delete_test_user(&pool, owner_id).await;
    support::delete_test_user(&pool, member_user_id).await;
    support::delete_test_user(&pool, guest_user_id).await;
}

#[tokio::test]
async fn cannot_modify_owner_membership() {
    let Some(pool) = support::setup_pool().await else {
        return;
    };

    let service = support::build_service(pool.clone()).await;
    let owner_id = support::create_test_user(&pool, "owner-protected").await;
    let admin_id = support::create_test_user(&pool, "admin-protected").await;

    let owner_ctx = support::test_ctx(owner_id);
    let admin_ctx = support::test_ctx(admin_id);

    let tenant = service
        .create_tenant(
            &owner_ctx,
            CreateTenantRequest {
                slug: format!("protected-{}", owner_id.inner()),
                name: "Protected Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    add_member(&pool, tenant.id, admin_id, TenantRole::Admin).await;

    let owner_email = format!("owner-protected-{}@example.com", owner_id.inner());

    let result = service
        .update_member_role(
            &admin_ctx,
            tenant.slug.as_str(),
            tenant_service::UpdateMemberRoleRequest {
                email: owner_email.clone(),
                role: TenantRole::Member,
            },
        )
        .await;
    assert!(matches!(result, Err(TenantError::Internal(_))));

    let result = service
        .remove_member(
            &admin_ctx,
            tenant.slug.as_str(),
            tenant_service::RemoveMemberRequest { email: owner_email },
        )
        .await;
    assert!(matches!(result, Err(TenantError::Internal(_))));

    service
        .delete_tenant(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    support::delete_test_user(&pool, owner_id).await;
    support::delete_test_user(&pool, admin_id).await;
}
