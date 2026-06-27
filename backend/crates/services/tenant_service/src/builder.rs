//! Builder for constructing a [`TenantService`] with explicit dependencies.

use std::sync::Arc;

use base::ports::audit::AuditLogger;
use base::ports::permission::{PermissionRepository, RoleRepository};
use base::ports::repository::{
    MembershipRepository, TenantInviteRepository, TenantRepository, UserRepository,
};
use session_coordinator::SessionCoordinator;

use crate::error::TenantError;
use crate::{Dependencies, TenantConfig, TenantService};

/// Builder for [`TenantService`].
///
/// Provides a fluent API for wiring production dependencies while
/// allowing test-specific overrides. Persistence adapters must be supplied
/// by the composition root; this crate no longer depends on `sqlx`.
#[derive(Default)]
pub struct TenantBuilder {
    config: Option<TenantConfig>,
    tenant_repository: Option<Arc<dyn TenantRepository>>,
    membership_repository: Option<Arc<dyn MembershipRepository>>,
    user_repository: Option<Arc<dyn UserRepository>>,
    invite_repository: Option<Arc<dyn TenantInviteRepository>>,
    permission_repository: Option<Arc<dyn PermissionRepository>>,
    role_repository: Option<Arc<dyn RoleRepository>>,
    session_coordinator: Option<Arc<SessionCoordinator>>,
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

    /// Set the tenant repository.
    pub fn with_tenant_repository(mut self, repo: Arc<dyn TenantRepository>) -> Self {
        self.tenant_repository = Some(repo);
        self
    }

    /// Set the membership repository.
    pub fn with_membership_repository(mut self, repo: Arc<dyn MembershipRepository>) -> Self {
        self.membership_repository = Some(repo);
        self
    }

    /// Set the user repository.
    pub fn with_user_repository(mut self, repo: Arc<dyn UserRepository>) -> Self {
        self.user_repository = Some(repo);
        self
    }

    /// Set the tenant invite repository.
    pub fn with_invite_repository(mut self, repo: Arc<dyn TenantInviteRepository>) -> Self {
        self.invite_repository = Some(repo);
        self
    }

    /// Set the permission repository.
    pub fn with_permission_repository(mut self, repo: Arc<dyn PermissionRepository>) -> Self {
        self.permission_repository = Some(repo);
        self
    }

    /// Set the role repository.
    pub fn with_role_repository(mut self, repo: Arc<dyn RoleRepository>) -> Self {
        self.role_repository = Some(repo);
        self
    }

    /// Set the session coordinator.
    pub fn with_session_coordinator(
        mut self,
        session_coordinator: Arc<SessionCoordinator>,
    ) -> Self {
        self.session_coordinator = Some(session_coordinator);
        self
    }

    /// Set the audit logger.
    pub fn with_audit_logger(mut self, logger: Arc<dyn AuditLogger>) -> Self {
        self.audit_logger = Some(logger);
        self
    }

    /// Build the service.
    ///
    /// # Errors
    ///
    /// Returns an error if a required dependency was not provided.
    pub fn build(self) -> Result<TenantService, TenantError> {
        let config = self.config.unwrap_or_default();

        let tenant_repository = self
            .tenant_repository
            .ok_or_else(|| TenantError::internal("TenantBuilder requires a tenant repository"))?;

        let membership_repository = self.membership_repository.ok_or_else(|| {
            TenantError::internal("TenantBuilder requires a membership repository")
        })?;

        let user_repository = self
            .user_repository
            .ok_or_else(|| TenantError::internal("TenantBuilder requires a user repository"))?;

        let invite_repository = self.invite_repository.ok_or_else(|| {
            TenantError::internal("TenantBuilder requires a tenant invite repository")
        })?;

        let permission_repository = self.permission_repository.ok_or_else(|| {
            TenantError::internal("TenantBuilder requires a permission repository")
        })?;

        let role_repository = self
            .role_repository
            .ok_or_else(|| TenantError::internal("TenantBuilder requires a role repository"))?;

        let session_coordinator = self
            .session_coordinator
            .ok_or_else(|| TenantError::internal("TenantBuilder requires a session coordinator"))?;

        let audit_logger = self
            .audit_logger
            .ok_or_else(|| TenantError::internal("TenantBuilder requires an audit logger"))?;

        TenantService::new(
            config,
            Dependencies {
                tenant_repository,
                membership_repository,
                user_repository,
                invite_repository,
                permission_repository,
                role_repository,
                session_coordinator,
                audit_logger,
            },
        )
    }
}
