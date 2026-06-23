//! Postgres-backed integration tests for the tenant service.
//!
//! These tests require `DATABASE_URL` to point at a running PostgreSQL instance.

use base::ctx::{ActorType, ExecutionContext, RequestContext};
use base::ports::repository::MembershipRepository;
use domain::{Membership, TenantRole, UserId};
use tenant_service::{CreateTenantRequest, TenantError, TenantService};

fn database_url() -> Option<String> {
    std::env::var("DATABASE_URL").ok()
}

async fn setup_pool() -> Option<sqlx::PgPool> {
    let url = database_url()?;
    let pool = sqlx::PgPool::connect(&url).await.ok()?;
    sqlx::migrate!("../../../migrations")
        .run(&pool)
        .await
        .ok()?;
    Some(pool)
}

fn test_ctx(user_id: UserId) -> ExecutionContext {
    ExecutionContext::new(RequestContext::new()).with_actor(user_id.inner(), ActorType::User)
}

async fn build_service(pool: sqlx::PgPool) -> TenantService {
    TenantService::builder()
        .with_pool(pool)
        .build()
        .await
        .expect("tenant service should build")
}

async fn create_test_user(pool: &sqlx::PgPool, prefix: &str) -> UserId {
    let user_id = UserId::new();
    let email = format!("{}-{}@example.com", prefix, user_id.inner());

    sqlx::query(
        r#"
        INSERT INTO users (
            id, email, name, password_hash,
            status, terms_accepted_at, terms_version
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(user_id.inner())
    .bind(&email)
    .bind(prefix)
    .bind("hash")
    .bind("active")
    .bind(chrono::Utc::now())
    .bind("1.0")
    .execute(pool)
    .await
    .expect("user should insert");

    user_id
}

async fn add_member(
    pool: &sqlx::PgPool,
    tenant_id: domain::TenantId,
    user_id: UserId,
    role: TenantRole,
) {
    let repo = persistence::repositories::membership::PgMembershipRepository::new(pool.clone());
    let ctx = test_ctx(user_id);
    let membership = Membership::new(tenant_id, user_id, role);

    repo.create(&ctx, &membership)
        .await
        .expect("membership should insert");
}

async fn delete_test_user(pool: &sqlx::PgPool, user_id: UserId) {
    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id.inner())
        .execute(pool)
        .await
        .ok();
}

#[tokio::test]
async fn create_tenant_as_authenticated_user() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let service = build_service(pool.clone()).await;
    let owner_id = create_test_user(&pool, "owner-create").await;
    let ctx = test_ctx(owner_id);

    let request = CreateTenantRequest {
        slug: format!("create-{}", owner_id.inner()),
        name: "Created Tenant".to_string(),
    };

    let tenant = service.create_tenant(&ctx, request).await.unwrap();

    assert_eq!(tenant.slug.as_str(), format!("create-{}", owner_id.inner()));
    assert_eq!(tenant.name, "Created Tenant");
    assert_eq!(tenant.owner_id, owner_id);

    service
        .delete_tenant(&ctx, tenant.slug.as_str())
        .await
        .unwrap();
    delete_test_user(&pool, owner_id).await;
}

#[tokio::test]
async fn list_my_tenants() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let service = build_service(pool.clone()).await;
    let owner_id = create_test_user(&pool, "owner-list").await;
    let other_id = create_test_user(&pool, "other-list").await;

    let owner_ctx = test_ctx(owner_id);
    let other_ctx = test_ctx(other_id);

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
    assert!(owner_list.iter().any(|t| t.id == owner_tenant.id));
    assert!(!owner_list.iter().any(|t| t.id == other_tenant.id));

    service
        .delete_tenant(&owner_ctx, owner_tenant.slug.as_str())
        .await
        .unwrap();
    service
        .delete_tenant(&other_ctx, other_tenant.slug.as_str())
        .await
        .unwrap();
    delete_test_user(&pool, owner_id).await;
    delete_test_user(&pool, other_id).await;
}

#[tokio::test]
async fn get_tenant_by_slug() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let service = build_service(pool.clone()).await;
    let owner_id = create_test_user(&pool, "owner-get").await;
    let stranger_id = create_test_user(&pool, "stranger-get").await;

    let owner_ctx = test_ctx(owner_id);
    let stranger_ctx = test_ctx(stranger_id);

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
    delete_test_user(&pool, owner_id).await;
    delete_test_user(&pool, stranger_id).await;
}

#[tokio::test]
async fn update_tenant_requires_admin_or_owner() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let service = build_service(pool.clone()).await;
    let owner_id = create_test_user(&pool, "owner-update").await;
    let admin_id = create_test_user(&pool, "admin-update").await;
    let member_id = create_test_user(&pool, "member-update").await;
    let guest_id = create_test_user(&pool, "guest-update").await;

    let owner_ctx = test_ctx(owner_id);
    let admin_ctx = test_ctx(admin_id);
    let member_ctx = test_ctx(member_id);
    let guest_ctx = test_ctx(guest_id);

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
    delete_test_user(&pool, owner_id).await;
    delete_test_user(&pool, admin_id).await;
    delete_test_user(&pool, member_id).await;
    delete_test_user(&pool, guest_id).await;
}

#[tokio::test]
async fn delete_tenant_requires_owner() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let service = build_service(pool.clone()).await;
    let owner_id = create_test_user(&pool, "owner-delete").await;
    let admin_id = create_test_user(&pool, "admin-delete").await;
    let member_id = create_test_user(&pool, "member-delete").await;

    let owner_ctx = test_ctx(owner_id);
    let admin_ctx = test_ctx(admin_id);
    let member_ctx = test_ctx(member_id);

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

    delete_test_user(&pool, owner_id).await;
    delete_test_user(&pool, admin_id).await;
    delete_test_user(&pool, member_id).await;
}

#[tokio::test]
async fn enforce_two_tenant_ownership_limit() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let service = build_service(pool.clone()).await;
    let owner_id = create_test_user(&pool, "owner-limit").await;
    let ctx = test_ctx(owner_id);

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
    delete_test_user(&pool, owner_id).await;
}
