//! Postgres-backed integration tests for the canonical DesktopAppRepository.
//!
//! These tests require `DATABASE_URL` to point at a running PostgreSQL instance.
//! If `DATABASE_URL` is unset, the tests are skipped.

use base::ctx::{ExecutionContext, RequestContext};
use base::ports::repository::{DesktopAppRepository, TenantRepository, UserRepository};
use domain::{
    AppType, DesktopApp, DomainError, IconTreePosition, LayoutScope, Tenant, TenantSlug, UserRole,
};
use persistence::repositories::desktop_app::PgDesktopAppRepository;
use persistence::repositories::tenant::PgTenantRepository;
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

fn unique_email() -> domain::Email {
    domain::Email::new(format!(
        "desktop-app-test-{}@example.com",
        domain::UserId::new().inner()
    ))
}

fn unique_slug() -> TenantSlug {
    TenantSlug::parse(&format!(
        "desktop-app-{}-slug",
        domain::UserId::new().inner()
    ))
    .unwrap()
}

async fn create_test_user(pool: &sqlx::PgPool, name: &str) -> domain::UserId {
    let user_repo = PgUserRepository::new(pool.clone());
    let email = unique_email();
    let username = domain::UserId::new().inner().to_string();
    user_repo
        .create_pending_user(
            &test_ctx(),
            name.to_string(),
            username,
            email,
            "hash".to_string(),
            UserRole::Student,
            None,
        )
        .await
        .unwrap()
}

async fn create_test_tenant(pool: &sqlx::PgPool, owner_id: domain::UserId) -> Tenant {
    let tenant_repo = PgTenantRepository::new(pool.clone());
    let slug = unique_slug();
    let tenant = Tenant::create(slug, "Test Tenant".to_string(), owner_id).unwrap();
    tenant_repo.create(&test_ctx(), &tenant).await.unwrap()
}

fn new_desktop_app(
    tenant_id: uuid::Uuid,
    owner_id: Option<uuid::Uuid>,
    created_by: uuid::Uuid,
) -> DesktopApp {
    DesktopApp {
        id: uuid::Uuid::new_v4(),
        tenant_id,
        app_type: AppType::Notes,
        title: "Test App".to_string(),
        content: serde_json::json!({}),
        menu_config: serde_json::json!({}),
        owner_id,
        created_by,
        locked: false,
        etag: uuid::Uuid::new_v4().to_string(),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    }
}

