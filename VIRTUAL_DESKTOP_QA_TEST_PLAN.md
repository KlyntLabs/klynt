# Virtual Desktop — End-to-End QA Test Plan

> Scope: context-menu system, dynamic mini-apps (Markdown / Notes / Video / Folder), drag-drop, persistence, permissions, security, and stress boundaries.
> Environment: local Docker stack exposed via `lvh.me` subdomains.
> Execution: manual browser automation via Kimi WebBridge, supplemented by direct API calls.

---

## 1. Environment & Entry Points

### 1.1 Local domain mapping

`lvh.me` resolves to `127.0.0.1`, so any subdomain works locally without `/etc/hosts` edits.

| Service | URL |
|---|---|
| Frontend (prod Docker build) | `http://app.lvh.me:5174` |
| Backend API | `http://api.lvh.me:3001` |
| Direct backend health | `http://api.lvh.me:3001/health/live` |
| Tenant desktop (slug = `acme-test`) | `http://acme-test.lvh.me:5174/` |

### 1.2 Required env overrides for Docker

Create / update `.env` in the repo root before `docker compose up`:

```bash
# Ports
KLYNT_BACKEND_PORT=3001
KLYNT_FRONTEND_PORT=5174

# Backend must accept requests originating from the lvh.me frontend
KLYNT_API__ALLOWED_ORIGINS='["http://app.lvh.me:5174","http://acme-test.lvh.me:5174","http://lvh.me:5174"]'
VITE_API_BASE_URL=http://api.lvh.me:3001/api/v1
VITE_APP_DOMAIN=lvh.me
VITE_APP_PROTOCOL=http
```

The SPA build also needs `VITE_APP_DOMAIN` and `VITE_APP_PROTOCOL` passed through as Docker build args (`frontend/Dockerfile` and `docker-compose.yml`). Without them the tenant-subdomain router falls back to the marketing desktop and API calls break.

### 1.3 Stack startup verification

- [ ] `docker compose up --build` completes without error.
- [ ] `curl -fsS http://api.lvh.me:3001/health/live` returns `200 OK`.
- [ ] `curl -fsS http://api.lvh.me:3001/health/ready` returns `200 OK`.
- [ ] `curl -I http://app.lvh.me:5174` returns `200 OK` and serves the Vite-built SPA.
- [ ] Browser console has no fatal JS errors on initial load of `http://acme-test.lvh.me:5174/`.

### 1.4 Test account

The seeded Playwright account is reused for local QA:

```
email:    test@klynt.dev
password: TestPass123!
tenant:   acme-test
```

If the DB was not seeded, create the tenant + user via the backend seed script or direct API.

---

## 2. Scope & Priority Tiers

| Priority | Area | Goal |
|---|---|---|
| P0 | Desktop shell + navigation | App loads, menus render, no console errors. |
| P0 | Context menu — desktop background | Create all four app types from right-click. |
| P0 | Mini-apps — open / edit / persist | Markdown, Notes, Video content survives reload. |
| P0 | Folder nesting | Create, open, drag apps in/out, breadcrumb navigation. |
| P1 | Context menu — icon / folder targets | Rename, delete, open, cut/copy/paste behavior. |
| P1 | Keyboard shortcuts | Create, open, delete via keyboard. |
| P1 | Window manager / dock | Dock icons open windows, close, z-order, focus. |
| P2 | Conflict handling | ETag conflict dialog on concurrent edits. |
| P2 | Permissions & visibility | Owner vs admin vs member actions, locked apps. |
| P2 | Security / negative cases | XSS, CSRF, invalid URLs, oversized payloads, 401/403. |
| P3 | Stress & boundaries | Large icon trees, many windows, rapid actions, 256KB content. |
| P3 | i18n & accessibility | Language switching, ARIA roles, focus management. |

---

## 3. Detailed Test Scenarios

### 3.1 Desktop shell & navigation (P0)

- [ ] **LOAD-01**: Navigate to `http://acme-test.lvh.me:5174/` while logged in.
  - Expected: wallpaper, menubar, empty grid, dock icons visible.
- [ ] **LOAD-02**: Load the desktop with a cold cache / incognito window.
  - Expected: no blank screen, loading indicator disappears, fallback empty state shown.
- [ ] **LOAD-03**: Open browser DevTools console and reload.
  - Expected: no `console.error` except expected 401 probes; no uncaught exceptions.
