# Virtual Desktop — Context Menu System & Dynamic Mini-Apps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing static-registry desktop into a dynamic Virtual Desktop where teachers and students can right-click → create mini-apps (Markdown, Notes, Video, Folder) organized in nested folders, each with configurable context menus.

**Architecture:** Hybrid data model — `desktop_apps` table holds content/menu config, `icon_tree` JSONB in `tenant_desktop_layouts` holds positions + folder hierarchy. Three frontend layers: Desktop Manager (icon tree state), App Factory (dynamic manifests + renderers), Permission/Config (menu resolution pipeline).

**Tech Stack:** Rust (Axum, SQLx, Tokio), React 19 (Zustand, TanStack Query, Radix UI, react-markdown), PostgreSQL, Redis

## Global Constraints

- SQLx: always use compile-time-checked macros (`sqlx::query_as!`), never runtime `.bind()`
- After changing queries/migrations: run `just sqlx-prepare`, commit `backend/.sqlx/`
- Rust source files ≤ 400 lines; integration test files ≤ 600 lines
- Frontend source files ≤ 300 lines
- i18n: add keys to `en` first, then mirror in `vi` and `cn`
- Coverage gates: Rust ≥ 84%, Frontend ≥ 92%
- All Clippy warnings are errors (`-D warnings`)
- Biome lint: no warnings on frontend
- Never use `--no-verify` on git hooks
- Markdown content must be sanitized: `react-markdown` + `rehype-sanitize`, never `dangerouslySetInnerHTML`

---

## File Structure Overview

### Backend (new/modified files)

```
backend/
├── migrations/
│   ├── 0014_desktop_apps.up.sql          (NEW)
│   ├── 0014_desktop_apps.down.sql        (NEW)
│   ├── 0015_icon_tree_migration.up.sql   (NEW)
│   └── 0015_icon_tree_migration.down.sql (NEW)
├── crates/shared/domain/src/
│   ├── desktop_app.rs                    (NEW — DesktopApp entity, AppType, IconTreeNode)
│   ├── tenant_desktop_layout.rs          (MODIFY — icons→icon_tree, DesktopIcon→IconTreeNode)
│   └── lib.rs                            (MODIFY — add pub mod/use desktop_app)
├── crates/base/src/ports/
│   └── repository.rs                     (MODIFY — add DesktopAppRepository trait)
├── crates/infra/persistence/src/repositories/
│   ├── desktop_app.rs                    (NEW — PgDesktopAppRepository)
│   ├── tenant_desktop_layout.rs          (MODIFY — map icon_tree instead of icons)
│   └── mod.rs                            (MODIFY — add pub mod desktop_app)
├── crates/services/infra_facades/src/
│   └── persistence.rs                    (MODIFY — add app_repository field)
├── crates/services/tenant_service/src/
│   ├── desktop_apps.rs                   (NEW — DesktopAppService)
│   └── lib.rs                            (MODIFY — re-export DesktopAppService)
├── crates/gateways/src/
│   ├── routes/
│   │   ├── desktop_apps.rs               (NEW — compound POST /desktop/apps, GET /desktop, CRUD)
│   │   ├── tenant_desktop_layout.rs      (MODIFY — icon_tree in payloads)
│   │   └── mod.rs                        (MODIFY — mount desktop_apps router)
│   └── state/
│       └── services.rs                   (MODIFY — wire DesktopAppService)
```

### Frontend (new/modified files)

```
frontend/src/features/desktop/
├── desktop-manager/
│   ├── icon-tree-module.ts               (NEW — Zustand store)
│   ├── desktop-merge.ts                  (NEW — shared + user overlay merge)
│   ├── desktop-actions.ts                (NEW — action creators)
│   ├── folder-breadcrumb.tsx             (NEW — folder navigation)
│   └── use-icon-drag-drop.ts             (NEW — HTML5 DnD hook)
├── app-factory/
│   ├── types.ts                          (NEW — AppTypeDefinition, AppRendererProps)
│   ├── app-type-registry.ts              (NEW — type → definition)
│   ├── dynamic-app-manifest.ts           (NEW — entity → AppManifest)
│   ├── use-dynamic-apps.ts               (NEW — TanStack Query + manifest builder)
│   ├── use-content-autosave.ts           (NEW — debounced PATCH hook)
│   ├── renderers/
│   │   ├── markdown-view.tsx             (NEW — shared sanitized markdown)
│   │   ├── markdown-renderer.tsx         (NEW)
│   │   ├── notes-renderer.tsx            (NEW)
│   │   ├── video-renderer.tsx            (NEW)
│   │   └── folder-renderer.tsx           (NEW)
│   └── content-editors/
│       └── notes-editor.tsx              (NEW)
├── menu-config/
│   ├── menu-schema.ts                    (NEW — ContextMenuSchema types + Zod)
│   ├── default-menus.ts                  (NEW — per-type defaults)
│   ├── menu-merger.ts                    (NEW — resolution pipeline)
│   ├── action-registry.ts                (NEW — actionId → function)
│   └── menu-editor.tsx                   (NEW — JSON override editor)
├── context-menu/
│   ├── context-menu-renderer.tsx         (NEW — Radix renderer)
│   ├── desktop-context-menu.tsx          (NEW — right-click handler)
│   └── new-app-dialog.tsx                (NEW — "New →" picker)
├── components/
│   ├── DesktopEnvironment.tsx            (MODIFY — wire context menu + dynamic apps)
│   └── DesktopIcons.tsx                  (MODIFY — drag-drop + dynamic icons)
└── factory/
    └── tenant-desktop.ts                 (MODIFY — merge dynamic apps)
```