async fn cleanup_test_data(
    pool: &sqlx::PgPool,
    user_ids: &[domain::UserId],
    tenant_ids: &[domain::TenantId],
) {
    for tenant_id in tenant_ids {
        sqlx::query!(
            r#"DELETE FROM tenant_desktop_layouts WHERE tenant_id = $1"#,
            tenant_id.inner()
        )
        .execute(pool)
        .await
        .expect("failed to cleanup tenant_desktop_layouts");
        sqlx::query!(
            r#"DELETE FROM desktop_apps WHERE tenant_id = $1"#,
            tenant_id.inner()
        )
        .execute(pool)
        .await
        .expect("failed to cleanup desktop_apps");
        sqlx::query!(
            r#"DELETE FROM user_tenant_memberships WHERE tenant_id = $1"#,
            tenant_id.inner()
        )
        .execute(pool)
        .await
        .expect("failed to cleanup user_tenant_memberships");
        sqlx::query!(r#"DELETE FROM tenants WHERE id = $1"#, tenant_id.inner())
            .execute(pool)
            .await
            .expect("failed to cleanup tenants");
    }
    for user_id in user_ids {
        sqlx::query!(r#"DELETE FROM users WHERE id = $1"#, user_id.inner())
            .execute(pool)
            .await
            .expect("failed to cleanup users");
    }
}

/// Read the icon tree directly from the persistence layer.
///
/// This is intentionally coupled to the internal `tenant_desktop_layouts` schema
/// so the integration test can verify exactly what the repository wrote to the
/// database. Production code should use the public layout repository instead.
async fn fetch_icon_tree(
    pool: &sqlx::PgPool,
    tenant_id: uuid::Uuid,
    scope: LayoutScope,
    user_id: Option<uuid::Uuid>,
) -> Vec<domain::IconTreeNode> {
    let row = sqlx::query!(
        r#"
        SELECT icon_tree
        FROM tenant_desktop_layouts
        WHERE tenant_id = $1 AND scope = $2 AND user_id IS NOT DISTINCT FROM $3
        "#,
        tenant_id,
        scope.as_str(),
        user_id
    )
    .fetch_one(pool)
    .await
    .expect("fetch_icon_tree: failed to read layout row");
    serde_json::from_value(row.icon_tree).expect("fetch_icon_tree: invalid icon_tree JSON in DB")
}

#[tokio::test]
async fn create_with_position_appends_to_root_of_shared_layout() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgDesktopAppRepository::new(pool.clone());
    let owner_id = create_test_user(&pool, "SharedOwner").await;
    let tenant = create_test_tenant(&pool, owner_id).await;
    let app = new_desktop_app(tenant.id.inner(), None, owner_id.inner());

    let created = repo
        .create_with_position(
            &test_ctx(),
            &app,
            &IconTreePosition {
                app_id: app.id,
                x: 10,
                y: 20,
                parent_id: None,
            },
            LayoutScope::Shared,
        )
        .await
        .unwrap();
    assert_eq!(created.id, app.id);

    let tree = fetch_icon_tree(&pool, tenant.id.inner(), LayoutScope::Shared, None).await;
    assert_eq!(tree.len(), 1);
    assert_eq!(tree[0].app_id, app.id);
    assert_eq!(tree[0].x, 10);
    assert_eq!(tree[0].y, 20);
    assert!(tree[0].children.is_empty());

    cleanup_test_data(&pool, &[owner_id], &[tenant.id]).await;
}

#[tokio::test]
async fn create_with_position_creates_user_layout() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgDesktopAppRepository::new(pool.clone());
    let owner_id = create_test_user(&pool, "UserOwner").await;
    let tenant = create_test_tenant(&pool, owner_id).await;
    let app = new_desktop_app(tenant.id.inner(), Some(owner_id.inner()), owner_id.inner());

    let created = repo
        .create_with_position(
            &test_ctx(),
            &app,
            &IconTreePosition {
                app_id: app.id,
                x: 5,
                y: 15,
                parent_id: None,
            },
            LayoutScope::User,
        )
        .await
        .unwrap();
    assert_eq!(created.id, app.id);

    let tree = fetch_icon_tree(
        &pool,
        tenant.id.inner(),
        LayoutScope::User,
        Some(owner_id.inner()),
    )
    .await;
    assert_eq!(tree.len(), 1);
    assert_eq!(tree[0].app_id, app.id);

    cleanup_test_data(&pool, &[owner_id], &[tenant.id]).await;
}

#[tokio::test]
async fn create_with_position_nests_under_parent_id() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgDesktopAppRepository::new(pool.clone());
    let owner_id = create_test_user(&pool, "FolderOwner").await;
    let tenant = create_test_tenant(&pool, owner_id).await;

    let mut folder_app = new_desktop_app(tenant.id.inner(), None, owner_id.inner());
    folder_app.app_type = AppType::Folder;
    let folder_id = folder_app.id;
    repo.create_with_position(
        &test_ctx(),
        &folder_app,
        &IconTreePosition {
            app_id: folder_id,
            x: 0,
            y: 0,
            parent_id: None,
        },
        LayoutScope::Shared,
    )
    .await
    .unwrap();

    let child_app = new_desktop_app(tenant.id.inner(), None, owner_id.inner());
    let child_id = child_app.id;
    repo.create_with_position(
        &test_ctx(),
        &child_app,
        &IconTreePosition {
            app_id: child_id,
            x: 1,
            y: 2,
            parent_id: Some(folder_id),
        },
        LayoutScope::Shared,
    )
    .await
    .unwrap();

    let tree = fetch_icon_tree(&pool, tenant.id.inner(), LayoutScope::Shared, None).await;
    assert_eq!(tree.len(), 1);
    assert_eq!(tree[0].app_id, folder_id);
    let children = &tree[0].children;
    assert_eq!(children.len(), 1);
    assert_eq!(children[0].app_id, child_id);
    assert_eq!(children[0].x, 1);
    assert_eq!(children[0].y, 2);

    cleanup_test_data(&pool, &[owner_id], &[tenant.id]).await;
}

