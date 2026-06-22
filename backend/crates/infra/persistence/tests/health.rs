//! Integration tests for infrastructure health checks.

use config::RateLimiterConfig;
use persistence::ports::HealthCheck;
use persistence::{
    password_hasher::Argon2PasswordHasher,
    rate_limiter::RedisRateLimiter,
    repositories::{pg_session::PgSessionStore, pg_user::PgUserRepository},
};
use sqlx::PgPool;

fn database_url() -> String {
    std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://klynt:klynt@localhost:5432/test".to_string())
}

fn redis_url() -> String {
    std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379/0".to_string())
}

async fn setup_pool() -> PgPool {
    let pool = PgPool::connect(&database_url()).await.unwrap();
    sqlx::migrate!("../../../migrations")
        .run(&pool)
        .await
        .unwrap();
    pool
}

#[tokio::test]
async fn user_repository_health_is_healthy() {
    let pool = setup_pool().await;
    let repo = PgUserRepository::new(pool);

    let health = repo.check().await;

    assert!(health.healthy);
    assert_eq!(health.name, "postgres.user_repository");
}

#[tokio::test]
async fn session_store_health_is_healthy() {
    let pool = setup_pool().await;
    let store = PgSessionStore::new(pool);

    let health = store.check().await;

    assert!(health.healthy);
    assert_eq!(health.name, "postgres.session_store");
}

#[tokio::test]
async fn redis_rate_limiter_health_is_healthy() {
    let config = RateLimiterConfig {
        enabled: true,
        max_requests: 10,
        window_seconds: 60,
    };
    let limiter = RedisRateLimiter::new(config, &redis_url()).await.unwrap();

    let health = limiter.check().await;

    assert!(health.healthy);
    assert_eq!(health.name, "redis.rate_limiter");
}

#[test]
fn argon2_hasher_can_be_created() {
    // Simple smoke test to exercise construction of the hasher.
    let _hasher = Argon2PasswordHasher::new();
}
