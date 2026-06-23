//! Integration tests for the Redis read-through session cache.

use base::ctx::{ExecutionContext, RequestContext};
use base::ports::session::{MembershipSnapshot, SessionKind, SessionStore, SessionToken};
use domain::{Email, TenantRole, UserId, UserStatus};
use persistence::repositories::cached_session_store::CachedSessionStore;
use persistence::repositories::session::PgSessionStore;
use redis::aio::MultiplexedConnection;
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

async fn setup_redis() -> MultiplexedConnection {
    let client = redis::Client::open(redis_url().as_str()).unwrap();
    client.get_multiplexed_async_connection().await.unwrap()
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

fn cache_key(token: &SessionToken) -> String {
    format!("session:{}", token.0)
}

async fn redis_has_key(conn: &mut MultiplexedConnection, key: &str) -> bool {
    let value: Option<String> = redis::cmd("GET").arg(key).query_async(conn).await.unwrap();
    value.is_some()
}

async fn redis_del_key(conn: &mut MultiplexedConnection, key: &str) {
    redis::cmd("DEL")
        .arg(key)
        .query_async::<()>(conn)
        .await
        .unwrap();
}

// Requires DATABASE_URL and REDIS_URL environment variables.
#[tokio::test]
async fn cached_store_populates_and_hits_cache() {
    let pool = setup_pool().await;
    let mut inspect_conn = setup_redis().await;
    let user_id = create_test_user(&pool).await;
    let postgres = PgSessionStore::new(pool);
    let store = CachedSessionStore::connect(postgres, &redis_url()).await;
    let ctx = ExecutionContext::new(RequestContext::new());
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(1);

    let token = store
        .create_with_kind(&ctx, user_id, expires_at, SessionKind::Access, None)
        .await
        .unwrap();
    let key = cache_key(&token);

    // create() should have written the session to Redis.
    assert!(redis_has_key(&mut inspect_conn, &key).await);

    // First read may hit Postgres and (re)populate cache.
    let session = store.find_valid(&ctx, &token).await.unwrap().unwrap();
    assert_eq!(session.user_id, user_id);
    assert!(redis_has_key(&mut inspect_conn, &key).await);

    // Second read should hit cache; the Redis key must still exist.
    let session2 = store.find_valid(&ctx, &token).await.unwrap().unwrap();
    assert_eq!(session2.user_id, user_id);
    assert!(redis_has_key(&mut inspect_conn, &key).await);

    store.revoke(&ctx, &token).await.unwrap();

    // Revoke should delete the cached key.
    assert!(!redis_has_key(&mut inspect_conn, &key).await);
    assert!(store.find_valid(&ctx, &token).await.unwrap().is_none());
}

#[tokio::test]
async fn cached_store_falls_back_to_postgres_and_rehydrates_cache() {
    let pool = setup_pool().await;
    let mut inspect_conn = setup_redis().await;
    let user_id = create_test_user(&pool).await;
    let postgres = PgSessionStore::new(pool);
    let store = CachedSessionStore::connect(postgres, &redis_url()).await;
    let ctx = ExecutionContext::new(RequestContext::new());
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(1);

    let token = store
        .create_with_kind(&ctx, user_id, expires_at, SessionKind::Access, None)
        .await
        .unwrap();
    let key = cache_key(&token);

    // Simulate a cache miss by deleting the Redis entry after creation.
    redis_del_key(&mut inspect_conn, &key).await;
    assert!(!redis_has_key(&mut inspect_conn, &key).await);

    // find_valid should fall back to Postgres and rehydrate the cache.
    let session = store.find_valid(&ctx, &token).await.unwrap().unwrap();
    assert_eq!(session.user_id, user_id);
    assert!(redis_has_key(&mut inspect_conn, &key).await);
}

#[tokio::test]
async fn cached_store_round_trips_through_postgres_when_redis_is_unreachable() {
    let pool = setup_pool().await;
    let user_id = create_test_user(&pool).await;
    let postgres = PgSessionStore::new(pool);
    // Use a port that is very unlikely to have a Redis listener.
    let store = CachedSessionStore::connect(postgres, "redis://127.0.0.1:1").await;
    let ctx = ExecutionContext::new(RequestContext::new());
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(1);

    let token = store
        .create_with_kind(&ctx, user_id, expires_at, SessionKind::Access, None)
        .await
        .unwrap();

    let session = store.find_valid(&ctx, &token).await.unwrap().unwrap();
    assert_eq!(session.user_id, user_id);

    store.revoke(&ctx, &token).await.unwrap();
    assert!(store.find_valid(&ctx, &token).await.unwrap().is_none());
}

#[tokio::test]
async fn revoked_token_is_not_found_in_cache_or_postgres() {
    let pool = setup_pool().await;
    let mut inspect_conn = setup_redis().await;
    let user_id = create_test_user(&pool).await;
    let postgres = PgSessionStore::new(pool);
    let store = CachedSessionStore::connect(postgres, &redis_url()).await;
    let ctx = ExecutionContext::new(RequestContext::new());
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(1);

    let token = store
        .create_with_kind(&ctx, user_id, expires_at, SessionKind::Access, None)
        .await
        .unwrap();
    let key = cache_key(&token);

    // Populate cache.
    let _ = store.find_valid(&ctx, &token).await.unwrap();
    assert!(redis_has_key(&mut inspect_conn, &key).await);

    // Revoke should clear both stores.
    store.revoke(&ctx, &token).await.unwrap();
    assert!(!redis_has_key(&mut inspect_conn, &key).await);
    assert!(store.find_valid(&ctx, &token).await.unwrap().is_none());
}

#[tokio::test]
async fn unknown_token_returns_none() {
    let pool = setup_pool().await;
    let postgres = PgSessionStore::new(pool);
    let store = CachedSessionStore::connect(postgres, &redis_url()).await;
    let ctx = ExecutionContext::new(RequestContext::new());
    let token = SessionToken::new();

    assert!(store.find_valid(&ctx, &token).await.unwrap().is_none());
}

#[tokio::test]
async fn update_memberships_invalidates_cached_session() {
    let pool = setup_pool().await;
    let mut inspect_conn = setup_redis().await;
    let user_id = create_test_user(&pool).await;
    let postgres = PgSessionStore::new(pool);
    let store = CachedSessionStore::connect(postgres, &redis_url()).await;
    let ctx = ExecutionContext::new(RequestContext::new());
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(1);
    let tenant_id = Uuid::new_v4();
    let snapshot = MembershipSnapshot {
        tenant_id,
        role: TenantRole::Member,
    };

    let token = store
        .create_with_kind(&ctx, user_id, expires_at, SessionKind::Access, None)
        .await
        .unwrap();
    let key = cache_key(&token);

    // Populate the cache by reading the session.
    let _ = store.find_valid(&ctx, &token).await.unwrap();
    assert!(redis_has_key(&mut inspect_conn, &key).await);

    store
        .update_memberships(&ctx, &token, vec![snapshot.clone()])
        .await
        .unwrap();

    // Cache entry should have been invalidated.
    assert!(!redis_has_key(&mut inspect_conn, &key).await);

    // Subsequent find_valid should return the updated snapshot from Postgres.
    let session = store.find_valid(&ctx, &token).await.unwrap().unwrap();
    assert_eq!(session.tenant_memberships, vec![snapshot]);
}

#[tokio::test]
async fn add_membership_invalidates_all_cached_sessions_for_user() {
    let pool = setup_pool().await;
    let mut inspect_conn = setup_redis().await;
    let user_id = create_test_user(&pool).await;
    let postgres = PgSessionStore::new(pool);
    let store = CachedSessionStore::connect(postgres, &redis_url()).await;
    let ctx = ExecutionContext::new(RequestContext::new());
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(1);
    let tenant_id = Uuid::new_v4();
    let snapshot = MembershipSnapshot {
        tenant_id,
        role: TenantRole::Member,
    };

    let token_a = store
        .create_with_kind(&ctx, user_id, expires_at, SessionKind::Access, None)
        .await
        .unwrap();
    let token_b = store
        .create_with_kind(&ctx, user_id, expires_at, SessionKind::Access, None)
        .await
        .unwrap();
    let key_a = cache_key(&token_a);
    let key_b = cache_key(&token_b);

    // Populate the cache by reading both sessions.
    let _ = store.find_valid(&ctx, &token_a).await.unwrap();
    let _ = store.find_valid(&ctx, &token_b).await.unwrap();
    assert!(redis_has_key(&mut inspect_conn, &key_a).await);
    assert!(redis_has_key(&mut inspect_conn, &key_b).await);

    store
        .add_membership(&ctx, user_id, snapshot.clone())
        .await
        .unwrap();

    // All cached session entries for the user should be invalidated.
    assert!(!redis_has_key(&mut inspect_conn, &key_a).await);
    assert!(!redis_has_key(&mut inspect_conn, &key_b).await);

    // Subsequent reads should reflect the added membership from Postgres.
    let session_a = store.find_valid(&ctx, &token_a).await.unwrap().unwrap();
    assert_eq!(session_a.tenant_memberships, vec![snapshot.clone()]);

    let session_b = store.find_valid(&ctx, &token_b).await.unwrap().unwrap();
    assert_eq!(session_b.tenant_memberships, vec![snapshot]);
}