#[tokio::test]
async fn create_with_position_user_scope_without_owner_id_returns_validation_error() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgDesktopAppRepository::new(pool.clone());
    let owner_id = create_test_user(&pool, "NoOwner").await;
    let tenant = create_test_tenant(&pool, owner_id).await;
    let app = new_desktop_app(tenant.id.inner(), None, owner_id.inner());

    let result = repo
        .create_with_position(
            &test_ctx(),
            &app,
            &IconTreePosition {
                app_id: app.id,
                x: 0,
                y: 0,
                parent_id: None,
            },
            LayoutScope::User,
        )
        .await;

    assert!(matches!(result, Err(DomainError::Validation(_))));

    cleanup_test_data(&pool, &[owner_id], &[tenant.id]).await;
}

#[tokio::test]
async fn create_with_position_missing_parent_id_returns_not_found() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgDesktopAppRepository::new(pool.clone());
    let owner_id = create_test_user(&pool, "MissingParent").await;
    let tenant = create_test_tenant(&pool, owner_id).await;
    let app = new_desktop_app(tenant.id.inner(), None, owner_id.inner());

    let result = repo
        .create_with_position(
            &test_ctx(),
            &app,
            &IconTreePosition {
                app_id: app.id,
                x: 0,
                y: 0,
                parent_id: Some(uuid::Uuid::new_v4()),
            },
            LayoutScope::Shared,
        )
        .await;

    assert!(matches!(result, Err(DomainError::NotFound(_))));

    cleanup_test_data(&pool, &[owner_id], &[tenant.id]).await;
}

#[tokio::test]
async fn list_visible_returns_shared_and_owned_apps() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgDesktopAppRepository::new(pool.clone());
    let owner_id = create_test_user(&pool, "VisibleOwner").await;
    let other_id = create_test_user(&pool, "OtherUser").await;
    let tenant = create_test_tenant(&pool, owner_id).await;

    let shared_app = new_desktop_app(tenant.id.inner(), None, owner_id.inner());
    let owned_app = new_desktop_app(tenant.id.inner(), Some(owner_id.inner()), owner_id.inner());
    let other_app = new_desktop_app(tenant.id.inner(), Some(other_id.inner()), other_id.inner());

    repo.create_with_position(
        &test_ctx(),
        &shared_app,
        &IconTreePosition {
            app_id: shared_app.id,
            x: 0,
            y: 0,
            parent_id: None,
        },
        LayoutScope::Shared,
    )
    .await
    .unwrap();
    repo.create_with_position(
        &test_ctx(),
        &owned_app,
        &IconTreePosition {
            app_id: owned_app.id,
            x: 0,
            y: 0,
            parent_id: None,
        },
        LayoutScope::User,
    )
    .await
    .unwrap();
    repo.create_with_position(
        &test_ctx(),
        &other_app,
        &IconTreePosition {
            app_id: other_app.id,
            x: 0,
            y: 0,
            parent_id: None,
        },
        LayoutScope::User,
    )
    .await
    .unwrap();

    let visible = repo
        .list_visible(&test_ctx(), tenant.id.inner(), owner_id.inner())
        .await
        .unwrap();
    let visible_ids: Vec<_> = visible.iter().map(|a| a.id).collect();
    assert!(visible_ids.contains(&shared_app.id));
    assert!(visible_ids.contains(&owned_app.id));
    assert!(!visible_ids.contains(&other_app.id));

    cleanup_test_data(&pool, &[owner_id, other_id], &[tenant.id]).await;
}

#[tokio::test]
async fn find_by_id_returns_correct_app() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgDesktopAppRepository::new(pool.clone());
    let owner_id = create_test_user(&pool, "Finder").await;
    let tenant = create_test_tenant(&pool, owner_id).await;
    let app = new_desktop_app(tenant.id.inner(), None, owner_id.inner());

    repo.create_with_position(
        &test_ctx(),
        &app,
        &IconTreePosition {
            app_id: app.id,
            x: 0,
            y: 0,
            parent_id: None,
        },
        LayoutScope::Shared,
    )
    .await
    .unwrap();

    let found = repo
        .find_by_id(&test_ctx(), tenant.id.inner(), app.id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(found.id, app.id);
    assert_eq!(found.title, app.title);

    let missing = repo
        .find_by_id(&test_ctx(), tenant.id.inner(), uuid::Uuid::new_v4())
        .await
        .unwrap();
    assert!(missing.is_none());

    cleanup_test_data(&pool, &[owner_id], &[tenant.id]).await;
}