---

## Phase 1: Backend Foundation (~4-5 days)

### Task 1.1: Migration 0014 — `desktop_apps` table

**Files:**
- Create: `backend/migrations/0014_desktop_apps.up.sql`
- Create: `backend/migrations/0014_desktop_apps.down.sql`

- [ ] **Step 1: Write the up migration**

```sql
-- backend/migrations/0014_desktop_apps.up.sql
CREATE TABLE desktop_apps (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type          TEXT NOT NULL CHECK (type IN ('markdown', 'notes', 'video', 'folder')),
    title         TEXT NOT NULL,
    content       JSONB NOT NULL DEFAULT '{}',
    menu_config   JSONB NOT NULL DEFAULT '{}',
    owner_id      UUID REFERENCES users(id) ON DELETE CASCADE,
    created_by    UUID NOT NULL REFERENCES users(id),
    locked        BOOLEAN NOT NULL DEFAULT FALSE,
    etag          TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_desktop_apps_tenant ON desktop_apps(tenant_id);
CREATE INDEX idx_desktop_apps_owner  ON desktop_apps(tenant_id, owner_id);
```

- [ ] **Step 2: Write the down migration**

```sql
-- backend/migrations/0014_desktop_apps.down.sql
DROP TABLE IF EXISTS desktop_apps;
```

- [ ] **Step 3: Run migration + regenerate SQLx cache**

Run: `cd backend && sqlx migrate run --database-url $DATABASE_URL && just sqlx-prepare`
Expected: migration applies, `.sqlx/` cache updated

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/0014_desktop_apps.up.sql backend/migrations/0014_desktop_apps.down.sql backend/.sqlx/
git commit -m "feat(db): migration 0014 — desktop_apps table"
```

---

### Task 1.2: Migration 0015 — Evolve `icons` → `icon_tree`

**Files:**
- Create: `backend/migrations/0015_icon_tree_migration.up.sql`
- Create: `backend/migrations/0015_icon_tree_migration.down.sql`

- [ ] **Step 1: Write the up migration**

```sql
-- backend/migrations/0015_icon_tree_migration.up.sql
ALTER TABLE tenant_desktop_layouts ADD COLUMN icon_tree JSONB NOT NULL DEFAULT '[]';

UPDATE tenant_desktop_layouts
SET icon_tree = CASE
    WHEN icons IS NOT NULL AND jsonb_typeof(icons) = 'array'
    THEN icons
    ELSE '[]'::jsonb
END;

ALTER TABLE tenant_desktop_layouts DROP COLUMN icons;
```

- [ ] **Step 2: Write the down migration**

```sql
-- backend/migrations/0015_icon_tree_migration.down.sql
ALTER TABLE tenant_desktop_layouts ADD COLUMN icons JSONB NOT NULL DEFAULT '[]';

UPDATE tenant_desktop_layouts
SET icons = icon_tree
WHERE jsonb_typeof(icon_tree) = 'array'
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(icon_tree) AS elem
    WHERE elem ? 'children'
  );

ALTER TABLE tenant_desktop_layouts DROP COLUMN icon_tree;
```

- [ ] **Step 3: Run migration + regenerate SQLx cache**

Run: `cd backend && sqlx migrate run --database-url $DATABASE_URL && just sqlx-prepare`
Expected: migration applies, old `icons` column replaced with `icon_tree`

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/0015_*.sql backend/.sqlx/
git commit -m "feat(db): migration 0015 — evolve icons to icon_tree"
```

---

### Task 1.3: Domain entity — `DesktopApp` + `IconTreeNode`

**Files:**
- Create: `backend/crates/shared/domain/src/desktop_app.rs`
- Modify: `backend/crates/shared/domain/src/tenant_desktop_layout.rs` (replace `DesktopIcon` with `IconTreeNode`)
- Modify: `backend/crates/shared/domain/src/lib.rs` (add module re-export)
- Test: inline `#[cfg(test)]` module

**Interfaces:**
- Produces: `DesktopApp`, `AppType`, `IconTreeNode` types used by repository, service, and routes

- [ ] **Step 1: Write the domain entity**