- [ ] **LOAD-04**: Resize viewport to 375×667 and 1920×1080.
  - Expected: layout adapts, no clipped menus, grid remains usable.
- [ ] **LOAD-05**: Refresh page after creating one of each app type.
  - Expected: all icons reappear in the same positions.

### 3.2 Context menu — desktop background (P0)

- [ ] **BG-01**: Right-click on an empty area of the desktop.
  - Expected: context menu appears near cursor with items: New (Folder, Markdown, Notes, Video), Paste, Refresh, Change Background.
- [ ] **BG-02**: Press `Escape` while context menu is open.
  - Expected: menu closes, no action triggered.
- [ ] **BG-03**: Click outside the menu.
  - Expected: menu closes.
- [ ] **BG-04**: Hover over "New" group.
  - Expected: submenu appears with four app types.
- [ ] **BG-05**: Create a folder via `New → Folder`.
  - Expected: dialog opens, after entering title and submitting, folder icon appears in grid.
- [ ] **BG-06**: Create a markdown app via `New → Markdown`.
  - Expected: icon appears, double-click opens markdown editor.
- [ ] **BG-07**: Create a notes app via `New → Notes`.
  - Expected: icon appears, double-click opens notes editor.
- [ ] **BG-08**: Create a video app via `New → Video`.
  - Expected: icon appears, double-click opens video player config.
- [ ] **BG-09**: Submit the new-app dialog with an empty title.
  - Expected: validation error, dialog stays open.
- [ ] **BG-10**: Submit the new-app dialog with a title > 100 characters.
  - Expected: validation error or truncation, no server 500.
- [ ] **BG-11**: Click `Refresh`.
  - Expected: desktop bundle reloads, icons reflect latest server state.
- [ ] **BG-12**: Click `Change Background`.
  - Expected: background picker/preset selector appears; selection persists after reload.

### 3.3 Icon interaction — left click / double-click / selection (P0)

- [ ] **ICON-01**: Single-click a folder icon.
  - Expected: icon becomes selected/highlighted.
- [ ] **ICON-02**: Double-click a folder icon.
  - Expected: navigates into folder, breadcrumb shows `Home > FolderName`.
- [ ] **ICON-03**: Double-click a markdown icon.
  - Expected: window opens with markdown editor and preview.
- [ ] **ICON-04**: Double-click a notes icon.
  - Expected: window opens with notes editor.
- [ ] **ICON-05**: Double-click a video icon.
  - Expected: window opens with video URL input.
- [ ] **ICON-06**: Select an icon and click on empty desktop.
  - Expected: selection clears.

### 3.4 Context menu — icon target (P1)

- [ ] **ICON-CTX-01**: Right-click a folder icon.
  - Expected: menu shows Open, Rename, New Folder inside, Cut, Copy, Delete.
- [ ] **ICON-CTX-02**: Right-click a markdown icon.
  - Expected: menu shows Open, Rename, Duplicate, Delete.
- [ ] **ICON-CTX-03**: Right-click a notes icon.
  - Expected: menu shows Rename, Delete.
- [ ] **ICON-CTX-04**: Right-click a video icon.
  - Expected: menu shows Rename, Delete.
- [ ] **ICON-CTX-05**: Click `Rename` and change the title.
  - Expected: icon label updates, persists after reload.
- [ ] **ICON-CTX-06**: Click `Rename` and submit empty title.
  - Expected: validation error, original name preserved.
- [ ] **ICON-CTX-07**: Click `Delete` on an unlocked app.
  - Expected: confirmation (if any), app removed from grid and DB.
- [ ] **ICON-CTX-08**: Click `Delete` on a locked app as non-admin.
  - Expected: delete option hidden or action rejected with permission error.
- [ ] **ICON-CTX-09**: Click `Duplicate` on a markdown app.
  - Expected: new icon appears with copy suffix, content identical.
- [ ] **ICON-CTX-10**: Cut an icon, then Paste on desktop background.
  - Expected: icon moves (if implemented) or gracefully no-ops.
- [ ] **ICON-CTX-11**: Copy an icon, then Paste.
  - Expected: duplicate created (if implemented) or gracefully no-ops.

### 3.5 Folder nesting & drag-drop (P0/P1)

- [ ] **FOLDER-01**: Create a folder and open it.
  - Expected: empty grid inside, breadcrumb shows folder name.
- [ ] **FOLDER-02**: Create an app inside a folder via background context menu.
  - Expected: app appears only inside the folder, not at root.
