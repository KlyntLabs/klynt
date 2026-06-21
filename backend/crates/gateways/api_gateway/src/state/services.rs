//! Service container — composition root.

use std::sync::Arc;

use auth_service::{
    infrastructure::{
        repositories::{
            SessionRepositoryAdapter, TokenRepositoryAdapter,
            UserRepositoryAdapter as AuthUserRepositoryAdapter,
        },
        services::{
            AuditLoggerAdapter as AuthAuditLoggerAdapter, EmailSenderAdapter,
            PasswordHasherAdapter as AuthPasswordHasherAdapter,
        },
    },
    AuthConfig, AuthService, Dependencies as AuthDependencies,
};
use klynt_infrastructure::{
    email::MockEmailService,
    password_hasher::Argon2PasswordHasher,
    repositories::{
        pg_session::PgSessionStore, pg_user::PgUserRepository,
        sqlx_audit_repo::PgAuditEventRepository, sqlx_token_repo::PgTokenStore,
    },
};
use user_service::{
    infrastructure::{
        repositories::UserRepositoryAdapter as UserRepoAdapter,
        services::{
            AuditLoggerAdapter as UserAuditLoggerAdapter,
            PasswordHasherAdapter as UserPasswordHasherAdapter,
        },
    },
    Dependencies as UserDependencies, UserConfig, UserService,
};

use super::Config;

/// All business services — composed together.
#[derive(Clone)]
pub struct Services {
    pub auth: Arc<AuthService>,
    pub user: Arc<UserService>,
    /// Session store exposed for HTTP authentication middleware.
    pub session_store: Arc<dyn klynt_domain::session::SessionStore>,
}

impl Services {
    /// Create all services from configuration.
    ///
    /// This is the **composition root** — where all dependencies are wired together.
    pub async fn from_config(config: &Config) -> Result<Self, crate::GatewayError> {
        if config.database_url.is_empty() {
            return Err(crate::GatewayError::configuration(
                "DATABASE_URL is required",
            ));
        }

        let pool = sqlx::PgPool::connect(&config.database_url)
            .await
            .map_err(|e| crate::GatewayError::configuration(format!("Database connection: {e}")))?;

        sqlx::migrate!("../../../migrations")
            .run(&pool)
            .await
            .map_err(|e| crate::GatewayError::configuration(format!("Migrations: {e}")))?;

        let (auth_service, session_store) = Self::create_auth_service(config, pool.clone()).await?;
        let user_service = Self::create_user_service(config, pool).await?;

        Ok(Self {
            auth: Arc::new(auth_service),
            user: Arc::new(user_service),
            session_store,
        })
    }

    async fn create_auth_service(
        config: &Config,
        pool: sqlx::PgPool,
    ) -> Result<(AuthService, Arc<dyn klynt_domain::session::SessionStore>), crate::GatewayError>
    {
        let user_repository = Arc::new(AuthUserRepositoryAdapter::new(PgUserRepository::new(
            pool.clone(),
        )));
        // The auth service adapter needs a concrete type implementing the legacy
        // `SessionStore` trait, while the gateway middleware needs a trait object.
        // Both are backed by the same pool, so they observe the same data.
        let session_store = Arc::new(SessionRepositoryAdapter::new(PgSessionStore::new(
            pool.clone(),
        )));
        let legacy_session_store: Arc<dyn klynt_domain::session::SessionStore> =
            Arc::new(PgSessionStore::new(pool.clone()));
        let token_store = Arc::new(TokenRepositoryAdapter::new(PgTokenStore::new(pool.clone())));

        let audit_repo = Arc::new(PgAuditEventRepository::new(pool.clone()));
        let audit_service = Arc::new(klynt_application::audit::AuditService::new(audit_repo));
        let audit_logger = Arc::new(AuthAuditLoggerAdapter::new(audit_service));

        let email_service: klynt_domain::ports::SharedEmailService =
            Arc::new(MockEmailService::new());
        let email_sender = Arc::new(EmailSenderAdapter::new(email_service));

        let password_hasher: Arc<dyn auth_service::application::ports::PasswordHasher> =
            Arc::new(AuthPasswordHasherAdapter::new(Argon2PasswordHasher::new()));

        let clock: Arc<dyn auth_service::application::ports::Clock> =
            Arc::new(auth_service::application::ports::SystemClock);

        let auth_service = AuthService::new(
            AuthConfig {
                base_url: config.base_url.clone(),
                session_duration_secs: 86400,
                token_duration_secs: 3600,
                password_policy: None,
            },
            AuthDependencies {
                user_repository,
                session_store,
                token_store,
                email_sender,
                audit_logger,
                password_hasher,
                clock,
            },
        )
        .map_err(|e| crate::GatewayError::configuration(format!("Auth service: {e}")))?;

        Ok((auth_service, legacy_session_store))
    }

    async fn create_user_service(
        _config: &Config,
        pool: sqlx::PgPool,
    ) -> Result<UserService, crate::GatewayError> {
        let user_repository = Arc::new(UserRepoAdapter::new(PgUserRepository::new(pool.clone())));

        let audit_repo = Arc::new(PgAuditEventRepository::new(pool.clone()));
        let audit_service = Arc::new(klynt_application::audit::AuditService::new(audit_repo));
        let audit_logger = Arc::new(UserAuditLoggerAdapter::new(audit_service));

        let password_hasher: Arc<dyn user_service::application::ports::PasswordHasher> =
            Arc::new(UserPasswordHasherAdapter::new(Argon2PasswordHasher::new()));

        let clock: Arc<dyn user_service::application::ports::Clock> =
            Arc::new(user_service::application::ports::SystemClock);

        UserService::new(
            UserConfig::default(),
            UserDependencies {
                user_repository,
                audit_logger,
                password_hasher,
                clock,
            },
        )
        .map_err(|e| crate::GatewayError::configuration(format!("User service: {e}")))
    }
}
