//! Postgres-backed integration tests for tenant roles.
//!
//! These tests require `DATABASE_URL` to point at a running PostgreSQL instance.

use base::ctx::{ActorType, ExecutionContext, RequestContext};
use domain::UserId;
use tenant_service::CreateTenantRequest;

mod support;

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

async fn create_test_user(pool: &sqlx::PgPool, prefix: &str) -> UserId {
    let user_id = UserId::new();
    let email = format!("{}-{}@example.com", prefix, user_id.inner());

    let username = user_id.inner().to_string();

    sqlx::query(
        r#"
        INSERT INTO users (
            id, email, username, name, password_hash,
            status, terms_accepted_at, terms_version
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
    )
    .bind(user_id.inner())
    .bind(&email)
    .bind(&username)
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

async fn delete_test_user(pool: &sqlx::PgPool, user_id: UserId) {
    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id.inner())
        .execute(pool)
        .await
        .ok();
}

#[tokio::test]
async fn create_custom_role_exposes_is_custom() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let service = support::build_service(pool.clone()).await;
    let owner_id = create_test_user(&pool, "owner-role").await;
    let owner_ctx = test_ctx(owner_id);

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
    delete_test_user(&pool, owner_id).await;
}
