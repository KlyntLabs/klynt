//! Integration tests for [`DesktopAppService`] CRUD, ownership, visibility, and
//! icon-tree cleanup.

mod common;

use base::ports::repository::{DesktopAppRepository, TenantDesktopLayoutRepository};
use common::{sample_app, sample_layout, service, test_ctx};
use domain::{DomainError, IconTreeNode, LayoutScope};
use uuid::Uuid;

use tenant_service::TenantError;

#[tokio::test]
async fn create_app_generates_etag_and_sets_owner() {
    let (service, app_repo, _layout_repo, _audit) = service();
    let ctx = test_ctx();
    let tenant_id = Uuid::new_v4();
    let caller_id = Uuid::new_v4();

    let app = service
        .create_app(
            &ctx,
            tenant_id,
            domain::AppType::Markdown,
            "My App".to_string(),
            serde_json::json!({"body": "hello"}),
            serde_json::json!({}),
            None,
            caller_id,
            false,
        )
        .await
        .unwrap();

    assert_eq!(app.tenant_id, tenant_id);
    assert_eq!(app.owner_id, Some(caller_id));
    assert_eq!(app.created_by, caller_id);
    assert!(!app.etag.is_empty());

    let stored = app_repo.find_by_id(&ctx, tenant_id, app.id).await.unwrap();
    assert!(stored.is_some());
}

#[tokio::test]
async fn list_apps_filters_by_visibility() {
    let (service, app_repo, _layout_repo, _audit) = service();
    let ctx = test_ctx();
    let tenant_id = Uuid::new_v4();
    let caller_id = Uuid::new_v4();
    let other_id = Uuid::new_v4();

    let shared = sample_app(tenant_id, None, caller_id);
    let owned = sample_app(tenant_id, Some(caller_id), caller_id);
    let other_private = sample_app(tenant_id, Some(other_id), other_id);

    app_repo.insert(shared);
    app_repo.insert(owned);
    app_repo.insert(other_private);

    let apps = service.list_apps(&ctx, tenant_id, caller_id).await.unwrap();
    assert_eq!(apps.len(), 2);
}

#[tokio::test]
async fn get_desktop_bundle_returns_visible_apps() {
    let (service, app_repo, _layout_repo, _audit) = service();
    let ctx = test_ctx();
    let tenant_id = Uuid::new_v4();
    let caller_id = Uuid::new_v4();
    let other_id = Uuid::new_v4();

    let shared = sample_app(tenant_id, None, caller_id);
    let owned = sample_app(tenant_id, Some(caller_id), caller_id);
    let other_private = sample_app(tenant_id, Some(other_id), other_id);

    app_repo.insert(shared);
    app_repo.insert(owned);
    app_repo.insert(other_private);

    let bundle = service
        .get_desktop_bundle(&ctx, tenant_id, caller_id)
        .await
        .unwrap();
    assert_eq!(bundle.apps.len(), 2);
    assert!(!bundle.etag.is_empty());
}

#[tokio::test]
async fn get_app_returns_owned_app_for_owner() {
    let (service, app_repo, _layout_repo, _audit) = service();
    let ctx = test_ctx();
    let tenant_id = Uuid::new_v4();
    let caller_id = Uuid::new_v4();

    let app = sample_app(tenant_id, Some(caller_id), caller_id);
    app_repo.insert(app.clone());

    let found = service
        .get_app(&ctx, tenant_id, app.id, caller_id)
        .await
        .unwrap();
    assert_eq!(found.id, app.id);
}

#[tokio::test]
async fn get_app_returns_shared_app_for_any_caller() {
    let (service, app_repo, _layout_repo, _audit) = service();
    let ctx = test_ctx();
    let tenant_id = Uuid::new_v4();
    let caller_id = Uuid::new_v4();

    let app = sample_app(tenant_id, None, caller_id);
    app_repo.insert(app.clone());

    let found = service
        .get_app(&ctx, tenant_id, app.id, caller_id)
        .await
        .unwrap();
    assert_eq!(found.id, app.id);
}

