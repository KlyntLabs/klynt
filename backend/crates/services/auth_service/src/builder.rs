//! Builder for constructing an [`AuthService`] with sensible defaults.

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
/// allowing test-specific overrides.
#[derive(Default)]
pub struct AuthBuilder {
    config: Option<AuthConfig>,
    pool: Option<sqlx::PgPool>,
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

    /// Override the session service.
    pub fn with_session_service(mut self, service: Arc<session_service::SessionService>) -> Self {
        self.session_service = Some(service);
        self
    }

    /// Override the session store.
    pub fn with_session_store(
        mut self,
        store: Arc<dyn base::ports::session::SessionStore>,
    ) -> Self {
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

    /// Override the membership repository.
    pub fn with_membership_repository(mut self, repo: Arc<dyn MembershipRepository>) -> Self {
        self.membership_repository = Some(repo);
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
            Arc::new(persistence::repositories::user::PgUserRepository::new(
                pool.clone(),
            )) as Arc<dyn UserRepository>
        });

        let session_store = self.session_store.unwrap_or_else(|| {
            Arc::new(persistence::repositories::session::PgSessionStore::new(
                pool.clone(),
            )) as Arc<dyn base::ports::session::SessionStore>
        });

        let session_service = self.session_service.unwrap_or_else(|| {
            Arc::new(session_service::SessionService::new(
                session_service::SessionConfig::default(),
                session_store.clone(),
            ))
        });

        let token_store = self.token_store.unwrap_or_else(|| {
            Arc::new(persistence::repositories::token::PgTokenStore::new(
                pool.clone(),
            )) as Arc<dyn TokenStore>
        });

        let email_sender = self.email_sender.unwrap_or_else(|| {
            Arc::new(persistence::email::MockEmailService::new()) as Arc<dyn EmailSender>
        });

        let audit_logger = self.audit_logger.unwrap_or_else(|| {
            let audit_repo = Arc::new(
                persistence::repositories::audit_event::PgAuditEventRepository::new(pool.clone()),
            );
            Arc::new(observability::audit::AuditService::new(audit_repo)) as Arc<dyn AuditLogger>
        });

        let password_hasher = self.password_hasher.unwrap_or_else(|| {
            Arc::new(AuthPasswordHasherAdapter::new(
                persistence::password_hasher::Argon2PasswordHasher::new(),
            ))
        });

        let membership_repository = self.membership_repository.unwrap_or_else(|| {
            Arc::new(
                persistence::repositories::membership::PgMembershipRepository::new(pool.clone()),
            ) as Arc<dyn MembershipRepository>
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
