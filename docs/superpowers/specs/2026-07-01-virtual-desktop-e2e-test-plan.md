# Virtual Desktop End-to-End Test Plan

**Date:** 2026-07-01  
**Branch:** `feat/virtual-desktop`  
**Scope:** Verify every feature added by the Virtual Desktop plan through API tests and real browser interaction.

## Success criteria

- All API endpoints behave correctly under normal, error, and ownership scenarios.
- The browser desktop renders the icon tree, context menus, app windows, and folder navigation.
- Optimistic UI, drag-and-drop, keyboard shortcuts, ETag conflicts, and empty states work as a real user would expect.
- i18n strings display in English, Vietnamese, and Chinese where implemented.
- No regressions in existing tenant dock icons or layout persistence.

---

## Phase A — Infrastructure & test data

- [x] Start Postgres (`klynt-postgres`) and Redis (`klynt-redis`) containers.
- [x] Run backend migrations (`sqlx migrate run`).
- [x] Seed test data: tenant `acme-test`, admin user `test@klynt.dev`, tenant membership, initial shared layout with empty `icon_tree`.
- [x] Start backend server (actual default port `http://localhost:3001`).
- [x] Start frontend dev server (actual default port `http://localhost:5174`).
- [x] Confirm health endpoints return 200 (note: mounted at `/health/live` and `/health/ready`, not under `/api/v1`).

---

## Phase B — API verification

### Authentication

- [x] `POST /api/v1/auth/login` with seeded credentials returns bearer token.

### App CRUD

- [x] `POST /api/v1/tenants/acme-test/desktop/apps` creates a **folder** app (201 + etag).
- [x] `POST ...` creates a **markdown** app (201 + etag).
- [x] `POST ...` creates a **notes** app (201 + etag).
- [x] `POST ...` creates a **video** app with HTTPS `src` (201 + etag).
- [x] `POST ...` with video `src: "http://..."` returns 422.
- [x] `POST ...` with markdown content > 256KB returns 422.
- [x] `GET /api/v1/tenants/acme-test/desktop` returns bundle with `apps` and `etag`.
- [x] `GET /api/v1/tenants/acme-test/apps/{id}` returns full app including `content`.
- [x] `PATCH /api/v1/tenants/acme-test/apps/{id}` with correct etag updates app (200 + new etag).
- [x] `PATCH ...` with stale etag returns 409.
- [x] `DELETE /api/v1/tenants/acme-test/apps/{id}` as owner returns 204.
- [x] `GET ...` after delete returns 404.

### Layout / icon tree persistence

- [x] `PUT /api/v1/tenants/acme-test/desktop-layout` (shared) with `icon_tree` succeeds for admin.
- [x] `GET /api/v1/tenants/acme-test/desktop-layout` returns persisted `icon_tree`.
- [x] Deleting an app removes it from the layout `icon_tree`.

### Ownership / permissions

- [x] Second member cannot delete an app owned by the admin (403).
- [x] Second member cannot read a private app owned by the admin (403).

> **Note:** Apps currently default to user-scoped ownership, so cross-member reads require shared apps (not yet implemented).

---

## Phase C — Browser verification (Kimi WebBridge)

> **Status:** Full interactive browser verification is **deferred**. The Kimi WebBridge skill is not available in this session, and wildcard `*.localhost` DNS does not resolve on macOS, blocking tenant-subdomain browser tests. Only the automated Playwright smoke test below was run.

### Automated smoke test

- [x] Seeded admin can access tenant desktop via path redirect (`/tenants/acme-test`) without unexpected JS console errors.

### Login & desktop shell

- [ ] Navigate to `http://localhost:5174/login`, log in with seeded credentials.
- [ ] Desktop loads with fabric wallpaper, menubar, and existing dock icons.
- [ ] No console errors on initial load.

### Context menu (desktop background)

- [ ] Right-click empty desktop → context menu appears with New Folder / New Markdown / New Notes / New Video / Paste / Refresh / Change Background.
- [ ] Select "New Folder" → dialog opens.
- [ ] Submit dialog → folder icon appears on desktop (optimistic temp icon first, then real icon).

### Folder navigation

- [ ] Double-click folder → folder window opens showing empty state.
- [ ] Breadcrumb shows "Home > Folder Name".
- [ ] Create a markdown app inside the folder → appears in folder window and breadcrumb persists.
- [ ] Click "Home" in breadcrumb → returns to root desktop view.

### App renderers

- [ ] Create and open a **markdown** app → window opens, preview renders `# heading` from default content.
- [ ] Edit markdown text → debounced save indicator shows; reload page → content persists.
- [ ] Create and open a **notes** app → editable textarea opens, type text, reload → persists.
- [ ] Create and open a **video** app with a valid HTTPS URL → video element appears.
- [ ] Create a video app with invalid URL → empty state "No valid video URL" appears.
- [ ] Create a folder app → folder window renders child apps as a grid.

### Drag-and-drop

- [ ] Drag a root app icon and drop it on a folder icon → app moves into folder.
- [ ] Open the folder → moved app is visible inside.
- [ ] Drag an app out of a folder onto empty desktop → app returns to root.

### Optimistic UI

- [ ] Throttle network to slow 3G (or add artificial API delay).
- [ ] Create a new app → temp icon appears immediately, then is replaced by the real icon once the API responds.
- [ ] On API failure during create → temp icon disappears and error is surfaced.

### ETag conflict handling

- [ ] Open two browser sessions/tabs logged in as the same user.
- [ ] Edit the same markdown app in both tabs.
- [ ] Save in tab A, then save in tab B → tab B shows conflict dialog with Reload/Retry options.
- [ ] Click Reload in tab B → latest server content loads.

### Keyboard shortcuts

- [ ] Press `Ctrl+Shift+N` (or `Cmd+Shift+N`) → New App dialog opens.
- [ ] Select an app icon, press `Enter` → app/folder opens.
- [ ] Select an app icon, press `Delete` → app is removed (with API call).
- [ ] Press `Esc` while context menu/dialog is open → it closes.

### Empty states

- [ ] Empty folder window shows "This folder is empty".
- [ ] Empty desktop grid shows "No icons on the desktop".
- [ ] Video app without valid URL shows empty state.

### i18n

- [ ] Switch language to Vietnamese where UI strings exist → desktop empty state / context menu labels reflect Vietnamese.
- [ ] Switch language to Chinese → labels reflect Chinese.

### Regression

- [ ] Existing tenant dock icons (Members, Roles, Settings) still open their windows.
- [ ] Layout save on window move/resize still works and survives reload.

---

## Phase D — Documentation

- [x] Update this file: check off each passing item above.
- [x] Update `docs/VALIDATION_REPORT.md` with a summary of verified backend + frontend behavior.
- [x] Note any bugs found and whether they were fixed or deferred.

---

## Known limitations / deferred items

- Admin status for creating shared apps is not yet computed from tenant role; shared apps default to user-scoped.
- The `desktop:paste` context action is a placeholder (no clipboard implementation).
- `app:rename` and `app:cut/copy` context actions are placeholders.
