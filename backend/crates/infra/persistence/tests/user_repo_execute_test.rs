//! Postgres-backed integration tests for the UserRepository::execute command interface.
//!
//! These tests require `DATABASE_URL` to point at a running PostgreSQL instance.
//! If `DATABASE_URL` is unset, the tests are skipped.

use base::ctx::{ExecutionContext, RequestContext};
use base::ports::repository::{UserOpResult, UserRepository};
use domain::operations::UserOp;
use domain::{Email, PaginationRequest, UserRole, UserStatus};
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

async fn cleanup_test_data(pool: &sqlx::PgPool, user_ids: &[domain::UserId]) {
    for user_id in user_ids {
        sqlx::query("DELETE FROM users WHERE id = $1")
            .bind(user_id.inner())
            .execute(pool)
            .await
            .ok();
    }
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

async fn create_test_user(repo: &PgUserRepository, email: Email) -> domain::UserId {
    repo.create_pending_user(
        &test_ctx(),
        "Execute User".to_string(),
        domain::UserId::new().inner().to_string(),
        email,
        "hash".to_string(),
        UserRole::Student,
        None,
    )
    .await
    .unwrap()
}

#[tokio::test]
async fn repository_execute_delegates_find_by_email() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool.clone());
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

    assert_eq!(result, UserOpResult::UserOption(None));

    let user_id = create_test_user(&repo, email.clone()).await;

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

    cleanup_test_data(&pool, &[user_id]).await;
}

#[tokio::test]
async fn repository_execute_create_pending_user_returns_user_id() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool.clone());
    let ctx = test_ctx();
    let email = unique_email();

    let result = repo
        .execute(
            &ctx,
            UserOp::CreatePendingUser {
                full_name: "Created User".to_string(),
                username: domain::UserId::new().inner().to_string(),
                email: email.clone(),
                password_hash: "hash".to_string(),
                role: UserRole::Student,
                institution_id: None,
            },
        )
        .await
        .unwrap();

    let user_id = match result {
        UserOpResult::UserId(id) => id,
        _ => panic!("Expected UserId result"),
    };

    let found = repo
        .execute(
            &ctx,
            UserOp::FindByEmail {
                email: email.clone(),
            },
        )
        .await
        .unwrap();
    match found {
        UserOpResult::UserOption(Some(user)) => {
            assert_eq!(user.id, user_id);
            assert_eq!(user.email, email);
            assert_eq!(user.full_name, Some("Created User".to_string()));
            assert_eq!(user.role, UserRole::Student);
            assert_eq!(user.status, UserStatus::Pending);
        }
        _ => panic!("Expected created user to be found"),
    }

    cleanup_test_data(&pool, &[user_id]).await;
}

#[tokio::test]
async fn repository_execute_activate_user_and_update_password_return_unit() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool.clone());
    let ctx = test_ctx();
    let email = unique_email();
    let user_id = create_test_user(&repo, email).await;

    let activate_result = repo
        .execute(&ctx, UserOp::ActivateUser { user_id })
        .await
        .unwrap();
    assert_eq!(activate_result, UserOpResult::Unit);

    let update_password_result = repo
        .execute(
            &ctx,
            UserOp::UpdatePassword {
                user_id,
                password_hash: "new-hash".to_string(),
            },
        )
        .await
        .unwrap();
    assert_eq!(update_password_result, UserOpResult::Unit);

    let found = repo.find_by_id(&ctx, user_id).await.unwrap().unwrap();
    assert_eq!(found.status, UserStatus::Active);
    assert_eq!(found.password_hash, "new-hash");

    cleanup_test_data(&pool, &[user_id]).await;
}

#[tokio::test]
async fn repository_execute_update_returns_user_and_delete_returns_unit() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool.clone());
    let ctx = test_ctx();
    let email = unique_email();
    let user_id = create_test_user(&repo, email).await;

    let mut user = repo.find_by_id(&ctx, user_id).await.unwrap().unwrap();
    user.full_name = Some("Updated Name".to_string());

    let update_result = repo.execute(&ctx, UserOp::Update { user }).await.unwrap();
    match update_result {
        UserOpResult::User(updated) => {
            assert_eq!(updated.id, user_id);
            assert_eq!(updated.full_name, Some("Updated Name".to_string()));
        }
        _ => panic!("Expected User result"),
    }

    let delete_result = repo
        .execute(&ctx, UserOp::Delete { user_id })
        .await
        .unwrap();
    assert_eq!(delete_result, UserOpResult::Unit);

    let found = repo.find_by_id(&ctx, user_id).await.unwrap().unwrap();
    assert!(found.is_deleted());

    cleanup_test_data(&pool, &[user_id]).await;
}

#[tokio::test]
async fn repository_execute_list_returns_paginated_users() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool.clone());
    let ctx = test_ctx();
    let email = unique_email();
    let user_id = create_test_user(&repo, email).await;

    let result = repo
        .execute(
            &ctx,
            UserOp::List {
                pagination: PaginationRequest::first(),
            },
        )
        .await
        .unwrap();

    match result {
        UserOpResult::UserList((users, total)) => {
            assert!(!users.is_empty());
            assert!(total >= 1);
            assert!(users.iter().any(|u| u.id == user_id));
        }
        _ => panic!("Expected UserList result"),
    }

    cleanup_test_data(&pool, &[user_id]).await;
}
