use std::sync::Arc;

use axum::Router;
use klynt_api::services::AuthenticationServices;
use klynt_api::startup::build_router;
use klynt_api::state::AppState;
use klynt_application::audit::AuditService;
use klynt_application::auth::AuthService;
use klynt_application::users::UserService;
use klynt_domain::config::AppConfig;
use klynt_domain::models::UserDto;
use klynt_domain::ports::{HealthCheck, IdempotencyStore, PasswordHasher, SharedEmailService};
use klynt_domain::repositories::{AuditEventRepository, TokenStore};
use klynt_domain::session::SessionStore;
use klynt_infrastructure::email::MockEmailService;
use klynt_infrastructure::password_hasher::Argon2PasswordHasher;
use klynt_infrastructure::rate_limiter_redis::RedisRateLimiter;
use klynt_infrastructure::repositories::pg_session::PgSessionStore;
use klynt_infrastructure::repositories::pg_user::PgUserRepository;
use klynt_infrastructure::repositories::redis_idempotency::RedisIdempotencyStore;
use klynt_infrastructure::repositories::sqlx_audit_repo::PgAuditEventRepository;
use klynt_infrastructure::repositories::sqlx_token_repo::PgTokenStore;
use sqlx::PgPool;

const IDEMPOTENCY_TTL_SECONDS: u64 = 24 * 60 * 60;

/// Builds the production application graph from the provided config.
///
/// This is the single composition root. It connects to Postgres, runs pending
/// migrations, and wires Postgres-backed repositories with Redis for rate
/// limiting and idempotency.
pub async fn build_app(config: AppConfig) -> Router {
    let email_service: SharedEmailService = Arc::new(MockEmailService::new());
    build_app_with_email_service(config, email_service).await
}

/// Builds the application graph with an injectable email service.
///
/// Exposed for integration tests that need to inspect the mock email service.
pub async fn build_app_with_email_service(
    config: AppConfig,
    email_service: SharedEmailService,
) -> Router {
    let database_url = config
        .database_url
        .clone()
        .expect("DATABASE_URL must be set");
    let redis_url = config.redis_url.clone().expect("REDIS_URL must be set");

    let pool = PgPool::connect(&database_url)
        .await
        .expect("failed to connect to Postgres");

    sqlx::migrate!("../../migrations")
        .run(&pool)
        .await
        .expect("failed to run database migrations");

    let user_repo: Arc<PgUserRepository> = Arc::new(PgUserRepository::new(pool.clone()));
    let session_store: Arc<PgSessionStore> = Arc::new(PgSessionStore::new(pool.clone()));
    let token_store: Arc<dyn TokenStore> = Arc::new(PgTokenStore::new(pool.clone()));
    let audit_repo: Arc<dyn AuditEventRepository> =
        Arc::new(PgAuditEventRepository::new(pool.clone()));

    let idempotency_store: Arc<RedisIdempotencyStore<UserDto>> = Arc::new(
        RedisIdempotencyStore::new(&redis_url, IDEMPOTENCY_TTL_SECONDS)
            .await
            .expect("failed to connect to Redis for idempotency store"),
    );
    let idempotency_store_port: Arc<dyn IdempotencyStore<UserDto>> =
        Arc::clone(&idempotency_store) as Arc<dyn IdempotencyStore<UserDto>>;

    let rate_limiter: Arc<RedisRateLimiter> = Arc::new(
        RedisRateLimiter::new(config.rate_limiter.clone(), &redis_url)
            .await
            .expect("failed to connect to Redis for rate limiter"),
    );
    let rate_limiter_port: Arc<dyn klynt_domain::ports::RateLimiter> =
        Arc::clone(&rate_limiter) as Arc<dyn klynt_domain::ports::RateLimiter>;
    let rate_limiter_health: Arc<dyn HealthCheck> =
        Arc::clone(&rate_limiter) as Arc<dyn HealthCheck>;

    let password_hasher: Arc<dyn PasswordHasher> = Arc::new(Argon2PasswordHasher::new());
    let user_service = Arc::new(UserService::new(
        Arc::clone(&user_repo) as Arc<dyn klynt_domain::repositories::UserRepository>,
        password_hasher,
        Arc::clone(&idempotency_store_port),
    ));

    let audit_service = Arc::new(AuditService::new(Arc::clone(&audit_repo)));

    let base_url = format!(
        "{}://{}",
        if config.api.host.contains("localhost") || config.api.host == "127.0.0.1" {
            "http"
        } else {
            "https"
        },
        config.api.host
    );

    let auth_service = Arc::new(AuthService::new(
        Arc::clone(&user_service),
        Arc::clone(&session_store) as Arc<dyn SessionStore>,
        Arc::clone(&token_store),
        email_service,
        Arc::clone(&audit_service),
        base_url,
    ));

    let health_checks: Vec<Arc<dyn HealthCheck>> = vec![
        Arc::clone(&user_repo) as Arc<dyn HealthCheck>,
        Arc::clone(&session_store) as Arc<dyn HealthCheck>,
        rate_limiter_health,
    ];

    let auth_services = AuthenticationServices::new(user_service, auth_service);

    let state = Arc::new(AppState::new(klynt_api::state::AppStateDeps {
        config,
        auth_services,
        session_store: Arc::clone(&session_store) as Arc<dyn SessionStore>,
        rate_limiter: rate_limiter_port,
        health_checks,
    }));

    build_router(state)
}
