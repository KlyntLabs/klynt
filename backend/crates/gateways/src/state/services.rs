//! Service container — composition root.

use std::sync::Arc;

use auth_service::{AuthConfig, AuthService};
use base::ports::repository::{
    DesktopAppRepository, MembershipRepository, TenantDesktopLayoutRepository,
    TenantInviteRepository, TenantRepository, UserRepository,
};
use base::ports::{
    AuditLogger, Clock, EmailSender, PasswordHasher, PermissionRepository, RoleRepository,
    TokenStore,
};
use infra_facades::{InfraFacade, PersistenceFacade};
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
use persistence::PasswordHasherAdapter;
use session_coordinator::{SessionCoordinator, SessionCoordinatorConfig};
use tenant_service::{DesktopAppService, TenantDesktopLayoutService, TenantService};

use super::Config;

/// All business services — composed together.
#[derive(Clone)]
pub struct Services {
    pub auth: Arc<AuthService>,
    pub user: Arc<user_service::UserService>,
    /// Tenant service exposed for tenant management endpoints.
    pub tenant: Arc<TenantService>,
    /// Tenant desktop layout service.
    pub desktop_layout: Arc<TenantDesktopLayoutService>,
    /// Desktop app service.
    pub desktop_apps: Arc<DesktopAppService>,
    /// Session service exposed for HTTP authentication middleware.
    pub session: Arc<session_service::SessionService>,
    /// Database pool used by background jobs and direct DB operations.
    pub pool: sqlx::PgPool,
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

        let persistence_facade = Arc::new(PersistenceFacade::new(
            Arc::new(persistence::repositories::user::PgUserRepository::new(pool.clone()))
                as Arc<dyn UserRepository>,
            Arc::new(persistence::repositories::tenant::PgTenantRepository::new(pool.clone()))
                as Arc<dyn TenantRepository>,
            Arc::new(persistence::repositories::membership::PgMembershipRepository::new(pool.clone()))
                as Arc<dyn MembershipRepository>,
            Arc::new(
                persistence::repositories::tenant_invite::PgTenantInviteRepository::new(pool.clone()),
            ) as Arc<dyn TenantInviteRepository>,
            Arc::new(persistence::repositories::permission::PgPermissionRepository::new(pool.clone()))
                as Arc<dyn PermissionRepository>,
            Arc::new(persistence::repositories::role::PgRoleRepository::new(pool.clone()))
                as Arc<dyn RoleRepository>,
            Arc::new(
                persistence::repositories::tenant_desktop_layout::PgTenantDesktopLayoutRepository::new(
                    pool.clone(),
                ),
            ) as Arc<dyn TenantDesktopLayoutRepository>,
            Arc::new(persistence::repositories::desktop_app::PgDesktopAppRepository::new(
                pool.clone(),
            )) as Arc<dyn DesktopAppRepository>,
            session_store.clone(),
            Arc::new(persistence::repositories::token::PgTokenStore::new(pool.clone()))
                as Arc<dyn TokenStore>,
            Arc::new(observability::audit::AuditService::new(Arc::new(
                persistence::repositories::audit_event::PgAuditEventRepository::new(pool.clone()),
            ))) as Arc<dyn AuditLogger>,
        ));

        let email_sender: Arc<dyn EmailSender> =
            Arc::new(persistence::email::MockEmailService::new());
        let clock: Arc<dyn Clock> = Arc::new(base::ports::SystemClock);
        let password_hasher: Arc<dyn PasswordHasher> = Arc::new(PasswordHasherAdapter::new(
            persistence::password_hasher::Argon2PasswordHasher::new(),
        ));
        let infra_facade = Arc::new(InfraFacade::new(password_hasher, email_sender, clock));

        let session_service = Arc::new(Self::create_session_service(
            config,
            session_store.clone(),
            infra_facade.clock.clone(),
        ));

        let session_coordinator = Arc::new(Self::create_session_coordinator(
            config,
            session_store.clone(),
        ));

        let auth_service = Self::create_auth_service(
            config,
            persistence_facade.clone(),
            infra_facade.clone(),
            session_service.clone(),
        )?;
        let user_service =
            Self::create_user_service(config, persistence_facade.clone(), infra_facade.clone())?;
        let tenant_service =
            Self::create_tenant_service(persistence_facade.clone(), session_coordinator)?;
        let desktop_layout_service =
            Self::create_desktop_layout_service(persistence_facade.clone());
        let desktop_apps_service = Arc::new(DesktopAppService::new(
            persistence_facade.app_repository.clone(),
            persistence_facade.layout_repository.clone(),
            persistence_facade.audit_logger.clone(),
        ));
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
            desktop_layout: Arc::new(desktop_layout_service),
            desktop_apps: desktop_apps_service,
            session: session_service,
            pool,
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

    fn create_auth_service(
        config: &Config,
        persistence_facade: Arc<PersistenceFacade>,
        infra_facade: Arc<InfraFacade>,
        session_service: Arc<session_service::SessionService>,
    ) -> Result<AuthService, crate::GatewayError> {
        AuthService::builder()
            .with_config(AuthConfig {
                base_url: config.base_url.clone(),
                token_duration_secs: 3600,
                password_policy: None,
            })
            .with_persistence_facade(persistence_facade)
            .with_infra_facade(infra_facade)
            .with_session_service(session_service)
            .build()
            .map_err(|e| crate::GatewayError::configuration(format!("Auth service: {e}")))
    }

    fn create_session_service(
        config: &Config,
        session_store: Arc<dyn base::ports::session::SessionStore>,
        clock: Arc<dyn Clock>,
    ) -> session_service::SessionService {
        let session_config = session_service::SessionConfig {
            session_duration_secs: config.session.session_duration_secs,
            long_session_duration_secs: config.session.long_session_duration_secs,
            refresh_duration_secs: config.session.refresh_duration_secs,
        };
        session_service::SessionService::with_clock(session_config, session_store, clock)
    }

    fn create_user_service(
        _config: &Config,
        persistence_facade: Arc<PersistenceFacade>,
        infra_facade: Arc<InfraFacade>,
    ) -> Result<user_service::UserService, crate::GatewayError> {
        user_service::UserService::builder()
            .with_config(user_service::UserConfig::default())
            .with_persistence_facade(persistence_facade)
            .with_infra_facade(infra_facade)
            .build()
            .map_err(|e| crate::GatewayError::configuration(format!("User service: {e}")))
    }

    fn create_session_coordinator(
        config: &Config,
        session_store: Arc<dyn base::ports::session::SessionStore>,
    ) -> SessionCoordinator {
        SessionCoordinator::new(
            session_store,
            SessionCoordinatorConfig {
                enabled: config.session_sync_enabled,
            },
        )
    }

    fn create_tenant_service(
        persistence_facade: Arc<PersistenceFacade>,
        session_coordinator: Arc<SessionCoordinator>,
    ) -> Result<TenantService, crate::GatewayError> {
        TenantService::builder()
            .with_config(tenant_service::TenantConfig::default())
            .with_persistence_facade(persistence_facade)
            .with_session_coordinator(session_coordinator)
            .build()
            .map_err(|e| crate::GatewayError::configuration(format!("Tenant service: {e}")))
    }

    fn create_desktop_layout_service(
        persistence_facade: Arc<PersistenceFacade>,
    ) -> TenantDesktopLayoutService {
        TenantDesktopLayoutService::new(persistence_facade.layout_repository.clone())
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
