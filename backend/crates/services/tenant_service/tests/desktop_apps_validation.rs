//! Validation tests for [`DesktopAppService`].

mod common;

use base::ports::repository::DesktopAppRepository;
use common::{sample_app, service, test_ctx};
use domain::{AppType, DomainError};
use uuid::Uuid;

use tenant_service::TenantError;

#[tokio::test]
async fn create_app_rejects_oversized_content() {
    let (service, _app_repo, _layout_repo, _audit) = service();
    let ctx = test_ctx();
    let tenant_id = Uuid::new_v4();
    let caller_id = Uuid::new_v4();

    let big_body = "x".repeat(256 * 1024 + 1);
    let result = service
        .create_app(
            &ctx,
            tenant_id,
            AppType::Markdown,
            "Big".to_string(),
            serde_json::json!({"body": big_body}),
            serde_json::json!({}),
            Some(caller_id),
            caller_id,
            false,
        )
        .await;

    assert!(matches!(
        result,
        Err(TenantError::Domain(DomainError::Validation(_)))
    ));
}

#[tokio::test]
async fn create_app_rejects_non_https_video_src() {
    let (service, _app_repo, _layout_repo, _audit) = service();
    let ctx = test_ctx();
    let tenant_id = Uuid::new_v4();
    let caller_id = Uuid::new_v4();

    let result = service
        .create_app(
            &ctx,
            tenant_id,
            AppType::Video,
            "Video".to_string(),
            serde_json::json!({"src": "http://example.com/video.mp4"}),
            serde_json::json!({}),
            Some(caller_id),
            caller_id,
            false,
        )
        .await;

    assert!(matches!(
        result,
        Err(TenantError::Domain(DomainError::Validation(_)))
    ));
}

#[tokio::test]
async fn create_app_accepts_https_video_src() {
    let (service, app_repo, _layout_repo, _audit) = service();
    let ctx = test_ctx();
    let tenant_id = Uuid::new_v4();
    let caller_id = Uuid::new_v4();

    let app = service
        .create_app(
            &ctx,
            tenant_id,
            AppType::Video,
            "Video".to_string(),
            serde_json::json!({"src": "https://example.com/video.mp4"}),
            serde_json::json!({}),
            Some(caller_id),
            caller_id,
            false,
        )
        .await
        .unwrap();

    assert_eq!(app.app_type, AppType::Video);
    let stored = app_repo.find_by_id(&ctx, tenant_id, app.id).await.unwrap();
    assert!(stored.is_some());
}

#[tokio::test]
async fn update_app_rejects_oversized_menu_config() {
    let (service, app_repo, _layout_repo, _audit) = service();
    let ctx = test_ctx();
    let tenant_id = Uuid::new_v4();
    let caller_id = Uuid::new_v4();

    let app = sample_app(tenant_id, Some(caller_id), caller_id);
    app_repo.insert(app.clone());

    let big_menu = serde_json::json!({"items": "x".repeat(16 * 1024 + 1)});
    let result = service
        .update_app(
            &ctx,
            tenant_id,
            app.id,
            caller_id,
            false,
            app.etag,
            None,
            None,
            Some(big_menu),
        )
        .await;

    assert!(matches!(
        result,
        Err(TenantError::Domain(DomainError::Validation(_)))
    ));
}
