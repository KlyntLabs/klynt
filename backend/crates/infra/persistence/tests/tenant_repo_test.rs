//! Postgres-backed integration tests for the canonical TenantRepository.
//!
//! These tests require `DATABASE_URL` to point at a running PostgreSQL instance.
//! If `DATABASE_URL` is unset, the tests are skipped.

use base::ctx::{ExecutionContext, RequestContext};
use base::ports::repository::{
    MembershipRepository, TenantOpResult, TenantRepository, UserRepository,
};
use domain::operations::TenantOp;
use domain::{DomainError, Email, Membership, Tenant, TenantRole, TenantSlug, UserRole};
use persistence::repositories::membership::PgMembershipRepository;
use persistence::repositories::tenant::PgTenantRepository;
use persistence::repositories::user::PgUserRepository;

fn database_url() -> Option<String> {
    std::env::var("DATABASE_URL").ok()
}

async fn setup_pool() -> Option<sqlx::PgPool> {
    let url = database_url()?;
    let pool = sqlx::PgPool::connect(&url)
        .await
        .expect("DATABASE_URL is set but Postgres is unreachable");
    sqlx::migrate!("../../../migrations")
        .run(&pool)
        .await
        .expect("migrations failed");
    Some(pool)
}

async fn cleanup_test_data(
    pool: &sqlx::PgPool,
    user_ids: &[domain::UserId],
    tenant_ids: &[domain::TenantId],
) {
    for tenant_id in tenant_ids {
        sqlx::query("DELETE FROM user_tenant_memberships WHERE tenant_id = $1")
            .bind(tenant_id.inner())
            .execute(pool)
            .await
            .ok();
        sqlx::query("DELETE FROM tenants WHERE id = $1")
            .bind(tenant_id.inner())
            .execute(pool)
            .await
            .ok();
    }
    for user_id in user_ids {
        sqlx::query("DELETE FROM users WHERE id = $1")
            .bind(user_id.inner())
            .execute(pool)
            .await
            .ok();
    }
}

fn test_ctx() -> ExecutionContext {
    ExecutionContext::new(RequestContext::new())
}

fn unique_email() -> Email {
    Email::new(format!(
        "tenant-repo-test-{}@example.com",
        domain::UserId::new().inner()
    ))
}

fn unique_slug() -> TenantSlug {
    TenantSlug::parse(&format!("tenant-{}-slug", domain::UserId::new().inner())).unwrap()
}

async fn create_test_user(pool: &sqlx::PgPool, name: &str) -> domain::UserId {
    let user_repo = PgUserRepository::new(pool.clone());
    let ctx = test_ctx();
    let email = unique_email();
    let username = domain::UserId::new().inner().to_string();
    user_repo
        .create_pending_user(
            &ctx,
            name.to_string(),
            username,
            email,
            "hash".to_string(),
            UserRole::Student,
            None,
        )
        .await
        .unwrap()
}

async fn create_test_tenant(
    tenant_repo: &PgTenantRepository,
    owner_id: domain::UserId,
    name: &str,
) -> Tenant {
    let slug = unique_slug();
    let tenant = Tenant::create(slug, name.to_string(), owner_id).unwrap();
    tenant_repo.create(&test_ctx(), &tenant).await.unwrap()
}

#[tokio::test]
async fn create_makes_creator_an_owner_member() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let tenant_repo = PgTenantRepository::new(pool.clone());
    let membership_repo = PgMembershipRepository::new(pool.clone());
    let ctx = test_ctx();
    let owner_id = create_test_user(&pool, "Owner").await;

    let tenant = create_test_tenant(&tenant_repo, owner_id, "Acme").await;

    let membership = membership_repo
        .find(&ctx, tenant.id, owner_id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(membership.tenant_id, tenant.id);
    assert_eq!(membership.user_id, owner_id);
    assert_eq!(membership.role, TenantRole::Owner);

    let role_id: Option<uuid::Uuid> = sqlx::query_scalar(
        "SELECT tenant_role_id FROM user_tenant_memberships WHERE tenant_id = $1 AND user_id = $2",
    )
    .bind(tenant.id.inner())
    .bind(owner_id.inner())
    .fetch_one(&pool)
    .await
    .ok();
    assert!(role_id.is_some());

    cleanup_test_data(&pool, &[owner_id], &[tenant.id]).await;
}

