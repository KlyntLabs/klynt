//! Postgres-backed integration tests for accepting tenant invites.

use base::ctx::{ActorType, ExecutionContext, RequestContext};
use chrono::{Duration, Utc};
use domain::{RoleId, UserId};
use tenant_service::{CreateTenantRequest, TenantError, TenantService};
use uuid::Uuid;

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

async fn create_test_user(pool: &sqlx::PgPool, prefix: &str) -> (UserId, String) {
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
    .bind(Utc::now())
    .bind("1.0")
    .execute(pool)
    .await
    .expect("user should insert");

    (user_id, email)
}

async fn find_role_id(pool: &sqlx::PgPool, tenant_id: domain::TenantId, name: &str) -> RoleId {
    let id: Uuid = sqlx::query_scalar(
        r#"
        SELECT id FROM tenant_roles
        WHERE tenant_id = $1 AND name = $2
        "#,
    )
    .bind(tenant_id.inner())
    .bind(name)
    .fetch_one(pool)
    .await
    .unwrap();

    RoleId::from_uuid(id)
}

#[allow(clippy::too_many_arguments)]
async fn create_invite(
    pool: &sqlx::PgPool,
    tenant_id: domain::TenantId,
    role_id: RoleId,
    invited_by: UserId,
    email: &str,
    token: &str,
    expires_in: Duration,
    accepted: bool,
) {
    let expires_at = Utc::now() + expires_in;
    let accepted_at = if accepted { Some(Utc::now()) } else { None };

    sqlx::query(
        r#"
        INSERT INTO tenant_invites (
            id, tenant_id, email, tenant_role_id, invited_by,
            expires_at, accepted_at, token, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(tenant_id.inner())
    .bind(email)
    .bind(role_id.0)
    .bind(invited_by.inner())
    .bind(expires_at)
    .bind(accepted_at)
    .bind(token)
    .bind(Utc::now())
    .bind(Utc::now())
    .execute(pool)
    .await
    .expect("invite should insert");
}

async fn delete_test_user(pool: &sqlx::PgPool, user_id: UserId) {
    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id.inner())
        .execute(pool)
        .await
        .ok();
}

#[tokio::test]
async fn accept_invite_adds_user_as_member() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let service = build_service(pool.clone()).await;
    let (owner_id, _) = create_test_user(&pool, "accept-owner").await;
    let (new_user_id, new_email) = create_test_user(&pool, "accept-new").await;
    let ctx = test_ctx(new_user_id);

    let tenant = service
        .create_tenant(
            &test_ctx(owner_id),
            CreateTenantRequest {
                slug: format!("accept-{}", owner_id.inner()),
                name: "Accept Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    let role_id = find_role_id(&pool, tenant.id, "member").await;
    create_invite(
        &pool,
        tenant.id,
        role_id,
        owner_id,
        &new_email,
        "valid-token",
        Duration::hours(1),
        false,
    )
    .await;

    let accepted = service.accept_invite(&ctx, "valid-token").await.unwrap();
    assert_eq!(accepted.id, tenant.id);

    let tenants = service.list_my_tenants(&ctx).await.unwrap();
    assert!(tenants.iter().any(|t| t.id == tenant.id));

    delete_test_user(&pool, owner_id).await;
    delete_test_user(&pool, new_user_id).await;
}

#[tokio::test]
async fn accept_invite_returns_not_found_for_unknown_token() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let service = build_service(pool.clone()).await;
    let (user_id, _) = create_test_user(&pool, "accept-notfound").await;
    let ctx = test_ctx(user_id);

    let result = service.accept_invite(&ctx, "missing-token").await;
    assert!(matches!(
        result,
        Err(TenantError::Domain(domain::DomainError::NotFound(_)))
    ));

    delete_test_user(&pool, user_id).await;
}

#[tokio::test]
async fn accept_invite_fails_when_expired() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let service = build_service(pool.clone()).await;
    let (owner_id, _) = create_test_user(&pool, "accept-expired-owner").await;
    let (new_user_id, new_email) = create_test_user(&pool, "accept-expired").await;
    let ctx = test_ctx(new_user_id);

    let tenant = service
        .create_tenant(
            &test_ctx(owner_id),
            CreateTenantRequest {
                slug: format!("expired-{}", owner_id.inner()),
                name: "Expired Invite Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    let role_id = find_role_id(&pool, tenant.id, "member").await;
    create_invite(
        &pool,
        tenant.id,
        role_id,
        owner_id,
        &new_email,
        "expired-token",
        Duration::hours(-1),
        false,
    )
    .await;

    let result = service.accept_invite(&ctx, "expired-token").await;
    assert!(matches!(
        result,
        Err(TenantError::Domain(domain::DomainError::Validation(_)))
    ));

    delete_test_user(&pool, owner_id).await;
    delete_test_user(&pool, new_user_id).await;
}

#[tokio::test]
async fn accept_invite_fails_for_wrong_email() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let service = build_service(pool.clone()).await;
    let (owner_id, _) = create_test_user(&pool, "accept-wrong-owner").await;
    let (new_user_id, _) = create_test_user(&pool, "accept-wrong").await;
    let ctx = test_ctx(new_user_id);

    let tenant = service
        .create_tenant(
            &test_ctx(owner_id),
            CreateTenantRequest {
                slug: format!("wrong-{}", owner_id.inner()),
                name: "Wrong Email Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    let role_id = find_role_id(&pool, tenant.id, "member").await;
    create_invite(
        &pool,
        tenant.id,
        role_id,
        owner_id,
        "someone-else@example.com",
        "wrong-email-token",
        Duration::hours(1),
        false,
    )
    .await;

    let result = service.accept_invite(&ctx, "wrong-email-token").await;
    assert!(matches!(
        result,
        Err(TenantError::Domain(domain::DomainError::NotPermitted(_)))
    ));

    delete_test_user(&pool, owner_id).await;
    delete_test_user(&pool, new_user_id).await;
}

#[tokio::test]
async fn accept_invite_fails_when_already_accepted() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let service = build_service(pool.clone()).await;
    let (owner_id, _) = create_test_user(&pool, "accept-accepted-owner").await;
    let (new_user_id, new_email) = create_test_user(&pool, "accept-accepted").await;
    let ctx = test_ctx(new_user_id);

    let tenant = service
        .create_tenant(
            &test_ctx(owner_id),
            CreateTenantRequest {
                slug: format!("accepted-{}", owner_id.inner()),
                name: "Already Accepted Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    let role_id = find_role_id(&pool, tenant.id, "member").await;
    create_invite(
        &pool,
        tenant.id,
        role_id,
        owner_id,
        &new_email,
        "accepted-token",
        Duration::hours(1),
        true,
    )
    .await;

    let result = service.accept_invite(&ctx, "accepted-token").await;
    assert!(matches!(
        result,
        Err(TenantError::Domain(domain::DomainError::Validation(_)))
    ));

    delete_test_user(&pool, owner_id).await;
    delete_test_user(&pool, new_user_id).await;
}
