//! Builder for constructing an [`AuthService`] with explicit dependencies.

use std::sync::Arc;

use base::ports::{AuditLogger, Clock, EmailSender, PasswordHasher, SystemClock};

use crate::application::ports::{MembershipRepository, UserRepository};
use crate::core::TokenStore;
use crate::error::AuthError;
use crate::infrastructure::services::PasswordHasherAdapter as AuthPasswordHasherAdapter;
use crate::AuthConfig;
use crate::AuthService;
use crate::Dependencies;

/// Builder for [`AuthService`].
///
/// Provides a fluent API for wiring production dependencies while
/// allowing test-specific overrides. Persistence adapters must be supplied
/// by the composition root; this crate no longer depends on `sqlx`.
#[derive(Default)]
pub struct AuthBuilder {
    config: Option<AuthConfig>,
    user_repository: Option<Arc<dyn UserRepository>>,
    session_service: Option<Arc<session_service::SessionService>>,
    session_store: Option<Arc<dyn base::ports::session::SessionStore>>,
    token_store: Option<Arc<dyn TokenStore>>,
    email_sender: Option<Arc<dyn EmailSender>>,
    audit_logger: Option<Arc<dyn AuditLogger>>,
    password_hasher: Option<Arc<dyn PasswordHasher>>,
    membership_repository: Option<Arc<dyn MembershipRepository>>,
    clock: Option<Arc<dyn Clock>>,
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

    /// Set the user repository.
    pub fn with_user_repository(mut self, repo: Arc<dyn UserRepository>) -> Self {
        self.user_repository = Some(repo);
        self
    }

    /// Set the session service.
    pub fn with_session_service(mut self, service: Arc<session_service::SessionService>) -> Self {
        self.session_service = Some(service);
        self
    }

    /// Set the session store.
    pub fn with_session_store(
        mut self,
        store: Arc<dyn base::ports::session::SessionStore>,
    ) -> Self {
        self.session_store = Some(store);
        self
    }

    /// Set the token store.
    pub fn with_token_store(mut self, store: Arc<dyn TokenStore>) -> Self {
        self.token_store = Some(store);
        self
    }

    /// Set the email sender.
    pub fn with_email_sender(mut self, sender: Arc<dyn EmailSender>) -> Self {
        self.email_sender = Some(sender);
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

    /// Set the membership repository.
    pub fn with_membership_repository(mut self, repo: Arc<dyn MembershipRepository>) -> Self {
        self.membership_repository = Some(repo);
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
    pub fn build(self) -> Result<AuthService, AuthError> {
        let config = self.config.unwrap_or_default();

        let session_store = self.session_store.ok_or_else(|| {
            AuthError::internal("AuthBuilder requires a session store".to_string())
        })?;

        let session_service = self.session_service.unwrap_or_else(|| {
            Arc::new(session_service::SessionService::new(
                session_service::SessionConfig::default(),
                session_store.clone(),
            ))
        });

        let user_repository = self.user_repository.ok_or_else(|| {
            AuthError::internal("AuthBuilder requires a user repository".to_string())
        })?;

        let token_store = self
            .token_store
            .ok_or_else(|| AuthError::internal("AuthBuilder requires a token store".to_string()))?;

        let email_sender = self.email_sender.ok_or_else(|| {
            AuthError::internal("AuthBuilder requires an email sender".to_string())
        })?;

        let audit_logger = self.audit_logger.ok_or_else(|| {
            AuthError::internal("AuthBuilder requires an audit logger".to_string())
        })?;

        let membership_repository = self.membership_repository.ok_or_else(|| {
            AuthError::internal("AuthBuilder requires a membership repository".to_string())
        })?;

        let password_hasher = self.password_hasher.unwrap_or_else(|| {
            Arc::new(AuthPasswordHasherAdapter::new(
                persistence::password_hasher::Argon2PasswordHasher::new(),
            ))
        });

        let clock = self.clock.unwrap_or_else(|| Arc::new(SystemClock));

        AuthService::new(
            config,
            Dependencies {
                user_repository,
                session_service,
                session_store,
                token_store,
                email_sender,
                audit_logger,
                password_hasher,
                membership_repository,
                clock,
            },
        )
    }
}
