//! Postgres-backed integration tests for the UserRepository::execute command interface.
//!
//! These tests require `DATABASE_URL` to point at a running PostgreSQL instance.
//! If `DATABASE_URL` is unset, the tests are skipped.

use base::ctx::{ExecutionContext, RequestContext};
use base::ports::repository::{UserOpResult, UserRepository};
use domain::operations::UserOp;
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
        "execute-test-{}@example.com",
        domain::UserId::new().inner()
    ))
}

#[tokio::test]
async fn repository_execute_delegates_find_by_email() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let email = unique_email();

    let result = repo
        .execute(
            &ctx,
            UserOp::FindByEmail {
                email: email.clone(),
            },
        )
        .await
        .unwrap();

    match result {
        UserOpResult::UserOption(None) => {}
        _ => panic!("Expected None for non-existent user"),
    }

    let user_id = repo
        .create_pending_user(
            &ctx,
            "Execute User".to_string(),
            domain::UserId::new().inner().to_string(),
            email.clone(),
            "hash".to_string(),
            UserRole::Student,
            None,
        )
        .await
        .unwrap();

    let result = repo
        .execute(
            &ctx,
            UserOp::FindByEmail {
                email: email.clone(),
            },
        )
        .await
        .unwrap();

    match result {
        UserOpResult::UserOption(Some(user)) => {
            assert_eq!(user.id, user_id);
            assert_eq!(user.email, email);
        }
        _ => panic!("Expected Some user for existing email"),
    }
}
