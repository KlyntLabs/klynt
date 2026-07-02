//! PostgreSQL implementation of the desktop app repository.

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::repository::DesktopAppRepository;
use domain::{AppType, DesktopApp, DomainError, DomainResult, IconTreeNode, LayoutScope};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

const DEFAULT_BACKGROUND_PRESET_ID: &str = "default";
const MAX_ICON_TREE_DEPTH: usize = 10;

pub struct PgDesktopAppRepository {
    pool: PgPool,
}

impl PgDesktopAppRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[derive(FromRow)]
struct AppRow {
    id: Uuid,
    tenant_id: Uuid,
    r#type: String,
    title: String,
    content: serde_json::Value,
    menu_config: serde_json::Value,
    owner_id: Option<Uuid>,
    created_by: Uuid,
    locked: bool,
    etag: String,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(FromRow)]
struct LayoutRow {
    id: Uuid,
    tenant_id: Uuid,
    icon_tree: serde_json::Value,
}

fn map_app_row(row: AppRow) -> DomainResult<DesktopApp> {
    let app_type: AppType = row.r#type.parse().map_err(|e: domain::DomainError| {
        DomainError::internal_msg(format!("invalid app type in DB: {e}"))
    })?;
    Ok(DesktopApp {
        id: row.id,
        tenant_id: row.tenant_id,
        app_type,
        title: row.title,
        content: row.content,
        menu_config: row.menu_config,
        owner_id: row.owner_id,
        created_by: row.created_by,
        locked: row.locked,
        etag: row.etag,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

fn layout_user_id(scope: LayoutScope, owner_id: Option<Uuid>) -> Option<Uuid> {
    match scope {
        LayoutScope::Shared => None,
        LayoutScope::User => owner_id,
    }
}

fn append_icon_tree_node(
    tree: &mut Vec<IconTreeNode>,
    node: IconTreeNode,
    parent_id: Option<&str>,
) -> DomainResult<()> {
    match parent_id {
        None => {
            tree.push(node);
            Ok(())
        }
        Some(parent_id) => {
            if let Some(parent) = find_icon_tree_parent(tree, parent_id, 0)? {
                parent.children.get_or_insert_with(Vec::new).push(node);
                Ok(())
            } else {
                Err(DomainError::not_found("parent folder"))
            }
        }
    }
}

fn find_icon_tree_parent<'a>(
    tree: &'a mut [IconTreeNode],
    parent_id: &str,
    depth: usize,
) -> DomainResult<Option<&'a mut IconTreeNode>> {
    if depth > MAX_ICON_TREE_DEPTH {
        return Err(DomainError::validation(
            "icon tree exceeds maximum nesting depth",
        ));
    }
    for node in tree.iter_mut() {
        if node.app_id == parent_id {
            return Ok(Some(node));
        }
        if let Some(children) = node.children.as_mut() {
            if let Some(found) = find_icon_tree_parent(children, parent_id, depth + 1)? {
                return Ok(Some(found));
            }
        }
    }
    Ok(None)
}

async fn fetch_layout_for_update(
    conn: &mut sqlx::PgConnection,
    tenant_id: Uuid,
    scope: LayoutScope,
    user_id: Option<Uuid>,
) -> DomainResult<Option<LayoutRow>> {
    sqlx::query_as!(
        LayoutRow,
        r#"
        SELECT id, tenant_id, icon_tree
        FROM tenant_desktop_layouts
        WHERE tenant_id = $1 AND scope = $2 AND user_id IS NOT DISTINCT FROM $3
        FOR UPDATE
        "#,
        tenant_id,
        scope.as_str(),
        user_id
    )
    .fetch_optional(conn)
    .await
    .map_err(DomainError::internal)
}

async fn update_layout_icon_tree(
    conn: &mut sqlx::PgConnection,
    layout: LayoutRow,
    new_node: IconTreeNode,
    parent_id: Option<&str>,
) -> DomainResult<()> {
    let mut icon_tree: Vec<IconTreeNode> = serde_json::from_value(layout.icon_tree)
        .map_err(|e| DomainError::internal_msg(format!("invalid icon_tree JSON in DB: {e}")))?;
    append_icon_tree_node(&mut icon_tree, new_node, parent_id)?;
    let icon_tree_json = serde_json::to_value(&icon_tree)
        .map_err(|e| DomainError::internal_msg(format!("failed to serialize icon_tree: {e}")))?;
    let new_etag = Uuid::new_v4().to_string();

    sqlx::query!(
        r#"
        UPDATE tenant_desktop_layouts
        SET icon_tree = $3, etag = $4, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        "#,
        layout.id,
        layout.tenant_id,
        icon_tree_json,
        new_etag
    )
    .execute(conn)
    .await
    .map_err(DomainError::internal)?;
    Ok(())
}

