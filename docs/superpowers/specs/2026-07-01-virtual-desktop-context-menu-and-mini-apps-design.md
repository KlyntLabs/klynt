# Virtual Desktop — Context Menu System & Dynamic Mini-Apps

**Status:** Approved (brainstorm complete)  
**Date:** 2026-07-01  
**Sub-project:** ① of 5 (MVP)  
**Depends on:** Existing `features/desktop/` module, `TenantDesktopLayout` backend entity, `PersistenceAdapter` pattern

---

## 1. Problem Statement

The Klynt Education Platform has a mature desktop environment (`DesktopEnvironment`, `WindowManager`, `PersistenceAdapter`, factory system), but apps are currently hardcoded in static registries. The platform needs to become a true **Virtual Desktop (OS Simulator)** where:

- Teachers right-click the desktop → "New" → choose app type → a mini-app appears
- Each mini-app type has its own renderer and default context menu
- Teachers can configure/override the context menu per app instance to guide or restrict learner actions
- Students get a personal layer — they can create their own notes/files while interacting with teacher-curated content
- Mini-apps can be organized into nested folders (like a real filesystem)

### MVP Scope

| In Scope | Out of Scope (later sub-projects) |
|---|---|
| Context menu system (desktop + per-app, configurable) | Visual drag-and-drop menu builder (P3) |
| Dynamic mini-app factory (Markdown, Notes, Video, Folder) | HTML app type (P4 — sandboxing risk) |
| Nested folder hierarchy | Templates & marketplace (P5) |
| Teacher base + student personal layer (two-layer model) | Automation/scripting (P6) |
| Smart defaults + JSON menu override | Global undo/redo (P2) |

---

## 2. User Stories (fixes M5)

### Teacher (curator)
- **As a teacher**, I want to right-click the desktop and create a Markdown lesson so that my students can read course content in the desktop environment.
- **As a teacher**, I want to create a Video app pointing to my lesson video so that students can watch lectures without leaving the desktop.
- **As a teacher**, I want to organize my course apps into folders so that the desktop stays organized across multiple units.
- **As a teacher**, I want to override the context menu on a specific video app so that I can restrict students to "Play" and "Exit" only during an exam.
- **As a teacher**, I want to lock my content so that students can view it but not accidentally delete or rename it.

### Student (learner)
- **As a student**, I want to create personal Notes apps on the desktop so that I can jot down lesson summaries alongside the teacher's content.
- **As a student**, I want to see my teacher's course folder appear on my desktop when I enroll so that I can start learning immediately.
- **As a student**, I want to move my personal notes around the desktop without affecting what the teacher sees so that I can organize my workspace.

### Admin (tenant manager)
- **As an admin**, I want to manage all apps on the tenant desktop (including deleting inappropriate content) so that I maintain a safe environment.
- **As an admin**, I want to see an audit trail of who created, modified, or deleted apps so that I can investigate issues.

### First-run student (onboarding)
- **As a first-time student**, I want to see a clean desktop with clear empty-state guidance so that I know how to interact with the environment.
- **As a first-time student**, I want the right-click menu to be obvious and simple so that I can discover how to create my first note without instructions.

---

## 3. Acceptance Criteria (fixes M1)

| # | Given | When | Then |
|---|---|---|---|
| AC1 | Teacher is on tenant desktop | Right-clicks desktop → New → Markdown, enters title | A Markdown app icon appears at the click position, and opens in a window showing the markdown content |
| AC2 | Teacher is on tenant desktop | Right-clicks desktop → New → Notes, enters title | A Notes app icon appears, and opens in an editable notes window |
| AC3 | Teacher is on tenant desktop | Right-clicks desktop → New → Video, enters title and URL | A Video app icon appears, and opens with an HTML5 video player |
| AC4 | Teacher is on tenant desktop | Right-clicks desktop → New → Folder, enters title | A Folder icon appears, double-clicking opens a folder view |
| AC5 | Student opens the tenant desktop | Page loads | Student sees all shared (teacher) apps + their own personal apps merged on one desktop |
| AC6 | Student right-clicks a locked teacher app | Context menu appears | Menu does NOT contain Delete, Rename, or Edit — only the teacher-configured actions |
| AC7 | Student right-clicks their own app | Context menu appears | Menu contains Open and Delete |
| AC8 | Student creates a Notes app | Edits content, closes window, reopens | Content persists across reloads |
| AC9 | Teacher creates nested folders to depth 5 | Student opens each folder | All folders render correctly; depth-6 creation is rejected |
| AC10 | Tenant has existing flat `icons` layout | Migration 0014 runs | `icon_tree` column is backfilled, `icons` column is dropped, desktop loads with apps at original positions |
| AC11 | Student stores markdown with `<script>` tag | App is opened by any user | Script does NOT execute — content is sanitized via `react-markdown` + `rehype-sanitize` |
| AC12 | Teacher overrides a video app's menu to "replace" | Student right-clicks the video | Student sees only the teacher's custom menu items |
| AC13 | Student is removed from tenant (membership revoked) | Cascade runs | Student's personal apps and user-overlay layout are deleted in the same transaction |
| AC14 | POST `/desktop/apps` is called twice with same Idempotency-Key | Second call returns | Same app entity returned — no duplicate created |

---

## 4. Success Metrics (fixes M4)

| Metric | Target | Measurement Window | Review Checkpoint |
|---|---|---|---|
| Teacher app-creation rate | ≥60% of teachers create ≥1 app within first week | 4 weeks post-launch | Week 4 review |
| Student personal-app creation | Median student creates ≥1 personal note within first 3 sessions | 4 weeks post-launch | Week 4 review |
| Desktop confusion (support tickets) | <5% of support tickets reference desktop confusion | 4 weeks post-launch | Week 4 review |
| Context menu discovery | ≥40% of students right-click an app at least once | 2 weeks post-launch | Week 2 review |

**Review at week 4:** If teacher app-creation rate < 30% target or support confusion > 15%, reassess UX before investing in P2–P6.

---

## 5. Rollback / Abandon Criteria (fixes M6)

