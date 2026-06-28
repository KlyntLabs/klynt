//! Postgres-backed integration tests for `UserRepository::find_by_email`.
//!
//! These tests require `DATABASE_URL` to point at a running PostgreSQL instance.
//! If `DATABASE_URL` is unset, the tests are skipped.

use base::ctx::{ExecutionContext, RequestContext};
use base::ports::repository::UserRepository;
use domain::{Email, UserRole};
use persistence::repositories::user::PgUserRepository;

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
    Email::new(format!(
        "find-by-email-test-{}@example.com",
        domain::UserId::new().inner()
    ))
}

#[tokio::test]
async fn find_by_email_ignores_deleted_users() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let email = unique_email();

    let user_id = repo
        .create_pending_user(
            &ctx,
            "Deleted User".to_string(),
            domain::UserId::new().inner().to_string(),
            email.clone(),
            "hash".to_string(),
            UserRole::Student,
            None,
        )
        .await
        .unwrap();

    repo.delete(&ctx, user_id).await.unwrap();

    assert!(
        repo.find_by_email(&ctx, &email).await.unwrap().is_none(),
        "soft-deleted user should not be found by email"
    );
}
