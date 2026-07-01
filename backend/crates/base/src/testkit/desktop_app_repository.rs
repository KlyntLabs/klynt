//! Canonical in-memory fake for [`DesktopAppRepository`].
//!
//! Stores desktop apps keyed by ID. Icon-tree operations are ignored; this
//! fake is only concerned with app CRUD and visibility rules.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use chrono::Utc;
use uuid::Uuid;

use crate::ctx::ExecutionContext;
use crate::ports::repository::DesktopAppRepository;
use domain::{DesktopApp, DomainError, DomainResult, LayoutScope};

/// In-memory desktop app repository for tests.
#[derive(Clone, Debug, Default)]
pub struct FakeDesktopAppRepository {
    inner: Arc<Mutex<Inner>>,
}

#[derive(Debug, Default)]
struct Inner {
    apps: HashMap<Uuid, DesktopApp>,
}

impl FakeDesktopAppRepository {
    /// Create an empty fake repository.
    pub fn new() -> Self {
        Self::default()
    }

    /// Insert or overwrite a desktop app.
    pub fn insert(&self, app: DesktopApp) {
        self.inner.lock().unwrap().apps.insert(app.id, app);
    }
}

#[async_trait]
impl DesktopAppRepository for FakeDesktopAppRepository {
    #[allow(clippy::too_many_arguments)]
    async fn create_with_position(
        &self,
        _ctx: &ExecutionContext,
        app: &DesktopApp,
        _icon_tree_app_id: &str,
        _icon_tree_x: i32,
        _icon_tree_y: i32,
        _icon_tree_parent_id: Option<&str>,
        _scope: LayoutScope,
    ) -> DomainResult<DesktopApp> {
        let mut inner = self.inner.lock().unwrap();
        let mut stored = app.clone();
        stored.updated_at = Utc::now();
        inner.apps.insert(stored.id, stored.clone());
        Ok(stored)
    }

    async fn list_visible(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: Uuid,
        caller_id: Uuid,
    ) -> DomainResult<Vec<DesktopApp>> {
        let inner = self.inner.lock().unwrap();
        let apps: Vec<DesktopApp> = inner
            .apps
            .values()
            .filter(|app| app.tenant_id == tenant_id)
            .filter(|app| app.owner_id.is_none() || app.owner_id == Some(caller_id))
            .cloned()
            .collect();
        Ok(apps)
    }

    async fn find_by_id(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: Uuid,
        app_id: Uuid,
    ) -> DomainResult<Option<DesktopApp>> {
        let inner = self.inner.lock().unwrap();
        Ok(inner
            .apps
            .get(&app_id)
            .filter(|app| app.tenant_id == tenant_id)
            .cloned())
    }

    async fn update(
        &self,
        _ctx: &ExecutionContext,
        app: &DesktopApp,
        expected_etag: &str,
    ) -> DomainResult<DesktopApp> {
        let mut inner = self.inner.lock().unwrap();
        let existing = inner
            .apps
            .get(&app.id)
            .ok_or_else(|| DomainError::not_found("desktop app"))?
            .clone();

        if existing.etag != expected_etag {
            return Err(DomainError::conflict("app etag mismatch"));
        }

        let mut updated = existing;
        updated.title = app.title.clone();
        updated.content = app.content.clone();
        updated.menu_config = app.menu_config.clone();
        updated.locked = app.locked;
        updated.etag = Uuid::new_v4().to_string();
        updated.updated_at = Utc::now();

        inner.apps.insert(updated.id, updated.clone());
        Ok(updated)
    }

    async fn delete(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: Uuid,
        app_id: Uuid,
    ) -> DomainResult<()> {
        let mut inner = self.inner.lock().unwrap();
        let existed = inner
            .apps
            .remove(&app_id)
            .map(|app| app.tenant_id == tenant_id)
            .unwrap_or(false);

        if existed {
            Ok(())
        } else {
            Err(DomainError::not_found("desktop app"))
        }
    }
}