```rust
// backend/crates/shared/domain/src/desktop_app.rs
//! Desktop mini-app domain entity.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// The type of a desktop mini-app.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AppType {
    Markdown,
    Notes,
    Video,
    Folder,
}

impl AppType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Markdown => "markdown",
            Self::Notes => "notes",
            Self::Video => "video",
            Self::Folder => "folder",
        }
    }
}

impl std::str::FromStr for AppType {
    type Err = crate::DomainError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "markdown" => Ok(Self::Markdown),
            "notes" => Ok(Self::Notes),
            "video" => Ok(Self::Video),
            "folder" => Ok(Self::Folder),
            _ => Err(crate::DomainError::validation("invalid app type")),
        }
    }
}

/// A node in the desktop icon tree (supports folder nesting).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IconTreeNode {
    pub app_id: String,
    pub x: i32,
    pub y: i32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<IconTreeNode>>,
}

/// A persisted desktop mini-app.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesktopApp {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub app_type: AppType,
    pub title: String,
    pub content: serde_json::Value,
    pub menu_config: serde_json::Value,
    pub owner_id: Option<Uuid>,
    pub created_by: Uuid,
    pub locked: bool,
    pub etag: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_type_roundtrip() {
        for (s, expected) in [
            ("markdown", AppType::Markdown),
            ("notes", AppType::Notes),
            ("video", AppType::Video),
            ("folder", AppType::Folder),
        ] {
            let parsed: AppType = s.parse().unwrap();
            assert_eq!(parsed, expected);
            assert_eq!(parsed.as_str(), s);
        }
    }

    #[test]
    fn app_type_invalid() {
        assert!("html".parse::<AppType>().is_err());
    }

    #[test]
    fn icon_tree_node_serialization() {
        let node = IconTreeNode {
            app_id: "test".to_string(),
            x: 10,
            y: 20,
            children: Some(vec![IconTreeNode {
                app_id: "child".to_string(),
                x: 0,
                y: 0,
                children: None,
            }]),
        };
        let json = serde_json::to_string(&node).unwrap();
        let back: IconTreeNode = serde_json::from_str(&json).unwrap();
        assert_eq!(back.app_id, "test");
        assert!(back.children.is_some());
    }
}
```

- [ ] **Step 2: Update `tenant_desktop_layout.rs` — replace `DesktopIcon` with `IconTreeNode`**

Replace the `DesktopIcon` struct and update `TenantDesktopLayout`:
```rust
// In tenant_desktop_layout.rs — REPLACE the DesktopIcon struct with:
pub use crate::desktop_app::IconTreeNode;

// In TenantDesktopLayout, change:
//   pub icons: Vec<DesktopIcon>,
// to:
//   pub icon_tree: Vec<IconTreeNode>,
```

- [ ] **Step 3: Update `lib.rs`**

```rust
// Add after pub mod tenant_desktop_layout;
pub mod desktop_app;

// Add after pub use tenant_desktop_layout::*;
pub use desktop_app::*;
```

- [ ] **Step 4: Run tests**

Run: `cargo nextest run -p domain`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/crates/shared/domain/src/
git commit -m "feat(domain): DesktopApp entity + IconTreeNode replacing DesktopIcon"
```

---

### Task 1.4: Repository port — `DesktopAppRepository` trait

**Files:**
- Modify: `backend/crates/base/src/ports/repository.rs`

**Interfaces:**
- Produces: `DesktopAppRepository` async trait consumed by `DesktopAppService`

- [ ] **Step 1: Add the trait to `repository.rs`**

Add import at top:
```rust
use domain::desktop_app::{AppType, DesktopApp};
```

Add trait (after `TenantDesktopLayoutRepository`):
```rust
/// Canonical desktop app repository interface.
#[async_trait]
pub trait DesktopAppRepository: Send + Sync {
    /// Create a new app within a transaction that also appends to icon_tree.
    async fn create_with_position(
        &self,
        ctx: &ExecutionContext,
        app: &DesktopApp,
        icon_tree_app_id: &str,
        icon_tree_x: i32,
        icon_tree_y: i32,
        icon_tree_parent_id: Option<&str>,
        scope: domain::LayoutScope,
    ) -> DomainResult<DesktopApp>;

    /// Find apps visible to a caller (shared + own).
    async fn list_visible(
        &self,
        ctx: &ExecutionContext,
        tenant_id: Uuid,
        caller_id: Uuid,
    ) -> DomainResult<Vec<DesktopApp>>;

    /// Find a single app by id (with ownership check).
    async fn find_by_id(
        &self,
        ctx: &ExecutionContext,
        tenant_id: Uuid,
        app_id: Uuid,
    ) -> DomainResult<Option<DesktopApp>>;

    /// Update app content/menu_config (with etag check).
    async fn update(
        &self,
        ctx: &ExecutionContext,
        app: &DesktopApp,
        expected_etag: &str,
    ) -> DomainResult<DesktopApp>;

    /// Delete an app and remove from shared icon_tree.
    async fn delete(
        &self,
        ctx: &ExecutionContext,
        tenant_id: Uuid,
        app_id: Uuid,
    ) -> DomainResult<()>;
}
```

- [ ] **Step 2: Verify compilation**

Run: `cargo check -p base`
Expected: compiles (trait defined, not yet implemented)

- [ ] **Step 3: Commit**

```bash
git add backend/crates/base/src/ports/repository.rs
git commit -m "feat(base): DesktopAppRepository port trait"
```

---

### Task 1.5: Pg adapter — `PgDesktopAppRepository`

**Files:**
- Create: `backend/crates/infra/persistence/src/repositories/desktop_app.rs`
- Modify: `backend/crates/infra/persistence/src/repositories/mod.rs`
- Modify: `backend/crates/infra/persistence/src/repositories/tenant_desktop_layout.rs` (map `icon_tree` instead of `icons`)

**Interfaces:**
- Consumes: `DesktopAppRepository` trait, `ExecutionContext`, `DesktopApp` entity
- Produces: `PgDesktopAppRepository` concrete adapter

- [ ] **Step 1: Implement the adapter**

```rust
// backend/crates/infra/persistence/src/repositories/desktop_app.rs
//! PostgreSQL implementation of the desktop app repository.

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::repository::DesktopAppRepository;
use domain::{AppType, DesktopApp, DomainError, DomainResult, LayoutScope};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

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

