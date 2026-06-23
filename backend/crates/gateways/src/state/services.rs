//! Service container — composition root.

use std::sync::Arc;

use auth_service::{AuthConfig, AuthService};
use ipnet::IpNet;
use observability::health::{
    AlwaysUnhealthyCheck, CompositeHealthReporter, HealthReporter, PostgresHealthCheck,
    RedisHealthCheck,
};
use observability::metrics::{install_recorder, PrometheusHandle};
use observability::HealthCheck;
use persistence::ports::RateLimiter;
use persistence::rate_limiter::{NoOpRateLimiter, RedisRateLimiter};
use persistence::repositories::cached_session_store::CachedSessionStore;
use persistence::repositories::session::PgSessionStore;
use tenant_service::TenantService;

use super::Config;

/// All business services — composed together.
#[derive(Clone)]
pub struct Services {
    pub auth: Arc<AuthService>,
    pub user: Arc<user_service::UserService>,
    /// Tenant service exposed for tenant management endpoints.
    pub tenant: Arc<TenantService>,
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
    /// Gateway configuration used by handlers and middleware.
    pub config: Config,
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
        let session_service = Arc::new(Self::create_session_service(config, session_store.clone()));

        let auth_service = Self::create_auth_service(
            config,
            pool.clone(),
            session_store.clone(),
            session_service.clone(),
        )
        .await?;
        let user_service = Self::create_user_service(config, pool.clone()).await?;
        let tenant_service = Self::create_tenant_service(pool.clone()).await?;
        let rate_limiter = Self::create_rate_limiter(config).await?;
        let trusted_proxies = Arc::new(
            config::parse_trusted_proxies(&config.trusted_proxies)
                .map_err(|e| crate::GatewayError::configuration(e.to_string()))?,
        );
        let health_reporter = Self::create_health_reporter(&pool, config.redis_url.as_deref());
        let metrics_handle = install_recorder();

        Ok(Self {
            auth: Arc::new(auth_service),
            user: Arc::new(user_service),
            tenant: Arc::new(tenant_service),
            session: session_service,
            rate_limiter,
            trusted_proxies,
            health_reporter,
            metrics_handle,
            config: config.clone(),
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
        session_service: Arc<session_service::SessionService>,
    ) -> Result<AuthService, crate::GatewayError> {
        AuthService::builder()
            .with_config(AuthConfig {
                base_url: config.base_url.clone(),
                token_duration_secs: 3600,
                password_policy: None,
            })
            .with_pool(pool)
            .with_session_store(session_store)
            .with_session_service(session_service)
            .build()
            .await
            .map_err(|e| crate::GatewayError::configuration(format!("Auth service: {e}")))
    }

    fn create_session_service(
        config: &Config,
        session_store: Arc<dyn base::ports::session::SessionStore>,
    ) -> session_service::SessionService {
        let session_config = session_service::SessionConfig {
            session_duration_secs: config.session.session_duration_secs,
            long_session_duration_secs: config.session.long_session_duration_secs,
            refresh_duration_secs: config.session.refresh_duration_secs,
        };
        session_service::SessionService::new(session_config, session_store)
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

    async fn create_tenant_service(
        pool: sqlx::PgPool,
    ) -> Result<TenantService, crate::GatewayError> {
        TenantService::builder()
            .with_config(tenant_service::TenantConfig::default())
            .with_pool(pool)
            .build()
            .await
            .map_err(|e| crate::GatewayError::configuration(format!("Tenant service: {e}")))
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

    fn create_health_reporter(
        pool: &sqlx::PgPool,
        redis_url: Option<&str>,
    ) -> Arc<dyn HealthReporter> {
        let mut checks: Vec<Arc<dyn HealthCheck>> =
            vec![Arc::new(PostgresHealthCheck::new(pool.clone()))];

        if let Some(redis_url) = redis_url {
            match redis::Client::open(redis_url) {
                Ok(client) => checks.push(Arc::new(RedisHealthCheck::new(client))),
                Err(e) => {
                    tracing::error!(error = %e, "failed to create redis health check client");
                    // Fall back to a check that will always report unhealthy so
                    // readiness reflects the misconfiguration without crashing.
                    checks.push(Arc::new(AlwaysUnhealthyCheck::new("redis")));
                }
            }
        }

        Arc::new(CompositeHealthReporter::new(checks))
    }
}