- [ ] **FOLDER-03**: Drag a root app into a folder.
  - Expected: app disappears from root, appears inside folder.
- [ ] **FOLDER-04**: Drag an app out of a folder onto root desktop.
  - Expected: app returns to root, disappears from folder.
- [ ] **FOLDER-05**: Drag a folder into another folder.
  - Expected: nested folder supported (if implemented) or rejected gracefully.
- [ ] **FOLDER-06**: Navigate nested folders via breadcrumbs.
  - Expected: each breadcrumb segment is clickable.
- [ ] **FOLDER-07**: Reload page while inside a folder.
  - Expected: restored to root or last folder (consistent behavior).
- [ ] **FOLDER-08**: Delete a folder containing children.
  - Expected: behavior defined — either cascade delete or block with warning.

### 3.6 Markdown app (P0)

- [ ] **MD-01**: Open markdown app, type `# Hello`.
  - Expected: preview renders `<h1>Hello</h1>`.
- [ ] **MD-02**: Type markdown with a link and an image.
  - Expected: link sanitized, image rendered with safe attributes.
- [ ] **MD-03**: Paste HTML/script into markdown editor.
  - Expected: script not executed, raw text or sanitized HTML shown.
- [ ] **MD-04**: Wait for autosave debounce, reload page.
  - Expected: content restored.
- [ ] **MD-05**: Edit concurrently in two tabs.
  - Expected: second save triggers conflict dialog.
- [ ] **MD-06**: Paste content > 256KB.
  - Expected: server rejects with validation error, UI shows error toast.
- [ ] **MD-07**: Export / print actions (if available).
  - Expected: no crash, output contains rendered markdown.

### 3.7 Notes app (P0)

- [ ] **NOTES-01**: Open notes app, type plain text.
  - Expected: text appears, autosave indicator updates.
- [ ] **NOTES-02**: Reload after editing.
  - Expected: content restored exactly.
- [ ] **NOTES-03**: Paste rich text from clipboard.
  - Expected: plain text or safely stripped rich text (no injected scripts).
- [ ] **NOTES-04**: Type very long note.
  - Expected: scrollbar appears, no performance degradation.

### 3.8 Video app (P0)

- [ ] **VIDEO-01**: Open video app, enter `https://example.com/video.mp4`.
  - Expected: `<video>` element visible, src attribute set.
- [ ] **VIDEO-02**: Enter HTTP (not HTTPS) URL.
  - Expected: backend rejects or UI shows validation error; player not created.
- [ ] **VIDEO-03**: Enter `javascript:alert(1)` URL.
  - Expected: rejected, no XSS execution.
- [ ] **VIDEO-04**: Enter non-URL string.
  - Expected: empty state shown.
- [ ] **VIDEO-05**: Enter valid URL, reload page.
  - Expected: URL restored, player reappears.

### 3.9 Keyboard shortcuts (P1)

- [ ] **KB-01**: Press `Ctrl+Shift+n` on desktop.
  - Expected: new-app dialog opens.
- [ ] **KB-02**: With icon selected, press `Enter`.
  - Expected: selected app opens.
- [ ] **KB-03**: With icon selected, press `Delete`.
  - Expected: selected app deleted.
- [ ] **KB-04**: Press `Escape` with dialog open.
  - Expected: dialog closes.
- [ ] **KB-05**: Tab navigation through context menu items.
  - Expected: focus visible, Enter activates item.

### 3.10 Window manager & dock (P1)

- [ ] **WIN-01**: Click `Members` dock icon.
  - Expected: window opens, title contains "Members".
- [ ] **WIN-02**: Click `Roles` dock icon.
  - Expected: window opens.
- [ ] **WIN-03**: Click `Tenant settings` dock icon.
  - Expected: window opens.
- [ ] **WIN-04**: Close a window via X button.
  - Expected: window removed, underlying desktop accessible.
- [ ] **WIN-05**: Open multiple mini-app windows.
  - Expected: windows stack, active window on top.
- [ ] **WIN-06**: Drag a window by title bar.
  - Expected: window moves, position persists (if implemented).
- [ ] **WIN-07**: Resize a window (if supported).
  - Expected: content reflows.

### 3.11 Persistence & conflict handling (P2)

- [ ] **PERS-01**: Create app, edit, reload immediately.
  - Expected: latest content shown.
- [ ] **PERS-02**: Open same app in two browser tabs, edit both.
  - Expected: conflict dialog appears in second saver.
