//! PostgreSQL implementation of the tenant desktop layout repository.

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::repository::TenantDesktopLayoutRepository;
use domain::{
    DesktopIcon, DesktopWindow, DomainError, DomainResult, LayoutScope, TenantDesktopLayout,
};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

/// PostgreSQL implementation of the tenant desktop layout repository.
pub struct PgTenantDesktopLayoutRepository {
    pool: PgPool,
}

impl PgTenantDesktopLayoutRepository {
    /// Create a new repository instance backed by `pool`.
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Return a reference to the underlying connection pool.
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}

#[derive(FromRow)]
struct LayoutRow {
    id: Uuid,
    tenant_id: Uuid,
    scope: String,
    user_id: Option<Uuid>,
    version: i32,
    background_preset_id: String,
    icons: serde_json::Value,
    windows: serde_json::Value,
    etag: String,
}

fn map_layout_row(row: LayoutRow) -> DomainResult<TenantDesktopLayout> {
    let scope = LayoutScope::from_str(&row.scope)
        .map_err(|e| DomainError::internal_msg(format!("invalid layout scope in DB: {e}")))?;
    let icons = serde_json::from_value(row.icons)
        .map_err(|e| DomainError::internal_msg(format!("invalid icons JSON in DB: {e}")))?;
    let windows = serde_json::from_value(row.windows)
        .map_err(|e| DomainError::internal_msg(format!("invalid windows JSON in DB: {e}")))?;

    Ok(TenantDesktopLayout {
        id: row.id,
        tenant_id: row.tenant_id,
        scope,
        user_id: row.user_id,
        version: row.version,
        background_preset_id: row.background_preset_id,
        icons,
        windows,
        etag: row.etag,
    })
}

#[async_trait]
impl TenantDesktopLayoutRepository for PgTenantDesktopLayoutRepository {
    async fn find(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: Uuid,
        scope: LayoutScope,
        user_id: Option<Uuid>,
    ) -> DomainResult<Option<TenantDesktopLayout>> {
        let row: Option<LayoutRow> = sqlx::query_as(
            r#"
            SELECT id, tenant_id, scope, user_id, version, background_preset_id, icons, windows, etag
            FROM tenant_desktop_layouts
            WHERE tenant_id = $1 AND scope = $2 AND user_id IS NOT DISTINCT FROM $3
            "#,
        )
        .bind(tenant_id)
        .bind(scope.as_str())
        .bind(user_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(row.map(map_layout_row).transpose()?)
    }

    async fn upsert(
        &self,
        _ctx: &ExecutionContext,
        layout: &TenantDesktopLayout,
    ) -> DomainResult<TenantDesktopLayout> {
        let icons = serde_json::to_value(&layout.icons)
            .map_err(|e| DomainError::internal_msg(format!("failed to serialize icons: {e}")))?;
        let windows = serde_json::to_value(&layout.windows)
            .map_err(|e| DomainError::internal_msg(format!("failed to serialize windows: {e}")))?;

        let row: LayoutRow = sqlx::query_as(
            r#"
            INSERT INTO tenant_desktop_layouts (
                id, tenant_id, scope, user_id, version, background_preset_id, icons, windows, etag, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            ON CONFLICT (tenant_id, scope, user_id)
            DO UPDATE SET
                version = EXCLUDED.version,
                background_preset_id = EXCLUDED.background_preset_id,
                icons = EXCLUDED.icons,
                windows = EXCLUDED.windows,
                etag = EXCLUDED.etag,
                updated_at = NOW()
            RETURNING id, tenant_id, scope, user_id, version, background_preset_id, icons, windows, etag
            "#,
        )
        .bind(layout.id)
        .bind(layout.tenant_id)
        .bind(layout.scope.as_str())
        .bind(layout.user_id)
        .bind(layout.version)
        .bind(&layout.background_preset_id)
        .bind(icons)
        .bind(windows)
        .bind(&layout.etag)
        .fetch_one(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(map_layout_row(row)?)
    }
}