#[tokio::test]
async fn get_app_rejects_private_app_for_non_owner() {
    let (service, app_repo, _layout_repo, _audit) = service();
    let ctx = test_ctx();
    let tenant_id = Uuid::new_v4();
    let owner_id = Uuid::new_v4();
    let caller_id = Uuid::new_v4();

    let app = sample_app(tenant_id, Some(owner_id), owner_id);
    app_repo.insert(app.clone());

    let result = service.get_app(&ctx, tenant_id, app.id, caller_id).await;

    assert!(matches!(
        result,
        Err(TenantError::Domain(DomainError::NotPermitted(_)))
    ));
}

#[tokio::test]
async fn update_app_rejects_etag_mismatch() {
    let (service, app_repo, _layout_repo, _audit) = service();
    let ctx = test_ctx();
    let tenant_id = Uuid::new_v4();
    let caller_id = Uuid::new_v4();

    let app = sample_app(tenant_id, Some(caller_id), caller_id);
    app_repo.insert(app.clone());

    let result = service
        .update_app(
            &ctx,
            tenant_id,
            app.id,
            caller_id,
            false,
            "wrong-etag".to_string(),
            Some("Updated".to_string()),
            None,
            None,
        )
        .await;

    assert!(matches!(
        result,
        Err(TenantError::Domain(DomainError::Conflict(_)))
    ));
}

#[tokio::test]
async fn update_app_rejects_non_owner_non_admin() {
    let (service, app_repo, _layout_repo, _audit) = service();
    let ctx = test_ctx();
    let tenant_id = Uuid::new_v4();
    let owner_id = Uuid::new_v4();
    let caller_id = Uuid::new_v4();

    let app = sample_app(tenant_id, Some(owner_id), owner_id);
    app_repo.insert(app.clone());

    let result = service
        .update_app(
            &ctx,
            tenant_id,
            app.id,
            caller_id,
            false,
            app.etag,
            Some("Updated".to_string()),
            None,
            None,
        )
        .await;

    assert!(matches!(
        result,
        Err(TenantError::Domain(DomainError::NotPermitted(_)))
    ));
}

#[tokio::test]
async fn update_app_rejects_locked_app_for_non_admin() {
    let (service, app_repo, _layout_repo, _audit) = service();
    let ctx = test_ctx();
    let tenant_id = Uuid::new_v4();
    let owner_id = Uuid::new_v4();

    let mut app = sample_app(tenant_id, Some(owner_id), owner_id);
    app.locked = true;
    app_repo.insert(app.clone());

    let result = service
        .update_app(
            &ctx,
            tenant_id,
            app.id,
            owner_id,
            false,
            app.etag,
            Some("Updated".to_string()),
            None,
            None,
        )
        .await;

    assert!(matches!(
        result,
        Err(TenantError::Domain(DomainError::NotPermitted(_)))
    ));
}

#[tokio::test]
async fn update_app_allows_locked_app_for_admin() {
    let (service, app_repo, _layout_repo, _audit) = service();
    let ctx = test_ctx();
    let tenant_id = Uuid::new_v4();
    let owner_id = Uuid::new_v4();
    let admin_id = Uuid::new_v4();

    let mut app = sample_app(tenant_id, Some(owner_id), owner_id);
    app.locked = true;
    app_repo.insert(app.clone());

    let result = service
        .update_app(
            &ctx,
            tenant_id,
            app.id,
            admin_id,
            true,
            app.etag,
            Some("Updated".to_string()),
            None,
            None,
        )
        .await;

    assert!(result.is_ok());
}

#[tokio::test]
async fn delete_app_succeeds_for_owner() {
    let (service, app_repo, _layout_repo, _audit) = service();
    let ctx = test_ctx();
    let tenant_id = Uuid::new_v4();
    let caller_id = Uuid::new_v4();

    let app = sample_app(tenant_id, Some(caller_id), caller_id);
    app_repo.insert(app.clone());

    service
        .delete_app(&ctx, tenant_id, app.id, caller_id, false)
        .await
        .unwrap();

    let stored = app_repo.find_by_id(&ctx, tenant_id, app.id).await.unwrap();
    assert!(stored.is_none());
}

