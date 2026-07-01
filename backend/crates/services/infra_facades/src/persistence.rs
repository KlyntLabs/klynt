//! Persistence facade — groups all repository and store adapters.

use base::ports::permission::{PermissionRepository, RoleRepository};
use base::ports::repository::DesktopAppRepository;
use base::ports::repository::*;
use base::ports::session::SessionStore;
use base::ports::AuditLogger;
use base::ports::TokenStore;
use std::sync::Arc;

/// Persistence facade — single access point to all persistence adapters.
///
/// The grouped adapters are intentionally exposed as public fields so the
/// composition root can wire the facade once and services can reach only the
/// adapters they need. Consumers should not reach through this facade into
/// unrelated adapters; keep each service's dependencies narrow.
pub struct PersistenceFacade {
    // Repositories
    pub user_repository: Arc<dyn UserRepository>,
    pub tenant_repository: Arc<dyn TenantRepository>,
    pub membership_repository: Arc<dyn MembershipRepository>,
    pub invite_repository: Arc<dyn TenantInviteRepository>,
    pub permission_repository: Arc<dyn PermissionRepository>,
    pub role_repository: Arc<dyn RoleRepository>,
    pub layout_repository: Arc<dyn TenantDesktopLayoutRepository>,
    pub app_repository: Arc<dyn DesktopAppRepository>,

    // Stores
    pub session_store: Arc<dyn SessionStore>,
    pub token_store: Arc<dyn TokenStore>,

    // Audit
    pub audit_logger: Arc<dyn AuditLogger>,
}

impl PersistenceFacade {
    /// Create a new persistence facade from individual adapters.
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        user_repository: Arc<dyn UserRepository>,
        tenant_repository: Arc<dyn TenantRepository>,
        membership_repository: Arc<dyn MembershipRepository>,
        invite_repository: Arc<dyn TenantInviteRepository>,
        permission_repository: Arc<dyn PermissionRepository>,
        role_repository: Arc<dyn RoleRepository>,
        layout_repository: Arc<dyn TenantDesktopLayoutRepository>,
        app_repository: Arc<dyn DesktopAppRepository>,
        session_store: Arc<dyn SessionStore>,
        token_store: Arc<dyn TokenStore>,
        audit_logger: Arc<dyn AuditLogger>,
    ) -> Self {
        Self {
            user_repository,
            tenant_repository,
            membership_repository,
            invite_repository,
            permission_repository,
            role_repository,
            layout_repository,
            app_repository,
            session_store,
            token_store,
            audit_logger,
        }
    }
}
