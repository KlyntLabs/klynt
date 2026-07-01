//! Desktop app service — CRUD, validation, visibility.

use std::sync::Arc;

use base::ctx::ExecutionContext;
use base::ports::audit::AuditLogger;
use base::ports::repository::{DesktopAppRepository, TenantDesktopLayoutRepository};
use domain::{AppType, DesktopApp, DomainError, IconTreeNode, LayoutScope};
use uuid::Uuid;

use crate::error::TenantError;

const MAX_CONTENT_BYTES: usize = 256 * 1024;

/// Application service for desktop mini-apps.
///
/// Wired with repository and audit dependencies that will be exercised by
/// Task 1.8 routes and future audit event methods.
pub struct DesktopAppService {
    app_repo: Arc<dyn DesktopAppRepository>,
    layout_repo: Arc<dyn TenantDesktopLayoutRepository>,
    /// Reserved for future desktop-app audit events.
    #[allow(dead_code)]
    audit: Arc<dyn AuditLogger>,
}

impl DesktopAppService {
    pub fn new(
        app_repo: Arc<dyn DesktopAppRepository>,
        layout_repo: Arc<dyn TenantDesktopLayoutRepository>,
        audit: Arc<dyn AuditLogger>,
    ) -> Self {
        Self {
            app_repo,
            layout_repo,
            audit,
        }
    }

