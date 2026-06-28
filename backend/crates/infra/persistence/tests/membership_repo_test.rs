//! Postgres-backed integration tests for the canonical MembershipRepository.
//!
//! These tests require `DATABASE_URL` to point at a running PostgreSQL instance.
//! If `DATABASE_URL` is unset, the tests are skipped.

use base::ctx::{ExecutionContext, RequestContext};
use base::ports::repository::{
    MembershipOpResult, MembershipRepository, TenantRepository, UserRepository,
};
use domain::operations::MembershipOp;
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
        sqlx::query!(
            r#"DELETE FROM user_tenant_memberships WHERE tenant_id = $1"#,
            tenant_id.inner()
        )
        .execute(pool)
        .await
        .ok();
        sqlx::query!(r#"DELETE FROM tenants WHERE id = $1"#, tenant_id.inner())
            .execute(pool)
            .await
            .ok();
    }
    for user_id in user_ids {
        sqlx::query!(r#"DELETE FROM users WHERE id = $1"#, user_id.inner())
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
        "membership-repo-test-{}@example.com",
        domain::UserId::new().inner()
    ))
}

fn unique_slug() -> TenantSlug {
    TenantSlug::parse(&format!("member-{}-slug", domain::UserId::new().inner())).unwrap()
}

async fn create_test_user(pool: &sqlx::PgPool, name: &str) -> domain::UserId {
    let user_repo = PgUserRepository::new(pool.clone());
    let email = unique_email();
    let username = domain::UserId::new().inner().to_string();
    user_repo
        .create_pending_user(
            &test_ctx(),
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

async fn create_test_tenant(pool: &sqlx::PgPool, owner_id: domain::UserId) -> Tenant {
    let tenant_repo = PgTenantRepository::new(pool.clone());
    let slug = unique_slug();
    let tenant = Tenant::create(slug, "Test Tenant".to_string(), owner_id).unwrap();
    tenant_repo.create(&test_ctx(), &tenant).await.unwrap()
}

#[tokio::test]
async fn create_find_and_list_membership() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let membership_repo = PgMembershipRepository::new(pool.clone());
    let ctx = test_ctx();
    let owner_id = create_test_user(&pool, "MembershipOwner").await;
    let tenant = create_test_tenant(&pool, owner_id).await;
    let member_id = create_test_user(&pool, "Member").await;

    let membership = Membership::new(tenant.id, member_id, TenantRole::Member);
    membership_repo.create(&ctx, &membership).await.unwrap();

    let found = membership_repo
        .find(&ctx, tenant.id, member_id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(found.tenant_id, tenant.id);
    assert_eq!(found.user_id, member_id);
    assert_eq!(found.role, TenantRole::Member);

    let for_user = membership_repo
        .list_for_user(&ctx, member_id)
        .await
        .unwrap();
    assert_eq!(for_user.len(), 1);
    assert_eq!(for_user[0].tenant_id, tenant.id);

    let for_tenant = membership_repo
        .list_for_tenant(&ctx, tenant.id)
        .await
        .unwrap();
    assert_eq!(for_tenant.len(), 2); // owner + member

    cleanup_test_data(&pool, &[owner_id, member_id], &[tenant.id]).await;
}

#[tokio::test]
async fn update_role_changes_membership_role() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let membership_repo = PgMembershipRepository::new(pool.clone());
    let ctx = test_ctx();
    let owner_id = create_test_user(&pool, "RoleOwner").await;
    let tenant = create_test_tenant(&pool, owner_id).await;
    let member_id = create_test_user(&pool, "RoleMember").await;

    membership_repo
        .create(
            &ctx,
            &Membership::new(tenant.id, member_id, TenantRole::Member),
        )
        .await
        .unwrap();

    membership_repo
        .update_role(&ctx, tenant.id, member_id, TenantRole::Admin)
        .await
        .unwrap();

    let found = membership_repo
        .find(&ctx, tenant.id, member_id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(found.role, TenantRole::Admin);

    cleanup_test_data(&pool, &[owner_id, member_id], &[tenant.id]).await;
}

#[tokio::test]
async fn delete_removes_membership() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let membership_repo = PgMembershipRepository::new(pool.clone());
    let ctx = test_ctx();
    let owner_id = create_test_user(&pool, "DeleteOwner").await;
    let tenant = create_test_tenant(&pool, owner_id).await;
    let member_id = create_test_user(&pool, "DeleteMember").await;

    membership_repo
        .create(
            &ctx,
            &Membership::new(tenant.id, member_id, TenantRole::Member),
        )
        .await
        .unwrap();

    membership_repo
        .delete(&ctx, tenant.id, member_id)
        .await
        .unwrap();

    let found = membership_repo
        .find(&ctx, tenant.id, member_id)
        .await
        .unwrap();
    assert!(found.is_none());

    cleanup_test_data(&pool, &[owner_id, member_id], &[tenant.id]).await;
}

#[tokio::test]
async fn duplicate_create_returns_conflict() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let membership_repo = PgMembershipRepository::new(pool.clone());
    let ctx = test_ctx();
    let owner_id = create_test_user(&pool, "DupOwner").await;
    let tenant = create_test_tenant(&pool, owner_id).await;
    let member_id = create_test_user(&pool, "DupMember").await;

    membership_repo
        .create(
            &ctx,
            &Membership::new(tenant.id, member_id, TenantRole::Member),
        )
        .await
        .unwrap();

    let result = membership_repo
        .create(
            &ctx,
            &Membership::new(tenant.id, member_id, TenantRole::Admin),
        )
        .await;

    assert!(matches!(result, Err(DomainError::Conflict(_))));

    cleanup_test_data(&pool, &[owner_id, member_id], &[tenant.id]).await;
}

