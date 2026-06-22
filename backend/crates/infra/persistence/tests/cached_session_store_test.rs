//! Integration tests for the Redis read-through session cache.

use base::ctx::{ExecutionContext, RequestContext};
use base::ports::session::{SessionStore, SessionToken};
use domain::{Email, UserId, UserStatus};
use persistence::repositories::cached_session_store::CachedSessionStore;
use persistence::repositories::session::PgSessionStore;
use sqlx::PgPool;
use uuid::Uuid;

fn database_url() -> String {
    std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://klynt:klynt@localhost:5432/test".to_string())
}

fn redis_url() -> String {
    std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string())
}

async fn setup_pool() -> PgPool {
    let pool = PgPool::connect(&database_url()).await.unwrap();
    sqlx::migrate!("../../../migrations")
        .run(&pool)
        .await
        .unwrap();
    pool
}

async fn create_test_user(pool: &PgPool) -> UserId {
    let user_id = UserId(Uuid::new_v4());
    let email = Email::parse(&format!("{}@example.com", Uuid::new_v4())).unwrap();

    sqlx::query(
        r#"
        INSERT INTO users (id, email, password_hash, name, status, email_verified_at, terms_accepted_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        "#,
    )
    .bind(user_id.0)
    .bind(email.as_str())
    .bind("hashed")
    .bind("Test User")
    .bind(UserStatus::Active.as_str())
    .execute(pool)
    .await
    .unwrap();

    user_id
}

// Requires DATABASE_URL and REDIS_URL environment variables.
#[tokio::test]
async fn cached_store_falls_back_to_postgres_and_rehydrates_cache() {
    let pool = setup_pool().await;
    let user_id = create_test_user(&pool).await;
    let client = redis::Client::open(redis_url().as_str()).unwrap();
    let conn = client.get_multiplexed_async_connection().await.unwrap();

    let postgres = PgSessionStore::new(pool);
    let store = CachedSessionStore::new(postgres, conn);
    let ctx = ExecutionContext::new(RequestContext::new());
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(1);

    let token = store.create(&ctx, user_id, expires_at).await.unwrap();

    // First read may hit Postgres and populate cache.
    let session = store.find_valid(&ctx, &token).await.unwrap().unwrap();
    assert_eq!(session.user_id, user_id);

    // Second read should hit cache (verified by Redis MONITOR in CI).
    let session2 = store.find_valid(&ctx, &token).await.unwrap().unwrap();
    assert_eq!(session2.user_id, user_id);

    store.revoke(&ctx, &token).await.unwrap();
    assert!(store.find_valid(&ctx, &token).await.unwrap().is_none());
}

#[tokio::test]
async fn revoked_token_is_not_found_in_cache_or_postgres() {
    let pool = setup_pool().await;
    let user_id = create_test_user(&pool).await;
    let client = redis::Client::open(redis_url().as_str()).unwrap();
    let conn = client.get_multiplexed_async_connection().await.unwrap();

    let postgres = PgSessionStore::new(pool);
    let store = CachedSessionStore::new(postgres, conn);
    let ctx = ExecutionContext::new(RequestContext::new());
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(1);

    let token = store.create(&ctx, user_id, expires_at).await.unwrap();

    // Populate cache.
    let _ = store.find_valid(&ctx, &token).await.unwrap();

    // Revoke should clear both stores.
    store.revoke(&ctx, &token).await.unwrap();
    assert!(store.find_valid(&ctx, &token).await.unwrap().is_none());
}

#[tokio::test]
async fn unknown_token_returns_none() {
    let pool = setup_pool().await;
    let client = redis::Client::open(redis_url().as_str()).unwrap();
    let conn = client.get_multiplexed_async_connection().await.unwrap();

    let postgres = PgSessionStore::new(pool);
    let store = CachedSessionStore::new(postgres, conn);
    let ctx = ExecutionContext::new(RequestContext::new());
    let token = SessionToken::new();

    assert!(store.find_valid(&ctx, &token).await.unwrap().is_none());
}
