//! Test support utilities and fake implementations for the gateway.

#![allow(dead_code)]
#![allow(unused_imports)]

use std::sync::Arc;

use base::ports::{Clock, PasswordHashError, PasswordHasher};
use chrono::{DateTime, Utc};
use ipnet::IpNet;
use persistence::ports::RateLimiter;
use persistence::rate_limiter::NoOpRateLimiter;

pub mod auth;
pub mod rate_limiter;
pub mod session;
pub mod tenant;
pub mod user;

pub use auth::{
    build_test_auth_service, build_test_auth_service_with_session_store, FakeSessionStore,
    FakeUserRepository as FakeAuthUserRepository,
};
pub use rate_limiter::FakeRateLimiter;
pub use session::FakePersistenceSessionStore;
pub use tenant::{
    build_stateful_test_tenant_service, build_test_tenant_service, FakeTenantInviteRepository,
    StatefulFakeMembershipRepository, StatefulFakeTenantRepository,
};
pub use user::{build_test_user_service, FakeUserServiceRepository};

/// Fixed clock for deterministic tests.
#[derive(Clone)]
pub struct FixedClock {
    pub now: DateTime<Utc>,
}

impl FixedClock {
    pub fn new(now: DateTime<Utc>) -> Self {
        Self { now }
    }
}

impl Clock for FixedClock {
    fn now(&self) -> DateTime<Utc> {
        self.now
    }
}

/// Fake password hasher that accepts any password matching "hash-{password}".
#[derive(Default, Clone)]
pub struct FakePasswordHasher;

#[async_trait::async_trait]
impl PasswordHasher for FakePasswordHasher {
    async fn hash(&self, password: &str) -> Result<String, PasswordHashError> {
        Ok(format!("hash-{password}"))
    }

    async fn verify(&self, password: &str, hash: &str) -> Result<bool, PasswordHashError> {
        Ok(hash == format!("hash-{password}"))
    }
}

/// Build test gateway services with exposed fakes for protected route tests.
pub fn build_test_services_with_fakes() -> (
    gateways::state::Services,
    Arc<session_service::SessionService>,
    Arc<FakeUserServiceRepository>,
) {
    let (auth_service, _, _) = build_test_auth_service();
    let session_store = Arc::new(FakePersistenceSessionStore::default());
    let session_service = Arc::new(session_service::SessionService::new(
        session_service::SessionConfig::default(),
        session_store,
    ));
    let (user_service, user_repo) = build_test_user_service();

    let services = gateways::state::Services {
        auth: Arc::new(auth_service),
        user: Arc::new(user_service),
        tenant: Arc::new(tenant::build_test_tenant_service()),
        desktop_layout: build_test_desktop_layout_service(),
        session: session_service.clone(),
        pool: dummy_pool(),
        rate_limiter: Arc::new(NoOpRateLimiter),
        trusted_proxies: Arc::new(Vec::new()),
        health_reporter: Arc::new(observability::health::AlwaysReadyHealthReporter),
        metrics_handle: observability::metrics::install_recorder(),
        config: test_config(),
    };

    (services, session_service, user_repo)
}

/// Build test gateway services with stateful tenant fakes for tenant route tests.
pub fn build_test_services_with_tenant_fakes(
    tenant_repo: Arc<StatefulFakeTenantRepository>,
    membership_repo: Arc<StatefulFakeMembershipRepository>,
) -> (
    gateways::state::Services,
    Arc<session_service::SessionService>,
    Arc<FakeTenantInviteRepository>,
    Arc<FakeUserServiceRepository>,
) {
    let (auth_service, _, _) = build_test_auth_service();
    let session_store = Arc::new(FakePersistenceSessionStore::default());
    let session_service = Arc::new(session_service::SessionService::new(
        session_service::SessionConfig::default(),
        session_store,
    ));
    let (user_service, user_repo) = build_test_user_service();
    let invite_repo = Arc::new(FakeTenantInviteRepository::default());

    let services = gateways::state::Services {
        auth: Arc::new(auth_service),
        user: Arc::new(user_service),
        tenant: Arc::new(tenant::build_stateful_test_tenant_service(
            tenant_repo,
            membership_repo,
            invite_repo.clone(),
            user_repo.clone(),
        )),
        desktop_layout: build_test_desktop_layout_service(),
        session: session_service.clone(),
        pool: dummy_pool(),
        rate_limiter: Arc::new(NoOpRateLimiter),
        trusted_proxies: Arc::new(Vec::new()),
        health_reporter: Arc::new(observability::health::AlwaysReadyHealthReporter),
        metrics_handle: observability::metrics::install_recorder(),
        config: test_config(),
    };

    (services, session_service, invite_repo, user_repo)
}