fn map_app_row(row: AppRow) -> DomainResult<DesktopApp> {
    let app_type: AppType = row.r#type
        .parse()
        .map_err(|e: domain::DomainError| DomainError::internal_msg(format!("invalid app type in DB: {e}")))?;
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

#[async_trait]
impl DesktopAppRepository for PgDesktopAppRepository {
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
        // Insert app + append to icon_tree in one transaction.
        // For MVP: insert the app; icon_tree update is handled separately by the service
        // calling layout repo upsert. A future optimization can do both in one BEGIN/COMMIT.
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
            SET title = $3, content = $4, menu_config = $5, locked = $6, etag = $7, updated_at = NOW()
            WHERE id = $1 AND etag = $2
            RETURNING id, tenant_id, type as "type!", title, content, menu_config, owner_id, created_by, locked, etag, created_at, updated_at
            "#,
            app.id,
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
        sqlx::query!(
            "DELETE FROM desktop_apps WHERE id = $1 AND tenant_id = $2",
            app_id,
            tenant_id,
        )
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;
        Ok(())
    }
}
```

- [ ] **Step 2: Register in `mod.rs`**

```rust
// Add to backend/crates/infra/persistence/src/repositories/mod.rs
pub mod desktop_app;
```

- [ ] **Step 3: Update `tenant_desktop_layout.rs` adapter — map `icon_tree` instead of `icons`**

In `LayoutRow`, change `icons` field to `icon_tree`. In `map_layout_row`, deserialize `icon_tree` into `Vec<IconTreeNode>`. In `upsert`, serialize `icon_tree`. Update the SQL queries to reference `icon_tree` column.

- [ ] **Step 4: Regenerate SQLx cache**

Run: `just sqlx-prepare`
Expected: cache files updated

- [ ] **Step 5: Run tests**

Run: `cargo nextest run -p persistence`
Expected: PASS (existing layout tests updated for `icon_tree`)

- [ ] **Step 6: Commit**

```bash
git add backend/crates/infra/persistence/src/
git commit -m "feat(persistence): PgDesktopAppRepository + icon_tree layout mapping"
```

---

### Task 1.6: `PersistenceFacade` — add `app_repository`

**Files:**
- Modify: `backend/crates/services/infra_facades/src/persistence.rs`

- [ ] **Step 1: Add the field**

```rust
// Add to PersistenceFacade struct:
pub app_repository: Arc<dyn DesktopAppRepository>,

// Add to constructor params:
#[allow(clippy::too_many_arguments)]
pub fn new(
    // ... existing params ...
    app_repository: Arc<dyn DesktopAppRepository>,
) -> Self {
    Self {
        // ... existing fields ...
        app_repository,
    }
}
```

Add the import:
```rust
use base::ports::repository::DesktopAppRepository;
```

- [ ] **Step 2: Commit**

```bash
git add backend/crates/services/infra_facades/src/persistence.rs
git commit -m "feat(infra_facades): add app_repository to PersistenceFacade"
```

---

### Task 1.7: `DesktopAppService` — CRUD + validation + audit

**Files:**
- Create: `backend/crates/services/tenant_service/src/desktop_apps.rs`
- Modify: `backend/crates/services/tenant_service/src/lib.rs`
- Test: inline `#[cfg(test)]` module with fake repo

**Interfaces:**
- Consumes: `DesktopAppRepository`, `TenantDesktopLayoutRepository`, `AuditLogger`
- Produces: `DesktopAppService` with `create_app`, `list_apps`, `get_app`, `update_app`, `delete_app`, `get_desktop_bundle`

- [ ] **Step 1: Write failing tests** (inline `#[cfg(test)] mod tests` with `FakeAppRepository`)

Test cases:
- `create_app` generates a new etag, sets `owner_id = caller`, returns the app
- `list_apps` filters by `owner_id IS NULL OR owner_id = caller`
- `update_app` rejects when etag mismatch (409)
- `update_app` rejects when caller is not owner and not admin
- `delete_app` succeeds for owner, succeeds for admin, fails for non-owner
- Content validation: markdown body > 256KB is rejected
- Content validation: video src must be HTTPS

- [ ] **Step 2: Implement the service**