| Trigger | Action |
|---|---|
| Teacher app-creation rate < 20% at week 4 | Revert to static app registry (existing hardcoded registries). The `desktop_apps` table remains but the dynamic factory is disabled. |
| Support tickets > 15% reference desktop confusion | Investigate UX, potentially simplify (remove folders from MVP, flat desktop only). |
| XSS or security incident via app content | Immediately disable POST `/desktop/apps` (read-only mode) until fix ships. |
| Performance: `GET /desktop` p95 > 1s | Investigate pagination strategy before proceeding. |

The nesting-depth limit of 5 is a **guess to validate** — if real-world usage shows teachers exceeding depth 3 regularly, we will reassess whether deeper nesting or a different organization model is needed.

---

## 6. Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Desktop model | One merged desktop, two permission layers | Teacher apps (locked) + student apps (editable) coexist on one surface. No context-switching for learners. |
| Organization | Nested folders (filesystem metaphor) | Familiar to all desktop users. Scales to many courses/teachers. |
| Data architecture | Hybrid: `desktop_apps` table (content) + `icon_tree` in layout (positions) | Separates concerns that change at different rates. Prevents layout conflicts. Template-ready. |
| MVP app types | Markdown, Notes, Video, Folder | Each demonstrates a distinct pattern (content viewer, creation tool, media, organizer). HTML deferred for security. |
| Menu configuration | Smart defaults per type + JSON override for teachers | Full power without building a visual editor. `replace` strategy only in MVP. |
| Permission model | Ownership (`owner_id`) + tenant role | No new permission categories. Students own their apps; admins/owners manage everything. |

---

## 7. Architecture Overview

Three layers, all new modules inside the existing `features/desktop/` (see Section 10 for module details):

```
┌─────────────────────────────────────────────────────────────┐
│                    DesktopEnvironment                        │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐│
│  │ Desktop Manager │  │   App Factory   │  │  Permission  ││
│  │     Layer       │  │      Layer      │  │  & Config    ││
│  │                 │  │                 │  │    Layer     ││
│  │ • icon-tree     │  │ • type registry │  │ • menu schema││
│  │   module        │  │ • dynamic       │  │ • default    ││
│  │ • desktop-merge │  │   manifest      │  │   menus      ││
│  │ • desktop-      │  │ • renderers     │  │ • menu       ││
│  │   actions       │  │   (MD, Notes,   │  │   merger     ││
│  │ • folder nav    │  │    Video,       │  │ • menu       ││
│  │ • drag-drop     │  │    Folder)      │  │   editor     ││
│  │                 │  │ • content       │  │              ││
│  │                 │  │   editors       │  │              ││
│  └────────┬────────┘  └────────┬────────┘  └──────┬───────┘│
│           │                    │                  │         │
│           └────────────────────┼──────────────────┘         │
│                                ▼                             │
│                    ┌──────────────────┐                      │
│                    │ Context Menu UI  │                      │
│                    │ • desktop menu   │                      │
│                    │ • new-app dialog │                      │
│                    │ • menu renderer  │                      │
│                    └──────────────────┘                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              EXISTING (unchanged)                        ││
│  │  WindowManager • Window • Menubar • Backgrounds         ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Right-click desktop → "New" → "Notes"

```
DesktopEnvironment onContextMenu
  → desktop-context-menu.tsx (target is desktop surface)
  → renders desktop-level menu (New, Arrange)
  → user clicks "New → Notes"
  → new-app-dialog.tsx opens
  → user enters title
  → desktop-actions.createApp('notes', title, position)
    → POST /tenants/{slug}/desktop/apps
        { type, title, position: {x, y}, parentId: null }
        + Idempotency-Key header (Redis-backed)
    → backend inserts app AND appends to icon_tree in ONE transaction
    → returns { app: entity, layout: updated_layout } with both etags
    → icon-tree-module updates tree from response
    → dynamic-app-manifest builds AppManifest from entity
    → notes-renderer.tsx opens in a window (via WindowManager)
```

**Atomicity guarantee:** The compound `POST /desktop/apps` endpoint inserts into `desktop_apps` and updates `icon_tree` in a single database transaction. If either step fails, the entire operation rolls back — no orphaned apps. An idempotency key (using the existing Redis infrastructure) ensures that retried requests return the original app instead of creating duplicates.

### Data Flow: Right-click app icon → see its context menu

```
DesktopEnvironment onContextMenu
  → target is app icon → get app entity
  → menu-merger.resolve(app)
    → 1. app.menuConfig (teacher override) — highest priority
    → 2. default-menus[app.type] — type default
    → 3. if app.locked: filter out destructive actions
    → returns merged ContextMenuSchema
  → context-menu-renderer renders schema → Radix ContextMenu
  → user clicks "Export PDF"
  → action dispatched to notes-renderer via action registry
