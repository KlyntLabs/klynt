//! Shared test support for tenant service Postgres-backed integration tests.

use std::sync::Arc;

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
