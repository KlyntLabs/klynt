//! Builder for constructing a [`TenantService`] with sensible defaults.

use std::sync::Arc;

use base::ports::audit::AuditLogger;
use base::ports::permission::{PermissionRepository, RoleRepository};
use base::ports::repository::{
    MembershipRepository, TenantInviteRepository, TenantRepository, UserRepository,
};
use base::ports::session::SessionStore;

use crate::error::TenantError;
use crate::{Dependencies, TenantConfig, TenantService};

/// Builder for [`TenantService`].
///
/// Provides a fluent API for wiring production dependencies while
/// allowing test-specific overrides.
#[derive(Default)]
pub struct TenantBuilder {
    config: Option<TenantConfig>,
    pool: Option<sqlx::PgPool>,
    tenant_repository: Option<Arc<dyn TenantRepository>>,
    membership_repository: Option<Arc<dyn MembershipRepository>>,
    user_repository: Option<Arc<dyn UserRepository>>,
    invite_repository: Option<Arc<dyn TenantInviteRepository>>,
    permission_repository: Option<Arc<dyn PermissionRepository>>,
    role_repository: Option<Arc<dyn RoleRepository>>,
    session_store: Option<Arc<dyn SessionStore>>,
    audit_logger: Option<Arc<dyn AuditLogger>>,
}

impl TenantBuilder {
    /// Create a new builder with no overrides.
    pub fn new() -> Self {
        Self::default()
    }

    /// Set service configuration.
    pub fn with_config(mut self, config: TenantConfig) -> Self {
        self.config = Some(config);
        self
    }

    /// Set the PostgreSQL connection pool used to create default adapters.
    pub fn with_pool(mut self, pool: sqlx::PgPool) -> Self {
        self.pool = Some(pool);
        self
    }

    /// Override the tenant repository.
    pub fn with_tenant_repository(mut self, repo: Arc<dyn TenantRepository>) -> Self {
        self.tenant_repository = Some(repo);
        self
    }

    /// Override the membership repository.
    pub fn with_membership_repository(mut self, repo: Arc<dyn MembershipRepository>) -> Self {
        self.membership_repository = Some(repo);
        self
    }

    /// Override the user repository.
    pub fn with_user_repository(mut self, repo: Arc<dyn UserRepository>) -> Self {
        self.user_repository = Some(repo);
        self
    }

    /// Override the tenant invite repository.
    pub fn with_invite_repository(mut self, repo: Arc<dyn TenantInviteRepository>) -> Self {
        self.invite_repository = Some(repo);
        self
    }

    /// Override the permission repository.
    pub fn with_permission_repository(mut self, repo: Arc<dyn PermissionRepository>) -> Self {
        self.permission_repository = Some(repo);
        self
    }

    /// Override the role repository.
    pub fn with_role_repository(mut self, repo: Arc<dyn RoleRepository>) -> Self {
        self.role_repository = Some(repo);
        self
    }

    /// Override the session store.
    pub fn with_session_store(mut self, store: Arc<dyn SessionStore>) -> Self {
        self.session_store = Some(store);
        self
    }

    /// Override the audit logger.
    pub fn with_audit_logger(mut self, logger: Arc<dyn AuditLogger>) -> Self {
        self.audit_logger = Some(logger);
        self
    }

    /// Build the service, creating default adapters for any unwired dependency.
    ///
    /// # Errors
    ///
    /// Returns an error if no pool was provided and a default adapter is needed.
    pub async fn build(self) -> Result<TenantService, TenantError> {
        let pool = self
            .pool
            .ok_or_else(|| TenantError::internal("TenantBuilder requires a PostgreSQL pool"))?;

        let config = self.config.unwrap_or_default();

        let tenant_repository = self.tenant_repository.unwrap_or_else(|| {
            Arc::new(persistence::repositories::tenant::PgTenantRepository::new(
                pool.clone(),
            )) as Arc<dyn TenantRepository>
        });

        let membership_repository = self.membership_repository.unwrap_or_else(|| {
            Arc::new(
                persistence::repositories::membership::PgMembershipRepository::new(pool.clone()),
            ) as Arc<dyn MembershipRepository>
        });

        let user_repository = self.user_repository.unwrap_or_else(|| {
            Arc::new(persistence::repositories::user::PgUserRepository::new(
                pool.clone(),
            )) as Arc<dyn UserRepository>
        });

        let invite_repository = self.invite_repository.unwrap_or_else(|| {
            Arc::new(
                persistence::repositories::tenant_invite::PgTenantInviteRepository::new(
                    pool.clone(),
                ),
            ) as Arc<dyn TenantInviteRepository>
        });

        let permission_repository = self.permission_repository.unwrap_or_else(|| {
            Arc::new(
                persistence::repositories::permission::PgPermissionRepository::new(pool.clone()),
            ) as Arc<dyn PermissionRepository>
        });

        let role_repository = self.role_repository.unwrap_or_else(|| {
            Arc::new(persistence::repositories::role::PgRoleRepository::new(
                pool.clone(),
            )) as Arc<dyn RoleRepository>
        });

        let session_store = self.session_store.unwrap_or_else(|| {
            Arc::new(persistence::repositories::session::PgSessionStore::new(
                pool.clone(),
            )) as Arc<dyn SessionStore>
        });

        let audit_logger = self.audit_logger.unwrap_or_else(|| {
            let audit_repo = Arc::new(
                persistence::repositories::audit_event::PgAuditEventRepository::new(pool.clone()),
            );
            Arc::new(observability::audit::AuditService::new(audit_repo)) as Arc<dyn AuditLogger>
        });

        TenantService::new(
            config,
            Dependencies {
                tenant_repository,
                membership_repository,
                user_repository,
                invite_repository,
                permission_repository,
                role_repository,
                session_store,
                audit_logger,
            },
        )
    }
}
