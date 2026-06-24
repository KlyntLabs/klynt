//! Tenant desktop layout service.

use std::sync::Arc;

use base::ctx::ExecutionContext;
use base::ports::repository::TenantDesktopLayoutRepository;
use domain::{DomainError, LayoutScope, TenantDesktopLayout};
use uuid::Uuid;

use crate::error::TenantError;

/// Service for managing tenant desktop layouts.
pub struct TenantDesktopLayoutService {
    repo: Arc<dyn TenantDesktopLayoutRepository>,
}

impl TenantDesktopLayoutService {
    /// Create a new desktop layout service.
    pub fn new(repo: Arc<dyn TenantDesktopLayoutRepository>) -> Self {
        Self { repo }
    }

    /// Get the shared layout for a tenant.
    pub async fn get_shared(
        &self,
        ctx: &ExecutionContext,
        tenant_id: Uuid,
    ) -> Result<Option<TenantDesktopLayout>, TenantError> {
        self.repo
            .find(ctx, tenant_id, LayoutScope::Shared, None)
            .await
            .map_err(TenantError::Domain)
    }

    /// Replace the shared layout, failing if the expected etag does not match.
    pub async fn update_shared(
        &self,
        ctx: &ExecutionContext,
        tenant_id: Uuid,
        layout: TenantDesktopLayout,
        etag: String,
    ) -> Result<TenantDesktopLayout, TenantError> {
        let current = self
            .repo
            .find(ctx, tenant_id, LayoutScope::Shared, None)
            .await?;
        if let Some(current) = current {
            if current.etag != etag {
                return Err(TenantError::Domain(DomainError::conflict(
                    "desktop layout etag mismatch",
                )));
            }
        }
        self.repo
            .upsert(ctx, &layout)
            .await
            .map_err(TenantError::Domain)
    }

    /// Get the current user's layout override for a tenant.
    pub async fn get_user_override(
        &self,
        ctx: &ExecutionContext,
        tenant_id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<TenantDesktopLayout>, TenantError> {
        self.repo
            .find(ctx, tenant_id, LayoutScope::User, Some(user_id))
            .await
            .map_err(TenantError::Domain)
    }

    /// Replace the current user's layout override for a tenant.
    pub async fn update_user_override(
        &self,
        ctx: &ExecutionContext,
        layout: TenantDesktopLayout,
    ) -> Result<TenantDesktopLayout, TenantError> {
        self.repo
            .upsert(ctx, &layout)
            .await
            .map_err(TenantError::Domain)
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};

    use async_trait::async_trait;
    use base::ctx::ExecutionContext;
    use base::ports::repository::TenantDesktopLayoutRepository;
    use domain::{
        DesktopIcon, DesktopWindow, DomainError, DomainResult, LayoutScope, TenantDesktopLayout,
    };
    use uuid::Uuid;

    use super::{TenantDesktopLayoutService, TenantError};

    type LayoutKey = (Uuid, LayoutScope, Option<Uuid>);

    #[derive(Default, Clone)]
    struct FakeLayoutRepository {
        inner: Arc<Mutex<HashMap<LayoutKey, TenantDesktopLayout>>>,
    }

    #[async_trait]
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

    fn test_ctx() -> ExecutionContext {
        ExecutionContext::new(base::ctx::RequestContext::new())
    }

    fn sample_layout(
        tenant_id: Uuid,
        scope: LayoutScope,
        user_id: Option<Uuid>,
    ) -> TenantDesktopLayout {
        TenantDesktopLayout {
            id: Uuid::new_v4(),
            tenant_id,
            scope,
            user_id,
            version: 1,
            background_preset_id: "default".to_string(),
            icons: vec![DesktopIcon {
                app_id: "app-1".to_string(),
                x: 10,
                y: 20,
            }],
            windows: vec![DesktopWindow {
                app_id: "app-1".to_string(),
                x: 100,
                y: 200,
                width: 800,
                height: 600,
                state: "normal".to_string(),
            }],
            etag: "etag-1".to_string(),
        }
    }

    #[tokio::test]
    async fn get_shared_returns_existing_layout() {
        let repo = FakeLayoutRepository::default();
        let ctx = test_ctx();
        let tenant_id = Uuid::new_v4();
        let layout = sample_layout(tenant_id, LayoutScope::Shared, None);
        repo.inner
            .lock()
            .unwrap()
            .insert((tenant_id, LayoutScope::Shared, None), layout.clone());

        let service = TenantDesktopLayoutService::new(Arc::new(repo));
        let found = service.get_shared(&ctx, tenant_id).await.unwrap();

        assert_eq!(found.unwrap().id, layout.id);
    }

    #[tokio::test]
    async fn update_shared_succeeds_when_etag_matches() {
        let repo = FakeLayoutRepository::default();
        let ctx = test_ctx();
        let tenant_id = Uuid::new_v4();
        let existing = sample_layout(tenant_id, LayoutScope::Shared, None);
        repo.inner
            .lock()
            .unwrap()
            .insert((tenant_id, LayoutScope::Shared, None), existing.clone());

        let service = TenantDesktopLayoutService::new(Arc::new(repo));
        let updated = sample_layout(tenant_id, LayoutScope::Shared, None);
        let result = service
            .update_shared(&ctx, tenant_id, updated.clone(), existing.etag)
            .await
            .unwrap();

        assert_eq!(result.tenant_id, tenant_id);
        assert_eq!(result.scope, LayoutScope::Shared);
    }

    #[tokio::test]
    async fn update_shared_fails_when_etag_mismatches() {
        let repo = FakeLayoutRepository::default();
        let ctx = test_ctx();
        let tenant_id = Uuid::new_v4();
        let existing = sample_layout(tenant_id, LayoutScope::Shared, None);
        repo.inner
            .lock()
            .unwrap()
            .insert((tenant_id, LayoutScope::Shared, None), existing);

        let service = TenantDesktopLayoutService::new(Arc::new(repo));
        let updated = sample_layout(tenant_id, LayoutScope::Shared, None);
        let result = service
            .update_shared(&ctx, tenant_id, updated, "wrong-etag".to_string())
            .await;

        assert!(matches!(
            result,
            Err(TenantError::Domain(DomainError::Conflict(_)))
        ));
    }

    #[tokio::test]
    async fn update_user_override_creates_or_replaces_layout() {
        let repo = FakeLayoutRepository::default();
        let ctx = test_ctx();
        let tenant_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        let layout = sample_layout(tenant_id, LayoutScope::User, Some(user_id));

        let service = TenantDesktopLayoutService::new(Arc::new(repo));
        let result = service.update_user_override(&ctx, layout).await.unwrap();

        assert_eq!(result.user_id, Some(user_id));
    }
}