#[tokio::test]
async fn create_for_missing_tenant_returns_not_found() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let membership_repo = PgMembershipRepository::new(pool.clone());
    let ctx = test_ctx();
    let user_id = create_test_user(&pool, "OrphanUser").await;
    let missing_tenant_id = domain::TenantId::new();

    let result = membership_repo
        .create(
            &ctx,
            &Membership::new(missing_tenant_id, user_id, TenantRole::Member),
        )
        .await;

    assert!(matches!(result, Err(DomainError::NotFound(_))));

    cleanup_test_data(&pool, &[user_id], &[]).await;
}

#[tokio::test]
async fn create_for_missing_user_returns_not_found() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let membership_repo = PgMembershipRepository::new(pool.clone());
    let ctx = test_ctx();
    let owner_id = create_test_user(&pool, "MissingUserOwner").await;
    let tenant = create_test_tenant(&pool, owner_id).await;
    let missing_user_id = domain::UserId::new();

    let result = membership_repo
        .create(
            &ctx,
            &Membership::new(tenant.id, missing_user_id, TenantRole::Member),
        )
        .await;

    assert!(matches!(result, Err(DomainError::NotFound(_))));

    cleanup_test_data(&pool, &[owner_id], &[tenant.id]).await;
}

#[tokio::test]
async fn update_role_for_missing_membership_returns_not_found() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let membership_repo = PgMembershipRepository::new(pool);
    let ctx = test_ctx();
    let missing_tenant_id = domain::TenantId::new();
    let missing_user_id = domain::UserId::new();

    let result = membership_repo
        .update_role(&ctx, missing_tenant_id, missing_user_id, TenantRole::Member)
        .await;

    assert!(matches!(result, Err(DomainError::NotFound(_))));
}

#[tokio::test]
async fn delete_for_missing_membership_returns_not_found() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let membership_repo = PgMembershipRepository::new(pool);
    let ctx = test_ctx();
    let missing_tenant_id = domain::TenantId::new();
    let missing_user_id = domain::UserId::new();

    let result = membership_repo
        .delete(&ctx, missing_tenant_id, missing_user_id)
        .await;

    assert!(matches!(result, Err(DomainError::NotFound(_))));
}

#[tokio::test]
async fn repository_execute_delegates_find() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let membership_repo = PgMembershipRepository::new(pool.clone());
    let ctx = test_ctx();
    let owner_id = create_test_user(&pool, "ExecuteOwner").await;
    let tenant = create_test_tenant(&pool, owner_id).await;
    let member_id = create_test_user(&pool, "ExecuteMember").await;

    membership_repo
        .create(
            &ctx,
            &Membership::new(tenant.id, member_id, TenantRole::Member),
        )
        .await
        .unwrap();

    let result = membership_repo
        .execute(
            &ctx,
            MembershipOp::Find {
                tenant_id: tenant.id,
                user_id: member_id,
            },
        )
        .await
        .unwrap();

    match result {
        MembershipOpResult::MembershipOption(Some(membership)) => {
            assert_eq!(membership.tenant_id, tenant.id);
            assert_eq!(membership.user_id, member_id);
            assert_eq!(membership.role, TenantRole::Member);
        }
        _ => panic!("Expected Some membership"),
    }

    cleanup_test_data(&pool, &[owner_id, member_id], &[tenant.id]).await;
}

