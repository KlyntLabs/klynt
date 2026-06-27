//! Shared test support for tenant service Postgres-backed integration tests.

use std::sync::Arc;

use base::ctx::{ActorType, ExecutionContext, RequestContext};
use base::ports::session::{Session, SessionStore, SessionToken};
use chrono::{Duration, Utc};
use domain::UserId;
use tenant_service::TenantService;

/// Build a Postgres-backed session store.
pub fn build_session_store(pool: sqlx::PgPool) -> Arc<dyn SessionStore> {
    Arc::new(persistence::repositories::session::PgSessionStore::new(
        pool,
    ))
}

/// Build a tenant service wired with Postgres-backed adapters and a provided session store.
pub fn build_service_with_session_store(
    pool: sqlx::PgPool,
    session_store: Arc<dyn SessionStore>,
) -> TenantService {
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
    let session_coordinator = Arc::new(session_coordinator::SessionCoordinator::new(
        session_store,
        session_coordinator::SessionCoordinatorConfig::default(),
    ));
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
        .with_session_coordinator(session_coordinator)
        .with_audit_logger(audit_logger)
        .build()
        .expect("tenant service should build")
}

/// Build a tenant service wired with Postgres-backed adapters.
#[allow(dead_code)]
pub async fn build_service(pool: sqlx::PgPool) -> TenantService {
    let session_store = build_session_store(pool.clone());
    build_service_with_session_store(pool, session_store)
}

/// Create a real session for `user_id` using the provided store.
#[allow(dead_code)]
pub async fn create_session(
    session_store: &Arc<dyn SessionStore>,
    ctx: &ExecutionContext,
    user_id: UserId,
) -> SessionToken {
    let expires_at = Utc::now() + Duration::hours(1);
    session_store
        .create(ctx, user_id, expires_at)
        .await
        .expect("session should be created")
}

/// Find a valid session by token using the provided store.
#[allow(dead_code)]
pub async fn find_session(
    session_store: &Arc<dyn SessionStore>,
    ctx: &ExecutionContext,
    token: &SessionToken,
) -> Option<Session> {
    session_store
        .find_valid(ctx, token)
        .await
        .expect("session lookup should succeed")
}

/// Assert that `token` has exactly one membership with the expected tenant and role.
#[allow(dead_code)]
pub async fn assert_session_membership(
    session_store: &Arc<dyn SessionStore>,
    ctx: &ExecutionContext,
    token: &SessionToken,
    tenant_id: domain::TenantId,
    role: domain::TenantRole,
) {
    let session = find_session(session_store, ctx, token)
        .await
        .expect("session should be valid");
    assert_eq!(session.tenant_memberships.len(), 1);
    assert_eq!(session.tenant_memberships[0].tenant_id, tenant_id.inner());
    assert_eq!(session.tenant_memberships[0].role, role);
}

/// Assert that `token` has no tenant memberships.
#[allow(dead_code)]
pub async fn assert_session_has_no_memberships(
    session_store: &Arc<dyn SessionStore>,
    ctx: &ExecutionContext,
    token: &SessionToken,
) {
    let session = find_session(session_store, ctx, token)
        .await
        .expect("session should be valid");
    assert!(session.tenant_memberships.is_empty());
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