/// Build test gateway services.
pub fn build_test_services() -> gateways::state::Services {
    let (services, _, _) = build_test_services_with_fakes();
    services
}

/// Build test gateway services with a custom rate limiter.
pub fn build_test_services_with_rate_limiter(
    rate_limiter: Arc<dyn RateLimiter>,
) -> gateways::state::Services {
    let (mut services, _, _) = build_test_services_with_fakes();
    services.rate_limiter = rate_limiter;
    services
}

/// Build test gateway services with a custom rate limiter and trusted proxies.
pub fn build_test_services_with_rate_limiter_and_proxies(
    rate_limiter: Arc<dyn RateLimiter>,
    trusted_proxies: Vec<IpNet>,
) -> gateways::state::Services {
    let (mut services, _, _) = build_test_services_with_fakes();
    services.rate_limiter = rate_limiter;
    services.trusted_proxies = Arc::new(trusted_proxies);
    services
}

/// Build test gateway services with a custom health reporter.
pub fn build_test_services_with_health_reporter(
    health_reporter: Arc<dyn observability::health::HealthReporter>,
) -> gateways::state::Services {
    let (mut services, _, _) = build_test_services_with_fakes();
    services.health_reporter = health_reporter;
    services
}

/// Build test gateway services with both fake user repositories exposed.
pub fn build_test_services_with_auth_fakes() -> (
    gateways::state::Services,
    Arc<session_service::SessionService>,
    Arc<FakeAuthUserRepository>,
    Arc<FakeUserServiceRepository>,
) {
    let session_store = Arc::new(FakeSessionStore::default());
    let (auth_service, auth_user_repository, _) =
        build_test_auth_service_with_session_store(session_store.clone());
    let session_service = Arc::new(session_service::SessionService::new(
        session_service::SessionConfig::default(),
        session_store,
    ));
    let (user_service, user_service_repository) = build_test_user_service();

    let services = gateways::state::Services {
        auth: Arc::new(auth_service),
        user: Arc::new(user_service),
        tenant: Arc::new(tenant::build_test_tenant_service()),
        desktop_layout: build_test_desktop_layout_service(),
        session: session_service.clone(),
        pool: dummy_pool(),
        rate_limiter: Arc::new(NoOpRateLimiter),
        trusted_proxies: Arc::new(Vec::new()),
        health_reporter: Arc::new(observability::health::AlwaysReadyHealthReporter),
        metrics_handle: observability::metrics::install_recorder(),
        config: test_config(),
    };

    (
        services,
        session_service,
        auth_user_repository,
        user_service_repository,
    )
}

fn build_test_desktop_layout_service() -> Arc<tenant_service::TenantDesktopLayoutService> {
    let repository = Arc::new(
        persistence::repositories::tenant_desktop_layout::PgTenantDesktopLayoutRepository::new(
            dummy_pool(),
        ),
    ) as Arc<dyn base::ports::repository::TenantDesktopLayoutRepository>;

    Arc::new(tenant_service::TenantDesktopLayoutService::new(repository))
}

/// Default test configuration.
pub fn test_config() -> gateways::Config {
    gateways::Config::default()
}

/// Lazy, never-connected pool for tests that construct `Services` but do not
/// touch the database.
fn dummy_pool() -> sqlx::PgPool {
    sqlx::PgPool::connect_lazy("postgres://localhost:1/dummy")
        .expect("lazy pool construction should succeed")
}