```

---

## 8. Backend Data Model

### 4.1 New Table: `desktop_apps`

```sql
CREATE TABLE desktop_apps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,          -- 'markdown' | 'notes' | 'video' | 'folder'
  title         TEXT NOT NULL,
  content       JSONB DEFAULT '{}',     -- type-specific payload
  menu_config   JSONB DEFAULT '{}',     -- override or {} for type defaults
  owner_id      UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = tenant-owned (shared); student's personal apps deleted when student is deleted
  created_by    UUID NOT NULL REFERENCES users(id),
  locked        BOOLEAN DEFAULT FALSE,  -- teacher content = locked
  etag          TEXT NOT NULL,          -- optimistic concurrency
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_desktop_apps_tenant ON desktop_apps(tenant_id);
CREATE INDEX idx_desktop_apps_owner  ON desktop_apps(tenant_id, owner_id);
```

**Visibility rule:** An app is visible to a caller if `owner_id IS NULL` (tenant-owned/shared) OR `owner_id = caller_id` (personally owned).

**Content validation (fixes M10):**

| Constraint | Value |
|---|---|
| Per-type `content` schema | Validated at API boundary with type-specific Zod schemas (e.g., `video.src` must be a URL, `notes.body` must be a string) |
| Max `content` payload | 256 KB per app |
| Max `menu_config` payload | 16 KB per app |
| Per-tenant app-count quota | 1000 apps (configurable per tenant via `tenants.settings`) |
| Rate limit on POST/PATCH/DELETE apps | 60 requests/minute per user (existing Redis rate limiter) |

**Input sanitization (fixes M3 — XSS hardening):**

Markdown content is sanitized at two levels:
1. **Backend (on write):** `validator` crate strips raw HTML tags from markdown `body` fields. Only markdown syntax is allowed; inline HTML is rejected.
2. **Frontend (on render):** `markdown-renderer.tsx` uses `react-markdown` (emits React nodes, never `dangerouslySetInnerHTML`) with `rehype-sanitize` plugin. Raw HTML is disabled. URL schemes are allowlisted to `http`, `https`, `mailto`.

Notes content follows the same sanitization rules.

**Video URL allowlist (fixes M11):**

Video `src` and `poster` URLs are validated server-side:
1. Scheme must be `https` (reject `http`, `data:`, `javascript:`, `file:`).
2. Origin must be in the tenant's configured media allowlist (stored in `tenants.settings.mediaAllowlist`, defaulting to `["youtube.com", "youtube-nocookie.com", "vimeo.com"]`).
3. CSP `media-src` and `img-src` directives are set to the allowlisted origins.

**Content payloads per type:**

| Type | `content` JSONB |
|---|---|
| `markdown` | `{ "body": "# Lesson 1\n\nWelcome...", "readOnly": true }` |
| `notes` | `{ "body": "My notes from today...", "format": "markdown" }` |
| `video` | `{ "src": "https://...", "poster": "...", "startTime": 0 }` |
| `folder` | `{ }` — folder contents live in the layout's `icon_tree` children |

### 4.2 Evolved: `tenant_desktop_layouts`

The existing `icons` JSONB column (flat array) evolves to `icon_tree` (nested tree):

```
-- Old (flat array):
[{ "appId": "...", "x": 100, "y": 200 }]

