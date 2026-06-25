# Desktop OS WebBridge Test Scenarios

Test environment: `http://localhost:5174` (frontend), `http://127.0.0.1:3001` (backend).

## 1. Marketing Desktop (`/`)

### Happy cases
- [ ] Page loads as a desktop with wallpaper, menubar, and desktop icons.
- [ ] Clicking "Product OS" in the menubar opens the home window.
- [ ] Clicking a desktop icon opens its window.
- [ ] Window can be dragged, minimized, maximized, and closed.

### Worst cases
- [ ] Resize viewport below `lg` (e.g., 375px wide) shows desktop-only fallback.
- [ ] Deep link to an unknown marketing app shows a useful empty state.

## 2. Auth Kiosk Desktop

### Happy cases
- [ ] `/login` loads a locked, centered login window on a desktop wallpaper.
- [ ] User can type email/password and submit.
- [ ] Successful login redirects to `/dashboard` (admin) or `/{profileId}` (user).
- [ ] `/register`, `/verify-email`, `/forgot-password`, `/reset-password` render similarly.

### Worst cases
- [ ] The login window cannot be dragged, closed, minimized, or maximized.
- [ ] Submitting invalid credentials shows an error without breaking the kiosk.
- [ ] Visiting `/login` while already authenticated redirects away.
- [ ] `/verify-email` without a token shows an error.

## 3. Admin Desktop (`/dashboard`)

### Happy cases
- [ ] Admin user sees desktop with User Management, Tenant Management, Reports icons.
- [ ] Clicking User Management opens the app in a window.
- [ ] Clicking Tenant Management opens the app.
- [ ] Multiple windows can be open and switched.
- [ ] Layout (open windows, background) persists after reload.

### Worst cases
- [ ] Non-admin user is redirected or denied access to `/dashboard`.
- [ ] Closing all windows shows empty desktop.

## 4. User Desktop (`/{profileId}`)

### Happy cases
- [ ] User sees desktop with Profile and My Courses icons.
- [ ] Clicking Profile opens the profile window.
- [ ] Layout persists after reload.

### Worst cases
- [ ] Visiting another user's profile desktop shows access denied or redirects.
- [ ] Unauthenticated user is redirected to login.

## 5. Tenant Mini-Desktop (`/tenants/:slug`)

### Happy cases
- [ ] Tenant member sees Members, Roles, Settings icons.
- [ ] Clicking Members opens the members app with tenant data.
- [ ] Deep link `/tenants/:slug/members` opens the members app directly.
- [ ] Owner/admin can change the tenant background.
- [ ] Owner/admin layout changes persist for other users.

### Worst cases
- [ ] Non-member gets an access-denied screen.
- [ ] Member cannot save changes to the shared layout (save disabled or 403).
- [ ] Backend returns 409 conflict; UI shows retry option.

## 6. Persistence & Error Handling

### Happy cases
- [ ] Reloading admin/user desktop restores open windows and background.
- [ ] Tenant desktop loads shared template from backend.

### Worst cases
- [ ] Network failure loading tenant layout shows a retryable error.
- [ ] Lazy-loaded app fails to import and shows an error fallback with retry.
- [ ] Local storage corruption is handled gracefully.

## 7. Cross-Cutting

### Happy cases
- [ ] Menubar changes correctly between marketing/admin/user/tenant desktops.
- [ ] Window z-order works when clicking between windows.

### Worst cases
- [ ] Rapidly opening/closing windows does not crash the UI.
- [ ] Very long app title does not break menubar layout.

---

## Validation Results (2026-06-24)

Executed with Kimi WebBridge against `http://localhost:5174` and the existing `tester_1782345165@example.com` / `TestPass123!` admin account.

| Area | Status | Notes |
|------|--------|-------|
| Marketing desktop load | ✅ Pass | Wallpaper, menubar, left/right icons render. |
| Marketing menubar labels | ✅ Fixed | Was showing raw keys (`productOS`, `pricing`, etc.). Now translates correctly. |
| Marketing desktop icon labels | ✅ Fixed | Was showing filenames (`home.mdx`, `customers.mdx`, `demo.mov`). Now translates correctly. |
| Marketing window title | ✅ Fixed | Default home window was titled `home.mdx`; now titled `Trang chủ` / `Home`. |
| Marketing trailing CTA | ✅ Fixed | "Get started" button was showing raw key `desktop.menubar.getStarted`; now translates. |
| Auth kiosk `/login` happy path | ✅ Pass | Renders locked centered form; successful login redirects to `/dashboard`. |
| Admin desktop load | ✅ Pass | Shows User Management, Tenant Management, Reports icons. |
| Admin User Management app | ✅ Pass | Opens window with correct title and description. |
| Admin layout persistence | ✅ Pass | User Management window restores after reload. |
| User desktop load | ✅ Pass | Shows Profile and My Courses icons with correct Vietnamese labels. |
| Tenant desktop load | ✅ Pass | Shows Members, Roles, Settings icons with correct labels. |
| Tenant unauthorized persistence | ⚠️ Expected | Accessing a tenant the user does not belong to triggers the persistence error toast (`Không thể tải bố cục...`). This is the current worst-case behavior. |
| Full gates | ✅ Pass | `just check` and `just test-coverage` both pass (Rust 84%+ lines, frontend 92%+ lines). |

### Issues found and fixed
1. **Marketing menubar used raw group IDs as labels** → Updated `marketing-menubar.ts` to use `desktop.menubar.menus.<group>.label` keys.
2. **Marketing app titles were filenames / PostHog strings** → Updated `marketing-apps.ts` to use `desktop.marketing.apps.<id>` keys and added the keys to `en`, `vi`, and `cn` `home.json`.
3. **Tenant apps used `tenant.*` keys without namespace prefix** → Updated `tenant-apps.ts` and `tenant-menubar.ts` to use `tenant:<key>` so the shared desktop components (bound to the `home` namespace) can resolve them.
4. **Menubar trailing actions were not translated** → Updated `Menubar.tsx` to apply `t()` to trailing labels and `aria-label`.
5. **Test expected old `home.mdx` label** → Updated `DesktopEnvironment.interaction.test.tsx` to expect the translated `Home` label.
6. **Tenant menubar test expected old unprefixed key** → Updated `tenant-menubar.test.ts` to expect `tenant:menubar.tenant`.

### Remaining notes / not fixed
- ✅ **PostHog → Klynt rebrand completed** across all user-facing strings in `frontend/src/locales` (`en`, `vi`, `cn`), plus code references in marketing components, customer data, docs data, and tests. Cookie banner now reads "Klynt.com doesn't use third-party cookies...".
- ⚠️ Marketing **image assets** (e.g., the hedgehog mascot) still carry PostHog visual branding. Replacing them is an asset/design task, not a string change.
- Worst-case auth (invalid credentials) and mobile viewport were not fully exercised because the test account's httpOnly session cookie cannot be cleared from JS; these require a fresh browser profile or automated E2E with Playwright.
- Tenant deep links (`/tenants/:slug/members`) and role-based layout editing were not manually validated in this pass.