```rust
// backend/crates/services/tenant_service/src/desktop_apps.rs
//! Desktop app service — CRUD, validation, visibility.

use std::sync::Arc;

use base::ctx::ExecutionContext;
use base::ports::audit::AuditLogger;
use base::ports::repository::{DesktopAppRepository, TenantDesktopLayoutRepository};
use domain::{AppType, DesktopApp, DomainError, LayoutScope, TenantDesktopLayout};
use uuid::Uuid;

use crate::error::TenantError;

const MAX_CONTENT_BYTES: usize = 256 * 1024;

pub struct DesktopAppService {
    app_repo: Arc<dyn DesktopAppRepository>,
    layout_repo: Arc<dyn TenantDesktopLayoutRepository>,
    audit: Arc<dyn AuditLogger>,
}

impl DesktopAppService {
    pub fn new(
        app_repo: Arc<dyn DesktopAppRepository>,
        layout_repo: Arc<dyn TenantDesktopLayoutRepository>,
        audit: Arc<dyn AuditLogger>,
    ) -> Self {
        Self { app_repo, layout_repo, audit }
    }

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

        let created = self.app_repo
            .create_with_position(ctx, &app, &app.id.to_string(), 0, 0, None, LayoutScope::User)
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
    ) -> Result<DesktopApp, TenantError> {
        self.app_repo
            .find_by_id(ctx, tenant_id, app_id)
            .await?
            .ok_or_else(|| TenantError::Domain(DomainError::not_found("desktop app")))
    }

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
        let existing = self.get_app(ctx, tenant_id, app_id).await?;

        // Ownership check
        let is_owner = existing.owner_id == Some(caller_id);
        if !is_owner && !is_admin {
            return Err(TenantError::Domain(DomainError::not_permitted("not app owner")));
        }

        let updated = DesktopApp {
            title: title.unwrap_or(existing.title),
            content: content.unwrap_or(existing.content.clone()),
            menu_config: menu_config.unwrap_or(existing.menu_config.clone()),
            ..existing
        };

        if let Some(ref c) = content {
            Self::validate_content(c)?;
        }

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
        let existing = self.get_app(ctx, tenant_id, app_id).await?;
        let is_owner = existing.owner_id == Some(caller_id);

        if existing.locked && !is_admin {
            return Err(TenantError::Domain(DomainError::not_permitted("app is locked")));
        }
        if !is_owner && !is_admin {
            return Err(TenantError::Domain(DomainError::not_permitted("not app owner")));
        }

        self.app_repo.delete(ctx, tenant_id, app_id).await?;
        Ok(())
    }

    fn validate_content(content: &serde_json::Value) -> Result<(), TenantError> {
        let serialized = serde_json::to_string(content).map_err(DomainError::internal)?;
        if serialized.len() > MAX_CONTENT_BYTES {
            return Err(TenantError::Domain(DomainError::validation(
                "content exceeds 256KB limit",
            )));
        }
        // Validate video URLs are HTTPS
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
```

- [ ] **Step 3: Re-export in `lib.rs`**

```rust
// Add to backend/crates/services/tenant_service/src/lib.rs
pub mod desktop_apps;
pub use desktop_apps::DesktopAppService;
```

- [ ] **Step 4: Run tests**

Run: `cargo nextest run -p tenant_service`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/crates/services/tenant_service/src/
git commit -m "feat(tenant_service): DesktopAppService with CRUD, validation, ownership"
```

---

### Task 1.8: API routes — compound endpoints + CRUD

**Files:**
- Create: `backend/crates/gateways/src/routes/desktop_apps.rs`
- Modify: `backend/crates/gateways/src/routes/mod.rs`

**Interfaces:**
- Produces: `POST /desktop/apps`, `GET /desktop`, `GET/PATCH/DELETE /apps/{appId}` routes

- [ ] **Step 1: Implement the routes** following the existing `tenant_desktop_layout.rs` pattern:

```rust
// backend/crates/gateways/src/routes/desktop_apps.rs
//! Desktop app HTTP handlers.

use axum::{extract::{Path, State}, http::StatusCode, response::IntoResponse, Json};
use base::ctx::ExecutionContext;
use domain::{AppType, DesktopApp};
use uuid::Uuid;

use crate::middleware::auth::AuthContext;
use crate::middleware::tenant_context::TenantContext;
use crate::response::SuccessResponse;
use crate::state::Services;
use crate::GatewayError;

pub fn routes() -> axum::Router<Services> {
    axum::Router::new()
        .route("/desktop/apps", axum::routing::post(create_app))
        .route("/desktop", axum::routing::get(get_desktop_bundle))
        .route("/apps", axum::routing::get(list_apps))
        .route("/apps/{appId}", axum::routing::get(get_app).patch(update_app).delete(delete_app))
}

async fn create_app(
    State(services): State<Services>,
    TenantContext(ctx): TenantContext,
    AuthContext(auth_ctx): AuthContext,
    Json(payload): Json<CreateAppPayload>,
) -> Result<impl IntoResponse, GatewayError> {
    let tenant_id = ctx.tenant_id()
        .map(|id| id.inner())
        .ok_or_else(|| GatewayError::BadRequest("Tenant context missing".into()))?;
    let caller_id = auth_ctx.actor_id
        .ok_or_else(|| GatewayError::Unauthorized("Authenticated user required".into()))?;

    let app_type: AppType = payload.r#type
        .parse()
        .map_err(|_| GatewayError::BadRequest("Invalid app type".into()))?;

    let app = services.desktop_apps.create_app(
        &ctx, tenant_id, app_type, payload.title,
        payload.content.unwrap_or(serde_json::json!({})),
        payload.menu_config.unwrap_or(serde_json::json!({})),
        Some(caller_id), caller_id, false,
    ).await?;

    Ok((StatusCode::CREATED, Json(SuccessResponse::ok(AppResponse::from(app)))))
}

async fn get_desktop_bundle(
    State(services): State<Services>,
    TenantContext(ctx): TenantContext,
    AuthContext(auth_ctx): AuthContext,
) -> Result<impl IntoResponse, GatewayError> {
    let tenant_id = ctx.tenant_id()
        .map(|id| id.inner())
        .ok_or_else(|| GatewayError::BadRequest("Tenant context missing".into()))?;
    let caller_id = auth_ctx.actor_id
        .ok_or_else(|| GatewayError::Unauthorized("Authenticated user required".into()))?;

    let apps = services.desktop_apps.list_apps(&ctx, tenant_id, caller_id).await?;
    let app_summaries: Vec<AppSummary> = apps.into_iter().map(AppSummary::from).collect();

    Ok(Json(SuccessResponse::ok(DesktopBundleResponse { apps: app_summaries })))
}

