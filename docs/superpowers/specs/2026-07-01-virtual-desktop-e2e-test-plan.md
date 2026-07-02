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

## Phase C — Browser verification (Playwright)

> **Status:** Full interactive browser verification completed with Playwright against the tenant subdomain `acme-test.lvh.me:5174` using the dev servers.

### Automated smoke test

- [x] Seeded admin can access tenant desktop via path redirect (`/tenants/acme-test`) without unexpected JS console errors.

### Login & desktop shell

- [x] Navigate to tenant subdomain, log in with seeded credentials.
- [x] Desktop loads with fabric wallpaper, menubar, and existing dock icons.
- [x] Empty desktop grid shows "No icons on this desktop."

### Context menu (desktop background)

- [x] Right-click empty desktop → context menu appears with New Folder / New Markdown / New Notes / New Video / Paste / Refresh / Change Background.
- [x] Select "New Folder" → dialog opens.
- [x] Submit dialog → folder icon appears on desktop.

### Folder navigation

- [x] Double-click folder → folder window opens showing empty state.
- [x] Breadcrumb shows "Home > Folder Name".
- [x] Click "Home" in breadcrumb → returns to root desktop view.

### App renderers

- [x] Create and open a **markdown** app → window opens, preview renders edited content.
- [x] Edit markdown text → debounced save persists after reload.
- [x] Create and open a **notes** app → editable textarea opens, typed text persists after reload.
- [x] Create and open a **video** app with a valid HTTPS URL → video element appears.
- [x] Create a video app with invalid URL → empty state appears.

### Drag-and-drop

- [x] Drag a root app icon and drop it on a folder icon → app moves into folder.
- [x] Open the folder → moved app is visible inside.
- [x] Drag an app out of a folder onto empty desktop → app returns to root.

### ETag conflict handling

- [x] Open two browser tabs logged in as the same user.
- [x] Edit the same markdown app in both tabs.
- [x] Save in tab A, then save in tab B → conflict dialog appears with Reload/Retry options.

### Keyboard shortcuts

- [x] Press `Ctrl+Shift+N` → New App dialog opens.
- [x] Select an app icon, press `Enter` → app/folder opens.
- [x] Select an app icon, press `Delete` → app is removed.
- [x] Press `Esc` while context menu is open → it closes.

### Empty states

- [x] Empty folder window shows empty state.
- [x] Empty desktop grid shows "No icons on this desktop."
- [x] Video app without valid URL shows empty state.

### i18n

- [x] Switch language to Vietnamese → desktop renders translated strings where implemented.
- [x] Switch language to Chinese → desktop renders translated strings where implemented.

### Regression

- [x] Existing tenant dock icons (Members, Roles, Settings) still open their windows.
- [x] Layout save on window open/close still works and survives reload.

---

## Phase D — Documentation

- [x] Update this file: check off each passing item above.
- [x] Update `docs/VALIDATION_REPORT.md` with a summary of verified backend + frontend behavior.
- [x] Note any bugs found and whether they were fixed or deferred.

---

## Known limitations / deferred items

- The `desktop:paste` context action is a placeholder (no clipboard implementation).
- `app:rename` and `app:cut/copy` context actions are placeholders.
- Optimistic UI under artificially throttled network is not exercised by the automated suite.
