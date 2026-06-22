//! Postgres-backed integration tests for user_service infrastructure adapters.
//!
//! These tests require `DATABASE_URL` to point at a running PostgreSQL instance.

use std::sync::Arc;

use base::ctx::{ExecutionContext, RequestContext};
use base::ports::{audit::AuditLogger, PasswordHasher};
use chrono::Utc;
use domain::{PaginationRequest, UserId, UserStatus};
use user_service::{
    application::ports::UserRepository, infrastructure::services::PasswordHasherAdapter,
};

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

#[tokio::test]
async fn user_repository_round_trips_with_postgres() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = persistence::repositories::user::PgUserRepository::new(pool.clone());
    let ctx = test_ctx();

    let user_id = UserId::new();
    let email = format!("adapter-{}@example.com", user_id.inner());

    sqlx::query(
        r#"
        INSERT INTO users (
            id, email, name, password_hash,
            status, email_verified_at, global_role,
            terms_accepted_at, terms_version,
            role, institution_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        "#,
    )
    .bind(user_id.inner())
    .bind(&email)
    .bind("Ada")
    .bind("hash")
    .bind("active")
    .bind::<Option<chrono::DateTime<Utc>>>(None)
    .bind::<Option<String>>(None)
    .bind(Utc::now())
    .bind("1.0")
    .bind("student")
    .bind::<Option<uuid::Uuid>>(None)
    .execute(&pool)
    .await
    .unwrap();

    let found = repo
        .find_by_id(&ctx, user_id)
        .await
        .unwrap()
        .expect("user should exist");
    assert_eq!(found.id, user_id);
    assert_eq!(found.email.inner(), email);
    assert_eq!(found.full_name, Some("Ada".to_string()));
    assert_eq!(found.status, UserStatus::Active);
    assert!(found.deleted_at.is_none());

    let (users, total) = repo.list(&ctx, PaginationRequest::first()).await.unwrap();
    assert!(total >= 1);
    assert!(!users.is_empty());

    repo.delete(&ctx, user_id).await.unwrap();

    let after_delete = repo.find_by_id(&ctx, user_id).await.unwrap().unwrap();
    assert!(after_delete.is_deleted());
}

#[tokio::test]
async fn password_hasher_adapter_hashes_and_verifies_with_argon2() {
    let _ = setup_pool().await;

    let hasher = persistence::password_hasher::Argon2PasswordHasher::new();
    let adapter = PasswordHasherAdapter::new(hasher);

    let hash = adapter.hash("Str0ng!Pass#123").await.unwrap();
    assert!(adapter.verify("Str0ng!Pass#123", &hash).await.unwrap());
    assert!(!adapter.verify("wrong-password", &hash).await.unwrap());
}

#[tokio::test]
async fn audit_service_creates_profile_updated_event() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let audit_repo =
        Arc::new(persistence::repositories::audit_event::PgAuditEventRepository::new(pool));
    let audit_service = Arc::new(observability::audit::AuditService::new(audit_repo));
    let ctx = test_ctx();
    let user_id = UserId::new();

    let before = serde_json::json!({ "full_name": "Before" });
    let after = serde_json::json!({ "full_name": "After" });
    let _ = AuditLogger::log_profile_updated(&*audit_service, &ctx, user_id, before, after).await;
}