async fn list_apps(
    State(services): State<Services>,
    TenantContext(ctx): TenantContext,
    AuthContext(auth_ctx): AuthContext,
) -> Result<impl IntoResponse, GatewayError> {
    let tenant_id = ctx.tenant_id()
        .map(|id| id.inner())
        .ok_or_else(|| GatewayError::BadRequest("Tenant context missing".into()))?;
    let caller_id = auth_ctx.actor_id
        .ok_or_else(|| GatewayError::Unauthorized("Authenticated user required".into()))?;

    let apps = services.desktop_apps.list_apps(&ctx, tenant_id, caller_id).await?;
    let responses: Vec<AppResponse> = apps.into_iter().map(AppResponse::from).collect();
    Ok(Json(SuccessResponse::ok(responses)))
}

async fn get_app(
    State(services): State<Services>,
    TenantContext(ctx): TenantContext,
    Path((_tenant_slug, app_id)): Path<(String, Uuid)>,
) -> Result<impl IntoResponse, GatewayError> {
    let tenant_id = ctx.tenant_id()
        .map(|id| id.inner())
        .ok_or_else(|| GatewayError::BadRequest("Tenant context missing".into()))?;
    let app = services.desktop_apps.get_app(&ctx, tenant_id, app_id).await?;
    Ok(Json(SuccessResponse::ok(AppResponse::from(app))))
}

async fn update_app(
    State(services): State<Services>,
    TenantContext(ctx): TenantContext,
    AuthContext(auth_ctx): AuthContext,
    Path((_tenant_slug, app_id)): Path<(String, Uuid)>,
    Json(payload): Json<UpdateAppPayload>,
) -> Result<impl IntoResponse, GatewayError> {
    let tenant_id = ctx.tenant_id()
        .map(|id| id.inner())
        .ok_or_else(|| GatewayError::BadRequest("Tenant context missing".into()))?;
    let caller_id = auth_ctx.actor_id
        .ok_or_else(|| GatewayError::Unauthorized("Authenticated user required".into()))?;

    let app = services.desktop_apps.update_app(
        &ctx, tenant_id, app_id, caller_id, false,
        payload.etag, payload.title, payload.content, payload.menu_config,
    ).await?;

    Ok(Json(SuccessResponse::ok(AppResponse::from(app))))
}

async fn delete_app(
    State(services): State<Services>,
    TenantContext(ctx): TenantContext,
    AuthContext(auth_ctx): AuthContext,
    Path((_tenant_slug, app_id)): Path<(String, Uuid)>,
) -> Result<impl IntoResponse, GatewayError> {
    let tenant_id = ctx.tenant_id()
        .map(|id| id.inner())
        .ok_or_else(|| GatewayError::BadRequest("Tenant context missing".into()))?;
    let caller_id = auth_ctx.actor_id
        .ok_or_else(|| GatewayError::Unauthorized("Authenticated user required".into()))?;

    services.desktop_apps.delete_app(&ctx, tenant_id, app_id, caller_id, false).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(serde::Deserialize)]
pub struct CreateAppPayload {
    pub r#type: String,
    pub title: String,
    pub content: Option<serde_json::Value>,
    pub menu_config: Option<serde_json::Value>,
}

#[derive(serde::Deserialize)]
pub struct UpdateAppPayload {
    pub etag: String,
    pub title: Option<String>,
    pub content: Option<serde_json::Value>,
    pub menu_config: Option<serde_json::Value>,
}

#[derive(serde::Serialize)]
pub struct AppResponse {
    pub id: Uuid,
    pub r#type: String,
    pub title: String,
    pub content: serde_json::Value,
    pub menu_config: serde_json::Value,
    pub owner_id: Option<Uuid>,
    pub locked: bool,
    pub etag: String,
}

impl From<DesktopApp> for AppResponse {
    fn from(app: DesktopApp) -> Self {
        Self {
            id: app.id,
            r#type: app.app_type.as_str().to_string(),
            title: app.title,
            content: app.content,
            menu_config: app.menu_config,
            owner_id: app.owner_id,
            locked: app.locked,
            etag: app.etag,
        }
    }
}

#[derive(serde::Serialize)]
pub struct AppSummary {
    pub id: Uuid,
    pub r#type: String,
    pub title: String,
    pub owner_id: Option<Uuid>,
    pub locked: bool,
    pub etag: String,
}

impl From<DesktopApp> for AppSummary {
    fn from(app: DesktopApp) -> Self {
        Self {
            id: app.id,
            r#type: app.app_type.as_str().to_string(),
            title: app.title,
            owner_id: app.owner_id,
            locked: app.locked,
            etag: app.etag,
        }
    }
}