- [ ] **PERS-03**: Accept conflict dialog resolution.
  - Expected: chosen version applied, no data loss.
- [ ] **PERS-04**: Offline / network error during save.
  - Expected: retry indicator, error toast, no silent data loss.

### 3.12 Permissions & multi-tenancy (P2)

- [ ] **PERM-01**: As owner, perform all CRUD actions.
  - Expected: all succeed.
- [ ] **PERM-02**: As non-owner member, attempt to edit an app.
  - Expected: UI disables actions or API returns 403.
- [ ] **PERM-03**: As admin, delete another user's app.
  - Expected: succeeds.
- [ ] **PERM-04**: As admin, delete a locked app.
  - Expected: succeeds.
- [ ] **PERM-05**: Access tenant desktop URL without authentication.
  - Expected: redirect to login.
- [ ] **PERM-06**: Access tenant A's desktop while logged into tenant B.
  - Expected: 403 or redirect.
- [ ] **PERM-07**: Non-existent tenant slug.
  - Expected: 404, friendly error page.

### 3.13 Security & negative cases (P2)

- [ ] **SEC-01**: Context menu injection via `menu_config` JSON.
  - Expected: unknown actions ignored, no script execution.
- [ ] **SEC-02**: XSS in app title.
  - Expected: title rendered as text, not HTML.
- [ ] **SEC-03**: XSS in markdown content.
  - Expected: sanitized by `rehype-sanitize`.
- [ ] **SEC-04**: Video src set to `data:text/html,<script>alert(1)</script>`.
  - Expected: rejected, no alert.
- [ ] **SEC-05**: CSRF: send state-changing request without session token.
  - Expected: 401.
- [ ] **SEC-06**: CSRF: send state-changing request with token in query string.
  - Expected: 401 or rejected.
- [ ] **SEC-07**: SQL injection in title/content.
  - Expected: stored literally, no error.
- [ ] **SEC-08**: Unicode / RTL / emoji titles.
  - Expected: displayed correctly, persisted.
- [ ] **SEC-09**: Rapid double-submit new-app dialog.
  - Expected: single app created, no duplicates.

### 3.14 Stress & boundaries (P3)

- [ ] **STRESS-01**: Create 50 apps on root desktop.
  - Expected: page remains responsive, grid scrolls or paginates.
- [ ] **STRESS-02**: Create 20 nested folders.
  - Expected: breadcrumb handles deep nesting.
- [ ] **STRESS-03**: Open 10 mini-app windows.
  - Expected: no browser crash, z-order works.
- [ ] **STRESS-04**: Paste 256KB into markdown.
  - Expected: explicit validation error.
- [ ] **STRESS-05**: Rapidly create and delete 20 apps.
  - Expected: no race conditions, counts correct.
- [ ] **STRESS-06**: Rapidly switch folders.
  - Expected: no stale content from previous folder.

### 3.15 i18n & accessibility (P3)

- [ ] **I18N-01**: Switch language to Vietnamese.
  - Expected: desktop labels update, no layout breakage.
- [ ] **I18N-02**: Switch language to Chinese.
  - Expected: labels update.
- [ ] **A11Y-01**: Tab through desktop icons.
  - Expected: focus ring visible, Enter opens.
- [ ] **A11Y-02**: Screen reader announces context menu.
  - Expected: menu has `role="menu"`, items have `role="menuitem"`.
- [ ] **A11Y-03**: High contrast / reduced motion (if supported).
  - Expected: no essential information lost.

---

## 4. Execution Workflow

### 4.1 Pre-test reset

Before each major scenario group, reset the tenant desktop to a known state:

```bash
TOKEN=$(curl -s -X POST http://api.lvh.me:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@klynt.dev","password":"TestPass123!"}' | jq -r '.data.access_token')

# Delete all apps
curl -s -H "Authorization: Bearer $TOKEN" \
  http://api.lvh.me:3001/api/v1/tenants/acme-test/desktop | jq '.data.apps[].id' | \
  xargs -I {} curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://api.lvh.me:3001/api/v1/tenants/acme-test/apps/{}

# Reset layout
curl -s -X PUT -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  http://api.lvh.me:3001/api/v1/tenants/acme-test/desktop-layout \
  -d '{"version":1,"background_preset_id":"default","icon_tree":[],"windows":[],"etag":""}'
```

### 4.2 Browser session setup

