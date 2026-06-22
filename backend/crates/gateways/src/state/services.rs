//! Service container — composition root.

use std::sync::Arc;

use auth_service::{AuthConfig, AuthService};
use persistence::repositories::cached_session_store::CachedSessionStore;
use persistence::repositories::session::PgSessionStore;
use session_service::{SessionConfig, SessionService};
use user_service::{UserConfig, UserService};

use super::Config;

/// All business services — composed together.
#[derive(Clone)]
pub struct Services {
    pub auth: Arc<AuthService>,
    pub user: Arc<UserService>,
    /// Session service exposed for HTTP authentication middleware.
    pub session: Arc<SessionService>,
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

        sqlx::migrate!("../../migrations")
            .run(&pool)
            .await
            .map_err(|e| crate::GatewayError::configuration(format!("Migrations: {e}")))?;

        let auth_service = Self::create_auth_service(config, pool.clone()).await?;
        let session_service = Self::create_session_service(config, pool.clone()).await?;
        let user_service = Self::create_user_service(config, pool).await?;

        Ok(Self {
            auth: Arc::new(auth_service),
            user: Arc::new(user_service),
            session: Arc::new(session_service),
        })
    }

    async fn create_auth_service(
        config: &Config,
        pool: sqlx::PgPool,
    ) -> Result<AuthService, crate::GatewayError> {
        AuthService::builder()
            .with_config(AuthConfig {
                base_url: config.base_url.clone(),
                session_duration_secs: 86400,
                token_duration_secs: 3600,
                password_policy: None,
            })
            .with_pool(pool)
            .build()
            .await
            .map_err(|e| crate::GatewayError::configuration(format!("Auth service: {e}")))
    }

    async fn create_session_service(
        config: &Config,
        pool: sqlx::PgPool,
    ) -> Result<SessionService, crate::GatewayError> {
        let postgres = PgSessionStore::new(pool);

        let store: Arc<dyn base::ports::session::SessionStore> = if let Some(redis_url) =
            &config.redis_url
        {
            let client = redis::Client::open(redis_url.as_str())
                .map_err(|e| crate::GatewayError::configuration(format!("Redis client: {e}")))?;
            let conn = client
                .get_multiplexed_async_connection()
                .await
                .map_err(|e| {
                    crate::GatewayError::configuration(format!("Redis connection: {e}"))
                })?;
            Arc::new(CachedSessionStore::new(postgres, conn))
        } else {
            Arc::new(postgres)
        };

        Ok(SessionService::new(
            SessionConfig {
                session_duration_secs: 86400,
            },
            store,
        ))
    }

    async fn create_user_service(
        _config: &Config,
        pool: sqlx::PgPool,
    ) -> Result<UserService, crate::GatewayError> {
        UserService::builder()
            .with_config(UserConfig::default())
            .with_pool(pool)
            .build()
            .await
            .map_err(|e| crate::GatewayError::configuration(format!("User service: {e}")))
    }
}
