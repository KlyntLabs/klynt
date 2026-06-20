use std::sync::Arc;

use axum::Router;
use klynt_api::startup::build_router;
use klynt_api::state::AppState;
use klynt_application::audit::AuditService;
use klynt_application::auth::AuthService;
use klynt_application::users::UserService;
use klynt_domain::config::AppConfig;
use klynt_domain::models::UserDto;
use klynt_domain::ports::{HealthCheck, IdempotencyStore, PasswordHasher, SharedEmailService};
use klynt_domain::repositories::AuditEventRepository;
use klynt_domain::session::SessionStore;
use klynt_infrastructure::email::MockEmailService;
use klynt_infrastructure::password_hasher::Argon2PasswordHasher;
use klynt_infrastructure::rate_limiter::RateLimiter as InMemoryRateLimiter;
use klynt_infrastructure::repositories::idempotency::InMemoryIdempotencyStore;
use klynt_infrastructure::repositories::in_memory_audit_event::InMemoryAuditEventRepository;
use klynt_infrastructure::repositories::in_memory_password_reset_token::InMemoryPasswordResetTokenRepository;
use klynt_infrastructure::repositories::in_memory_token::InMemoryEmailVerificationTokenRepository;
use klynt_infrastructure::repositories::in_memory_user::InMemoryUserRepository;
use klynt_infrastructure::repositories::session::InMemorySessionStore;
use klynt_infrastructure::unit_of_work::InMemoryUnitOfWork;

/// Builds the production application graph from the provided config.
///
/// This is the single composition root. Keeping it in the server crate keeps
/// the application crate free of infrastructure knowledge and makes the system
/// easy to bootstrap for both production and integration tests.
pub fn build_app(config: AppConfig) -> Router {
    let email_service: SharedEmailService = Arc::new(MockEmailService::new());
    build_app_with_email_service(config, email_service)
}

/// Builds the application graph with an injectable email service.
///
/// Useful for integration tests that need to inspect the emails (and tokens)
/// "sent" by the application.
pub fn build_app_with_email_service(
    config: AppConfig,
    email_service: SharedEmailService,
) -> Router {
    let user_repo = InMemoryUserRepository::new();
    let idempotency_store: Arc<InMemoryIdempotencyStore<UserDto>> =
        Arc::new(InMemoryIdempotencyStore::new());
    let idempotency_store_port: Arc<dyn IdempotencyStore<UserDto>> =
        Arc::clone(&idempotency_store) as Arc<dyn IdempotencyStore<UserDto>>;
    let session_store = Arc::new(InMemorySessionStore::new());
    let session_store_port: Arc<dyn SessionStore> =
        Arc::clone(&session_store) as Arc<dyn SessionStore>;
    let session_store_health: Arc<dyn HealthCheck> =
        Arc::clone(&session_store) as Arc<dyn HealthCheck>;
    let rate_limiter: Arc<InMemoryRateLimiter> =
        Arc::new(InMemoryRateLimiter::new(config.rate_limiter.clone()));
    let rate_limiter_port: Arc<dyn klynt_domain::ports::RateLimiter> =
        Arc::clone(&rate_limiter) as Arc<dyn klynt_domain::ports::RateLimiter>;
    let rate_limiter_health: Arc<dyn HealthCheck> =
        Arc::clone(&rate_limiter) as Arc<dyn HealthCheck>;

    let password_hasher: Arc<dyn PasswordHasher> = Arc::new(Argon2PasswordHasher::new());
    let uow: Arc<InMemoryUnitOfWork> = Arc::new(InMemoryUnitOfWork::new(user_repo.clone()));
    let uow_health: Arc<dyn HealthCheck> = Arc::clone(&uow) as Arc<dyn HealthCheck>;
    let user_service = Arc::new(UserService::new(
        uow,
        password_hasher,
        Arc::clone(&idempotency_store_port),
    ));

    let email_verification_repo: Arc<
        dyn klynt_domain::repositories::EmailVerificationTokenRepository,
    > = Arc::new(InMemoryEmailVerificationTokenRepository::new());
    let password_reset_repo: Arc<dyn klynt_domain::repositories::PasswordResetTokenRepository> =
        Arc::new(InMemoryPasswordResetTokenRepository::new());

    let audit_repo: Arc<dyn AuditEventRepository> = Arc::new(InMemoryAuditEventRepository::new());
    let audit_service = Arc::new(AuditService::new(Arc::clone(&audit_repo)));

    let auth_service = Arc::new(AuthService::new(
        Arc::clone(&user_service),
        Arc::clone(&session_store_port),
        Arc::clone(&email_verification_repo),
        Arc::clone(&password_reset_repo),
        email_service,
        Arc::clone(&audit_service),
    ));

    let health_checks: Vec<Arc<dyn HealthCheck>> = vec![
        Arc::new(user_repo.clone()),
        Arc::clone(&idempotency_store) as Arc<dyn HealthCheck>,
        session_store_health,
        uow_health,
        rate_limiter_health,
    ];

    let state = Arc::new(AppState::new(klynt_api::state::AppStateDeps {
        config,
        user_service,
        auth_service,
        session_store: session_store_port,
        rate_limiter: rate_limiter_port,
        health_checks,
        email_verification_repo,
        password_reset_repo,
        audit_service,
    }));

    build_router(state)
}
