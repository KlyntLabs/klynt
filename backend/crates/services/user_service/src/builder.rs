//! Builder for constructing a [`UserService`] with explicit dependencies.

use std::sync::Arc;

use base::ports::{AuditLogger, Clock, PasswordHasher, SystemClock};

use crate::application::ports::UserRepository;
use crate::error::UserError;
use crate::infrastructure::services::PasswordHasherAdapter as UserPasswordHasherAdapter;
use crate::Dependencies;
use crate::UserConfig;
use crate::UserService;

/// Builder for [`UserService`].
///
/// Provides a fluent API for wiring production dependencies while
/// allowing test-specific overrides. Persistence adapters must be supplied
/// by the composition root; this crate no longer depends on `sqlx`.
#[derive(Default)]
pub struct UserBuilder {
    config: Option<UserConfig>,
    user_repository: Option<Arc<dyn UserRepository>>,
    audit_logger: Option<Arc<dyn AuditLogger>>,
    password_hasher: Option<Arc<dyn PasswordHasher>>,
    clock: Option<Arc<dyn Clock>>,
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

    /// Set the user repository.
    pub fn with_user_repository(mut self, repo: Arc<dyn UserRepository>) -> Self {
        self.user_repository = Some(repo);
        self
    }

    /// Set the audit logger.
    pub fn with_audit_logger(mut self, logger: Arc<dyn AuditLogger>) -> Self {
        self.audit_logger = Some(logger);
        self
    }

    /// Override the password hasher.
    pub fn with_password_hasher(mut self, hasher: Arc<dyn PasswordHasher>) -> Self {
        self.password_hasher = Some(hasher);
        self
    }

    /// Override the clock.
    pub fn with_clock(mut self, clock: Arc<dyn Clock>) -> Self {
        self.clock = Some(clock);
        self
    }

    /// Build the service.
    ///
    /// # Errors
    ///
    /// Returns an error if a required dependency was not provided.
    pub fn build(self) -> Result<UserService, UserError> {
        let config = self.config.unwrap_or_default();

        let user_repository = self
            .user_repository
            .ok_or_else(|| UserError::internal("UserBuilder requires a user repository"))?;

        let audit_logger = self
            .audit_logger
            .ok_or_else(|| UserError::internal("UserBuilder requires an audit logger"))?;

        let password_hasher = self.password_hasher.unwrap_or_else(|| {
            Arc::new(UserPasswordHasherAdapter::new(
                persistence::password_hasher::Argon2PasswordHasher::new(),
            ))
        });

        let clock = self.clock.unwrap_or_else(|| Arc::new(SystemClock));

        UserService::new(
            config,
            Dependencies {
                user_repository,
                audit_logger,
                password_hasher,
                clock,
            },
        )
    }
}
