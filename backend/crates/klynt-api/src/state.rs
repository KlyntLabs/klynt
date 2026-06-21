use std::sync::Arc;

use crate::services::AuthenticationServices;
use klynt_domain::config::AppConfig;
use klynt_domain::ports::{ComponentHealth, HealthCheck, RateLimiter};
use klynt_domain::session::SessionStore;

#[derive(Clone)]
pub struct AppState {
    config: Arc<AppConfig>,
    auth_services: AuthenticationServices,
    session_store: Arc<dyn SessionStore>,
    rate_limiter: Arc<dyn RateLimiter>,
    health_checks: Vec<Arc<dyn HealthCheck>>,
}

/// Named dependency bag for constructing [`AppState`].
pub struct AppStateDeps {
    pub config: AppConfig,
    pub auth_services: AuthenticationServices,
    pub session_store: Arc<dyn SessionStore>,
    pub rate_limiter: Arc<dyn RateLimiter>,
    pub health_checks: Vec<Arc<dyn HealthCheck>>,
}

impl AppState {
    pub fn new(deps: AppStateDeps) -> Self {
        Self {
            config: Arc::new(deps.config),
            auth_services: deps.auth_services,
            session_store: deps.session_store,
            rate_limiter: deps.rate_limiter,
            health_checks: deps.health_checks,
        }
    }

    pub fn config(&self) -> &AppConfig {
        &self.config
    }

    pub fn rate_limiter(&self) -> &dyn RateLimiter {
        &*self.rate_limiter
    }

    pub fn rate_limiter_arc(&self) -> Arc<dyn RateLimiter> {
        Arc::clone(&self.rate_limiter)
    }

    pub fn session_store(&self) -> &dyn SessionStore {
        &*self.session_store
    }

    pub fn auth(&self) -> &AuthenticationServices {
        &self.auth_services
    }

    pub async fn check_health(&self) -> Vec<ComponentHealth> {
        let mut results = Vec::with_capacity(self.health_checks.len());
        for check in &self.health_checks {
            results.push(check.check().await);
        }
        results
    }
}
