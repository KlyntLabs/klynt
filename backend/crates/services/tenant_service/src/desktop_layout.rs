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
