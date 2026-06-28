//! Postgres-backed integration tests for the cleanup job.
//!
//! These tests require `DATABASE_URL` to point at a running PostgreSQL instance.

use chrono::{Duration, Utc};
use cleanup_job::CleanupJob;

fn database_url() -> Option<String> {
    std::env::var("DATABASE_URL").ok()
}

async fn setup_pool() -> Option<sqlx::PgPool> {
    let url = database_url()?;
    let pool = sqlx::PgPool::connect(&url).await.ok()?;
    sqlx::migrate!("../../../migrations")
        .run(&pool)
        .await
        .ok()?;
    Some(pool)
}

async fn create_test_user(pool: &sqlx::PgPool, prefix: &str) -> uuid::Uuid {
    let user_id = uuid::Uuid::new_v4();
    let email = format!("{}-{}@example.com", prefix, user_id);

    let username = format!("{}-{}", prefix, user_id);

    sqlx::query!(
        r#"
        INSERT INTO users (
            id, email, username, name, password_hash,
            status, terms_accepted_at, terms_version
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
        user_id,
        &email,
        &username,
        prefix,
        "hash",
        "active",
        Utc::now(),
        "1.0",
    )
    .execute(pool)
    .await
    .expect("user should insert");

    user_id
}

async fn insert_session(
    pool: &sqlx::PgPool,
    user_id: uuid::Uuid,
    expires_at: chrono::DateTime<Utc>,
) -> uuid::Uuid {
    let token = uuid::Uuid::new_v4();
    sqlx::query!(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)",
        token,
        user_id,
        expires_at,
    )
    .execute(pool)
    .await
    .expect("session should insert");
    token
}

async fn insert_email_token(
    pool: &sqlx::PgPool,
    user_id: uuid::Uuid,
    expires_at: chrono::DateTime<Utc>,
) -> String {
    let token_hash = format!("{:064x}", rand::random::<u128>());
    sqlx::query!(
        "INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        user_id,
        &token_hash,
        expires_at,
    )
    .execute(pool)
    .await
    .expect("email token should insert");
    token_hash
}

async fn insert_audit_event(pool: &sqlx::PgPool, created_at: chrono::DateTime<Utc>) -> uuid::Uuid {
    let id = uuid::Uuid::new_v4();
    sqlx::query!(
        "INSERT INTO audit_events (id, action, resource_type, success, created_at) VALUES ($1, $2, $3, $4, $5)",
        id,
        "test_action",
        "test_resource",
        true,
        created_at,
    )
    .execute(pool)
    .await
    .expect("audit event should insert");
    id
}

async fn session_exists(pool: &sqlx::PgPool, token: uuid::Uuid) -> bool {
    sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM sessions WHERE token = $1) AS "exists!""#,
        token,
    )
    .fetch_one(pool)
    .await
    .expect("existence check should succeed")
}

async fn email_token_exists(pool: &sqlx::PgPool, token_hash: &str) -> bool {
    sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM email_verification_tokens WHERE token_hash = $1) AS "exists!""#,
        token_hash,
    )
    .fetch_one(pool)
    .await
    .expect("existence check should succeed")
}

async fn audit_event_exists(pool: &sqlx::PgPool, id: uuid::Uuid) -> bool {
    sqlx::query_scalar!(
        r#"SELECT EXISTS(SELECT 1 FROM audit_events WHERE id = $1) AS "exists!""#,
        id,
    )
    .fetch_one(pool)
    .await
    .expect("existence check should succeed")
}

#[tokio::test]
async fn cleanup_removes_expired_and_retained_rows() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let user_id = create_test_user(&pool, "cleanup").await;

    let now = Utc::now();

    // Expired rows that should be deleted.
    let expired_session = insert_session(&pool, user_id, now - Duration::hours(1)).await;
    let expired_token = insert_email_token(&pool, user_id, now - Duration::days(8)).await;
    let old_audit = insert_audit_event(&pool, now - Duration::days(366)).await;

    // Active/control rows that should remain.
    let active_session = insert_session(&pool, user_id, now + Duration::hours(1)).await;
    let active_token = insert_email_token(&pool, user_id, now + Duration::days(1)).await;
    let recent_audit = insert_audit_event(&pool, now - Duration::days(1)).await;

    CleanupJob::new(pool.clone())
        .run_once()
        .await
        .expect("cleanup should succeed");

    assert!(
        !session_exists(&pool, expired_session).await,
        "expired session should be deleted"
    );
    assert!(
        session_exists(&pool, active_session).await,
        "active session should remain"
    );

    assert!(
        !email_token_exists(&pool, &expired_token).await,
        "expired email token should be deleted"
    );
    assert!(
        email_token_exists(&pool, &active_token).await,
        "active email token should remain"
    );

    assert!(
        !audit_event_exists(&pool, old_audit).await,
        "old audit event should be deleted"
    );
    assert!(
        audit_event_exists(&pool, recent_audit).await,
        "recent audit event should remain"
    );
}

#[tokio::test]
async fn cleanup_deletes_large_expired_session_set_in_batches() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let user_id = create_test_user(&pool, "cleanup-batch").await;
    let now = Utc::now();

    // Insert more expired sessions than a single batch so the loop must run
    // more than once.
    for _ in 0..1502 {
        insert_session(&pool, user_id, now - Duration::hours(1)).await;
    }

    CleanupJob::new(pool.clone())
        .run_once()
        .await
        .expect("cleanup should succeed");

    let after_count: i64 = sqlx::query_scalar!(
        r#"SELECT COUNT(*) AS "count!" FROM sessions WHERE user_id = $1 AND expires_at < $2"#,
        user_id,
        now,
    )
    .fetch_one(&pool)
    .await
    .expect("count should succeed");
    assert_eq!(
        after_count, 0,
        "all expired sessions should be deleted in batches"
    );
}