#[tokio::test]
async fn update_with_matching_etag_succeeds() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgDesktopAppRepository::new(pool.clone());
    let owner_id = create_test_user(&pool, "Updater").await;
    let tenant = create_test_tenant(&pool, owner_id).await;
    let mut app = new_desktop_app(tenant.id.inner(), None, owner_id.inner());

    repo.create_with_position(
        &test_ctx(),
        &app,
        &IconTreePosition {
            app_id: app.id,
            x: 0,
            y: 0,
            parent_id: None,
        },
        LayoutScope::Shared,
    )
    .await
    .unwrap();

    app.title = "Updated Title".to_string();
    let updated = repo.update(&test_ctx(), &app, &app.etag).await.unwrap();
    assert_eq!(updated.title, "Updated Title");
    assert_ne!(updated.etag, app.etag);

    cleanup_test_data(&pool, &[owner_id], &[tenant.id]).await;
}

#[tokio::test]
async fn update_with_wrong_etag_returns_conflict() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgDesktopAppRepository::new(pool.clone());
    let owner_id = create_test_user(&pool, "EtagConflict").await;
    let tenant = create_test_tenant(&pool, owner_id).await;
    let app = new_desktop_app(tenant.id.inner(), None, owner_id.inner());

    repo.create_with_position(
        &test_ctx(),
        &app,
        &IconTreePosition {
            app_id: app.id,
            x: 0,
            y: 0,
            parent_id: None,
        },
        LayoutScope::Shared,
    )
    .await
    .unwrap();

    let result = repo.update(&test_ctx(), &app, "wrong-etag").await;
    assert!(matches!(result, Err(DomainError::Conflict(_))));

    cleanup_test_data(&pool, &[owner_id], &[tenant.id]).await;
}

#[tokio::test]
async fn update_with_wrong_tenant_id_returns_conflict() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgDesktopAppRepository::new(pool.clone());
    let owner_id = create_test_user(&pool, "TenantIsolation").await;
    let tenant = create_test_tenant(&pool, owner_id).await;
    let other_tenant = create_test_tenant(&pool, owner_id).await;
    let mut app = new_desktop_app(tenant.id.inner(), None, owner_id.inner());

    repo.create_with_position(
        &test_ctx(),
        &app,
        &IconTreePosition {
            app_id: app.id,
            x: 0,
            y: 0,
            parent_id: None,
        },
        LayoutScope::Shared,
    )
    .await
    .unwrap();

    app.tenant_id = other_tenant.id.inner();
    let result = repo.update(&test_ctx(), &app, &app.etag).await;
    assert!(matches!(result, Err(DomainError::Conflict(_))));

    cleanup_test_data(&pool, &[owner_id], &[tenant.id, other_tenant.id]).await;
}

#[tokio::test]
async fn delete_removes_app() {
    let Some(pool) = setup_pool().await else {
        return;
    };

    let repo = PgDesktopAppRepository::new(pool.clone());
    let owner_id = create_test_user(&pool, "Deleter").await;
    let tenant = create_test_tenant(&pool, owner_id).await;
    let app = new_desktop_app(tenant.id.inner(), None, owner_id.inner());

    repo.create_with_position(
        &test_ctx(),
        &app,
        &IconTreePosition {
            app_id: app.id,
            x: 0,
            y: 0,
            parent_id: None,
        },
        LayoutScope::Shared,
    )
    .await
    .unwrap();

    repo.delete(&test_ctx(), tenant.id.inner(), app.id)
        .await
        .unwrap();

    let found = repo
        .find_by_id(&test_ctx(), tenant.id.inner(), app.id)
        .await
        .unwrap();
    assert!(found.is_none());

    let second_delete = repo.delete(&test_ctx(), tenant.id.inner(), app.id).await;
    assert!(matches!(second_delete, Err(DomainError::NotFound(_))));

    cleanup_test_data(&pool, &[owner_id], &[tenant.id]).await;
}