#[tokio::test]
async fn delete_app_succeeds_for_admin() {
    let (service, app_repo, _layout_repo, _audit) = service();
    let ctx = test_ctx();
    let tenant_id = Uuid::new_v4();
    let owner_id = Uuid::new_v4();
    let admin_id = Uuid::new_v4();

    let app = sample_app(tenant_id, Some(owner_id), owner_id);
    app_repo.insert(app.clone());

    service
        .delete_app(&ctx, tenant_id, app.id, admin_id, true)
        .await
        .unwrap();

    let stored = app_repo.find_by_id(&ctx, tenant_id, app.id).await.unwrap();
    assert!(stored.is_none());
}

#[tokio::test]
async fn delete_app_fails_for_non_owner() {
    let (service, app_repo, _layout_repo, _audit) = service();
    let ctx = test_ctx();
    let tenant_id = Uuid::new_v4();
    let owner_id = Uuid::new_v4();
    let caller_id = Uuid::new_v4();

    let app = sample_app(tenant_id, Some(owner_id), owner_id);
    app_repo.insert(app.clone());

    let result = service
        .delete_app(&ctx, tenant_id, app.id, caller_id, false)
        .await;

    assert!(matches!(
        result,
        Err(TenantError::Domain(DomainError::NotPermitted(_)))
    ));

    let stored = app_repo.find_by_id(&ctx, tenant_id, app.id).await.unwrap();
    assert!(stored.is_some());
}

#[tokio::test]
async fn delete_app_removes_icon_tree_node() {
    let (service, app_repo, layout_repo, _audit) = service();
    let ctx = test_ctx();
    let tenant_id = Uuid::new_v4();
    let owner_id = Uuid::new_v4();
    let admin_id = Uuid::new_v4();

    let app = sample_app(tenant_id, Some(owner_id), owner_id);
    app_repo.insert(app.clone());

    let other_app_id = Uuid::new_v4();

    let shared_layout = sample_layout(
        tenant_id,
        LayoutScope::Shared,
        None,
        vec![
            IconTreeNode {
                app_id: app.id,
                x: 0,
                y: 0,
                children: Vec::new(),
            },
            IconTreeNode {
                app_id: other_app_id,
                x: 1,
                y: 1,
                children: vec![IconTreeNode {
                    app_id: app.id,
                    x: 2,
                    y: 2,
                    children: Vec::new(),
                }],
            },
        ],
    );
    layout_repo.upsert(&ctx, &shared_layout).await.unwrap();

    let owner_layout = sample_layout(
        tenant_id,
        LayoutScope::User,
        Some(owner_id),
        vec![IconTreeNode {
            app_id: app.id,
            x: 3,
            y: 3,
            children: Vec::new(),
        }],
    );
    layout_repo.upsert(&ctx, &owner_layout).await.unwrap();

    let admin_layout = sample_layout(
        tenant_id,
        LayoutScope::User,
        Some(admin_id),
        vec![IconTreeNode {
            app_id: app.id,
            x: 4,
            y: 4,
            children: Vec::new(),
        }],
    );
    layout_repo.upsert(&ctx, &admin_layout).await.unwrap();

    service
        .delete_app(&ctx, tenant_id, app.id, admin_id, true)
        .await
        .unwrap();

    let shared_after = layout_repo
        .find(&ctx, tenant_id, LayoutScope::Shared, None)
        .await
        .unwrap()
        .unwrap();
    assert!(!shared_after.icon_tree.iter().any(|n| n.app_id == app.id));
    assert!(shared_after
        .icon_tree
        .iter()
        .any(|n| n.app_id == other_app_id));
    assert!(shared_after
        .icon_tree
        .iter()
        .find(|n| n.app_id == other_app_id)
        .unwrap()
        .children
        .is_empty());

    let owner_after = layout_repo
        .find(&ctx, tenant_id, LayoutScope::User, Some(owner_id))
        .await
        .unwrap()
        .unwrap();
    assert!(!owner_after.icon_tree.iter().any(|n| n.app_id == app.id));

    let admin_after = layout_repo
        .find(&ctx, tenant_id, LayoutScope::User, Some(admin_id))
        .await
        .unwrap()
        .unwrap();
    assert!(!admin_after.icon_tree.iter().any(|n| n.app_id == app.id));
}