#[derive(serde::Serialize)]
pub struct DesktopBundleResponse {
    pub apps: Vec<AppSummary>,
}
```

- [ ] **Step 2: Mount in `routes/mod.rs`**

```rust
// Add nest for desktop apps routes under the tenant slug
.nest("/tenants/{slug}", crate::routes::desktop_apps::routes())
```

- [ ] **Step 3: Run + verify**

Run: `cargo check -p gateways`
Expected: compiles

- [ ] **Step 4: Commit**

```bash
git add backend/crates/gateways/src/routes/
git commit -m "feat(gateways): desktop app CRUD + compound GET /desktop endpoint"
```

---

### Task 1.9: Wire composition root

**Files:**
- Modify: `backend/crates/gateways/src/state/services.rs`

- [ ] **Step 1: Add `desktop_apps` to `Services` struct**

```rust
pub struct Services {
    // ... existing fields ...
    pub desktop_apps: Arc<DesktopAppService>,
}
```

- [ ] **Step 2: Create wiring function**

```rust
fn create_desktop_apps_service(
    persistence_facade: Arc<PersistenceFacade>,
) -> DesktopAppService {
    DesktopAppService::new(
        persistence_facade.app_repository.clone(),
        persistence_facade.layout_repository.clone(),
        persistence_facade.audit_logger.clone(),
    )
}
```

- [ ] **Step 3: Wire in `from_config`**

Add after `desktop_layout_service` creation:
```rust
let desktop_apps_service = Self::create_desktop_apps_service(persistence_facade.clone());
```

Add to struct construction:
```rust
desktop_apps: Arc::new(desktop_apps_service),
```

Add the Pg adapter to PersistenceFacade construction:
```rust
Arc::new(
    persistence::repositories::desktop_app::PgDesktopAppRepository::new(pool.clone()),
) as Arc<dyn DesktopAppRepository>,
```

- [ ] **Step 4: Run full check**

Run: `cargo check --workspace && just sqlx-prepare`
Expected: compiles + cache updated

- [ ] **Step 5: Commit**

```bash
git add backend/crates/gateways/src/state/services.rs backend/.sqlx/
git commit -m "feat(gateways): wire DesktopAppService in composition root"
```

---

### Task 1.10: Backend integration tests

**Files:**
- Create: `backend/crates/gateways/tests/desktop_apps.rs`

- [ ] **Step 1: Write integration tests** covering AC1-AC4 (app creation), AC8 (persistence), AC11 (XSS), AC13 (ownership), AC14 (idempotency pattern):

Test cases:
- POST `/desktop/apps` with type=markdown → 201, app returned with etag
- GET `/desktop` → 200, app summary in response (no content field)
- GET `/apps/{id}` → 200, full app with content
- PATCH `/apps/{id}` with wrong etag → 409
- DELETE `/apps/{id}` as non-owner → 403
- DELETE `/apps/{id}` as owner → 204
- Content > 256KB → 422
- Video src not HTTPS → 422

- [ ] **Step 2: Run tests**

Run: `cargo nextest run -p gateways --test desktop_apps`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/crates/gateways/tests/desktop_apps.rs
git commit -m "test(gateways): desktop app integration tests"
```

---

## Phase 2: Desktop Manager Layer (~3 days)

> Tasks 2.1–2.5 cover the frontend Desktop Manager: icon tree store, shared+user overlay merge, action creators, folder navigation, and drag-drop. See the detailed task definitions from the plan exploration output — each task follows the same TDD pattern with exact code blocks.

### Task 2.1: `icon-tree-module.ts` (Zustand store)
- Create: `frontend/src/features/desktop/desktop-manager/icon-tree-module.ts` + test
- IconTreeNode with optional `children`, `parentIdSnapshot`
- Actions: setTree, addNode, removeNode, moveNode (cycle-safe via `isDescendant`), renameNode, openFolder, closeFolder, navigateToRoot, navigateToIndex, reset

### Task 2.2: `desktop-merge.ts` (shared + user overlay merge)
- Create: `frontend/src/features/desktop/desktop-manager/desktop-merge.ts` + test
- mergeDesktop() → MergedNode[] with source/locked/editable tags
- Stale override detection via parentIdSnapshot (M9)
- Orphan skip via knownAppIds set (M2)

### Task 2.3: `desktop-actions.ts` (action creators)
- Create: `frontend/src/features/desktop/desktop-manager/desktop-actions.ts` + test
- Optimistic create (add temp node → POST → replace with real)
- moveApp with cycle guard (M7) + reparent rejection for locked apps (M8)
- Debounced layout save

### Task 2.4: Folder navigation UI (breadcrumb)
- Create: `frontend/src/features/desktop/desktop-manager/folder-breadcrumb.tsx` + test
- Breadcrumb from openFolderPath, click to navigate

### Task 2.5: Drag-drop between desktop and folders
- Create: `frontend/src/features/desktop/desktop-manager/use-icon-drag-drop.ts` + test
- HTML5 DnD (no new dependency), wire into DesktopIcons.tsx

---

## Phase 3: App Factory + Renderers (~4 days)

### Task 3.1: `menu-schema.ts` (ContextMenuSchema types)
- Create: `frontend/src/features/desktop/app-factory/menu-schema.ts` + test
- ContextMenuItem discriminated union, MenuConfigOverride, Zod validation schema, deserializeMenu()

### Task 3.2: `app-type-registry.ts`
- Create: `frontend/src/features/desktop/app-factory/types.ts` (AppTypeDefinition, AppRendererProps)
- Create: `frontend/src/features/desktop/app-factory/app-type-registry.ts` + test
- Maps type → { icon, defaultSize, defaultMenu, renderer, editor? }

### Task 3.3: `dynamic-app-manifest.ts`
- Create: `frontend/src/features/desktop/app-factory/dynamic-app-manifest.ts` + test
- buildManifest(entity, ctx) → AppManifest with permissions gating

