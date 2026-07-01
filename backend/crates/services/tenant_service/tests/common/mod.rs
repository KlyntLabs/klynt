//! Shared helpers for [`DesktopAppService`] integration tests.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::repository::TenantDesktopLayoutRepository;
use base::testkit::{FakeAuditLogger, FakeDesktopAppRepository};
use domain::{AppType, DesktopApp, DomainResult, IconTreeNode, LayoutScope, TenantDesktopLayout};
use uuid::Uuid;

use tenant_service::DesktopAppService;

type LayoutKey = (Uuid, LayoutScope, Option<Uuid>);

#[derive(Default, Clone)]
pub struct FakeLayoutRepository {
    inner: Arc<Mutex<HashMap<LayoutKey, TenantDesktopLayout>>>,
}

#[async_trait]
impl TenantDesktopLayoutRepository for FakeLayoutRepository {
    async fn find(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: Uuid,
        scope: LayoutScope,
        user_id: Option<Uuid>,
    ) -> DomainResult<Option<TenantDesktopLayout>> {
        Ok(self
            .inner
            .lock()
            .unwrap()
            .get(&(tenant_id, scope, user_id))
            .cloned())
    }

    async fn upsert(
        &self,
        _ctx: &ExecutionContext,
        layout: &TenantDesktopLayout,
    ) -> DomainResult<TenantDesktopLayout> {
        let mut inner = self.inner.lock().unwrap();
        inner.insert(
            (layout.tenant_id, layout.scope, layout.user_id),
            layout.clone(),
        );
        Ok(layout.clone())
    }
}

pub fn test_ctx() -> ExecutionContext {
    base::testkit::test_ctx()
}

pub fn service() -> (
    DesktopAppService,
    FakeDesktopAppRepository,
    FakeLayoutRepository,
    FakeAuditLogger,
) {
    let app_repo = FakeDesktopAppRepository::new();
    let layout_repo = FakeLayoutRepository::default();
    let audit = FakeAuditLogger;
    let service = DesktopAppService::new(
        Arc::new(app_repo.clone()),
        Arc::new(layout_repo.clone()),
        Arc::new(audit.clone()),
    );
    (service, app_repo, layout_repo, audit)
}

pub fn sample_app(tenant_id: Uuid, owner_id: Option<Uuid>, created_by: Uuid) -> DesktopApp {
    DesktopApp {
        id: Uuid::new_v4(),
        tenant_id,
        app_type: AppType::Markdown,
        title: "Notes".to_string(),
        content: serde_json::json!({"body": "hello"}),
        menu_config: serde_json::json!({}),
        owner_id,
        created_by,
        locked: false,
        etag: Uuid::new_v4().to_string(),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    }
}

#[allow(dead_code)]
pub fn sample_layout(
    tenant_id: Uuid,
    scope: LayoutScope,
    user_id: Option<Uuid>,
    icon_tree: Vec<IconTreeNode>,
) -> TenantDesktopLayout {
    TenantDesktopLayout {
        id: Uuid::new_v4(),
        tenant_id,
        scope,
        user_id,
        version: 1,
        background_preset_id: "default".to_string(),
        icon_tree,
        windows: Vec::new(),
        etag: Uuid::new_v4().to_string(),
    }
}