-- New (nested tree):
[
  { "appId": "uuid-1", "x": 100, "y": 200 },
  { "appId": "uuid-folder", "x": 200, "y": 100,
    "children": [
      { "appId": "uuid-2", "x": 0, "y": 0 },
      { "appId": "uuid-3", "x": 80, "y": 0,
        "children": [ ... ]           -- unlimited nesting
    ]
  }
]
```

Position coordinates are **relative within the containing folder** (x/y reset to 0,0 inside children).

**Migration strategy (fixes M14):**

The migration is explicit and immediate, not lazy:

```sql
-- Migration 0014: Evolve icons to icon_tree

-- Step 1: Add icon_tree column
ALTER TABLE tenant_desktop_layouts ADD COLUMN icon_tree JSONB DEFAULT '[]';

-- Step 2: Backfill icon_tree from existing icons (flat array → root-level tree)
UPDATE tenant_desktop_layouts
SET icon_tree = (
  CASE
    WHEN icons IS NOT NULL AND jsonb_typeof(icons) = 'array'
    THEN icons  -- flat array is already valid root-level tree (nodes without children)
    ELSE '[]'::jsonb
  END
);

-- Step 3: Drop the old icons column
ALTER TABLE tenant_desktop_layouts DROP COLUMN icons;

-- Note: version, background_preset_id, windows, etag columns are preserved unchanged.
```

The Rust domain entity `TenantDesktopLayout` evolves: `icons: Vec<DesktopIcon>` becomes `icon_tree: Vec<IconTreeNode>` where `IconTreeNode` is:

```rust
pub struct IconTreeNode {
    pub app_id: String,
    pub x: i32,
    pub y: i32,
    pub children: Option<Vec<IconTreeNode>>,  // None = leaf node
}
```

The existing `DesktopIcon` type is replaced by `IconTreeNode`. The `PgTenantDesktopLayoutRepository` mapping functions are updated in the same migration phase.

### 4.3 Domain Entity: `DesktopApp`

New domain entity in `backend/crates/shared/domain/src/desktop_app.rs`:

```rust
pub struct DesktopApp {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub app_type: AppType,         // Markdown, Notes, Video, Folder
    pub title: String,
    pub content: serde_json::Value,
    pub menu_config: serde_json::Value,
    pub owner_id: Option<Uuid>,    // None = tenant-owned
    pub created_by: Uuid,
    pub locked: bool,
    pub etag: String,
    pub created_at: DateTime,
    pub updated_at: DateTime,
}

pub enum AppType {
    Markdown,
    Notes,
    Video,
    Folder,
}
```

### 4.4 Why Content and Positions Are Separate

This is the most critical design decision. Two concerns change at very different rates:

| Concern | Who changes it | Frequency | Table |
|---|---|---|---|
| **Content** (lesson text, video URL, notes body) | Teacher (curated) or owner | Rare | `desktop_apps` |
| **Position** (x/y, folder membership, ordering) | Any user (drag-drop) | Frequent | `icon_tree` in layout |

If both lived in one JSONB blob (Approach B), a student dragging an icon would save the entire blob — potentially clobbering a teacher's concurrent content edit. With the hybrid approach (Approach C), content and position writes cannot clobber each other. Referential consistency (orphaned `appId` references after deletion) is handled separately via lazy resolution in `desktop-merge.ts` (see M2 fix in Section 9.1).

---

## 9. API Layer

All routes follow existing patterns: nested under `/api/v1/tenants/{slug}/`, require auth + tenant membership middleware, use ETag optimistic concurrency.

### 5.1 App CRUD

```
POST   /tenants/{slug}/desktop/apps           → create app + insert into icon_tree (atomic, idempotent)
GET    /tenants/{slug}/apps                    → list all apps visible to caller (paginated)
GET    /tenants/{slug}/apps/{appId}            → single app with content + menuConfig
PATCH  /tenants/{slug}/apps/{appId}            → update content/menuConfig (If-Match: etag)
DELETE /tenants/{slug}/apps/{appId}            → delete app (+ cascade-remove from all icon_trees)
```

**POST /desktop/apps** is the compound creation endpoint (fixes C1):
- Request: `{ type, title, content?, menuConfig?, position: {x, y}, parentId?: string | null, scope: "shared" | "user" }`
- Idempotency-Key header (Redis-backed, existing infrastructure) — retries return the original response
- Backend inserts into `desktop_apps` AND appends to the appropriate `icon_tree` (shared or user overlay) in one DB transaction
- Response: `{ app: DesktopAppEntity, layout: { iconTree, etag } }`

**DELETE /apps/{appId}** cascade strategy (fixes M2):
- Shared layout: `icon_tree` row updated in same transaction (admin/owner only)
- User overlays: each student's overlay may contain the `appId`. The backend cannot atomically rewrite N overlay rows. Instead:
  1. DELETE removes the app from `desktop_apps` and from the **shared** `icon_tree` in one transaction.
  2. User overlays are cleaned **lazily** — stale `appId` references are silently dropped during `desktop-merge.ts` (the merge function skips any `appId` not present in the apps list).
  3. A periodic reconciliation job (runs daily via existing `cleanup_job`) prunes dead `appId` references from user-overlay `icon_tree` JSONB.

### 5.2 Desktop Layout (existing, evolved)

```
GET    /tenants/{slug}/desktop-layout         → shared layout (icon_tree + windows)
PUT    /tenants/{slug}/desktop-layout         → save shared (If-Match: etag)
GET    /tenants/{slug}/desktop-layout/me      → user overlay (student's personal layer)
PUT    /tenants/{slug}/desktop-layout/me      → save user overlay
```

### 5.3 Compound: Desktop Bundle

```
GET    /tenants/{slug}/desktop                → everything needed to render

Response:
{
  "layout": {
    "shared": {
      "iconTree": [...],
      "windows": [...],
      "etag": "..."
    },
    "userOverlay": {                    // null if no user override exists
      "iconTree": [...],
      "windows": [...],
      "etag": "..."
    }
  },
  "apps": [
    {
      "id": "...",
      "type": "markdown",
      "title": "...",
      "content": {...},
      "menuConfig": {...},
      "ownerId": null,                  // null = tenant-owned/shared
      "locked": true,
      "etag": "..."
    }
  ]
}
```

This compound endpoint minimizes round-trips for initial desktop render. The frontend fetches this once on mount, then uses individual `PATCH /apps/{id}` and `PUT /desktop-layout` for subsequent edits.

**Pagination strategy (fixes M12):** The compound endpoint returns the icon_tree structure and metadata for all visible apps (lightweight: id, type, title, ownerId, locked). App **content** (the potentially large JSONB payloads) is **not** included in the bundle — it are fetched lazily per-app when the app window opens via `GET /apps/{appId}`. This keeps the compound response small regardless of app count.

**Latency SLO:** Target p95 < 200ms for `GET /desktop` with up to 500 apps in a tenant. Monitored via existing Prometheus metrics.

**Server-side tree validation (fixes m2):** On `PUT /desktop-layout/me`, the backend validates that every `appId` in the user-overlay `icon_tree` is either shared (`owner_id IS NULL`) or owned by the caller (`owner_id = caller`). References to other students' apps are rejected with 422.

### 5.4 Permission Enforcement

| Route | Who can call |
|---|---|
| `PUT /desktop-layout` (shared) | tenant owner or admin only |
| `PUT /desktop-layout/me` (user overlay) | any tenant member |
| `POST /apps` | any tenant member (creates with `owner_id = caller`) |
| `PATCH /apps/{appId}` | `owner_id = caller` OR tenant admin/owner |
| `DELETE /apps/{appId}` | `owner_id = caller` OR tenant admin/owner; locked apps require admin/owner |
| `GET /apps`, `GET /desktop` | any tenant member (filtered: `owner_id IS NULL OR owner_id = caller`) |

Permission is enforced **at the database query level** (WHERE clause on `owner_id`), not just in the API layer. The frontend filter is a convenience, not a security boundary.

---

## 10. Frontend Architecture

### 6.1 New Module Map

```
features/desktop/
├── ── EXISTING (unchanged) ──
├── components/
│   ├── DesktopEnvironment.tsx
│   ├── WindowManager.tsx
│   ├── Window.tsx
│   └── Menubar.tsx
├── window-manager/
│   └── window-module.ts
├── backgrounds/
│   └── presets.ts
├── factory/
│   └── types.ts                 → DesktopConfig (extended with context menu support)
│
├── ── NEW: Desktop Manager Layer ──
├── desktop-manager/
│   ├── icon-tree-module.ts      ① Zustand store: icon tree CRUD, folder open/close,
│   │                               drag-drop, move between folders, z-order
│   ├── desktop-merge.ts         ② merges shared + user overlay into unified tree
│   └── desktop-actions.ts       ③ action creators: createApp, moveApp, deleteApp,
│                                   renameApp, openFolder, closeFolder
│
├── ── NEW: App Factory Layer ──
├── app-factory/
│   ├── app-type-registry.ts     ④ maps type string → { manifest template, defaultMenu,
│   │                               defaultSize, icon, renderer }
│   ├── dynamic-app-manifest.ts  ⑤ builds AppManifest from desktop_apps entity
│   │                               (title, content, menuConfig, permissions)
│   ├── renderers/
│   │   ├── markdown-renderer.tsx   ⑥ lazy-loaded per type
│   │   ├── notes-renderer.tsx
│   │   ├── video-renderer.tsx
│   │   └── folder-renderer.tsx
│   └── content-editors/
│       ├── markdown-editor.tsx
│       ├── notes-editor.tsx
│       └── video-config.tsx
│
├── ── NEW: Permission & Config Layer ──
├── menu-config/
│   ├── menu-schema.ts           ⑦ ContextMenuSchema type — mirrors MenubarSchema
│   ├── default-menus.ts         ⑧ per-type default context menus
│   │   ├── (markdown, notes, video, folder, desktop)
│   ├── menu-merger.ts           ⑨ resolves: teacher override > type default > desktop default
│   └── menu-editor.tsx          ⑩ JSON editor for teachers to override menu config
│
├── ── NEW: Context Menu UI ──
├── context-menu/
│   ├── desktop-context-menu.tsx ⑪ right-click handler: desktop surface vs app icon
│   ├── new-app-dialog.tsx       ⑫ "New → Markdown | Notes | Video | Folder" picker
│   └── context-menu-renderer.tsx⑬ renders ContextMenuSchema → Radix ContextMenu
```

### 6.2 Desktop Manager Layer (`desktop-manager/`)

#### `icon-tree-module.ts`

Zustand + Immer store (same pattern as existing `window-module.ts`). State:

```typescript
interface IconTreeState {
  // Per-desktop tree (keyed by desktopId, like WindowManager)
  trees: Record<string, IconTreeNode[]>;
  // Currently open folder path (for breadcrumb navigation)
  openFolderPath: string[];        // array of folder appIds
  // Drag state
  draggingAppId: string | null;

  // Actions
  setTree: (desktopId: string, tree: IconTreeNode[]) => void;
  addNode: (desktopId: string, node: IconTreeNode, parentId?: string) => void;
  removeNode: (desktopId: string, appId: string) => void;
  moveNode: (desktopId: string, appId: string, newParentId: string | null, x: number, y: number) => void;
  renameNode: (desktopId: string, appId: string, title: string) => void;
  openFolder: (folderAppId: string) => void;
  closeFolder: () => void;
  navigateToRoot: () => void;
}

interface IconTreeNode {
  appId: string;
  x: number;
  y: number;
  children?: IconTreeNode[];
}
```

#### `desktop-merge.ts`

Merges the shared (teacher) layout and the user overlay (student) into a single unified tree:

- Teacher's shared tree is the base. Nodes with `locked: true` cannot be moved/deleted by students.
- User overlay stores **only the student's personal apps and position overrides** — it does NOT duplicate the entire shared tree. When a student moves a shared app, the override records `{ appId, x, y }` for that specific app. The merge applies position overrides on top of shared positions.
- Student's personal apps (those with `owner_id = student`) from the user overlay are appended to the merged tree.
- Merge result: one tree with all apps visible, each tagged with its source (`{ source: "shared" | "user", locked: boolean, editable: boolean }`).

**Reparenting rules (fixes M8):**

- Students may **only override x/y** of shared/locked apps. They cannot reparent (change `parentId`) a shared app — it stays in the teacher's folder structure.
- `moveNode` on a locked/shared app into a different parent is **rejected** (no-op + toast: "Cannot move teacher's app into a different folder").
- `parentId` is stored in the user overlay **only for student-owned apps** (their personal apps can be moved freely, including into shared folders).

**Stale override handling (fixes M9):**

When a teacher reparents a shared app (e.g., moves it from root into a folder), students who had position overrides for that app at root level would get ghost icons. Resolution:
- The merge function matches overrides by `appId`. If the shared tree's position for that `appId` has a different `parentId` than when the override was created, the override is **dropped** (app appears at its new shared position).
- Overrides include a `parentId` snapshot: `{ appId, x, y, parentIdSnapshot }`. If `parentIdSnapshot !== currentSharedParentId`, the override is stale and discarded.

**Orphan resolution (fixes M2):**

- During merge, any `appId` in either tree that doesn't exist in the apps list is silently skipped (no ghost icon rendered).
- This handles the window between a shared app being deleted and user overlays being reconciled.

#### `desktop-actions.ts`

Action creators that orchestrate the full flow (API call → store update → optimistic UI):

- `createApp(type, title, position, parentId?)` — POST to compound endpoint (atomic), add to tree on success (optimistic: add to tree immediately, rollback on failure)
- `moveApp(appId, newParentId, x, y)` — update tree, debounced save to layout. **Rejects if move creates a cycle** (fixes M7): `newParentId` must not be the node itself or any of its descendants. Cycle check traverses the subtree before committing.
- `deleteApp(appId)` — DELETE to backend, remove from tree
- `renameApp(appId, newTitle)` — PATCH title, update tree

### 6.3 App Factory Layer (`app-factory/`)

#### `app-type-registry.ts`

Static registry mapping app type strings to their render-time configuration:

```typescript
interface AppTypeDefinition {
  type: "markdown" | "notes" | "video" | "folder";
  icon: ComponentType<{ className?: string }>;
  defaultSize: { width: number; height: number };
  defaultMenu: ContextMenuSchema;
  renderer: LazyExoticComponent<ComponentType<AppRendererProps>>;
  editor?: LazyExoticComponent<ComponentType<AppEditorProps>>;  // null for read-only types
}

const appTypeRegistry: Record<string, AppTypeDefinition> = { ... };
```

#### `dynamic-app-manifest.ts`

Converts a `DesktopApp` entity (from the backend) into an `AppManifest` (consumed by the existing WindowManager):

```typescript
function buildManifest(app: DesktopAppEntity): AppManifest {
  const def = appTypeRegistry[app.type];
  return {
    id: app.id,
    title: app.title,
    icon: def.icon,
    category: app.ownerId ? "user" : "tenant",
    component: def.renderer,
    defaultSize: def.defaultSize,
    permissions: ({ user }) => app.locked
      ? user?.id !== app.ownerId && !isAdmin(user)  // locked = restricted
      : true,
    singleton: false,                // all app types are non-singleton in MVP
  };
}
```

#### Renderers

Each renderer is a lazy-loaded React component that receives the app's content payload and renders it inside a desktop window:

- **`markdown-renderer.tsx`** — Renders Markdown content (using a Markdown library). Read-only for students; teacher can edit via `markdown-editor.tsx`.
- **`notes-renderer.tsx`** — Editable rich text or Markdown editor (student creation tool). Auto-saves content via `PATCH /apps/{id}`.
- **`video-renderer.tsx`** — HTML5 `<video>` player. Reads `src`, `poster`, `startTime` from content payload.
- **`folder-renderer.tsx`** — Grid view of folder's child apps. Double-click a child to open it in a new window.

### 6.4 Permission & Config Layer (`menu-config/`)

#### `menu-schema.ts`

```typescript
type ContextMenuItem =
  | { type: "action"; label: string; shortcut?: string;
      icon?: ComponentType<{ className?: string }>;
      action: DesktopAction }
  | { type: "submenu"; label: string;
      icon?: ComponentType<{ className?: string }>;
      items: ContextMenuItem[] }
  | { type: "separator" };

type ContextMenuSchema = {
  items: ContextMenuItem[];
};

// Serialized form stored in desktop_apps.menu_config (JSONB)
// Component refs replaced by actionId strings
type MenuConfigOverride = {
  strategy: "replace";   // MVP: "replace" only. "extend" added later.
  items: SerializableMenuItem[];
};

type SerializableMenuItem =
  | { type: "action"; label: string; shortcut?: string;
      actionId: string;
      actionParams?: Record<string, unknown> }
  | { type: "submenu"; label: string;
      items: SerializableMenuItem[] }
  | { type: "separator" };
```

#### `default-menus.ts`

Per-type default context menus, shipped in code. **MVP menus include only actions the renderers implement** (fixes m4, m6):

```
Desktop surface (right-click empty space):
  ├─ New ▸ Markdown | Notes | Video | Folder
  └─ Arrange By ▸ Name | Date Created

Markdown app:
  ├─ Open
  ├─ ────
  └─ Delete (owner/admin only)

Notes app:
  ├─ Open
  ├─ ────
  └─ Delete (owner/admin only)

Video app:
  ├─ Open
  ├─ ────
  └─ Delete (owner/admin only)

Folder:
  ├─ Open
  ├─ New ▸ Markdown | Notes | Video | Folder
  ├─ Rename (owner/admin only)
  ├─ ────
  └─ Delete (owner/admin only)
```

Features like Print, Zoom, Export PDF, Pin to Desktop, Speed/Loop, Copy Timestamp, and Paste are **deferred** — they will be added when the renderers gain those capabilities in future sub-projects.

#### `menu-merger.ts`

The resolution pipeline that produces the final menu:

1. **Load type default** — `default-menus[app.type]`
2. **Check for override** — if `app.menuConfig` is non-empty, apply merge strategy:
   - `"replace"` (MVP): teacher's menu replaces the default entirely
   - `"extend"` (future): add/remove specific items from the default
3. **Lock filter** — if `app.locked` is true and caller is not admin/owner: strip Delete, Rename, Properties
4. **Ownership filter** — if caller is not `owner_id` and not admin: strip Delete, Edit

The lock filter and ownership filter **always run**, regardless of what the override says. This is the double-protection principle: even if a teacher's override accidentally includes "Delete" in a locked app's menu, the lock filter removes it for students.

#### `menu-editor.tsx`

A JSON editor dialog for teachers to configure the menu override on a specific app instance. Contains:
- The current default menu (read-only reference)
- A text area for JSON input (validated against `MenuConfigOverride` schema with Zod)
- A "reset to default" button

Live preview and the "extend" strategy are deferred to P3 (Visual Menu Builder).

### 6.5 Context Menu UI (`context-menu/`)

#### `desktop-context-menu.tsx`

Attaches to `DesktopEnvironment`'s `onContextMenu` handler. Determines whether the right-click target is:
- **Desktop surface (empty space)** → shows desktop-level menu
- **App icon** → resolves the app entity, runs menu-merger, shows app-specific menu
- **Folder (open or closed)** → shows folder menu

#### `new-app-dialog.tsx`

Dialog shown when user clicks "New →" from the context menu. Contains:
- App type picker (Markdown, Notes, Video, Folder)
- Title input
- Position (auto-filled from right-click coordinates)
- Parent folder (auto-filled if right-clicked inside a folder, else root)

#### `context-menu-renderer.tsx`

Takes a `ContextMenuSchema` and renders it using the existing Radix `ContextMenu` primitive (`frontend/src/components/ui/context-menu`). Maps `ContextMenuItem` types to Radix components:
- `"action"` → `ContextMenuItem` with onClick dispatching the action
- `"submenu"` → `ContextMenuSub` with nested items
- `"separator"` → `ContextMenuSeparator`

An **action registry** maps `actionId` strings to actual functions, resolving the serialization gap between stored JSONB and runtime component references.

---

## 11. Two-Layer Desktop Model

### How shared + user overlay merge

When a student loads the tenant desktop:

1. `GET /tenants/{slug}/desktop` returns: shared layout, user overlay (if exists), and all visible apps
2. `desktop-merge.ts` merges the two icon trees:
   - Shared tree nodes are included as-is (positions may be overridden by user overlay)
   - User overlay nodes (student's personal apps) are appended to the root
   - Each merged node is tagged: `{ source: "shared" | "user", locked: boolean }`
3. Student sees a unified desktop: teacher's course folder + their own notes coexisting

### What students can and cannot do

| Action | Teacher app (locked) | Student's own app |
|---|---|---|
| Open | Yes | Yes |
| Right-click → context menu | Yes (teacher-configured menu) | Yes (type default menu) |
| Move / reposition | Yes (position saved to user overlay, doesn't affect shared) | Yes |
| Rename | No (lock filter strips it) | Yes |
| Delete | No (lock filter strips it) | Yes |
| Edit content | No (lock filter strips it) | Yes |
| Create inside folder | Depends on folder's menu config | Yes |

### Why students can reposition shared apps (fixes m5)

Allowing students to rearrange teacher content on their personal desktop is a deliberate UX decision: an OS desktop where you can't move icons feels broken. Students reorganize to match their workflow — moving the current lesson's folder to a prominent position, grouping notes alongside a video. This does not affect the shared layout or what other students see. The position override is lightweight (just x/y in the user overlay) and the merge algorithm handles it naturally. If this proves to add unexpected complexity during implementation, the fallback is to simplify to fixed-position shared apps (overlay = student apps only).

---

## 12. Context Menu Resolution — The Critical Risk

The most critical risk (as identified in the brief) is conflicts between the default context menu and teacher configurations. This is addressed by the **menu resolution pipeline** (Section 10.4, `menu-merger.ts`):

```
         ┌─────────────────────────────────┐
app ───▶ │ Step 1: Load type default       │
entity   │ Step 2: Check teacher override  │
         │ Step 3: Merge (replace/extend)  │
         │ Step 4: Lock filter             │
         │ Step 5: Ownership filter        │
         └──────────┬──────────────────────┘
                    ▼
            ContextMenuSchema
```

**Guarantees:**
- The lock filter **always** strips destructive actions from locked apps, even if the teacher's override includes them. The teacher's lock decision overrides their own menu config.
- The ownership filter **always** strips management actions (Delete, Edit) from apps the caller doesn't own.
- Permission is enforced at two levels: UI filter (menu resolution) and API enforcement (backend checks `owner_id`). Even if the UI filter is bypassed, the API rejects unauthorized actions.

---

## 13. Development Roadmap

### MVP Phases

#### Phase 1: Backend Foundation (~4-5 days)
- Migration: `desktop_apps` table
- Migration: `icon_tree` column on `tenant_desktop_layouts` (backfill + drop old `icons` column)
- Domain entity: `DesktopApp` in `shared/domain/src/desktop_app.rs`
- Domain entity: `IconTreeNode` (replaces `DesktopIcon`)
- `AppType` enum
- Repository port in `base/src/ports/repository.rs`
- Pg adapter in `infra/persistence/src/repositories/desktop_app.rs`
- `DesktopAppService` in `services/` (CRUD + ownership checks + visibility filter)
- Compound `POST /desktop/apps` endpoint (atomic create + tree insert, idempotency key)
- Compound `GET /desktop` endpoint (layout + app metadata, content excluded)
- App CRUD routes (PATCH, DELETE, GET single with content)
- Audit events for all mutations (`desktop_app.created/updated/deleted/menu_config_changed`)
- Content validation (per-type Zod schemas, 256KB cap, XSS sanitization, video URL allowlist)
- Membership revocation cascade (delete personal apps + user overlay)
- SQLx cache regeneration (`just sqlx-prepare`)
- Integration tests (ownership, visibility, idempotency, content validation, XSS prevention)

#### Phase 2: Desktop Manager Layer (~3 days)
- `icon-tree-module.ts` (Zustand store — tree CRUD, folder open/close)
- `desktop-merge.ts` (shared + user overlay merge, stale-override detection, orphan skip)
- `desktop-actions.ts` (create/move/delete/rename with optimistic UI, cycle detection on move)
- Folder open/close navigation (breadcrumb UI)
- Drag-drop between desktop and folders (native HTML5 DnD)
- Reparent rejection for locked/shared apps (students can only override x/y)

#### Phase 3: App Factory + Renderers (~4 days)
- `app-type-registry.ts` (type → manifest mapping)
- `dynamic-app-manifest.ts` (entity → AppManifest)
- `markdown-renderer.tsx` (read-only viewer, react-markdown + rehype-sanitize)
- `notes-renderer.tsx` + `notes-editor.tsx` (student creation, same sanitization)
- `video-renderer.tsx` (HTML5 video player, CSP-enforced origins)
- `folder-renderer.tsx` (grid view of children)
- Wire to existing `WindowManager` (open apps in windows)
- Content auto-save (debounced PATCH)

#### Phase 4: Context Menu System (~3 days)
- `menu-schema.ts` (`ContextMenuSchema` type)
- `default-menus.ts` (per-type + desktop defaults)
- `menu-merger.ts` (resolution pipeline with lock + ownership filters)
- `context-menu-renderer.tsx` (Radix ContextMenu)
- `desktop-context-menu.tsx` (right-click handler — desktop vs app icon)
- `new-app-dialog.tsx` ("New →" picker)
- `menu-editor.tsx` (JSON override editor for teachers)
- Action registry (actionId → function)

#### Phase 5: Polish & Integration (~2-3 days)
- Compound endpoint optimization (single RTT, lazy content fetch)
- Optimistic UI updates (create/move feels instant)
- Conflict handling (ETag 409 → merge prompt)
- Bundle-level ETag for `GET /desktop` (hash of max(updated_at) + layout etag) for cache coherence
- Empty states (empty folder, no apps, first-time desktop onboarding)
- Keyboard shortcuts (Enter to open, F2 to rename, Delete to delete)
- i18n keys added to `en` namespace, mirrored in `vi` and `cn`
- File size checks (each source file under 300 lines frontend / 400 lines backend)

**Total MVP: ~16-18 days**

### Expansion Projects (separate specs, priority order)

| Priority | Project | Description |
|---|---|---|
| P2 | Global Undo/Redo | Command pattern wrapping `desktop-actions`. Per-desktop undo stack. Ctrl+Z / Ctrl+Shift+Z. |
| P3 | Visual Menu Builder | Drag-and-drop menu designer. Live preview per app type. Shortcut assignment UI. |
| P4 | HTML App Type | Sandboxed iframe renderer. CSP policy for untrusted content. Whitelist of allowed embeds. |
| P5 | Templates & Marketplace | Save `desktop_apps` row as template. Tenant-internal sharing. Cross-tenant marketplace. "Install course" → clone apps into layout. |
| P6 | Automation/Scripting | Scripted app sequences. Guided tours (pop-up hints). Trigger system (on-open, on-complete). |

---

## 14. Risk Analysis

| Risk | Severity | Mitigation |
|---|---|---|
| **Layout conflict** — student drags icon, overwrites teacher's content edit | CRITICAL | **Solved by design.** Content (`desktop_apps`) and positions (`icon_tree`) are separate tables. Content and position writes cannot clobber each other. |
| **createApp orphan** — POST succeeds but layout PUT fails, app exists but is invisible | CRITICAL | **Solved by compound endpoint.** POST `/desktop/apps` inserts app + updates icon_tree in one DB transaction with idempotency key (Section 9.1). |
| **Menu override conflicts** — teacher override vs type defaults produce confusing UX | HIGH | Explicit merge strategy (`replace`). Lock filter always strips destructive actions. No ambiguity. |
| **Stored XSS via markdown** — student stores `<script>` in markdown body | HIGH | Backend sanitizes raw HTML on write. Frontend uses `react-markdown` + `rehype-sanitize`, never `dangerouslySetInnerHTML`. URL schemes allowlisted (Section 8.1). |
| **Untrusted video URLs** — arbitrary external media loaded | HIGH | Server-side scheme validation (HTTPS only) + tenant-configured origin allowlist + CSP `media-src` (Section 8.1). |
| **Student sees teacher's personal apps** — permission leak | HIGH | Backend query filters `owner_id IS NULL OR owner_id = caller`. Double-checked in API layer. Frontend filter is convenience, not security. |
| **Folder cycle** — moving a folder into its own descendant | MEDIUM | `moveNode` rejects when `newParentId` is the node or any descendant (Section 10.2). |
| **Stale override ghosting** — teacher reparents app, student's old override creates ghost | MEDIUM | Override includes `parentIdSnapshot`; dropped if parent changed (Section 10.2). |
| **Deep folder nesting** — performance degrades with many levels | MEDIUM | JSONB tree loaded once via compound endpoint. Folder open is pure frontend state toggle. MVP limits nesting depth to 5. |
| **Orphaned appId references** — app deleted but referenced in user overlays | MEDIUM | Shared icon_tree cleaned in same transaction. User overlays cleaned lazily during merge (skip missing appIds) + daily reconciliation job (Section 9.1). |
| **Unbounded content payloads** — user stores very large JSONB | MEDIUM | Per-type schema validation, 256KB content cap, 16KB menu_config cap, per-tenant app-count quota, rate limiting (Section 8.1). |
| **Membership revocation data leak** — student leaves but data persists | MEDIUM | Cascade-delete of personal apps + user overlay on membership removal (Section 16). |
| **Concurrent layout edits** — two users save `icon_tree` simultaneously | LOW | ETag optimistic concurrency (existing pattern). 409 → frontend prompts retry. Shared: admin/owner only. User overlay: only the user. |

---

## 15. Audit Logging (fixes M13)

The existing `AuditLogger` trait logs every meaningful mutation. Desktop app operations are added to this system:

| Event | Audit Action | Fields |
|---|---|---|
| App created | `desktop_app.created` | appId, type, title, ownerId, scope (shared/user) |
| App updated (content/menu) | `desktop_app.updated` | appId, fieldsChanged, etagBefore, etagAfter |
| App deleted | `desktop_app.deleted` | appId, deletedBy, scope |
| Menu config overridden | `desktop_app.menu_config_changed` | appId, strategy, itemCount |

Each `DesktopAppService` use case emits the corresponding audit event via the injected `AuditLogger`, mirroring how existing services (`TenantService`, `UserService`) already do.

---

## 16. Membership Revocation & Data Cleanup (fixes M15)

When a student's tenant membership is revoked (not user deletion — the user record persists), their desktop data must be cleaned up:

**Strategy:** Cascade-delete on membership removal.
- The existing membership removal flow (`MembershipRepository::delete`) is extended to also delete the student's `desktop_apps` (WHERE `owner_id = student AND tenant_id = tenant`) and their user-scoped `tenant_desktop_layout` (WHERE `user_id = student AND tenant_id = tenant`).
- This runs in the same database transaction as the membership deletion.
- The shared `icon_tree` is not affected (student-owned apps only exist in the user overlay, not the shared tree — enforced by the creation endpoint's `scope` parameter).

**Child PII note (fixes m3):** Student note content constitutes child PII under COPPA/GDPR Art. 8. The cascade-delete on membership revocation satisfies the right-to-erasure. A data-export endpoint (`GET /users/me/export`) will be added as a platform-level feature (separate spec). Retention period: deleted immediately on membership revocation, no grace period.

---

## 17. Testing Strategy

### Acceptance Criteria Mapping
Each acceptance criterion (Section 3) maps to at least one test:
- AC1–AC4 (create each app type): backend integration test (compound POST) + frontend component test (new-app-dialog flow)
- AC5 (merged desktop): frontend integration test (desktop-merge with shared + user overlay)
- AC6–AC7 (context menu lock/ownership filtering): frontend unit test (menu-merger)
- AC8 (content persistence): backend integration test (PATCH + reload)
- AC9 (folder nesting to depth 5): frontend unit test (icon-tree-module) + backend validation test
- AC10 (migration): backend migration test (backfill flat → tree)
- AC11 (XSS prevention): backend sanitization test + frontend render test (script tag does not execute)
- AC12 (menu override replace): frontend unit test (menu-merger with replace strategy)
- AC13 (membership revocation cascade): backend integration test
- AC14 (idempotency): backend integration test (duplicate POST with same key)

### Backend
- Unit tests: `DesktopApp` domain entity validation, `AppType` parsing, content schema validation per type
- Integration tests: app CRUD routes, ownership enforcement, visibility filter, compound `/desktop` endpoint, idempotency key behavior, icon_tree migration from flat `icons`, XSS sanitization on write, video URL allowlist enforcement, membership revocation cascade, audit event emission
- Coverage gate: ≥ 84%

### Frontend
- Unit tests: `icon-tree-module` (tree CRUD, move, folder navigation, cycle detection), `desktop-merge` (shared + overlay merge, stale-override detection, orphan skip), `menu-merger` (resolution pipeline, lock filter, ownership filter), `dynamic-app-manifest` (entity → manifest)
- Component tests: `desktop-context-menu` (desktop vs app icon targeting), `new-app-dialog`, `context-menu-renderer`, each renderer (markdown, notes, video, folder)
- Integration tests: full flow — right-click → create app → appears in tree → opens in window → right-click app → context menu shows correct items
- Security test: markdown with `<script>` tag renders as text, never executes
- Coverage gate: ≥ 92%

---

## 18. Ubiquitous Language Additions

New terms to add to `UBIQUITOUS_LANGUAGE.md`:

| Term | Definition | Aliases to avoid |
|---|---|---|
| **DesktopApp** | A launchable mini-app instance on the desktop. Has a type (Markdown, Notes, Video, Folder), content payload, and optional menu override. Stored in `desktop_apps` table. | widget, tool, item |
| **AppType** | The kind of mini-app: `markdown`, `notes`, `video`, `folder`. Determines the renderer, default context menu, and content schema. | category |
| **IconTree** | The nested tree structure in `tenant_desktop_layouts` that stores app positions and folder hierarchy. Nodes reference `DesktopApp` IDs. | icon list, layout array |
| **MenuConfigOverride** | A teacher's custom context menu configuration stored per `DesktopApp` instance. Replaces or extends the type's default menu. | menu config, custom menu |
| **Lock** | A flag on `DesktopApp` indicating the app is teacher-curated content. Locked apps cannot be renamed, deleted, or edited by students. | readonly, protected |
| **User Overlay** | A student's personal `tenant_desktop_layout` (scope = `user`). Stores the student's own apps and position overrides for shared apps. | personal layer, my desktop |

---

## 19. ADR Required

An Architecture Decision Record should be written for:
- **ADR-014: Virtual Desktop Hybrid Data Model** — the decision to split content (`desktop_apps`) and structure (`icon_tree`) into separate tables, and the two-layer (shared + user overlay) desktop model.
