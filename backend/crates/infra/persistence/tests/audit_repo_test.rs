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
    let pool = sqlx::PgPool::connect(&url)
        .await
        .expect("DATABASE_URL must point to a running PostgreSQL instance");
    sqlx::migrate!("../../../migrations")
        .run(&pool)
        .await
        .expect("migrations must apply successfully");
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

    let repo = PgAuditEventRepository::new(pool.clone());
    let ctx = test_ctx();

    let event = AuditEvent::new(AuditAction::UserRegistered, ResourceType::User)
        .with_ip("192.168.1.1".to_string());
    let event_id = event.id;

    repo.log(&ctx, event).await.unwrap();

    let stored_ip: String = sqlx::query_scalar!(
        r#"SELECT host(actor_ip_address) AS "host!" FROM audit_events WHERE id = $1"#,
        event_id
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(stored_ip, "192.168.1.1");
}

#[tokio::test]
async fn audit_event_with_ipv6_round_trips_through_postgres() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgAuditEventRepository::new(pool.clone());
    let ctx = test_ctx();

    let event = AuditEvent::new(AuditAction::UserRegistered, ResourceType::User)
        .with_ip("2001:db8::1".to_string());
    let event_id = event.id;

    repo.log(&ctx, event).await.unwrap();

    let stored_ip: String = sqlx::query_scalar!(
        r#"SELECT host(actor_ip_address) AS "host!" FROM audit_events WHERE id = $1"#,
        event_id
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(stored_ip, "2001:db8::1");
}

#[tokio::test]
async fn audit_event_without_ip_inserts_null_inet() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgAuditEventRepository::new(pool.clone());
    let ctx = test_ctx();

    let event = AuditEvent::new(AuditAction::UserRegistered, ResourceType::User);
    let event_id = event.id;

    repo.log(&ctx, event).await.unwrap();

    let stored_count: i64 = sqlx::query_scalar!(
        r#"SELECT COUNT(*) AS "count!" FROM audit_events WHERE id = $1 AND actor_ip_address IS NULL"#,
        event_id
    )
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(stored_count, 1);
}