1. Start Kimi WebBridge daemon.
2. Open `http://acme-test.lvh.me:5174/` in a tab group.
3. Log in via API and inject `session_token` cookie for `.lvh.me`.
4. Take baseline screenshot of empty desktop.

### 4.3 Recording findings

For each failure record:

- Scenario ID
- Steps to reproduce
- Expected vs actual
- Screenshot path
- Console errors / network response
- Severity (blocker / high / medium / low)

---

## 5. Exit Criteria

- [ ] P0 scenarios all pass.
- [ ] No uncaught JS exceptions during P0/P1 runs.
- [ ] No 500-class errors from API during normal usage.
- [ ] Security negative cases are rejected safely.
- [ ] All findings documented in this file or linked issue comments.

---

## 6. Known Risks & Assumptions

- Drag-and-drop is simulated via HTML5 events because pointer events are consumed by the DnD layer.
- `lvh.me` depends on public DNS resolving to `127.0.0.1`; if it fails, use `127.0.0.1.nip.io` as fallback.
- Some cut/copy/paste flows may be partially implemented; document whether they no-op or work.
- Video app backend validation requires HTTPS; test accordingly.

---

## 7. Execution Results

> Run on 2026-07-03 against the local Docker stack (`lvh.me`).
> Test account: `test@klynt.dev` / `TestPass123!` / tenant `acme-test`.
> Browser automation: Kimi WebBridge + direct API calls; Playwright e2e suite for regression.

### 7.1 Environment setup

| Check | Result |
|---|---|
| Docker stack builds and starts | ✅ Pass |
| `api.lvh.me:3001/health/live` | ✅ 200 |
| `api.lvh.me:3001/health/ready` | ✅ 200 |
| `app.lvh.me:5174` SPA served | ✅ 200 |
| `acme-test.lvh.me:5174` desktop loads | ✅ 200 |
| `.env` with `VITE_API_BASE_URL`, `VITE_APP_DOMAIN`, `VITE_APP_PROTOCOL` | ✅ Required |
| `frontend/Dockerfile` + `docker-compose.yml` pass `VITE_APP_DOMAIN`/`VITE_APP_PROTOCOL` build args | ✅ Committed |

### 7.2 Automated regression suites

| Suite | Result |
|---|---|
| Playwright e2e (full `frontend/e2e` suite) | ✅ 18/18 passed |
| Vitest unit tests | ✅ 848/848 passed |

The Playwright suite verified: desktop shell, background context menu, create all four app types, markdown/notes edit and persist, video valid/invalid URLs, drag into/out of folder, keyboard shortcuts, i18n switching, dock icons opening windows, ETag conflict dialogs, admin desktop access, and registration flows.

### 7.3 WebBridge / API spot-checks

| Scenario | Result |
|---|---|
| Desktop renders four seeded icons | ✅ Pass |
| Folder double-click opens empty folder with breadcrumb | ✅ Pass |
| Markdown window opens (editor + preview) | ✅ Pass |
| Notes window opens | ✅ Pass |
| Video window opens, URL input accepts value | ✅ Pass |
| Desktop background context menu shows New / Paste / Refresh / Change Background | ✅ Pass |
| Create folder via context menu | ✅ Pass |
| Delete selected folder via Delete key | ✅ Pass |
| Layout restore after reload (open window reappears) | ✅ Pass |
| Context menu on folder icon shows Open/Rename/New Folder inside/Cut/Copy/Delete | ✅ Pass |
| `Members` dock icon opens permission-guarded window | ✅ Pass |
| `Roles` dock icon opens window and loads role data | ✅ Pass |
| `Tenant settings` dock icon opens window and loads tenant data | ✅ Pass |
| XSS in app title rendered as text | ✅ Pass |
| XSS `<img onerror>` in markdown preview sanitized | ✅ Pass |
| Unauthenticated API calls | ✅ 401 |
| Cross-tenant access (user2 → acme-test) | ✅ 403 |
| CORS from allowed origin (`app.lvh.me:5174`) | ✅ Allowed |
| CORS from disallowed origin (`evil.com`) | ✅ Rejected (no ACAO header) |

### 7.4 Bugs & findings

#### ✅ Resolved — Desktop layout persistence fails with floating-point window coordinates

- **Original issue**: `PUT /api/v1/tenants/acme-test/desktop-layout` returned `422` because `x`/`y` coordinates were sent as floats.
- **Fix**: Rounded layout coordinates to integers in `frontend/src/features/desktop/components/use-desktop-layout-save.ts` before sending.
- **Verification**: Playwright layout tests pass; WebBridge reload restores open windows in the same position.

