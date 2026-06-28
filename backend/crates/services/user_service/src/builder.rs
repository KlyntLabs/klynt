//! Builder for constructing a [`UserService`] with explicit dependencies.

use std::sync::Arc;

use infra_facades::{InfraFacade, PersistenceFacade};

use crate::error::UserError;
use crate::Dependencies;
use crate::UserConfig;
use crate::UserService;

/// Builder for [`UserService`].
///
/// Provides a fluent API for wiring production dependencies through
/// infrastructure facades while allowing test-specific overrides.
#[derive(Default)]
pub struct UserBuilder {
    config: Option<UserConfig>,
    persistence_facade: Option<Arc<PersistenceFacade>>,
    infra_facade: Option<Arc<InfraFacade>>,
}

impl UserBuilder {
    /// Create a new builder with no overrides.
    pub fn new() -> Self {
        Self::default()
    }

    /// Set service configuration.
    pub fn with_config(mut self, config: UserConfig) -> Self {
        self.config = Some(config);
        self
    }

    /// Set the persistence facade.
    pub fn with_persistence_facade(mut self, facade: Arc<PersistenceFacade>) -> Self {
        self.persistence_facade = Some(facade);
        self
    }

    /// Set the infrastructure facade.
    pub fn with_infra_facade(mut self, facade: Arc<InfraFacade>) -> Self {
        self.infra_facade = Some(facade);
        self
    }

    /// Build the service.
    ///
    /// # Errors
    ///
    /// Returns an error if a required dependency was not provided.
    pub fn build(self) -> Result<UserService, UserError> {
        let config = self.config.unwrap_or_default();

        let persistence_facade = self
            .persistence_facade
            .ok_or_else(|| UserError::internal("UserBuilder requires a persistence facade"))?;

        let infra_facade = self
            .infra_facade
            .ok_or_else(|| UserError::internal("UserBuilder requires an infrastructure facade"))?;

        UserService::new(
            config,
            Dependencies {
                persistence_facade,
                infra_facade,
            },
        )
    }
}
