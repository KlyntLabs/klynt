//! Postgres-backed integration tests for the canonical UserRepository.
//!
//! These tests require `DATABASE_URL` to point at a running PostgreSQL instance.
//! If `DATABASE_URL` is unset, the tests are skipped.

use chrono::Utc;
use klynt_base::ctx::{ExecutionContext, RequestContext};
use klynt_base::ports::repository::{RepositoryError, UserRepository};
use klynt_common::domain::{Email, PaginationRequest, User, UserRole, UserStatus};
use klynt_common::util::UserId;
use klynt_persistence::repositories::pg_user::PgUserRepository;

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
async fn create_pending_user_creates_user_and_returns_id() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let email = unique_email();

    let user_id = repo
        .create_pending_user(
            &ctx,
            "Ada Lovelace".to_string(),
            email.clone(),
            "hash".to_string(),
        )
        .await
        .unwrap();

    let found = repo.find_by_id(&ctx, user_id).await.unwrap().unwrap();
    assert_eq!(found.id, user_id);
    assert_eq!(found.email, email);
    assert_eq!(found.status, UserStatus::Pending);
    assert_eq!(found.role, UserRole::Student);
}

#[tokio::test]
async fn create_pending_user_twice_with_same_email_returns_conflict() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let email = unique_email();

    repo.create_pending_user(&ctx, "First".to_string(), email.clone(), "hash".to_string())
        .await
        .unwrap();

    let result = repo
        .create_pending_user(
            &ctx,
            "Second".to_string(),
            email.clone(),
            "other".to_string(),
        )
        .await;

    assert!(matches!(
        result,
        Err(klynt_base::ports::repository::RepositoryError::Conflict(_))
    ));
}

#[tokio::test]
async fn find_by_email_returns_matching_user() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let email = unique_email();

    let user_id = repo
        .create_pending_user(
            &ctx,
            "Grace Hopper".to_string(),
            email.clone(),
            "hash".to_string(),
        )
        .await
        .unwrap();

    let found = repo.find_by_email(&ctx, &email).await.unwrap().unwrap();
    assert_eq!(found.id, user_id);
    assert_eq!(found.email, email);
}

#[tokio::test]
async fn find_by_id_returns_matching_user() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let email = unique_email();

    let user_id = repo
        .create_pending_user(
            &ctx,
            "Alan Turing".to_string(),
            email.clone(),
            "hash".to_string(),
        )
        .await
        .unwrap();

    let found = repo.find_by_id(&ctx, user_id).await.unwrap().unwrap();
    assert_eq!(found.id, user_id);
    assert_eq!(found.email, email);
}

#[tokio::test]
async fn activate_user_changes_status_from_pending_to_active() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let email = unique_email();

    let user_id = repo
        .create_pending_user(
            &ctx,
            "Marie Curie".to_string(),
            email.clone(),
            "hash".to_string(),
        )
        .await
        .unwrap();

    repo.activate_user(&ctx, user_id).await.unwrap();

    let found = repo.find_by_id(&ctx, user_id).await.unwrap().unwrap();
    assert_eq!(found.status, UserStatus::Active);
}

#[tokio::test]
async fn update_password_changes_password_hash() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let email = unique_email();

    let user_id = repo
        .create_pending_user(
            &ctx,
            "User".to_string(),
            email.clone(),
            "old-hash".to_string(),
        )
        .await
        .unwrap();

    repo.update_password(&ctx, user_id, "new-hash".to_string())
        .await
        .unwrap();

    let found = repo.find_by_id(&ctx, user_id).await.unwrap().unwrap();
    assert_eq!(found.password_hash, "new-hash");
}

