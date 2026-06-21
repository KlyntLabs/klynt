use std::sync::Arc;

use klynt_application::auth::AuthService;
use klynt_application::users::UserService;
use klynt_domain::config::AppConfig;
use klynt_domain::errors::DomainError;
use klynt_domain::ports::{HealthCheck, RateLimiter};
use klynt_domain::session::SessionStore;

#[derive(Clone)]
pub struct AppState {
    config: Arc<AppConfig>,
    user_service: Arc<UserService>,
    auth_service: Arc<AuthService>,
    session_store: Arc<dyn SessionStore>,
    rate_limiter: Arc<dyn RateLimiter>,
    health_checks: Vec<Arc<dyn HealthCheck>>,
}

/// Named dependency bag for constructing [`AppState`].
pub struct AppStateDeps {
    pub config: AppConfig,
    pub user_service: Arc<UserService>,
    pub auth_service: Arc<AuthService>,
    pub session_store: Arc<dyn SessionStore>,
    pub rate_limiter: Arc<dyn RateLimiter>,
    pub health_checks: Vec<Arc<dyn HealthCheck>>,
}

impl AppState {
    pub fn new(deps: AppStateDeps) -> Self {
        Self {
            config: Arc::new(deps.config),
            user_service: deps.user_service,
            auth_service: deps.auth_service,
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

    pub fn user_service(&self) -> &UserService {
        &self.user_service
    }

    pub fn auth_service(&self) -> &AuthService {
        &self.auth_service
    }

    pub async fn check_health(&self) -> Result<(), DomainError> {
        for check in &self.health_checks {
            check.check().await?;
        }
        Ok(())
    }
}
