//! Service container — composition root.

use std::sync::Arc;

use auth_service::{AuthConfig, AuthService};
use ipnet::IpNet;
use observability::health::{
    CompositeHealthReporter, HealthReporter, PostgresHealthCheck, RedisHealthCheck,
};
use observability::metrics::{install_recorder, PrometheusHandle};
use observability::HealthCheck;
use persistence::ports::RateLimiter;
use persistence::rate_limiter::{NoOpRateLimiter, RedisRateLimiter};
use persistence::repositories::cached_session_store::CachedSessionStore;
use persistence::repositories::session::PgSessionStore;

use super::Config;

/// All business services — composed together.
#[derive(Clone)]
pub struct Services {
    pub auth: Arc<AuthService>,
    pub user: Arc<user_service::UserService>,
    /// Session service exposed for HTTP authentication middleware.
    pub session: Arc<session_service::SessionService>,
    /// Rate limiter shared across auth endpoints.
    pub rate_limiter: Arc<dyn RateLimiter>,
    /// Trusted proxy networks used to resolve the real client IP from
    /// `X-Forwarded-For`. Parsed once at startup and shared across requests.
    pub trusted_proxies: Arc<Vec<IpNet>>,
    /// Readiness reporter for infrastructure dependencies.
    pub health_reporter: Arc<dyn HealthReporter>,
    /// Prometheus metrics handle used to render the `/metrics` endpoint.
    pub metrics_handle: PrometheusHandle,
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
        let user_service = Self::create_user_service(config, pool.clone()).await?;
        let rate_limiter = Self::create_rate_limiter(config).await?;
        let trusted_proxies = Arc::new(
            config::parse_trusted_proxies(&config.trusted_proxies)
                .map_err(|e| crate::GatewayError::configuration(e.to_string()))?,
        );
        let health_reporter =
            Self::create_health_reporter(&pool, config.redis_url.as_deref()).await?;
        let metrics_handle = install_recorder();

        Ok(Self {
            auth: Arc::new(auth_service),
            user: Arc::new(user_service),
            session: Arc::new(session_service),
            rate_limiter,
            trusted_proxies,
            health_reporter,
            metrics_handle,
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
    ) -> session_service::SessionService {
        session_service::SessionService::new(
            session_service::SessionConfig {
                session_duration_secs: 86400,
            },
            session_store,
        )
    }

    async fn create_user_service(
        _config: &Config,
        pool: sqlx::PgPool,
    ) -> Result<user_service::UserService, crate::GatewayError> {
        user_service::UserService::builder()
            .with_config(user_service::UserConfig::default())
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

    async fn create_health_reporter(
        pool: &sqlx::PgPool,
        redis_url: Option<&str>,
    ) -> Result<Arc<dyn HealthReporter>, crate::GatewayError> {
        let mut checks: Vec<Arc<dyn HealthCheck>> =
            vec![Arc::new(PostgresHealthCheck::new(pool.clone()))];

        if let Some(redis_url) = redis_url {
            let client = redis::Client::open(redis_url).map_err(|e| {
                crate::GatewayError::configuration(format!(
                    "Redis health check client creation: {e}"
                ))
            })?;
            let conn = client
                .get_multiplexed_async_connection()
                .await
                .map_err(|e| {
                    crate::GatewayError::configuration(format!(
                        "Redis health check connection: {e}"
                    ))
                })?;
            checks.push(Arc::new(RedisHealthCheck::new(conn)));
        }

        Ok(Arc::new(CompositeHealthReporter::new(checks)))
    }
}
