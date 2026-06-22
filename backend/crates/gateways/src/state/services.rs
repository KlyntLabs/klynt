//! Service container — composition root.

use std::sync::Arc;

use auth_service::{AuthConfig, AuthService};
use klynt_base::ports::session::SessionStore;
use klynt_persistence::repositories::pg_session::PgSessionStore;
use user_service::{UserConfig, UserService};

use super::Config;

/// All business services — composed together.
#[derive(Clone)]
pub struct Services {
    pub auth: Arc<AuthService>,
    pub user: Arc<UserService>,
    /// Session store exposed for HTTP authentication middleware.
    pub session_store: Arc<dyn SessionStore>,
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
    ) -> Result<(AuthService, Arc<dyn SessionStore>), crate::GatewayError> {
        // The gateway middleware needs direct access to the persistence session store.
        // The auth service uses its own session-store port backed by the same pool,
        // so both observe the same data.
        let session_store: Arc<dyn SessionStore> = Arc::new(PgSessionStore::new(pool.clone()));

        let auth_service = AuthService::builder()
            .with_config(AuthConfig {
                base_url: config.base_url.clone(),
                session_duration_secs: 86400,
                token_duration_secs: 3600,
                password_policy: None,
            })
            .with_pool(pool)
            .build()
            .await
            .map_err(|e| crate::GatewayError::configuration(format!("Auth service: {e}")))?;

        Ok((auth_service, session_store))
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
