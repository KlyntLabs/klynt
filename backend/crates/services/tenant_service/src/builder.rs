//! Builder for constructing a [`TenantService`] with explicit dependencies.

use std::sync::Arc;

use infra_facades::PersistenceFacade;
use session_coordinator::SessionCoordinator;

use crate::error::TenantError;
use crate::{Dependencies, TenantConfig, TenantService};

/// Builder for [`TenantService`].
///
/// Provides a fluent API for wiring production dependencies through
/// infrastructure facades while allowing test-specific overrides.
#[derive(Default)]
pub struct TenantBuilder {
    config: Option<TenantConfig>,
    persistence_facade: Option<Arc<PersistenceFacade>>,
    session_coordinator: Option<Arc<SessionCoordinator>>,
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

    /// Set the persistence facade.
    pub fn with_persistence_facade(mut self, facade: Arc<PersistenceFacade>) -> Self {
        self.persistence_facade = Some(facade);
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

    /// Build the service.
    ///
    /// # Errors
    ///
    /// Returns an error if a required dependency was not provided.
    pub fn build(self) -> Result<TenantService, TenantError> {
        let config = self.config.unwrap_or_default();

        let persistence_facade = self
            .persistence_facade
            .ok_or_else(|| TenantError::internal("TenantBuilder requires a persistence facade"))?;

        let session_coordinator = self
            .session_coordinator
            .ok_or_else(|| TenantError::internal("TenantBuilder requires a session coordinator"))?;

        TenantService::new(
            config,
            Dependencies {
                tenant_repository: persistence_facade.tenant_repository.clone(),
                membership_repository: persistence_facade.membership_repository.clone(),
                user_repository: persistence_facade.user_repository.clone(),
                invite_repository: persistence_facade.invite_repository.clone(),
                permission_repository: persistence_facade.permission_repository.clone(),
                role_repository: persistence_facade.role_repository.clone(),
                session_coordinator,
                audit_logger: persistence_facade.audit_logger.clone(),
            },
        )
    }
}
