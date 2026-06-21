//! Builder for constructing an [`AuthService`] with sensible defaults.

use std::sync::Arc;

use klynt_base::ports::{Clock, PasswordHasher, SystemClock};

use crate::application::ports::{AuditLogger, EmailSender, UserRepository};
use crate::domain::{SessionStore, TokenStore};
use crate::error::AuthError;
use crate::infrastructure::{
    repositories::{
        SessionRepositoryAdapter, TokenRepositoryAdapter,
        UserRepositoryAdapter as AuthUserRepositoryAdapter,
    },
    services::{
        AuditLoggerAdapter as AuthAuditLoggerAdapter, EmailSenderAdapter,
        PasswordHasherAdapter as AuthPasswordHasherAdapter,
    },
};
use crate::AuthConfig;
use crate::AuthService;
use crate::Dependencies;

/// Builder for [`AuthService`].
///
/// Provides a fluent API for wiring production dependencies while
/// allowing test-specific overrides.
#[derive(Default)]
pub struct AuthBuilder {
    config: Option<AuthConfig>,
    pool: Option<sqlx::PgPool>,
    user_repository: Option<Arc<dyn UserRepository>>,
    session_store: Option<Arc<dyn SessionStore>>,
    token_store: Option<Arc<dyn TokenStore>>,
    email_sender: Option<Arc<dyn EmailSender>>,
    audit_logger: Option<Arc<dyn AuditLogger>>,
    password_hasher: Option<Arc<dyn PasswordHasher>>,
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

    /// Set the PostgreSQL connection pool used to create default adapters.
    pub fn with_pool(mut self, pool: sqlx::PgPool) -> Self {
        self.pool = Some(pool);
        self
    }

    /// Override the user repository.
    pub fn with_user_repository(mut self, repo: Arc<dyn UserRepository>) -> Self {
        self.user_repository = Some(repo);
        self
    }

    /// Override the session store.
    pub fn with_session_store(mut self, store: Arc<dyn SessionStore>) -> Self {
        self.session_store = Some(store);
        self
    }

    /// Override the token store.
    pub fn with_token_store(mut self, store: Arc<dyn TokenStore>) -> Self {
        self.token_store = Some(store);
        self
    }

    /// Override the email sender.
    pub fn with_email_sender(mut self, sender: Arc<dyn EmailSender>) -> Self {
        self.email_sender = Some(sender);
        self
    }

    /// Override the audit logger.
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

    /// Build the service, creating default adapters for any unwired dependency.
    ///
    /// # Errors
    ///
    /// Returns an error if no pool was provided and a default adapter is needed.
    pub async fn build(self) -> Result<AuthService, AuthError> {
        let pool = self.pool.ok_or_else(|| {
            AuthError::internal("AuthBuilder requires a PostgreSQL pool".to_string())
        })?;

        let config = self.config.unwrap_or_default();

        let user_repository = self.user_repository.unwrap_or_else(|| {
            Arc::new(AuthUserRepositoryAdapter::new(
                klynt_persistence::repositories::pg_user::PgUserRepository::new(pool.clone()),
            ))
        });

        let session_store = self.session_store.unwrap_or_else(|| {
            Arc::new(SessionRepositoryAdapter::new(
                klynt_persistence::repositories::pg_session::PgSessionStore::new(pool.clone()),
            ))
        });

        let token_store = self.token_store.unwrap_or_else(|| {
            Arc::new(TokenRepositoryAdapter::new(
                klynt_persistence::repositories::sqlx_token_repo::PgTokenStore::new(pool.clone()),
            ))
        });

        let email_sender = self.email_sender.unwrap_or_else(|| {
            let email_service: klynt_persistence::ports::SharedEmailService =
                Arc::new(klynt_persistence::email::MockEmailService::new());
            Arc::new(EmailSenderAdapter::new(email_service))
        });

        let audit_logger = self.audit_logger.unwrap_or_else(|| {
            let audit_repo = Arc::new(
                klynt_persistence::repositories::sqlx_audit_repo::PgAuditEventRepository::new(
                    pool.clone(),
                ),
            );
            let audit_service = Arc::new(klynt_telemetry::audit::AuditService::new(audit_repo));
            Arc::new(AuthAuditLoggerAdapter::new(audit_service))
        });

        let password_hasher = self.password_hasher.unwrap_or_else(|| {
            Arc::new(AuthPasswordHasherAdapter::new(
                klynt_persistence::password_hasher::Argon2PasswordHasher::new(),
            ))
        });

        let clock = self.clock.unwrap_or_else(|| Arc::new(SystemClock));

        AuthService::new(
            config,
            Dependencies {
                user_repository,
                session_store,
                token_store,
                email_sender,
                audit_logger,
                password_hasher,
                clock,
            },
        )
    }
}
