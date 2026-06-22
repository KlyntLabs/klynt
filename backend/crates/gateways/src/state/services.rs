//! Service container — composition root.

use std::sync::Arc;

use auth_service::{AuthConfig, AuthService};
use ipnet::IpNet;
use persistence::ports::RateLimiter;
use persistence::rate_limiter::{NoOpRateLimiter, RedisRateLimiter};
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
    /// Rate limiter shared across auth endpoints.
    pub rate_limiter: Arc<dyn RateLimiter>,
    /// Trusted proxy networks used to resolve the real client IP from
    /// `X-Forwarded-For`. Parsed once at startup.
    pub trusted_proxies: Vec<IpNet>,
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

        let session_store = Self::create_session_store(config, pool.clone()).await;

        let auth_service =
            Self::create_auth_service(config, pool.clone(), session_store.clone()).await?;
        let session_service = Self::create_session_service(session_store);
        let user_service = Self::create_user_service(config, pool).await?;
        let rate_limiter = Self::create_rate_limiter(config).await?;
        let trusted_proxies = config::parse_trusted_proxies(&config.trusted_proxies)
            .map_err(|e| crate::GatewayError::configuration(e.to_string()))?;

        Ok(Self {
            auth: Arc::new(auth_service),
            user: Arc::new(user_service),
            session: Arc::new(session_service),
            rate_limiter,
            trusted_proxies,
        })
    }

    async fn create_session_store(
        config: &Config,
        pool: sqlx::PgPool,
    ) -> Arc<dyn base::ports::session::SessionStore> {
        let postgres = PgSessionStore::new(pool);

        if let Some(redis_url) = &config.redis_url {
            Arc::new(CachedSessionStore::connect(postgres, redis_url).await)
        } else {
            Arc::new(postgres)
        }
    }

    async fn create_auth_service(
        config: &Config,
        pool: sqlx::PgPool,
        session_store: Arc<dyn base::ports::session::SessionStore>,
    ) -> Result<AuthService, crate::GatewayError> {
        AuthService::builder()
            .with_config(AuthConfig {
                base_url: config.base_url.clone(),
                session_duration_secs: 86400,
                token_duration_secs: 3600,
                password_policy: None,
            })
            .with_pool(pool)
            .with_session_store(session_store)
            .build()
            .await
            .map_err(|e| crate::GatewayError::configuration(format!("Auth service: {e}")))
    }

    fn create_session_service(
        session_store: Arc<dyn base::ports::session::SessionStore>,
    ) -> SessionService {
        SessionService::new(
            SessionConfig {
                session_duration_secs: 86400,
            },
            session_store,
        )
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

    async fn create_rate_limiter(
        config: &Config,
    ) -> Result<Arc<dyn RateLimiter>, crate::GatewayError> {
        if !config.rate_limiter.enabled {
            return Ok(Arc::new(NoOpRateLimiter));
        }

        let redis_url = config.redis_url.as_ref().ok_or_else(|| {
            crate::GatewayError::configuration(
                "RATE_LIMITER_ENABLED is true but REDIS_URL is not configured",
            )
        })?;

        let limiter = RedisRateLimiter::new(config.rate_limiter.clone(), redis_url)
            .await
            .map_err(|e| crate::GatewayError::configuration(format!("Rate limiter: {e}")))?;
        Ok(Arc::new(limiter))
    }
}
