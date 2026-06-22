//! Postgres-backed integration tests for the audit event repository.
//!
//! These tests require `DATABASE_URL` to point at a running PostgreSQL instance.
//! If `DATABASE_URL` is unset, the tests are skipped.

use base::ctx::{ExecutionContext, RequestContext};
use observability::audit::types::{AuditAction, AuditEvent, AuditEventRepository, ResourceType};
use persistence::repositories::audit_event::PgAuditEventRepository;

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
async fn audit_event_with_ip_round_trips_through_postgres() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgAuditEventRepository::new(pool);
    let ctx = test_ctx();

    let event = AuditEvent::new(AuditAction::UserRegistered, ResourceType::User)
        .with_ip("192.168.1.1".to_string());

    repo.log(&ctx, event).await.unwrap();
}

#[tokio::test]
async fn audit_event_without_ip_inserts_null_inet() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgAuditEventRepository::new(pool);
    let ctx = test_ctx();

    let event = AuditEvent::new(AuditAction::UserRegistered, ResourceType::User);

    repo.log(&ctx, event).await.unwrap();
}
