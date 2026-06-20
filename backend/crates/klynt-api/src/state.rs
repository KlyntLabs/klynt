use std::sync::Arc;

use klynt_application::auth::AuthService;
use klynt_application::users::{CreateUserRequest, UserService};
use klynt_domain::config::AppConfig;
use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::{Email, User, UserDto, UserId};
use klynt_domain::ports::{HealthCheck, RateLimiter};
use klynt_domain::session::{SessionStore, SessionToken};
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    config: Arc<AppConfig>,
    user_service: Arc<UserService>,
    auth_service: Arc<AuthService>,
    session_store: Arc<dyn SessionStore>,
    rate_limiter: Arc<dyn RateLimiter>,
    health_checks: Vec<Arc<dyn HealthCheck>>,
}

impl AppState {
    pub fn new(
        config: AppConfig,
        user_service: Arc<UserService>,
        auth_service: Arc<AuthService>,
        session_store: Arc<dyn SessionStore>,
        rate_limiter: Arc<dyn RateLimiter>,
        health_checks: Vec<Arc<dyn HealthCheck>>,
    ) -> Self {
        Self {
            config: Arc::new(config),
            user_service,
            auth_service,
            session_store,
            rate_limiter,
            health_checks,
        }
    }

    pub fn config(&self) -> &AppConfig {
        &self.config
    }

    pub fn rate_limiter(&self) -> &dyn RateLimiter {
        &*self.rate_limiter
    }

    pub fn session_store(&self) -> &dyn SessionStore {
        &*self.session_store
    }

    pub async fn create_user(
        &self,
        ctx: &Ctx,
        idempotency_key: Uuid,
        req: CreateUserRequest,
    ) -> Result<UserDto, DomainError> {
        self.user_service
            .create_user(ctx, idempotency_key, req)
            .await
    }

    pub async fn find_user_by_id(&self, ctx: &Ctx, id: UserId) -> Result<User, DomainError> {
        self.user_service.find_by_id(ctx, id).await
    }

    pub async fn login(
        &self,
        ctx: &Ctx,
        email: &Email,
        password: &str,
    ) -> Result<(SessionToken, UserDto), DomainError> {
        self.auth_service.login(ctx, email, password).await
    }

    pub async fn register(
        &self,
        ctx: &Ctx,
        name: String,
        email: &Email,
        password: &str,
        terms_accepted: bool,
        terms_version: String,
    ) -> Result<UserId, DomainError> {
        self.auth_service
            .register(ctx, name, email, password, terms_accepted, terms_version)
            .await
    }

    pub async fn verify_email(&self, ctx: &Ctx, token: &str) -> Result<UserId, DomainError> {
        self.auth_service.verify_email(ctx, token).await
    }

    pub async fn request_password_reset(
        &self,
        ctx: &Ctx,
        email: &Email,
    ) -> Result<(), DomainError> {
        self.auth_service.request_password_reset(ctx, email).await
    }

    pub async fn reset_password(
        &self,
        ctx: &Ctx,
        token: &str,
        new_password: &str,
    ) -> Result<(), DomainError> {
        self.auth_service
            .reset_password(ctx, token, new_password)
            .await
    }

    pub async fn check_health(&self) -> Result<(), DomainError> {
        for check in &self.health_checks {
            check.check().await?;
        }
        Ok(())
    }
}
