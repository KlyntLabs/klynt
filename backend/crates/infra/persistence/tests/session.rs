//! Integration tests for the PostgreSQL session store.

use base::ctx::{ExecutionContext, RequestContext};
use base::ports::session::{MembershipSnapshot, SessionKind, SessionStore};
use chrono::{Duration, Utc};
use domain::{Email, TenantRole, UserId, UserStatus};
use persistence::repositories::session::PgSessionStore;
use sqlx::PgPool;
use uuid::Uuid;

fn database_url() -> String {
    std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://klynt:klynt@localhost:5432/test".to_string())
}

async fn setup_pool() -> PgPool {
    let pool = PgPool::connect(&database_url()).await.unwrap();
    sqlx::migrate!("../../../migrations")
        .run(&pool)
        .await
        .unwrap();
    pool
}

async fn create_test_user(pool: &PgPool) -> UserId {
    let user_id = UserId(Uuid::new_v4());
    let email = Email::parse(&format!("{}@example.com", Uuid::new_v4())).unwrap();

    let username = email.as_str().split('@').next().unwrap().to_string();

    sqlx::query(
        r#"
        INSERT INTO users (id, email, username, password_hash, name, status, email_verified_at, terms_accepted_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        "#,
    )
    .bind(user_id.0)
    .bind(email.as_str())
    .bind(&username)
    .bind("hashed")
    .bind("Test User")
    .bind(UserStatus::Active.as_str())
    .execute(pool)
    .await
    .unwrap();

    user_id
}

#[tokio::test]
async fn create_and_find_session() {
    let pool = setup_pool().await;
    let user_id = create_test_user(&pool).await;
    let store = PgSessionStore::new(pool);
    let ctx = ExecutionContext::new(RequestContext::new());
    let expires_at = Utc::now() + Duration::hours(1);

    let token = store
        .create_with_kind(&ctx, user_id, expires_at, SessionKind::Access, None)
        .await
        .unwrap();
    let session = store.find_valid(&ctx, &token).await.unwrap();

    assert!(session.is_some());
    let session = session.unwrap();
    assert_eq!(session.user_id, user_id);
    assert_eq!(session.kind, SessionKind::Access);
}

#[tokio::test]
async fn expired_session_is_not_found() {
    let pool = setup_pool().await;
    let user_id = create_test_user(&pool).await;
    let store = PgSessionStore::new(pool);
    let ctx = ExecutionContext::new(RequestContext::new());
    let expires_at = Utc::now() - Duration::hours(1);

    let token = store
        .create_with_kind(&ctx, user_id, expires_at, SessionKind::Access, None)
        .await
        .unwrap();
    let session = store.find_valid(&ctx, &token).await.unwrap();

    assert!(session.is_none());
}

#[tokio::test]
async fn revoked_session_is_not_found() {
    let pool = setup_pool().await;
    let user_id = create_test_user(&pool).await;
    let store = PgSessionStore::new(pool);
    let ctx = ExecutionContext::new(RequestContext::new());
    let expires_at = Utc::now() + Duration::hours(1);

    let token = store
        .create_with_kind(&ctx, user_id, expires_at, SessionKind::Access, None)
        .await
        .unwrap();
    store.revoke(&ctx, &token).await.unwrap();

    let session = store.find_valid(&ctx, &token).await.unwrap();
    assert!(session.is_none());
}

#[tokio::test]
async fn update_memberships_replaces_snapshot_for_token() {
    let pool = setup_pool().await;
    let user_id = create_test_user(&pool).await;
    let store = PgSessionStore::new(pool);
    let ctx = ExecutionContext::new(RequestContext::new());
    let expires_at = Utc::now() + Duration::hours(1);
    let tenant_id = Uuid::new_v4();
    let snapshot = MembershipSnapshot {
        tenant_id,
        role: TenantRole::Member,
    };

    let token = store
        .create_with_kind(&ctx, user_id, expires_at, SessionKind::Access, None)
        .await
        .unwrap();

    store
        .update_memberships(&ctx, &token, vec![snapshot.clone()])
        .await
        .unwrap();

    let session = store.find_valid(&ctx, &token).await.unwrap().unwrap();
    assert_eq!(session.tenant_memberships, vec![snapshot]);
}

#[tokio::test]
async fn add_membership_appends_to_active_sessions_for_user() {
    let pool = setup_pool().await;
    let user_id = create_test_user(&pool).await;
    let store = PgSessionStore::new(pool);
    let ctx = ExecutionContext::new(RequestContext::new());
    let active_expires_at = Utc::now() + Duration::hours(1);
    let expired_expires_at = Utc::now() - Duration::hours(1);
    let tenant_id = Uuid::new_v4();
    let snapshot = MembershipSnapshot {
        tenant_id,
        role: TenantRole::Member,
    };

    let active_token_a = store
        .create_with_kind(&ctx, user_id, active_expires_at, SessionKind::Access, None)
        .await
        .unwrap();
    let active_token_b = store
        .create_with_kind(&ctx, user_id, active_expires_at, SessionKind::Access, None)
        .await
        .unwrap();
    let expired_token = store
        .create_with_kind(&ctx, user_id, expired_expires_at, SessionKind::Access, None)
        .await
        .unwrap();

    store
        .add_membership(&ctx, user_id, snapshot.clone())
        .await
        .unwrap();

    let active_a = store
        .find_valid(&ctx, &active_token_a)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(active_a.tenant_memberships, vec![snapshot.clone()]);

    let active_b = store
        .find_valid(&ctx, &active_token_b)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(active_b.tenant_memberships, vec![snapshot.clone()]);

    let expired = store.find_valid(&ctx, &expired_token).await.unwrap();
    assert!(expired.is_none());
}

#[tokio::test]
async fn add_membership_is_idempotent_for_same_tenant() {
    let pool = setup_pool().await;
    let user_id = create_test_user(&pool).await;
    let store = PgSessionStore::new(pool);
    let ctx = ExecutionContext::new(RequestContext::new());
    let expires_at = Utc::now() + Duration::hours(1);
    let tenant_id = Uuid::new_v4();
    let member_snapshot = MembershipSnapshot {
        tenant_id,
        role: TenantRole::Member,
    };
    let admin_snapshot = MembershipSnapshot {
        tenant_id,
        role: TenantRole::Admin,
    };

    let token = store
        .create_with_kind(&ctx, user_id, expires_at, SessionKind::Access, None)
        .await
        .unwrap();

    store
        .add_membership(&ctx, user_id, member_snapshot.clone())
        .await
        .unwrap();
    store
        .add_membership(&ctx, user_id, admin_snapshot.clone())
        .await
        .unwrap();

    let session = store.find_valid(&ctx, &token).await.unwrap().unwrap();
    assert_eq!(session.tenant_memberships.len(), 1);
    assert_eq!(session.tenant_memberships[0], admin_snapshot);
}

#[tokio::test]
async fn remove_membership_removes_snapshot_for_tenant_and_leaves_others() {
    let pool = setup_pool().await;
    let user_id = create_test_user(&pool).await;
    let store = PgSessionStore::new(pool);
    let ctx = ExecutionContext::new(RequestContext::new());
    let expires_at = Utc::now() + Duration::hours(1);
    let tenant_a = Uuid::new_v4();
    let tenant_b = Uuid::new_v4();
    let snapshot_a = MembershipSnapshot {
        tenant_id: tenant_a,
        role: TenantRole::Member,
    };
    let snapshot_b = MembershipSnapshot {
        tenant_id: tenant_b,
        role: TenantRole::Admin,
    };

    let token_a = store
        .create_with_kind(&ctx, user_id, expires_at, SessionKind::Access, None)
        .await
        .unwrap();
    let token_b = store
        .create_with_kind(&ctx, user_id, expires_at, SessionKind::Access, None)
        .await
        .unwrap();

    store
        .update_memberships(&ctx, &token_a, vec![snapshot_a.clone()])
        .await
        .unwrap();
    store
        .update_memberships(&ctx, &token_b, vec![snapshot_b.clone()])
        .await
        .unwrap();

    store
        .remove_membership(&ctx, user_id, domain::TenantId::from_uuid(tenant_a))
        .await
        .unwrap();

    let session_a = store.find_valid(&ctx, &token_a).await.unwrap().unwrap();
    assert!(session_a.tenant_memberships.is_empty());

    let session_b = store.find_valid(&ctx, &token_b).await.unwrap().unwrap();
    assert_eq!(session_b.tenant_memberships, vec![snapshot_b.clone()]);
}
