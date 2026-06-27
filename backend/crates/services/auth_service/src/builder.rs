//! Builder for constructing an [`AuthService`] with explicit dependencies.

use std::sync::Arc;

use infra_facades::{InfraFacade, PersistenceFacade};

use crate::error::AuthError;
use crate::AuthConfig;
use crate::AuthService;
use crate::Dependencies;

/// Builder for [`AuthService`].
///
/// Provides a fluent API for wiring production dependencies through
/// infrastructure facades while allowing test-specific overrides.
#[derive(Default)]
pub struct AuthBuilder {
    config: Option<AuthConfig>,
    persistence_facade: Option<Arc<PersistenceFacade>>,
    infra_facade: Option<Arc<InfraFacade>>,
    session_service: Option<Arc<session_service::SessionService>>,
}

impl AuthBuilder {
    /// Create a new builder with no overrides.
    pub fn new() -> Self {
        Self::default()
    }

    /// Set service configuration.
    pub fn with_config(mut self, config: AuthConfig) -> Self {
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

    /// Set the session service.
    pub fn with_session_service(mut self, service: Arc<session_service::SessionService>) -> Self {
        self.session_service = Some(service);
        self
    }

    /// Build the service.
    ///
    /// # Errors
    ///
    /// Returns an error if a required dependency was not provided.
    pub fn build(self) -> Result<AuthService, AuthError> {
        let config = self.config.unwrap_or_default();

        let persistence_facade = self.persistence_facade.ok_or_else(|| {
            AuthError::internal("AuthBuilder requires a persistence facade".to_string())
        })?;

        let infra_facade = self.infra_facade.ok_or_else(|| {
            AuthError::internal("AuthBuilder requires an infrastructure facade".to_string())
        })?;

        let session_service = self.session_service.unwrap_or_else(|| {
            Arc::new(session_service::SessionService::with_clock(
                session_service::SessionConfig::default(),
                persistence_facade.session_store.clone(),
                infra_facade.clock.clone(),
            ))
        });

        AuthService::new(
            config,
            Dependencies {
                persistence_facade,
                infra_facade,
                session_service,
            },
        )
    }
}
