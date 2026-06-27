//! Integration tests for [`SessionCoordinator`] membership event handling.

use std::sync::Arc;

use base::ctx::ExecutionContext;
use base::ports::session::{SessionKind, SessionStore};
use base::testkit::{test_ctx, FakeSessionStore};
use chrono::{Duration, Utc};
use domain::{membership::TenantRole, TenantId, UserId};

use crate::{MembershipEvent, SessionCoordinator, SessionCoordinatorConfig};

async fn create_session_for_user(
    store: &FakeSessionStore,
    ctx: &ExecutionContext,
    user_id: UserId,
) -> base::ports::session::SessionToken {
    let expires_at = Utc::now() + Duration::hours(1);
    store
        .create_with_kind(ctx, user_id, expires_at, SessionKind::Access, None)
        .await
        .expect("create_with_kind should succeed")
}

#[tokio::test]
async fn test_added_event_adds_membership_to_session() {
    let fake_store = Arc::new(FakeSessionStore::new());
    let coordinator =
        SessionCoordinator::new(fake_store.clone(), SessionCoordinatorConfig::default());
    let ctx = test_ctx();
    let tenant_id = TenantId::new();
    let user_id = UserId::new();
    let token = create_session_for_user(&fake_store, &ctx, user_id).await;

    let event = MembershipEvent::Added {
        tenant_id,
        user_id,
        role: TenantRole::Member,
    };

    coordinator
        .handle_membership_event(&ctx, event)
        .await
        .unwrap();

    let session = fake_store
        .find_valid(&ctx, &token)
        .await
        .unwrap()
        .expect("session should exist");
    assert_eq!(session.tenant_memberships.len(), 1);
    assert_eq!(session.tenant_memberships[0].tenant_id, tenant_id.inner());
    assert_eq!(session.tenant_memberships[0].role, TenantRole::Member);
}

#[tokio::test]
async fn test_updated_event_updates_membership_in_session() {
    let fake_store = Arc::new(FakeSessionStore::new());
    let coordinator =
        SessionCoordinator::new(fake_store.clone(), SessionCoordinatorConfig::default());
    let ctx = test_ctx();
    let tenant_id = TenantId::new();
    let user_id = UserId::new();
    let token = create_session_for_user(&fake_store, &ctx, user_id).await;

    let add_event = MembershipEvent::Added {
        tenant_id,
        user_id,
        role: TenantRole::Member,
    };
    coordinator
        .handle_membership_event(&ctx, add_event)
        .await
        .unwrap();

    let update_event = MembershipEvent::Updated {
        tenant_id,
        user_id,
        role: TenantRole::Admin,
    };
    coordinator
        .handle_membership_event(&ctx, update_event)
        .await
        .unwrap();

    let session = fake_store
        .find_valid(&ctx, &token)
        .await
        .unwrap()
        .expect("session should exist");
    assert_eq!(session.tenant_memberships.len(), 1);
    assert_eq!(session.tenant_memberships[0].tenant_id, tenant_id.inner());
    assert_eq!(session.tenant_memberships[0].role, TenantRole::Admin);
}

#[tokio::test]
async fn test_removed_event_removes_membership_from_session() {
    let fake_store = Arc::new(FakeSessionStore::new());
    let coordinator =
        SessionCoordinator::new(fake_store.clone(), SessionCoordinatorConfig::default());
    let ctx = test_ctx();
    let tenant_id = TenantId::new();
    let user_id = UserId::new();
    let token = create_session_for_user(&fake_store, &ctx, user_id).await;

    let add_event = MembershipEvent::Added {
        tenant_id,
        user_id,
        role: TenantRole::Member,
    };
    coordinator
        .handle_membership_event(&ctx, add_event)
        .await
        .unwrap();

    let remove_event = MembershipEvent::Removed { tenant_id, user_id };
    coordinator
        .handle_membership_event(&ctx, remove_event)
        .await
        .unwrap();

    let session = fake_store
        .find_valid(&ctx, &token)
        .await
        .unwrap()
        .expect("session should exist");
    assert!(session.tenant_memberships.is_empty());
}

#[tokio::test]
async fn test_disabled_config_short_circuits_without_touching_store() {
    let fake_store = Arc::new(FakeSessionStore::new());
    let config = SessionCoordinatorConfig { enabled: false };
    let coordinator = SessionCoordinator::new(fake_store.clone(), config);
    let ctx = test_ctx();
    let tenant_id = TenantId::new();
    let user_id = UserId::new();
    let token = create_session_for_user(&fake_store, &ctx, user_id).await;

    let event = MembershipEvent::Added {
        tenant_id,
        user_id,
        role: TenantRole::Member,
    };

    coordinator
        .handle_membership_event(&ctx, event)
        .await
        .unwrap();

    let session = fake_store
        .find_valid(&ctx, &token)
        .await
        .unwrap()
        .expect("session should exist");
    assert!(session.tenant_memberships.is_empty());
}

#[tokio::test]
async fn test_events_for_user_with_no_session_do_not_create_phantom_session() {
    let fake_store = Arc::new(FakeSessionStore::new());
    let coordinator =
        SessionCoordinator::new(fake_store.clone(), SessionCoordinatorConfig::default());
    let ctx = test_ctx();
    let tenant_id = TenantId::new();
    let user_id = UserId::new();

    coordinator
        .handle_membership_event(
            &ctx,
            MembershipEvent::Added {
                tenant_id,
                user_id,
                role: TenantRole::Member,
            },
        )
        .await
        .unwrap();
    coordinator
        .handle_membership_event(
            &ctx,
            MembershipEvent::Updated {
                tenant_id,
                user_id,
                role: TenantRole::Admin,
            },
        )
        .await
        .unwrap();
    coordinator
        .handle_membership_event(&ctx, MembershipEvent::Removed { tenant_id, user_id })
        .await
        .unwrap();

    let active_sessions = fake_store.list_active_by_user(&ctx, user_id).await.unwrap();
    assert!(active_sessions.is_empty());
}

#[tokio::test]
async fn test_updated_without_prior_add_is_idempotent() {
    let fake_store = Arc::new(FakeSessionStore::new());
    let coordinator =
        SessionCoordinator::new(fake_store.clone(), SessionCoordinatorConfig::default());
    let ctx = test_ctx();
    let tenant_id = TenantId::new();
    let user_id = UserId::new();
    let token = create_session_for_user(&fake_store, &ctx, user_id).await;

    let event = MembershipEvent::Updated {
        tenant_id,
        user_id,
        role: TenantRole::Admin,
    };
    coordinator
        .handle_membership_event(&ctx, event)
        .await
        .unwrap();

    let session = fake_store
        .find_valid(&ctx, &token)
        .await
        .unwrap()
        .expect("session should exist");
    assert!(session.tenant_memberships.is_empty());
}

#[tokio::test]
async fn test_removed_without_prior_add_is_idempotent() {
    let fake_store = Arc::new(FakeSessionStore::new());
    let coordinator =
        SessionCoordinator::new(fake_store.clone(), SessionCoordinatorConfig::default());
    let ctx = test_ctx();
    let tenant_id = TenantId::new();
    let user_id = UserId::new();
    let token = create_session_for_user(&fake_store, &ctx, user_id).await;

    let event = MembershipEvent::Removed { tenant_id, user_id };
    coordinator
        .handle_membership_event(&ctx, event)
        .await
        .unwrap();

    let session = fake_store
        .find_valid(&ctx, &token)
        .await
        .unwrap()
        .expect("session should exist");
    assert!(session.tenant_memberships.is_empty());
}
