//! Shared test support for tenant service Postgres-backed integration tests.

use std::sync::Arc;

use base::ctx::{ActorType, ExecutionContext, RequestContext};
use chrono::Utc;
use domain::UserId;
use tenant_service::TenantService;

/// Build a tenant service wired with Postgres-backed adapters.
pub async fn build_service(pool: sqlx::PgPool) -> TenantService {
    let tenant_repository = Arc::new(persistence::repositories::tenant::PgTenantRepository::new(
        pool.clone(),
    )) as Arc<dyn base::ports::repository::TenantRepository>;
    let membership_repository =
        Arc::new(persistence::repositories::membership::PgMembershipRepository::new(pool.clone()))
            as Arc<dyn base::ports::repository::MembershipRepository>;
    let user_repository = Arc::new(persistence::repositories::user::PgUserRepository::new(
        pool.clone(),
    )) as Arc<dyn base::ports::repository::UserRepository>;
    let invite_repository = Arc::new(
        persistence::repositories::tenant_invite::PgTenantInviteRepository::new(pool.clone()),
    ) as Arc<dyn base::ports::repository::TenantInviteRepository>;
    let permission_repository =
        Arc::new(persistence::repositories::permission::PgPermissionRepository::new(pool.clone()))
            as Arc<dyn base::ports::PermissionRepository>;
    let role_repository = Arc::new(persistence::repositories::role::PgRoleRepository::new(
        pool.clone(),
    )) as Arc<dyn base::ports::RoleRepository>;
    let session_store = Arc::new(persistence::repositories::session::PgSessionStore::new(
        pool.clone(),
    )) as Arc<dyn base::ports::session::SessionStore>;
    let audit_repo =
        Arc::new(persistence::repositories::audit_event::PgAuditEventRepository::new(pool));
    let audit_logger = Arc::new(observability::audit::AuditService::new(audit_repo))
        as Arc<dyn base::ports::AuditLogger>;

    TenantService::builder()
        .with_tenant_repository(tenant_repository)
        .with_membership_repository(membership_repository)
        .with_user_repository(user_repository)
        .with_invite_repository(invite_repository)
        .with_permission_repository(permission_repository)
        .with_role_repository(role_repository)
        .with_session_store(session_store)
        .with_audit_logger(audit_logger)
        .build()
        .expect("tenant service should build")
}

/// Return `DATABASE_URL` if it is set.
pub fn database_url() -> Option<String> {
    std::env::var("DATABASE_URL").ok()
}

/// Connect to the test database and run migrations.
pub async fn setup_pool() -> Option<sqlx::PgPool> {
    let url = database_url()?;
    let pool = sqlx::PgPool::connect(&url).await.ok()?;
    sqlx::migrate!("../../../migrations")
        .run(&pool)
        .await
        .ok()?;
    Some(pool)
}

/// Create an execution context for the given user.
pub fn test_ctx(user_id: UserId) -> ExecutionContext {
    ExecutionContext::new(RequestContext::new()).with_actor(user_id.inner(), ActorType::User)
}

/// Create a test user and return their ID.
#[allow(dead_code)]
pub async fn create_test_user(pool: &sqlx::PgPool, prefix: &str) -> UserId {
    let (user_id, _) = create_test_user_with_email(pool, prefix).await;
    user_id
}

/// Create a test user and return their ID and email.
#[allow(dead_code)]
pub async fn create_test_user_with_email(pool: &sqlx::PgPool, prefix: &str) -> (UserId, String) {
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

/// Delete a test user by ID.
pub async fn delete_test_user(pool: &sqlx::PgPool, user_id: UserId) {
    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id.inner())
        .execute(pool)
        .await
        .ok();
}
