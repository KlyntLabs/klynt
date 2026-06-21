//! Integration tests for the PostgreSQL session store.

use chrono::{Duration, Utc};
use klynt_base::ctx::{ExecutionContext, RequestContext};
use klynt_common::util::{Email, UserId, UserStatus};
use klynt_persistence::repositories::pg_session::PgSessionStore;
use klynt_persistence::session::SessionStore;
use sqlx::PgPool;
use uuid::Uuid;

fn database_url() -> String {
    std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://klynt:klynt@localhost:5432/test".to_string())
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
    .bind(UserStatus::Active.to_string())
    .execute(pool)
    .await
    .unwrap();

    user_id
}

#[tokio::test]
async fn create_and_find_session() {
    let pool = setup_pool().await;
    let user_id = create_test_user(&pool).await;
    let store = PgSessionStore::new(pool);
    let ctx = ExecutionContext::new(RequestContext::new());
    let expires_at = Utc::now() + Duration::hours(1);

    let token = store.create(&ctx, user_id, expires_at).await.unwrap();
    let session = store.find_valid(&ctx, &token).await.unwrap();

    assert!(session.is_some());
    let session = session.unwrap();
    assert_eq!(session.user_id, user_id);
}

#[tokio::test]
async fn expired_session_is_not_found() {
    let pool = setup_pool().await;
    let user_id = create_test_user(&pool).await;
    let store = PgSessionStore::new(pool);
    let ctx = ExecutionContext::new(RequestContext::new());
    let expires_at = Utc::now() - Duration::hours(1);

    let token = store.create(&ctx, user_id, expires_at).await.unwrap();
    let session = store.find_valid(&ctx, &token).await.unwrap();

    assert!(session.is_none());
}

#[tokio::test]
async fn revoked_session_is_not_found() {
    let pool = setup_pool().await;
    let user_id = create_test_user(&pool).await;
    let store = PgSessionStore::new(pool);
    let ctx = ExecutionContext::new(RequestContext::new());
    let expires_at = Utc::now() + Duration::hours(1);

    let token = store.create(&ctx, user_id, expires_at).await.unwrap();
    store.revoke(&ctx, &token).await.unwrap();

    let session = store.find_valid(&ctx, &token).await.unwrap();
    assert!(session.is_none());
}
