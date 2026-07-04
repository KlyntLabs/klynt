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
use domain::{DesktopApp, DomainError, DomainResult, IconTreePosition, LayoutScope};

/// In-memory desktop app repository for tests.
///
/// Uses `std::sync::Mutex` because every async method releases the lock before
/// returning (no `.await` while holding the guard). This keeps the fake free of
/// a `tokio` dependency in the `base` crate.
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
        let mut inner = self.inner.lock().unwrap();
        inner.apps.insert(app.id, app);
    }
}

#[async_trait]
impl DesktopAppRepository for FakeDesktopAppRepository {
    async fn create_with_position(
        &self,
        _ctx: &ExecutionContext,
        app: &DesktopApp,
        _position: &IconTreePosition,
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

        if existing.tenant_id != app.tenant_id {
            return Err(DomainError::not_found("desktop app"));
        }

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
        let app = inner
            .apps
            .get(&app_id)
            .ok_or_else(|| DomainError::not_found("desktop app"))?;
        if app.tenant_id != tenant_id {
            return Err(DomainError::not_found("desktop app"));
        }
        inner.apps.remove(&app_id);
        Ok(())
    }
}
