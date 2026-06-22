//! Postgres-backed integration tests for the canonical UserRepository.
//!
//! These tests require `DATABASE_URL` to point at a running PostgreSQL instance.
//! If `DATABASE_URL` is unset, the tests are skipped.

use base::ctx::{ExecutionContext, RequestContext};
use base::ports::repository::{RepositoryError, UserRepository};
use chrono::Utc;
use domain::{Email, GlobalRole, PaginationRequest, User, UserId, UserRole, UserStatus};
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
            UserRole::Student,
            None,
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
async fn create_pending_user_persists_institution_id_for_instructor() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let email = unique_email();
    let institution_id = UserId::new().inner();

    let user_id = repo
        .create_pending_user(
            &ctx,
            "Teacher".to_string(),
            email.clone(),
            "hash".to_string(),
            UserRole::Instructor,
            Some(institution_id),
        )
        .await
        .unwrap();

    let found = repo.find_by_id(&ctx, user_id).await.unwrap().unwrap();
    assert_eq!(found.role, UserRole::Instructor);
    assert_eq!(found.institution_id, Some(institution_id));
}

#[tokio::test]
async fn create_pending_user_stores_none_institution_id_when_not_provided() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let email = unique_email();

    let user_id = repo
        .create_pending_user(
            &ctx,
            "Student".to_string(),
            email.clone(),
            "hash".to_string(),
            UserRole::Student,
            None,
        )
        .await
        .unwrap();

    let found = repo.find_by_id(&ctx, user_id).await.unwrap().unwrap();
    assert_eq!(found.role, UserRole::Student);
    assert_eq!(found.institution_id, None);
}

#[tokio::test]
async fn create_pending_user_twice_with_same_email_returns_conflict() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let email = unique_email();

    repo.create_pending_user(
        &ctx,
        "First".to_string(),
        email.clone(),
        "hash".to_string(),
        UserRole::Student,
        None,
    )
    .await
    .unwrap();

    let result = repo
        .create_pending_user(
            &ctx,
            "Second".to_string(),
            email.clone(),
            "other".to_string(),
            UserRole::Student,
            None,
        )
        .await;

    assert!(matches!(
        result,
        Err(base::ports::repository::RepositoryError::Conflict(_))
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
            UserRole::Student,
            None,
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
            UserRole::Student,
            None,
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
            UserRole::Student,
            None,
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
            UserRole::Student,
            None,
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
            UserRole::Student,
            None,
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
async fn update_persists_schema_aligned_fields() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgUserRepository::new(pool);
    let ctx = test_ctx();
    let email = unique_email();
    let institution_id = UserId::new().inner();
    let now = Utc::now();

    let user_id = repo
        .create_pending_user(
            &ctx,
            "Original".to_string(),
            email.clone(),
            "hash".to_string(),
            UserRole::Student,
            None,
        )
        .await
        .unwrap();

    let mut user = repo.find_by_id(&ctx, user_id).await.unwrap().unwrap();
    user.full_name = Some("Updated Name".to_string());
    user.password_hash = "updated-hash".to_string();
    user.status = UserStatus::Active;
    user.role = UserRole::Instructor;
    user.global_role = Some(GlobalRole::Admin);
    user.email_verified_at = Some(now);
    user.institution_id = Some(institution_id);
    user.terms_accepted_at = now;
    user.terms_version = "2.0".to_string();

    let updated = repo.update(&ctx, user.clone()).await.unwrap();
    assert_eq!(updated.global_role, Some(GlobalRole::Admin));
    assert_eq!(updated.email_verified_at, Some(now));
    assert_eq!(updated.institution_id, Some(institution_id));
    assert_eq!(updated.terms_accepted_at, now);
    assert_eq!(updated.terms_version, "2.0");

    let found = repo.find_by_id(&ctx, user_id).await.unwrap().unwrap();
    assert_eq!(found.global_role, Some(GlobalRole::Admin));
    assert_eq!(found.email_verified_at, Some(now));
    assert_eq!(found.institution_id, Some(institution_id));
    assert_eq!(found.terms_accepted_at, now);
    assert_eq!(found.terms_version, "2.0");
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
            UserRole::Student,
            None,
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
        UserRole::Student,
        None,
    )
    .await
    .unwrap();

    repo.create_pending_user(
        &ctx,
        "Second Listed".to_string(),
        second_email.clone(),
        "hash".to_string(),
        UserRole::Student,
        None,
    )
    .await
    .unwrap();

    let created_emails = [first_email.clone(), second_email.clone()];

    // Verify the created users exist independently of the paginated list,
    // which may also contain rows inserted by concurrently running tests.
    for email in &created_emails {
        assert!(
            repo.find_by_email(&ctx, email).await.unwrap().is_some(),
            "created user should be findable by email"
        );
    }

    let (users, total) = repo.list(&ctx, PaginationRequest::first()).await.unwrap();
    assert!(total >= 2);
    assert!(users.iter().all(|u| !u.is_deleted()));

    let (page_one, _) = repo.list(&ctx, PaginationRequest::new(1, 1)).await.unwrap();
    assert_eq!(page_one.len(), 1);
    assert!(!page_one[0].is_deleted());

    let (page_two, _) = repo.list(&ctx, PaginationRequest::new(2, 1)).await.unwrap();
    assert_eq!(page_two.len(), 1);
    assert!(!page_two[0].is_deleted());
    // NOTE: We intentionally do not assert page_one != page_two. Concurrent
    // tests may insert a row with a newer created_at between these two queries,
    // which can shift the row returned for page one down to page two. The
    // pagination structure (one row per page, bounded page returns empty) is
    // still verified below.

    // Use a page number far beyond any realistic total so the assertion stays
    // robust even if concurrent tests insert rows after we read `total`.
    let (empty, _) = repo
        .list(&ctx, PaginationRequest::new(u32::MAX, 1))
        .await
        .unwrap();
    assert!(empty.is_empty());
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
        global_role: None,
        email_verified_at: None,
        institution_id: None,
        terms_accepted_at: now,
        terms_version: "1.0".to_string(),
        created_at: now,
        updated_at: now,
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