#[tokio::test]
async fn repository_execute_create_returns_membership() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let membership_repo = PgMembershipRepository::new(pool.clone());
    let ctx = test_ctx();
    let owner_id = create_test_user(&pool, "ExecuteCreateOwner").await;
    let tenant = create_test_tenant(&pool, owner_id).await;
    let member_id = create_test_user(&pool, "ExecuteCreateMember").await;

    let membership = Membership::new(tenant.id, member_id, TenantRole::Member);
    let result = membership_repo
        .execute(&ctx, MembershipOp::Create { membership })
        .await
        .unwrap();

    match result {
        MembershipOpResult::Membership(created) => {
            assert_eq!(created.tenant_id, tenant.id);
            assert_eq!(created.user_id, member_id);
            assert_eq!(created.role, TenantRole::Member);
        }
        _ => panic!("Expected Membership result"),
    }

    cleanup_test_data(&pool, &[owner_id, member_id], &[tenant.id]).await;
}

#[tokio::test]
async fn repository_execute_list_for_tenant_returns_membership_list() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let membership_repo = PgMembershipRepository::new(pool.clone());
    let ctx = test_ctx();
    let owner_id = create_test_user(&pool, "ExecuteListOwner").await;
    let tenant = create_test_tenant(&pool, owner_id).await;
    let member_id = create_test_user(&pool, "ExecuteListMember").await;

    membership_repo
        .create(
            &ctx,
            &Membership::new(tenant.id, member_id, TenantRole::Member),
        )
        .await
        .unwrap();

    let result = membership_repo
        .execute(
            &ctx,
            MembershipOp::ListForTenant {
                tenant_id: tenant.id,
            },
        )
        .await
        .unwrap();

    match result {
        MembershipOpResult::MembershipList(list) => {
            assert_eq!(list.len(), 2); // owner + member
            assert!(list.iter().any(|m| m.user_id == member_id));
        }
        _ => panic!("Expected MembershipList result"),
    }

    cleanup_test_data(&pool, &[owner_id, member_id], &[tenant.id]).await;
}

#[tokio::test]
async fn repository_execute_list_for_user_returns_membership_list() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let membership_repo = PgMembershipRepository::new(pool.clone());
    let ctx = test_ctx();
    let owner_id = create_test_user(&pool, "ExecuteListForUserOwner").await;
    let tenant_a = create_test_tenant(&pool, owner_id).await;
    let tenant_b = create_test_tenant(&pool, owner_id).await;
    let member_id = create_test_user(&pool, "ExecuteListForUserMember").await;

    membership_repo
        .create(
            &ctx,
            &Membership::new(tenant_a.id, member_id, TenantRole::Member),
        )
        .await
        .unwrap();
    membership_repo
        .create(
            &ctx,
            &Membership::new(tenant_b.id, member_id, TenantRole::Admin),
        )
        .await
        .unwrap();

    let result = membership_repo
        .execute(&ctx, MembershipOp::ListForUser { user_id: member_id })
        .await
        .unwrap();

    match result {
        MembershipOpResult::MembershipList(list) => {
            assert_eq!(list.len(), 2);
            let tenant_ids: Vec<_> = list.iter().map(|m| m.tenant_id).collect();
            assert!(tenant_ids.contains(&tenant_a.id));
            assert!(tenant_ids.contains(&tenant_b.id));
            assert!(list.iter().any(|m| m.role == TenantRole::Member));
            assert!(list.iter().any(|m| m.role == TenantRole::Admin));
        }
        _ => panic!("Expected MembershipList result"),
    }

    cleanup_test_data(&pool, &[owner_id, member_id], &[tenant_a.id, tenant_b.id]).await;
}

#[tokio::test]
async fn repository_execute_update_role_and_delete_return_unit() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let membership_repo = PgMembershipRepository::new(pool.clone());
    let ctx = test_ctx();
    let owner_id = create_test_user(&pool, "ExecuteUpdateOwner").await;
    let tenant = create_test_tenant(&pool, owner_id).await;
    let member_id = create_test_user(&pool, "ExecuteUpdateMember").await;

    membership_repo
        .create(
            &ctx,
            &Membership::new(tenant.id, member_id, TenantRole::Member),
        )
        .await
        .unwrap();

    let update_result = membership_repo
        .execute(
            &ctx,
            MembershipOp::UpdateRole {
                tenant_id: tenant.id,
                user_id: member_id,
                role: TenantRole::Admin,
            },
        )
        .await
        .unwrap();
    assert_eq!(update_result, MembershipOpResult::Unit);

    let found = membership_repo
        .find(&ctx, tenant.id, member_id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(found.role, TenantRole::Admin);

    let delete_result = membership_repo
        .execute(
            &ctx,
            MembershipOp::Delete {
                tenant_id: tenant.id,
                user_id: member_id,
            },
        )
        .await
        .unwrap();
    assert_eq!(delete_result, MembershipOpResult::Unit);

    let found = membership_repo
        .find(&ctx, tenant.id, member_id)
        .await
        .unwrap();
    assert!(found.is_none());

    cleanup_test_data(&pool, &[owner_id, member_id], &[tenant.id]).await;
}
