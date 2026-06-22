//! Regression tests for corrupt user rows in the database.
//!
//! These tests require `DATABASE_URL` to point at a running PostgreSQL instance.
//! If `DATABASE_URL` is unset, the tests are skipped.

use base::ctx::{ExecutionContext, RequestContext};
use base::ports::repository::UserRepository;
use chrono::{DateTime, Utc};
use domain::{Email, UserId};
use persistence::repositories::user::PgUserRepository;
use uuid::Uuid;

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

fn test_ctx() -> ExecutionContext {
    ExecutionContext::new(RequestContext::new())
}

fn unique_email() -> Email {
    Email::new(format!("repo-test-{}@example.com", UserId::new().inner()))
}

#[tokio::test]
async fn find_by_id_returns_error_for_invalid_role_in_db() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool.clone());
    let ctx = test_ctx();
    let user_id = UserId::new();
    let email = unique_email();
    let now = Utc::now();

    sqlx::query(
        r#"
        INSERT INTO users (
            id, email, name, password_hash,
            status, email_verified_at, global_role,
            created_at, updated_at, terms_accepted_at, terms_version,
            role, institution_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        "#,
    )
    .bind(user_id.inner())
    .bind(email.as_str())
    .bind("Name")
    .bind("hash")
    .bind("pending_verification")
    .bind(None::<DateTime<Utc>>)
    .bind(None::<String>)
    .bind(now)
    .bind(now)
    .bind(now)
    .bind("1.0")
    .bind("invalid_role")
    .bind(None::<Uuid>)
    .execute(&pool)
    .await
    .unwrap();

    let result = repo.find_by_id(&ctx, user_id).await;
    assert!(result.is_err());

    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id.inner())
        .execute(&pool)
        .await
        .ok();
}

#[tokio::test]
async fn find_by_id_returns_error_for_invalid_global_role_in_db() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool.clone());
    let ctx = test_ctx();
    let user_id = UserId::new();
    let email = unique_email();
    let now = Utc::now();

    sqlx::query(
        r#"
        INSERT INTO users (
            id, email, name, password_hash,
            status, email_verified_at, global_role,
            created_at, updated_at, terms_accepted_at, terms_version,
            role, institution_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        "#,
    )
    .bind(user_id.inner())
    .bind(email.as_str())
    .bind("Name")
    .bind("hash")
    .bind("pending_verification")
    .bind(None::<DateTime<Utc>>)
    .bind(Some("invalid_global_role"))
    .bind(now)
    .bind(now)
    .bind(now)
    .bind("1.0")
    .bind("student")
    .bind(None::<Uuid>)
    .execute(&pool)
    .await
    .unwrap();

    let result = repo.find_by_id(&ctx, user_id).await;
    assert!(result.is_err());

    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id.inner())
        .execute(&pool)
        .await
        .ok();
}

#[tokio::test]
async fn find_by_id_returns_error_for_invalid_email_in_db() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool.clone());
    let ctx = test_ctx();
    let user_id = UserId::new();
    // Use a unique invalid email so repeated test runs on a persistent database
    // do not collide on the UNIQUE constraint.
    let email = format!("not-an-email-{}", user_id.inner());
    let now = Utc::now();

    sqlx::query(
        r#"
        INSERT INTO users (
            id, email, name, password_hash,
            status, email_verified_at, global_role,
            created_at, updated_at, terms_accepted_at, terms_version,
            role, institution_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        "#,
    )
    .bind(user_id.inner())
    .bind(&email)
    .bind("Name")
    .bind("hash")
    .bind("pending_verification")
    .bind(None::<DateTime<Utc>>)
    .bind(None::<String>)
    .bind(now)
    .bind(now)
    .bind(now)
    .bind("1.0")
    .bind("student")
    .bind(None::<Uuid>)
    .execute(&pool)
    .await
    .unwrap();

    let result = repo.find_by_id(&ctx, user_id).await;
    assert!(result.is_err());

    // Clean up so this test does not leave corrupt rows behind for concurrent
    // or subsequent test runs.
    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id.inner())
        .execute(&pool)
        .await
        .ok();
}