#### ✅ Resolved — Roles mini-app does not load role data

- **Original issue**: The Roles page used `useParams().slug`, which is empty inside desktop windows, so no tenant slug was available to fetch roles.
- **Fix**: Added `useTenantSlug()` hook that resolves the slug from the hostname for subdomain desktops and falls back to the route param; updated `roles-page.tsx` to use it.
- **Verification**: WebBridge confirms the Roles window lists admin, guest, member, owner with descriptions and permission counts.

#### ✅ Resolved — Tenant settings form fields are empty

- **Original issue**: Same root cause as Roles — `useParams()` returned no slug on the tenant subdomain desktop.
- **Fix**: Updated `tenant-settings-page.tsx` to use `useTenantSlug()`.
- **Verification**: WebBridge confirms the Tenant settings window shows Name "ACME Test Tenant" and Slug "acme-test".

#### ✅ Resolved — Frontend nginx response lacks security headers

- **Original issue**: `curl -I http://app.lvh.me:5174/` returned no security headers.
- **Fix**: Added `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and a CSP `connect-src` directive that allows API calls to `http://api.lvh.me:3001` in `frontend/nginx.conf`.
- **Verification**: `curl -I http://app.lvh.me:5174/` now returns the expected headers.

#### ✅ Resolved — Admin desktop e2e test failed on localhost URL

- **Original issue**: `desktop.spec.ts` navigated to `/admin` on `localhost:5174`, but the app is configured for `lvh.me` subdomains; the cookie was scoped to `localhost` so the admin subdomain redirect lost auth.
- **Fix**: Updated `loginAndSetCookies` helper to scope the cookie to `.lvh.me`, and changed the admin test to navigate to `http://admin.lvh.me:5174/admin`.
- **Verification**: Full Playwright suite passes (18/18).

#### ✅ Resolved — Keyboard shortcuts Playwright test failed after locale reload

- **Original issue**: `beforeEach` reloaded the page after setting `localStorage` language but only waited for the loading spinner to disappear, not for the desktop grid to remount. The shortcut was sent while the React app was still initializing.
- **Fix**: Added `await expect(page.locator('[data-testid="desktop-center-grid"]')).toBeVisible()` after the reload in `virtual-desktop-phase-c.spec.ts`.
- **Verification**: The keyboard-shortcuts test passes in isolation and in the full suite.

#### 🟡 Low — WebBridge synthetic events cannot drive React-controlled textareas

- **Repro**: Use WebBridge `fill` or `evaluate` to type into Notes/Markdown editor.
- **Actual**: Text appears in the DOM but React state is not updated, so autosave does not fire.
- **Note**: This is an automation limitation, not a product bug. Playwright's real input events work correctly and the e2e suite passes.
- **Workaround for WebBridge QA**: Use CDP `Input.dispatchKeyEvent` if trusted input is required, or rely on Playwright for editor persistence tests.

### 7.5 Screenshot inventory

| Path | What it shows |
|---|---|
| `/tmp/klynt-video-url.png` | Video player with `https://example.com/video.mp4` URL |
| `/tmp/klynt-after-close-video.png` | Desktop after closing video window |
| `/tmp/klynt-notes-open.png` | Notes editor window |
| `/tmp/klynt-notes-typed.png` | Notes editor with typed text (React-controlled) |
| `/tmp/klynt-context-menu.png` | Folder context menu |
| `/tmp/klynt-rename-mode.png` | Post-rename-click state |
| `/tmp/klynt-members-window.png` | Members dock window (permission denied) |
| `/tmp/klynt-roles-window.png` | Roles dock window (load error) |
| `/tmp/klynt-tenant-settings.png` | Tenant settings window (empty fields + layout toast) |
| `/tmp/klynt-xss-icon.png` | XSS title rendered as plain text icon |
| `/tmp/klynt-xss-markdown.png` | Markdown XSS sanitized in preview |

### 7.6 Follow-up work

1. Run a dedicated stress test (50 apps, 10 windows, 256KB payload) now that P0/P1 bugs are resolved.
2. Extend Playwright coverage for edge cases: rapid create/delete, deep folder nesting, cross-tenant access.
3. Verify production Coolify deployment with the updated `frontend/nginx.conf` security headers.
4. Monitor for any remaining `useParams()` assumptions on tenant subdomain pages.