#[tokio::test]
async fn update_updates_mutable_fields_and_returns_user() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let email = unique_email();

    let user_id = repo
        .create_pending_user(
            &ctx,
            "Original".to_string(),
            email.clone(),
            "hash".to_string(),
        )
        .await
        .unwrap();

    let mut user = repo.find_by_id(&ctx, user_id).await.unwrap().unwrap();
    user.full_name = Some("Updated Name".to_string());
    user.password_hash = "updated-hash".to_string();
    user.status = UserStatus::Active;
    user.role = UserRole::Instructor;

    let updated = repo.update(&ctx, user).await.unwrap();
    assert_eq!(updated.full_name, Some("Updated Name".to_string()));
    assert_eq!(updated.password_hash, "updated-hash");
    assert_eq!(updated.status, UserStatus::Active);
    assert_eq!(updated.role, UserRole::Instructor);

    let found = repo.find_by_id(&ctx, user_id).await.unwrap().unwrap();
    assert_eq!(found.full_name, Some("Updated Name".to_string()));
    assert_eq!(found.password_hash, "updated-hash");
    assert_eq!(found.status, UserStatus::Active);
    assert_eq!(found.role, UserRole::Instructor);
}

#[tokio::test]
async fn delete_soft_deletes_user() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let email = unique_email();

    let user_id = repo
        .create_pending_user(
            &ctx,
            "To Delete".to_string(),
            email.clone(),
            "hash".to_string(),
        )
        .await
        .unwrap();

    repo.delete(&ctx, user_id).await.unwrap();

    let found = repo.find_by_id(&ctx, user_id).await.unwrap().unwrap();
    assert!(found.is_deleted());
    assert!(found.deleted_at.is_some());
}

#[tokio::test]
async fn list_returns_paginated_users_with_total() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let first_email = unique_email();
    let second_email = unique_email();

    repo.create_pending_user(
        &ctx,
        "First Listed".to_string(),
        first_email.clone(),
        "hash".to_string(),
    )
    .await
    .unwrap();

    repo.create_pending_user(
        &ctx,
        "Second Listed".to_string(),
        second_email.clone(),
        "hash".to_string(),
    )
    .await
    .unwrap();

    let (users, total) = repo.list(&ctx, PaginationRequest::first()).await.unwrap();
    assert!(total >= 2);
    assert!(!users.is_empty());
    assert!(users.iter().all(|u| !u.is_deleted()));

    let (page_one, page_one_total) = repo.list(&ctx, PaginationRequest::new(1, 1)).await.unwrap();
    assert_eq!(page_one.len(), 1);
    assert!(page_one_total >= 2);
    assert_eq!(page_one[0].email, second_email);
    assert!(page_one.iter().all(|u| !u.is_deleted()));

    let (page_two, page_two_total) = repo.list(&ctx, PaginationRequest::new(2, 1)).await.unwrap();
    assert_eq!(page_two.len(), 1);
    assert_eq!(page_two_total, page_one_total);
    assert_eq!(page_two[0].email, first_email);
    assert!(page_two.iter().all(|u| !u.is_deleted()));

    let (empty, empty_total) = repo
        .list(&ctx, PaginationRequest::new(100, 1))
        .await
        .unwrap();
    assert!(empty.is_empty());
    assert_eq!(empty_total, page_one_total);
}

#[tokio::test]
async fn activate_user_returns_not_found_for_missing_user() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let missing_id = UserId::new();

    let result = repo.activate_user(&ctx, missing_id).await;
    assert!(matches!(result, Err(RepositoryError::NotFound)));
}

#[tokio::test]
async fn update_password_returns_not_found_for_missing_user() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let missing_id = UserId::new();

    let result = repo
        .update_password(&ctx, missing_id, "new-hash".to_string())
        .await;
    assert!(matches!(result, Err(RepositoryError::NotFound)));
}

#[tokio::test]
async fn update_returns_not_found_for_missing_user() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let missing_id = UserId::new();
    let now = Utc::now();

    let user = User {
        id: missing_id,
        email: Email::new("missing@example.com".to_string()),
        full_name: None,
        password_hash: "hash".to_string(),
        status: UserStatus::Pending,
        role: UserRole::Student,
        created_at: now,
        updated_at: None,
        deleted_at: None,
    };

    let result = repo.update(&ctx, user).await;
    assert!(matches!(result, Err(RepositoryError::NotFound)));
}

#[tokio::test]
async fn delete_returns_not_found_for_missing_user() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let missing_id = UserId::new();

    let result = repo.delete(&ctx, missing_id).await;
    assert!(matches!(result, Err(RepositoryError::NotFound)));
}