    /// Create a new desktop app.
    ///
    /// The current implementation always creates user-scoped apps;
    /// shared apps (`owner_id = None`) require a future API change to pass
    /// `LayoutScope::Shared`.
    #[allow(clippy::too_many_arguments)]
    pub async fn create_app(
        &self,
        ctx: &ExecutionContext,
        tenant_id: Uuid,
        app_type: AppType,
        title: String,
        content: serde_json::Value,
        menu_config: serde_json::Value,
        owner_id: Option<Uuid>,
        created_by: Uuid,
        locked: bool,
    ) -> Result<DesktopApp, TenantError> {
        Self::validate_content(&content)?;
        Self::validate_menu_config(&menu_config)?;

        let owner_id = owner_id.or(Some(created_by));

        let app = DesktopApp {
            id: Uuid::new_v4(),
            tenant_id,
            app_type,
            title,
            content,
            menu_config,
            owner_id,
            created_by,
            locked,
            etag: Uuid::new_v4().to_string(),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        let created = self
            .app_repo
            .create_with_position(
                ctx,
                &app,
                &app.id.to_string(),
                0,
                0,
                None,
                LayoutScope::User,
            )
            .await
            .map_err(TenantError::Domain)?;

        // TODO: emit audit event desktop_app.created
        Ok(created)
    }

    pub async fn list_apps(
        &self,
        ctx: &ExecutionContext,
        tenant_id: Uuid,
        caller_id: Uuid,
    ) -> Result<Vec<DesktopApp>, TenantError> {
        self.app_repo
            .list_visible(ctx, tenant_id, caller_id)
            .await
            .map_err(TenantError::Domain)
    }

    pub async fn get_app(
        &self,
        ctx: &ExecutionContext,
        tenant_id: Uuid,
        app_id: Uuid,
        caller_id: Uuid,
    ) -> Result<DesktopApp, TenantError> {
        let app = self
            .app_repo
            .find_by_id(ctx, tenant_id, app_id)
            .await?
            .ok_or_else(|| TenantError::Domain(DomainError::not_found("desktop app")))?;

        if let Some(owner) = app.owner_id {
            if owner != caller_id {
                return Err(TenantError::Domain(DomainError::NotPermitted(
                    "not app owner".to_string(),
                )));
            }
        }

        Ok(app)
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn update_app(
        &self,
        ctx: &ExecutionContext,
        tenant_id: Uuid,
        app_id: Uuid,
        caller_id: Uuid,
        is_admin: bool,
        expected_etag: String,
        title: Option<String>,
        content: Option<serde_json::Value>,
        menu_config: Option<serde_json::Value>,
    ) -> Result<DesktopApp, TenantError> {
        let existing = self
            .app_repo
            .find_by_id(ctx, tenant_id, app_id)
            .await?
            .ok_or_else(|| TenantError::Domain(DomainError::not_found("desktop app")))?;

        let is_owner = existing.owner_id == Some(caller_id);
        if !is_owner && !is_admin {
            return Err(TenantError::Domain(DomainError::NotPermitted(
                "not app owner".to_string(),
            )));
        }
        if existing.locked && !is_admin {
            return Err(TenantError::Domain(DomainError::NotPermitted(
                "app is locked".to_string(),
            )));
        }

        if let Some(ref c) = content {
            Self::validate_content(c)?;
        }

        let mut updated = existing;
        if let Some(title) = title {
            updated.title = title;
        }
        if let Some(content) = content {
            updated.content = content;
        }
        if let Some(menu_config) = menu_config {
            updated.menu_config = menu_config;
        }

        Self::validate_menu_config(&updated.menu_config)?;

        self.app_repo
            .update(ctx, &updated, &expected_etag)
            .await
            .map_err(TenantError::Domain)
    }

    pub async fn delete_app(
        &self,
        ctx: &ExecutionContext,
        tenant_id: Uuid,
        app_id: Uuid,
        caller_id: Uuid,
        is_admin: bool,
    ) -> Result<(), TenantError> {
        let existing = self
            .app_repo
            .find_by_id(ctx, tenant_id, app_id)
            .await?
            .ok_or_else(|| TenantError::Domain(DomainError::not_found("desktop app")))?;
        let is_owner = existing.owner_id == Some(caller_id);

        if existing.locked && !is_admin {
            return Err(TenantError::Domain(DomainError::NotPermitted(
                "app is locked".to_string(),
            )));
        }
        if !is_owner && !is_admin {
            return Err(TenantError::Domain(DomainError::NotPermitted(
                "not app owner".to_string(),
            )));
        }

        self.app_repo.delete(ctx, tenant_id, app_id).await?;
        self.remove_app_from_layouts(ctx, tenant_id, existing.owner_id, &app_id.to_string())
            .await?;
        Ok(())
    }

    /// Return the desktop bundle for a caller: all visible apps in the tenant.
    ///
    /// Task 1.8 routes will map these domain apps into `AppSummary` DTOs.
    pub async fn get_desktop_bundle(
        &self,
        ctx: &ExecutionContext,
        tenant_id: Uuid,
        caller_id: Uuid,
    ) -> Result<Vec<DesktopApp>, TenantError> {
        self.list_apps(ctx, tenant_id, caller_id).await
    }

    async fn remove_app_from_layouts(
        &self,
        ctx: &ExecutionContext,
        tenant_id: Uuid,
        owner_id: Option<Uuid>,
        app_id: &str,
    ) -> Result<(), TenantError> {
        let scopes = [(LayoutScope::Shared, None), (LayoutScope::User, owner_id)];

        for (scope, user_id) in scopes {
            if let Some(mut layout) = self
                .layout_repo
                .find(ctx, tenant_id, scope, user_id)
                .await
                .map_err(TenantError::Domain)?
            {
                let mut icon_tree = layout.icon_tree.clone();
                if Self::remove_icon_tree_node(&mut icon_tree, app_id) {
                    layout.icon_tree = icon_tree;
                    layout.etag = Uuid::new_v4().to_string();
                    self.layout_repo
                        .upsert(ctx, &layout)
                        .await
                        .map_err(TenantError::Domain)?;
                }
            }
        }

        Ok(())
    }

    fn remove_icon_tree_node(tree: &mut Vec<IconTreeNode>, app_id: &str) -> bool {
        let mut removed = false;
        tree.retain_mut(|node| {
            if node.app_id == app_id {
                removed = true;
                return false;
            }
            if let Some(children) = node.children.as_mut() {
                if Self::remove_icon_tree_node(children, app_id) {
                    removed = true;
                }
                if children.is_empty() {
                    node.children = None;
                }
            }
            true
        });
        removed
    }

    fn validate_content(content: &serde_json::Value) -> Result<(), TenantError> {
        let serialized = serde_json::to_string(content).map_err(DomainError::internal)?;
        if serialized.len() > MAX_CONTENT_BYTES {
            return Err(TenantError::Domain(DomainError::validation(
                "content exceeds 256KB limit",
            )));
        }
        if let Some(src) = content.get("src").and_then(|v| v.as_str()) {
            if !src.starts_with("https://") {
                return Err(TenantError::Domain(DomainError::validation(
                    "video src must be HTTPS",
                )));
            }
        }
        Ok(())
    }

    fn validate_menu_config(config: &serde_json::Value) -> Result<(), TenantError> {
        let serialized = serde_json::to_string(config).map_err(DomainError::internal)?;
        if serialized.len() > 16 * 1024 {
            return Err(TenantError::Domain(DomainError::validation(
                "menu_config exceeds 16KB limit",
            )));
        }
        Ok(())
    }
}