async fn upsert_layout_icon_tree(
    conn: &mut sqlx::PgConnection,
    app: &DesktopApp,
    scope: LayoutScope,
    new_node: IconTreeNode,
    parent_id: Option<&str>,
) -> DomainResult<()> {
    let user_id = layout_user_id(scope, app.owner_id);

    if let Some(layout) = fetch_layout_for_update(conn, app.tenant_id, scope, user_id).await? {
        return update_layout_icon_tree(conn, layout, new_node, parent_id).await;
    }

    if parent_id.is_some() {
        return Err(DomainError::not_found("parent folder"));
    }

    let icon_tree_json = serde_json::to_value(vec![new_node.clone()])
        .map_err(|e| DomainError::internal_msg(format!("failed to serialize icon_tree: {e}")))?;
    let windows_json = serde_json::Value::Array(Vec::new());
    let etag = Uuid::new_v4().to_string();

    let result = sqlx::query!(
        r#"
        INSERT INTO tenant_desktop_layouts (
            id, tenant_id, scope, user_id, version, background_preset_id, icon_tree, windows, etag, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        ON CONFLICT (tenant_id, scope, user_id) DO NOTHING
        "#,
        Uuid::new_v4(),
        app.tenant_id,
        scope.as_str(),
        user_id,
        1,
        DEFAULT_BACKGROUND_PRESET_ID,
        icon_tree_json,
        windows_json,
        etag
    )
    .execute(&mut *conn)
    .await
    .map_err(DomainError::internal)?;

    if result.rows_affected() > 0 {
        return Ok(());
    }

    // Concurrent insert happened; retry once with the row locked.
    let layout = fetch_layout_for_update(conn, app.tenant_id, scope, user_id)
        .await?
        .ok_or_else(|| DomainError::conflict("layout changed concurrently"))?;
    update_layout_icon_tree(conn, layout, new_node, parent_id).await
}

#[async_trait]
impl DesktopAppRepository for PgDesktopAppRepository {
    async fn create_with_position(
        &self,
        _ctx: &ExecutionContext,
        app: &DesktopApp,
        icon_tree_app_id: &str,
        icon_tree_x: i32,
        icon_tree_y: i32,
        icon_tree_parent_id: Option<&str>,
        scope: LayoutScope,
    ) -> DomainResult<DesktopApp> {
        if scope == LayoutScope::User && app.owner_id.is_none() {
            return Err(DomainError::validation(
                "user-scoped desktop app requires owner_id",
            ));
        }

        let mut tx = self.pool.begin().await.map_err(DomainError::internal)?;

        let row = sqlx::query_as!(
            AppRow,
            r#"
            INSERT INTO desktop_apps (id, tenant_id, type, title, content, menu_config, owner_id, created_by, locked, etag)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, tenant_id, type as "type!", title, content, menu_config, owner_id, created_by, locked, etag, created_at, updated_at
            "#,
            app.id,
            app.tenant_id,
            app.app_type.as_str(),
            &app.title,
            &app.content,
            &app.menu_config,
            app.owner_id,
            app.created_by,
            app.locked,
            &app.etag,
        )
        .fetch_one(&mut *tx)
        .await
        .map_err(DomainError::internal)?;

        let new_node = IconTreeNode {
            app_id: icon_tree_app_id.to_string(),
            x: icon_tree_x,
            y: icon_tree_y,
            children: None,
        };
        upsert_layout_icon_tree(&mut tx, app, scope, new_node, icon_tree_parent_id).await?;

        tx.commit().await.map_err(DomainError::internal)?;
        map_app_row(row)
    }

    async fn list_visible(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: Uuid,
        caller_id: Uuid,
    ) -> DomainResult<Vec<DesktopApp>> {
        let rows = sqlx::query_as!(
            AppRow,
            r#"
            SELECT id, tenant_id, type as "type!", title, content, menu_config, owner_id, created_by, locked, etag, created_at, updated_at
            FROM desktop_apps
            WHERE tenant_id = $1 AND (owner_id IS NULL OR owner_id = $2)
            "#,
            tenant_id,
            caller_id,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        rows.into_iter().map(map_app_row).collect()
    }

    async fn find_by_id(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: Uuid,
        app_id: Uuid,
    ) -> DomainResult<Option<DesktopApp>> {
        let row = sqlx::query_as!(
            AppRow,
            r#"
            SELECT id, tenant_id, type as "type!", title, content, menu_config, owner_id, created_by, locked, etag, created_at, updated_at
            FROM desktop_apps
            WHERE id = $1 AND tenant_id = $2
            "#,
            app_id,
            tenant_id,
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        row.map(map_app_row).transpose()
    }

    async fn update(
        &self,
        _ctx: &ExecutionContext,
        app: &DesktopApp,
        expected_etag: &str,
    ) -> DomainResult<DesktopApp> {
        let new_etag = Uuid::new_v4().to_string();
        let row = sqlx::query_as!(
            AppRow,
            r#"
            UPDATE desktop_apps
            SET title = $4, content = $5, menu_config = $6, locked = $7, etag = $8, updated_at = NOW()
            WHERE id = $1 AND tenant_id = $2 AND etag = $3
            RETURNING id, tenant_id, type as "type!", title, content, menu_config, owner_id, created_by, locked, etag, created_at, updated_at
            "#,
            app.id,
            app.tenant_id,
            expected_etag,
            &app.title,
            &app.content,
            &app.menu_config,
            app.locked,
            &new_etag,
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        match row {
            Some(row) => map_app_row(row),
            None => Err(DomainError::conflict("app etag mismatch")),
        }
    }

    async fn delete(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: Uuid,
        app_id: Uuid,
    ) -> DomainResult<()> {
        let result = sqlx::query!(
            "DELETE FROM desktop_apps WHERE id = $1 AND tenant_id = $2",
            app_id,
            tenant_id,
        )
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        if result.rows_affected() == 0 {
            return Err(DomainError::not_found("desktop app"));
        }
        Ok(())
    }
}