#[tokio::test]
async fn user_can_own_at_most_two_active_tenants() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let tenant_repo = PgTenantRepository::new(pool.clone());
    let owner_id = create_test_user(&pool, "Limited Owner").await;

    let first = create_test_tenant(&tenant_repo, owner_id, "First").await;
    let second = create_test_tenant(&tenant_repo, owner_id, "Second").await;

    let third_slug = unique_slug();
    let third = Tenant::create(third_slug, "Third".to_string(), owner_id).unwrap();
    let result = tenant_repo.create(&test_ctx(), &third).await;

    assert!(matches!(result, Err(DomainError::TenantLimitReached)));

    cleanup_test_data(&pool, &[owner_id], &[first.id, second.id]).await;
}

#[tokio::test]
async fn find_by_id_and_slug_return_tenant() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let tenant_repo = PgTenantRepository::new(pool.clone());
    let ctx = test_ctx();
    let owner_id = create_test_user(&pool, "Finder").await;
    let tenant = create_test_tenant(&tenant_repo, owner_id, "Findable").await;

    let by_id = tenant_repo
        .find_by_id(&ctx, tenant.id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(by_id.id, tenant.id);
    assert_eq!(by_id.slug, tenant.slug);
    assert_eq!(by_id.max_members, tenant.max_members);
    assert_eq!(by_id.max_owners, tenant.max_owners);
    assert_eq!(by_id.settings, tenant.settings);

    let by_slug = tenant_repo
        .find_by_slug(&ctx, &tenant.slug)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(by_slug.id, tenant.id);
    assert_eq!(by_slug.name, tenant.name);
    assert_eq!(by_slug.max_members, 100);
    assert_eq!(by_slug.max_owners, 1);
    assert!(by_slug.settings.is_object());

    cleanup_test_data(&pool, &[owner_id], &[tenant.id]).await;
}

#[tokio::test]
async fn find_by_slug_with_missing_slug_returns_none() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let tenant_repo = PgTenantRepository::new(pool);
    let ctx = test_ctx();
    let slug = TenantSlug::parse("missing-tenant-slug").unwrap();

    let found = tenant_repo.find_by_slug(&ctx, &slug).await.unwrap();
    assert!(found.is_none());
}

#[tokio::test]
async fn create_persists_tenant_settings() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let tenant_repo = PgTenantRepository::new(pool.clone());
    let ctx = test_ctx();
    let owner_id = create_test_user(&pool, "SettingsOwner").await;
    let tenant = create_test_tenant(&tenant_repo, owner_id, "Settings Tenant").await;

    assert_eq!(tenant.max_members, 100);
    assert_eq!(tenant.max_owners, 1);
    assert!(tenant.settings.is_object());

    let from_db = tenant_repo
        .find_by_id(&ctx, tenant.id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(from_db.max_members, tenant.max_members);
    assert_eq!(from_db.max_owners, tenant.max_owners);
    assert_eq!(from_db.settings, tenant.settings);

    cleanup_test_data(&pool, &[owner_id], &[tenant.id]).await;
}

#[tokio::test]
async fn list_for_user_returns_tenants_where_user_is_member() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let tenant_repo = PgTenantRepository::new(pool.clone());
    let membership_repo = PgMembershipRepository::new(pool.clone());
    let ctx = test_ctx();
    let owner_id = create_test_user(&pool, "MemberLister").await;
    let other_id = create_test_user(&pool, "NonMember").await;

    let tenant = create_test_tenant(&tenant_repo, owner_id, "Listed").await;

    let owner_tenants = tenant_repo.list_for_user(&ctx, owner_id).await.unwrap();
    assert_eq!(owner_tenants.len(), 1);
    assert_eq!(owner_tenants[0].id, tenant.id);

    let other_tenants = tenant_repo.list_for_user(&ctx, other_id).await.unwrap();
    assert!(other_tenants.is_empty());

    // Adding the other user as a member should surface the tenant for them too.
    membership_repo
        .create(
            &ctx,
            &Membership::new(tenant.id, other_id, TenantRole::Member),
        )
        .await
        .unwrap();
    let other_tenants = tenant_repo.list_for_user(&ctx, other_id).await.unwrap();
    assert_eq!(other_tenants.len(), 1);
    assert_eq!(other_tenants[0].id, tenant.id);

    cleanup_test_data(&pool, &[owner_id, other_id], &[tenant.id]).await;
}

#[tokio::test]
async fn update_renames_a_tenant() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let tenant_repo = PgTenantRepository::new(pool.clone());
    let ctx = test_ctx();
    let owner_id = create_test_user(&pool, "Renamer").await;
    let mut tenant = create_test_tenant(&tenant_repo, owner_id, "Old Name").await;

    tenant.rename("New Name".to_string()).unwrap();
    let updated = tenant_repo.update(&ctx, &tenant).await.unwrap();
    assert_eq!(updated.name, "New Name");

    let found = tenant_repo
        .find_by_id(&ctx, tenant.id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(found.name, "New Name");

    cleanup_test_data(&pool, &[owner_id], &[tenant.id]).await;
}

