//! Postgres-backed integration tests verifying audit events for role/member mutations.
//!
//! These tests require `DATABASE_URL` to point at a running PostgreSQL instance.

use base::ctx::{ActorType, ExecutionContext, RequestContext};
use domain::{TenantRole, UserId};
use tenant_service::{CreateTenantRequest, TenantService};

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

async fn find_audit_events(
    pool: &sqlx::PgPool,
    tenant_id: domain::TenantId,
    action: &str,
) -> Vec<(
    String,
    String,
    Option<serde_json::Value>,
    Option<serde_json::Value>,
)> {
    sqlx::query_as(
        r#"
        SELECT action, resource_type, before_data, after_data
        FROM audit_events
        WHERE tenant_id = $1 AND action = $2
        ORDER BY created_at
        "#,
    )
    .bind(tenant_id.inner())
    .bind(action)
    .fetch_all(pool)
    .await
    .unwrap()
}

#[tokio::test]
async fn role_lifecycle_is_audited() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let service = build_service(pool.clone()).await;
    let owner_id = create_test_user(&pool, "owner-audit-role").await;
    let owner_ctx = test_ctx(owner_id);

    let tenant = service
        .create_tenant(
            &owner_ctx,
            CreateTenantRequest {
                slug: format!("audit-role-{}", owner_id.inner()),
                name: "Role Audit Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    let permissions = service.list_permissions(&owner_ctx).await.unwrap();
    let initial_permission_ids: Vec<domain::PermissionId> =
        permissions.iter().take(2).map(|p| p.id).collect();
    let updated_permission_ids: Vec<domain::PermissionId> =
        permissions.iter().take(1).map(|p| p.id).collect();

    let role = service
        .create_role(
            &owner_ctx,
            tenant.slug.as_str(),
            tenant_service::CreateRoleRequest {
                name: "Audited Role".to_string(),
                description: "A role for audit testing".to_string(),
                permission_ids: initial_permission_ids.clone(),
            },
        )
        .await
        .unwrap();

    service
        .update_role(
            &owner_ctx,
            tenant.slug.as_str(),
            role.id,
            tenant_service::UpdateRoleRequest {
                permission_ids: updated_permission_ids.clone(),
            },
        )
        .await
        .unwrap();

    service
        .delete_role(&owner_ctx, tenant.slug.as_str(), role.id)
        .await
        .unwrap();

    let created = find_audit_events(&pool, tenant.id, "role_created").await;
    assert_eq!(created.len(), 1);
    assert_eq!(created[0].1, "role");
    assert!(created[0].2.is_none());
    assert_eq!(created[0].3.as_ref().unwrap()["name"], "Audited Role");
    assert_eq!(
        created[0].3.as_ref().unwrap()["permission_ids"]
            .as_array()
            .unwrap()
            .len(),
        initial_permission_ids.len()
    );

    let updated = find_audit_events(&pool, tenant.id, "role_permissions_updated").await;
    assert_eq!(updated.len(), 1);
    assert_eq!(
        updated[0].2.as_ref().unwrap()["permission_ids"]
            .as_array()
            .unwrap()
            .len(),
        initial_permission_ids.len()
    );
    assert_eq!(
        updated[0].3.as_ref().unwrap()["permission_ids"]
            .as_array()
            .unwrap()
            .len(),
        updated_permission_ids.len()
    );

    let deleted = find_audit_events(&pool, tenant.id, "role_deleted").await;
    assert_eq!(deleted.len(), 1);
    assert_eq!(deleted[0].1, "role");
    assert_eq!(deleted[0].2.as_ref().unwrap()["name"], "Audited Role");
    assert!(deleted[0].3.is_none());

    service
        .delete_tenant(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    delete_test_user(&pool, owner_id).await;
}

#[tokio::test]
async fn member_role_change_and_removal_are_audited() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let service = build_service(pool.clone()).await;
    let owner_id = create_test_user(&pool, "owner-audit-member").await;
    let member_id = create_test_user(&pool, "member-audit-member").await;
    let owner_ctx = test_ctx(owner_id);

    let tenant = service
        .create_tenant(
            &owner_ctx,
            CreateTenantRequest {
                slug: format!("audit-member-{}", owner_id.inner()),
                name: "Member Audit Tenant".to_string(),
            },
        )
        .await
        .unwrap();

    let member_email = format!("member-audit-member-{}@example.com", member_id.inner());

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

    let role_changed = find_audit_events(&pool, tenant.id, "member_role_changed").await;
    assert_eq!(role_changed.len(), 1);
    assert_eq!(role_changed[0].1, "membership");
    assert_eq!(role_changed[0].2.as_ref().unwrap()["role"], "member");
    assert_eq!(role_changed[0].3.as_ref().unwrap()["role"], "admin");

    let removed = find_audit_events(&pool, tenant.id, "member_removed").await;
    assert_eq!(removed.len(), 1);
    assert_eq!(removed[0].1, "membership");

    service
        .delete_tenant(&owner_ctx, tenant.slug.as_str())
        .await
        .unwrap();
    delete_test_user(&pool, owner_id).await;
    delete_test_user(&pool, member_id).await;
}