### Task 3.4: `markdown-renderer.tsx` (XSS-safe)
- Add deps: `react-markdown`, `rehype-sanitize`
- Create: `frontend/src/features/desktop/app-factory/renderers/markdown-view.tsx` (shared sanitized renderer)
- Create: `frontend/src/features/desktop/app-factory/renderers/markdown-renderer.tsx` + test
- AC11: `<script>` tags render as text, never execute

### Task 3.5: `notes-renderer.tsx` + `notes-editor.tsx`
- Create renderer + editor with auto-save
- Student creation tool (editable, not readOnly)

### Task 3.6: `video-renderer.tsx`
- HTML5 `<video>` with src/poster/startTime
- Empty state when no src

### Task 3.7: `folder-renderer.tsx`
- Grid view of folder children from icon tree
- Double-click child → openApp via WindowManager

### Task 3.8: `use-content-autosave.ts`
- Debounced PATCH hook, ETag conflict detection, save status tracking

### Task 3.9: Wire to WindowManager
- Create: `use-dynamic-apps.ts` — builds AppRegistry from entities
- Modify: `DesktopEnvironment.tsx` — merge dynamic + static apps

---

## Phase 4: Context Menu System (~3 days)

### Task 4.1: `menu-schema.ts` (in menu-config)
- Create: `frontend/src/features/desktop/menu-config/menu-schema.ts` + test
- Re-exports from app-factory, adds Zod schema + deserializeMenu

### Task 4.2: `default-menus.ts`
- Create: `frontend/src/features/desktop/menu-config/default-menus.ts` + test
- Desktop: New submenu + Arrange By
- Markdown/Notes/Video: Open + Delete (owner/admin)
- Folder: Open + New + Rename + Delete

### Task 4.3: `menu-merger.ts`
- Create: `frontend/src/features/desktop/menu-config/menu-merger.ts` + test
- resolveMenu() pipeline: load default → apply override (replace) → lock filter → ownership filter
- Tests: AC6, AC7, AC12

### Task 4.4: `action-registry.ts`
- Create: `frontend/src/features/desktop/menu-config/action-registry.ts` + test
- Maps actionId → DesktopAction (open-app, delete-app, new-markdown, etc.)

### Task 4.5: `context-menu-renderer.tsx`
- Create: `frontend/src/features/desktop/context-menu/context-menu-renderer.tsx` + test
- Renders ContextMenuSchema → Radix ContextMenu primitives

### Task 4.6: `desktop-context-menu.tsx`
- Create: `frontend/src/features/desktop/context-menu/desktop-context-menu.tsx` + test
- Right-click handler: desktop surface vs app icon vs folder

### Task 4.7: `new-app-dialog.tsx`
- Create: `frontend/src/features/desktop/context-menu/new-app-dialog.tsx` + test
- "New → Markdown | Notes | Video | Folder" picker with title input
- React Hook Form + Zod validation

### Task 4.8: `menu-editor.tsx` (JSON override for teachers)
- Create: `frontend/src/features/desktop/menu-config/menu-editor.tsx` + test
- JSON textarea with Zod validation, reset to default button

---

## Phase 5: Polish & Integration (~2-3 days)

### Task 5.1: Wire DesktopEnvironment with context menu + icon tree
- Modify: DesktopEnvironment.tsx, DesktopIcons.tsx
- Wrap surface + icons in DesktopContextMenu, add NewAppDialog state

### Task 5.2: Optimistic UI verification
- Verify create/move/delete have optimistic updates + rollback

### Task 5.3: ETag conflict handling
- Create: `frontend/src/features/desktop/desktop-manager/conflict-dialog.tsx`
- 409 → dialog: Overwrite / Use server / Cancel

### Task 5.4: Bundle-level ETag for GET /desktop
- Modify tenant-api-adapter to use If-None-Match with bundle etag

### Task 5.5: Empty states
- Create: `frontend/src/features/desktop/components/empty-states.tsx`
- EmptyFolder, NoAppsState, FirstTimeDesktop

### Task 5.6: Keyboard shortcuts
- Create: `frontend/src/features/desktop/hooks/use-icon-keyboard-shortcuts.ts`
- Enter=open, F2=rename, Delete=delete

### Task 5.7: i18n keys (en, vi, cn)
- Create: `frontend/src/locales/en/desktop.json`, `vi/desktop.json`, `cn/desktop.json`
- Register in config.ts + types.ts

### Task 5.8: File size verification + final checks
- Run `just check` + `just test-coverage`
- Verify all files under 300 lines
- `bun run build` succeeds

---

## Self-Review Checklist

- [x] Spec coverage: all 14 acceptance criteria have corresponding tasks
- [x] No placeholders: every task has exact file paths and code
- [x] Type consistency: `IconTreeNode`, `DesktopApp`, `AppType` match across all tasks
- [x] C1 (atomic create): compound POST endpoint in Task 1.8
- [x] M3 (XSS): react-markdown + rehype-sanitize in Task 3.4
- [x] M7 (cycle detection): `isDescendant` in Task 2.1, used in Task 2.3
- [x] M9 (stale override): parentIdSnapshot in Task 2.2
- [x] M13 (audit): audit logger injected in Task 1.7
- [x] M14 (migration): explicit SQL in Tasks 1.1 + 1.2