#[tokio::test]
async fn delete_removes_tenant_and_cascading_memberships() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let tenant_repo = PgTenantRepository::new(pool.clone());
    let membership_repo = PgMembershipRepository::new(pool.clone());
    let ctx = test_ctx();
    let owner_id = create_test_user(&pool, "Deleter").await;
    let member_id = create_test_user(&pool, "CascadeMember").await;

    let tenant = create_test_tenant(&tenant_repo, owner_id, "To Delete").await;
    membership_repo
        .create(
            &ctx,
            &Membership::new(tenant.id, member_id, TenantRole::Member),
        )
        .await
        .unwrap();

    tenant_repo.delete(&ctx, tenant.id).await.unwrap();

    let found = tenant_repo.find_by_id(&ctx, tenant.id).await.unwrap();
    assert!(found.is_none());

    let owner_membership = membership_repo
        .find(&ctx, tenant.id, owner_id)
        .await
        .unwrap();
    assert!(owner_membership.is_none());
    let member_membership = membership_repo
        .find(&ctx, tenant.id, member_id)
        .await
        .unwrap();
    assert!(member_membership.is_none());

    cleanup_test_data(&pool, &[owner_id, member_id], &[tenant.id]).await;
}

#[tokio::test]
async fn count_owned_by_user_returns_correct_counts() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let tenant_repo = PgTenantRepository::new(pool.clone());
    let ctx = test_ctx();
    let owner_id = create_test_user(&pool, "Counter").await;
    let other_id = create_test_user(&pool, "OtherCounter").await;

    assert_eq!(
        tenant_repo
            .count_owned_by_user(&ctx, owner_id)
            .await
            .unwrap(),
        0
    );

    let first = create_test_tenant(&tenant_repo, owner_id, "First Counted").await;
    assert_eq!(
        tenant_repo
            .count_owned_by_user(&ctx, owner_id)
            .await
            .unwrap(),
        1
    );

    // Other users are unaffected.
    assert_eq!(
        tenant_repo
            .count_owned_by_user(&ctx, other_id)
            .await
            .unwrap(),
        0
    );

    // Deleting a tenant removes it from the count.
    let second = create_test_tenant(&tenant_repo, owner_id, "Second Counted").await;
    assert_eq!(
        tenant_repo
            .count_owned_by_user(&ctx, owner_id)
            .await
            .unwrap(),
        2
    );

    tenant_repo.delete(&ctx, second.id).await.unwrap();
    assert_eq!(
        tenant_repo
            .count_owned_by_user(&ctx, owner_id)
            .await
            .unwrap(),
        1
    );

    cleanup_test_data(&pool, &[owner_id, other_id], &[first.id]).await;
}

#[tokio::test]
async fn delete_returns_not_found_for_missing_tenant() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let tenant_repo = PgTenantRepository::new(pool);
    let ctx = test_ctx();
    let missing_id = domain::TenantId::new();

    let result = tenant_repo.delete(&ctx, missing_id).await;
    assert!(matches!(result, Err(DomainError::NotFound(_))));
}

#[tokio::test]
async fn duplicate_slug_returns_conflict() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let tenant_repo = PgTenantRepository::new(pool.clone());
    let owner_id = create_test_user(&pool, "ConflictOwner").await;
    let other_id = create_test_user(&pool, "ConflictOther").await;

    let tenant = create_test_tenant(&tenant_repo, owner_id, "Original").await;

    // Creating another tenant with the same slug but a different owner fails.
    let duplicate = Tenant::create(tenant.slug.clone(), "Duplicate".to_string(), other_id).unwrap();
    let result = tenant_repo.create(&test_ctx(), &duplicate).await;

    assert!(matches!(result, Err(DomainError::Conflict(_))));

    cleanup_test_data(&pool, &[owner_id, other_id], &[tenant.id]).await;
}

#[tokio::test]
async fn repository_execute_delegates_find_by_id() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let tenant_repo = PgTenantRepository::new(pool.clone());
    let ctx = test_ctx();
    let owner_id = create_test_user(&pool, "ExecuteFinder").await;
    let tenant = create_test_tenant(&tenant_repo, owner_id, "Execute Findable").await;

    let result = tenant_repo
        .execute(&ctx, TenantOp::FindById { id: tenant.id })
        .await
        .unwrap();

    match result {
        TenantOpResult::TenantOption(Some(found)) => {
            assert_eq!(found.id, tenant.id);
            assert_eq!(found.slug, tenant.slug);
        }
        _ => panic!("Expected Some tenant"),
    }

    cleanup_test_data(&pool, &[owner_id], &[tenant.id]).await;
}
