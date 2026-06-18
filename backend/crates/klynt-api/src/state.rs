use std::sync::Arc;

use klynt_application::auth::AuthService;
use klynt_application::request_gate::UserRequestGate;
use klynt_application::users::UserService;
use klynt_domain::config::AppConfig;
use klynt_domain::ports::{HealthCheck, RateLimiter};
use klynt_domain::session::SessionStore;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub user_service: Arc<UserService>,
    pub request_gate: Arc<UserRequestGate>,
    pub auth_service: Arc<AuthService>,
    pub session_store: Arc<dyn SessionStore>,
    pub rate_limiter: Arc<dyn RateLimiter>,
    pub health_checks: Vec<Arc<dyn HealthCheck>>,
}

impl AppState {
    pub fn new(
        config: AppConfig,
        user_service: Arc<UserService>,
        request_gate: Arc<UserRequestGate>,
        auth_service: Arc<AuthService>,
        session_store: Arc<dyn SessionStore>,
        rate_limiter: Arc<dyn RateLimiter>,
        health_checks: Vec<Arc<dyn HealthCheck>>,
    ) -> Self {
        Self {
            config: Arc::new(config),
            user_service,
            request_gate,
            auth_service,
            session_store,
            rate_limiter,
            health_checks,
        }
    }
}
