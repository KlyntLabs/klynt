# OS-Simulator Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder Klynt homepage with a NeoBrutalism OS-simulator landing page (top menu bar, borderless desktop icons, centered hero window) while keeping the implementation CSS-only, accessible, and tested.

**Architecture:** A new `features/home/` feature owns the OS shell components (`os-desktop`, `os-top-bar`, `os-window`, `os-icon`) and the homepage route. A new `home` i18n namespace holds all copy, mirrored across `en`, `vi`, and `cn`. The existing `RootLayout` is made a flex column so the OS desktop can fill the viewport.

**Tech Stack:** React 19, React Router 7, Tailwind CSS v4, i18next, Vitest, axe-core, Lucide icons.

---

## File Structure

New files:

- `frontend/src/locales/en/home.json`
- `frontend/src/locales/vi/home.json`
- `frontend/src/locales/cn/home.json`
- `frontend/src/core/i18n/types.ts` (modify)
- `frontend/src/core/i18n/config.ts` (modify)
- `frontend/src/core/i18n/test-config.ts` (modify)
- `frontend/src/features/home/lib/desktop-apps.ts`
- `frontend/src/features/home/components/os-icon.tsx`
- `frontend/src/features/home/components/os-icon.test.tsx`
- `frontend/src/features/home/components/os-top-bar.tsx`
- `frontend/src/features/home/components/os-top-bar.test.tsx`
- `frontend/src/features/home/components/os-window.tsx`
- `frontend/src/features/home/components/os-window.test.tsx`
- `frontend/src/features/home/components/os-desktop.tsx`
- `frontend/src/features/home/components/os-desktop.test.tsx`
- `frontend/src/features/home/pages/home-page.tsx`
- `frontend/src/features/home/pages/home-page.test.tsx`
- `frontend/src/features/home/pages/home-page.a11y.test.tsx`

Modified files:

- `frontend/src/app/layout/root-layout.tsx`
- `frontend/src/core/routing/route-tree.tsx`

Deleted files:

- `frontend/src/core/routing/home-page.tsx`

---

### Task 1: Add the `home` i18n namespace

**Files:**
- Create: `frontend/src/locales/en/home.json`
- Create: `frontend/src/locales/vi/home.json`
- Create: `frontend/src/locales/cn/home.json`
- Modify: `frontend/src/core/i18n/config.ts`
- Modify: `frontend/src/core/i18n/test-config.ts`
- Modify: `frontend/src/core/i18n/types.ts`

- [ ] **Step 1: Create English namespace**

Create `frontend/src/locales/en/home.json`:

```json
{
  "topBar": {
    "startLabel": "Klynt",
    "windowTitle": "klynt-browser.mdx"
  },
  "hero": {
    "title": "Klynt",
    "subtitle": "The foundation-phase education platform, built like an OS.",
    "body": "Simple tools for teachers, parents, and young learners — no setup, no clutter.",
    "cta": "Get started free"
  },
  "desktop": {
    "navLabel": "Desktop apps",
    "apps": {
      "home": { "label": "Home" },
      "register": { "label": "Register" },
      "dashboard": { "label": "Dashboard" }
    }
  }
}
```

- [ ] **Step 2: Create Vietnamese namespace**

Create `frontend/src/locales/vi/home.json`:

```json
{
  "topBar": {
    "startLabel": "Klynt",
    "windowTitle": "klynt-browser.mdx"
  },
  "hero": {
    "title": "Klynt",
    "subtitle": "Nền tảng giáo dục giai đoạn nền tảng, được xây dựng như một hệ điều hành.",
    "body": "Công cụ đơn giản cho giáo viên, phụ huynh và học sinh nhỏ — không cài đặt, không rườm rà.",
    "cta": "Bắt đầu miễn phí"
  },
  "desktop": {
    "navLabel": "Ứng dụng trên màn hình",
    "apps": {
      "home": { "label": "Trang chủ" },
      "register": { "label": "Đăng ký" },
      "dashboard": { "label": "Bảng điều khiển" }
    }
  }
}
```

- [ ] **Step 3: Create Chinese namespace**

Create `frontend/src/locales/cn/home.json`:

```json
{
  "topBar": {
    "startLabel": "Klynt",
    "windowTitle": "klynt-browser.mdx"
  },
  "hero": {
    "title": "Klynt",
    "subtitle": "基础阶段教育平台，像操作系统一样构建。",
    "body": "为教师、家长和幼儿提供的简单工具——无需设置，没有杂乱。",
    "cta": "免费开始"
  },
  "desktop": {
    "navLabel": "桌面应用",
    "apps": {
      "home": { "label": "首页" },
      "register": { "label": "注册" },
      "dashboard": { "label": "仪表板" }
    }
  }
}
```

- [ ] **Step 4: Register the namespace in the runtime config**

Modify `frontend/src/core/i18n/config.ts` to import the three `home` JSON files and add `home` to `ns` and `resources`.

Full file after change:

```ts
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import cnAuth from "@/locales/cn/auth.json";
import cnCommon from "@/locales/cn/common.json";
import cnErrors from "@/locales/cn/errors.json";
import cnHome from "@/locales/cn/home.json";
import cnUi from "@/locales/cn/ui.json";
import cnValidation from "@/locales/cn/validation.json";
import enAuth from "@/locales/en/auth.json";
import enCommon from "@/locales/en/common.json";
import enErrors from "@/locales/en/errors.json";
import enHome from "@/locales/en/home.json";
import enUi from "@/locales/en/ui.json";
import enValidation from "@/locales/en/validation.json";
import viAuth from "@/locales/vi/auth.json";
import viCommon from "@/locales/vi/common.json";
import viErrors from "@/locales/vi/errors.json";
import viHome from "@/locales/vi/home.json";
import viUi from "@/locales/vi/ui.json";
import viValidation from "@/locales/vi/validation.json";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "./types";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    ns: ["common", "auth", "errors", "ui", "validation", "home"],
    defaultNS: "common",
    resources: {
      en: {
        auth: enAuth,
        common: enCommon,
        errors: enErrors,
        home: enHome,
        ui: enUi,
        validation: enValidation,
      },
      vi: {
        auth: viAuth,
        common: viCommon,
        errors: viErrors,
        home: viHome,
        ui: viUi,
        validation: viValidation,
      },
      cn: {
        auth: cnAuth,
        common: cnCommon,
        errors: cnErrors,
        home: cnHome,
        ui: cnUi,
        validation: cnValidation,
      },
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "klynt-language",
    },
    interpolation: {
      escapeValue: true,
    },
  });

export default i18n;
```

- [ ] **Step 5: Register the namespace in the test config**

Modify `frontend/src/core/i18n/test-config.ts` the same way.

Full file after change:

```ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import cnAuth from "@/locales/cn/auth.json";
import cnCommon from "@/locales/cn/common.json";
import cnErrors from "@/locales/cn/errors.json";
import cnHome from "@/locales/cn/home.json";
import cnUi from "@/locales/cn/ui.json";
import cnValidation from "@/locales/cn/validation.json";
import enAuth from "@/locales/en/auth.json";
import enCommon from "@/locales/en/common.json";
import enErrors from "@/locales/en/errors.json";
import enHome from "@/locales/en/home.json";
import enUi from "@/locales/en/ui.json";
import enValidation from "@/locales/en/validation.json";
import viAuth from "@/locales/vi/auth.json";
import viCommon from "@/locales/vi/common.json";
import viErrors from "@/locales/vi/errors.json";
import viHome from "@/locales/vi/home.json";
import viUi from "@/locales/vi/ui.json";
import viValidation from "@/locales/vi/validation.json";

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  ns: ["common", "auth", "errors", "ui", "validation", "home"],
  defaultNS: "common",
  resources: {
    en: {
      common: enCommon,
      auth: enAuth,
      errors: enErrors,
      home: enHome,
      ui: enUi,
      validation: enValidation,
    },
    vi: {
      common: viCommon,
      auth: viAuth,
      errors: viErrors,
      home: viHome,
      ui: viUi,
      validation: viValidation,
    },
    cn: {
      common: cnCommon,
      auth: cnAuth,
      errors: cnErrors,
      home: cnHome,
      ui: cnUi,
      validation: cnValidation,
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
```

- [ ] **Step 6: Add `home` to the TypeScript i18n types**

Modify `frontend/src/core/i18n/types.ts` to import `home` and include it in `CustomTypeOptions.resources`.

Full file after change:

```ts
import "i18next";
import type auth from "@/locales/en/auth.json";
import type common from "@/locales/en/common.json";
import type errors from "@/locales/en/errors.json";
import type home from "@/locales/en/home.json";
import type ui from "@/locales/en/ui.json";
import type validation from "@/locales/en/validation.json";

export type SupportedLanguage = "en" | "vi" | "cn";
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["en", "vi", "cn"];
export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof common;
      auth: typeof auth;
      errors: typeof errors;
      home: typeof home;
      ui: typeof ui;
      validation: typeof validation;
    };
  }
}
```

- [ ] **Step 7: Run the i18n tests**

Run:

```bash
npx vitest run frontend/src/core/i18n/i18n.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/locales/en/home.json frontend/src/locales/vi/home.json frontend/src/locales/cn/home.json frontend/src/core/i18n/config.ts frontend/src/core/i18n/test-config.ts frontend/src/core/i18n/types.ts
git commit -m "i18n: add home namespace for OS-simulator homepage"
```

---

### Task 2: Create the desktop apps config

**Files:**
- Create: `frontend/src/features/home/lib/desktop-apps.ts`

- [ ] **Step 1: Write the config**

Create `frontend/src/features/home/lib/desktop-apps.ts`:

```ts
import { Home, LayoutDashboard, UserPlus } from "lucide-react";
import { routePaths } from "@/core/routing/route-paths";
import type { LucideIcon } from "lucide-react";

export interface DesktopApp {
  id: string;
  labelKey: "desktop.apps.home.label" | "desktop.apps.register.label" | "desktop.apps.dashboard.label";
  icon: LucideIcon;
  route: string;
}

export const desktopApps: DesktopApp[] = [
  {
    id: "home",
    labelKey: "desktop.apps.home.label",
    icon: Home,
    route: routePaths.home,
  },
  {
    id: "register",
    labelKey: "desktop.apps.register.label",
    icon: UserPlus,
    route: routePaths.register,
  },
  {
    id: "dashboard",
    labelKey: "desktop.apps.dashboard.label",
    icon: LayoutDashboard,
    route: routePaths.dashboard,
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/home/lib/desktop-apps.ts
git commit -m "feat(home): add desktop apps config"
```

---

### Task 3: Build the `OsIcon` component

**Files:**
- Create: `frontend/src/features/home/components/os-icon.tsx`
- Create: `frontend/src/features/home/components/os-icon.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/home/components/os-icon.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { Home } from "lucide-react";
import { routePaths } from "@/core/routing/route-paths";
import { render } from "@/test/render";
import { OsIcon } from "./os-icon";

describe("OsIcon", () => {
  it("renders a labelled link to the given route", () => {
    render(<OsIcon to={routePaths.register} icon={Home} label="Register" />);

    const link = screen.getByRole("link", { name: "Register" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", routePaths.register);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest run frontend/src/features/home/components/os-icon.test.tsx
```

Expected: FAIL because `os-icon.tsx` does not exist.

- [ ] **Step 3: Implement the component**

Create `frontend/src/features/home/components/os-icon.tsx`:

```tsx
import { Link } from "react-router-dom";
import { cn, focusRing } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface OsIconProps {
  to: string;
  icon: LucideIcon;
  label: string;
}

export function OsIcon({ to, icon: Icon, label }: OsIconProps) {
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center gap-1 rounded p-2 text-center text-foreground transition-transform hover:-translate-y-1",
        focusRing,
      )}
    >
      <Icon aria-hidden="true" className="h-8 w-8" />
      <span className="text-xs font-bold">{label}</span>
    </Link>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx vitest run frontend/src/features/home/components/os-icon.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/home/components/os-icon.tsx frontend/src/features/home/components/os-icon.test.tsx
git commit -m "feat(home): add OsIcon component"
```

---

### Task 4: Build the `OsTopBar` component

**Files:**
- Create: `frontend/src/features/home/components/os-top-bar.tsx`
- Create: `frontend/src/features/home/components/os-top-bar.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/home/components/os-top-bar.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { routePaths } from "@/core/routing/route-paths";
import { render } from "@/test/render";
import { OsTopBar } from "./os-top-bar";

describe("OsTopBar", () => {
  it("renders the start link and window title", () => {
    render(<OsTopBar windowTitle="klynt-browser.mdx" />);

    expect(screen.getByRole("link", { name: "Klynt" })).toHaveAttribute("href", routePaths.home);
    expect(screen.getByText("klynt-browser.mdx")).toBeInTheDocument();
    expect(screen.getByText(/\d{1,2}:\d{2}/u)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest run frontend/src/features/home/components/os-top-bar.test.tsx
```

Expected: FAIL because `os-top-bar.tsx` does not exist.

- [ ] **Step 3: Implement the component**

Create `frontend/src/features/home/components/os-top-bar.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { routePaths } from "@/core/routing/route-paths";
import { cn, focusRing, hardShadowActive } from "@/lib/utils";

interface OsTopBarProps {
  windowTitle: string;
}

export function OsTopBar({ windowTitle }: OsTopBarProps) {
  const { t } = useTranslation("home");
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "numeric",
  }).format(new Date());

  return (
    <div className="flex h-10 items-center gap-3 border-b-2 border-border bg-primary px-3 text-primary-foreground">
      <Link
        to={routePaths.home}
        className={cn(
          "rounded bg-background px-2 py-0.5 text-sm font-bold text-foreground shadow-hard-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none",
          hardShadowActive,
          focusRing,
        )}
      >
        {t("topBar.startLabel")}
      </Link>
      <span className="flex-1 truncate text-center text-sm font-bold">{windowTitle}</span>
      <span aria-live="polite" className="text-xs font-bold">
        {time}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx vitest run frontend/src/features/home/components/os-top-bar.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/home/components/os-top-bar.tsx frontend/src/features/home/components/os-top-bar.test.tsx
git commit -m "feat(home): add OsTopBar component"
```

---

### Task 5: Build the `OsWindow` component

**Files:**
- Create: `frontend/src/features/home/components/os-window.tsx`
- Create: `frontend/src/features/home/components/os-window.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/home/components/os-window.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@/test/render";
import { OsWindow } from "./os-window";

describe("OsWindow", () => {
  it("renders the title bar and content", () => {
    render(<OsWindow title="klynt-browser.mdx">Hello Klynt</OsWindow>);

    expect(screen.getByText("klynt-browser.mdx")).toBeInTheDocument();
    expect(screen.getByText("Hello Klynt")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest run frontend/src/features/home/components/os-window.test.tsx
```

Expected: FAIL because `os-window.tsx` does not exist.

- [ ] **Step 3: Implement the component**

Create `frontend/src/features/home/components/os-window.tsx`:

```tsx
import { cn } from "@/lib/utils";

interface OsWindowProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function OsWindow({ title, children, className }: OsWindowProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border-2 border-border bg-card text-card-foreground shadow-hard",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b-2 border-border bg-primary px-3 py-2">
        <span className="h-3.5 w-3.5 rounded-full border-2 border-border bg-background" />
        <span className="h-3.5 w-3.5 rounded-full border-2 border-border bg-background" />
        <span className="h-3.5 w-3.5 rounded-full border-2 border-border bg-background" />
        <span className="flex-1 truncate text-center text-sm font-bold text-primary-foreground">
          {title}
        </span>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx vitest run frontend/src/features/home/components/os-window.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/home/components/os-window.tsx frontend/src/features/home/components/os-window.test.tsx
git commit -m "feat(home): add OsWindow component"
```

---

### Task 6: Build the `OsDesktop` component

**Files:**
- Create: `frontend/src/features/home/components/os-desktop.tsx`
- Create: `frontend/src/features/home/components/os-desktop.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/features/home/components/os-desktop.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@/test/render";
import { OsDesktop } from "./os-desktop";

describe("OsDesktop", () => {
  it("renders the top bar, desktop icons, and content", () => {
    render(
      <OsDesktop windowTitle="klynt-browser.mdx">
        <p>Hero content</p>
      </OsDesktop>,
    );

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register" })).toBeInTheDocument();
    expect(screen.getByText("Hero content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest run frontend/src/features/home/components/os-desktop.test.tsx
```

Expected: FAIL because `os-desktop.tsx` does not exist.

- [ ] **Step 3: Implement the component**

Create `frontend/src/features/home/components/os-desktop.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import { desktopApps } from "../lib/desktop-apps";
import { OsIcon } from "./os-icon";
import { OsTopBar } from "./os-top-bar";

interface OsDesktopProps {
  windowTitle: string;
  children: React.ReactNode;
}

export function OsDesktop({ windowTitle, children }: OsDesktopProps) {
  const { t } = useTranslation("home");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-secondary">
      <OsTopBar windowTitle={windowTitle} />
      <div className="relative flex flex-1">
        <nav
          aria-label={t("desktop.navLabel")}
          className="absolute left-2 top-2 flex flex-col gap-1 md:left-4 md:top-4"
        >
          {desktopApps.map((app) => (
            <OsIcon key={app.id} to={app.route} icon={app.icon} label={t(app.labelKey)} />
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-center p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx vitest run frontend/src/features/home/components/os-desktop.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/home/components/os-desktop.tsx frontend/src/features/home/components/os-desktop.test.tsx
git commit -m "feat(home): add OsDesktop shell component"
```

---

### Task 7: Make `RootLayout` a flex column

**Files:**
- Modify: `frontend/src/app/layout/root-layout.tsx`

The OS desktop needs to fill the viewport below the global header. Convert the root layout to a flex column and let `<main>` grow.

- [ ] **Step 1: Modify the layout**

Edit `frontend/src/app/layout/root-layout.tsx`:

```tsx
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLocation } from "react-router-dom";
import { SkipLink } from "@/core/a11y/skip-link";
import { LanguageSwitcher } from "@/core/i18n/language-switcher";
import { routePaths } from "@/core/routing/route-paths";
import { useFocusOnRouteChange } from "@/core/routing/use-focus-on-route-change";

const MAIN_ID = "main-content";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      aria-current={isActive ? "page" : undefined}
      className="hover:underline aria-[current=page]:font-semibold"
    >
      {children}
    </Link>
  );
}

export function RootLayout() {
  const { t } = useTranslation("common");
  const mainRef = useRef<HTMLElement>(null);
  useFocusOnRouteChange(mainRef);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SkipLink targetId={MAIN_ID} />
      <header className="border-b px-6 py-4">
        <nav className="flex items-center gap-4" aria-label={t("nav.home")}>
          <NavLink to={routePaths.home}>{t("nav.home")}</NavLink>
          <NavLink to={routePaths.dashboard}>{t("nav.dashboard")}</NavLink>
          <NavLink to={routePaths.register}>{t("nav.register")}</NavLink>
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </nav>
      </header>
      <main
        id={MAIN_ID}
        ref={mainRef}
        tabIndex={-1}
        className="flex flex-1 flex-col outline-none"
      >
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Run layout tests**

Run:

```bash
npx vitest run frontend/src/app/layout/root-layout.test.tsx
```

If the file does not exist, run the full test suite for the affected area:

```bash
npx vitest run
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/layout/root-layout.tsx
git commit -m "feat(layout): make root layout a flex column"
```

---

### Task 8: Build the new `HomePage`

**Files:**
- Create: `frontend/src/features/home/pages/home-page.tsx`
- Create: `frontend/src/features/home/pages/home-page.test.tsx`
- Create: `frontend/src/features/home/pages/home-page.a11y.test.tsx`
- Delete: `frontend/src/core/routing/home-page.tsx`
- Modify: `frontend/src/core/routing/route-tree.tsx`

- [ ] **Step 1: Write the failing page test**

Create `frontend/src/features/home/pages/home-page.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@/test/render";
import HomePage from "./home-page";

describe("HomePage", () => {
  it("renders the OS simulator hero", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "Klynt" })).toBeInTheDocument();
    expect(screen.getByText("The foundation-phase education platform, built like an OS.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get started free" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Write the failing a11y test**

Create `frontend/src/features/home/pages/home-page.a11y.test.tsx`:

```tsx
import { run } from "axe-core";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import HomePage from "./home-page";

describe("HomePage accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(<HomePage />);
    const results = await run(container);
    expect(results.violations).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run:

```bash
npx vitest run frontend/src/features/home/pages/home-page.test.tsx frontend/src/features/home/pages/home-page.a11y.test.tsx
```

Expected: FAIL because `home-page.tsx` does not exist.

- [ ] **Step 4: Implement the new homepage**

Create `frontend/src/features/home/pages/home-page.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/core/ui/button";
import { routePaths } from "@/core/routing/route-paths";
import { OsDesktop } from "../components/os-desktop";
import { OsWindow } from "../components/os-window";

export default function HomePage() {
  const { t } = useTranslation("home");
  const navigate = useNavigate();

  return (
    <OsDesktop windowTitle={t("topBar.windowTitle")}>
      <OsWindow title={t("topBar.windowTitle")} className="w-full max-w-2xl">
        <h1 className="mb-2 text-4xl font-extrabold text-card-foreground">{t("hero.title")}</h1>
        <p className="mb-2 text-lg font-bold text-card-foreground">{t("hero.subtitle")}</p>
        <p className="mb-6 text-card-foreground">{t("hero.body")}</p>
        <Button
          onClick={() => navigate(routePaths.register)}
          size="lg"
        >
          {t("hero.cta")}
        </Button>
      </OsWindow>
    </OsDesktop>
  );
}
```

- [ ] **Step 5: Update the route tree import**

Modify `frontend/src/core/routing/route-tree.tsx`:

```tsx
const HomePage = lazy(() => import("@/features/home/pages/home-page"));
```

Remove or replace the old import:

```tsx
// DELETE this line:
const HomePage = lazy(() => import("./home-page"));
```

- [ ] **Step 6: Delete the old homepage**

Run:

```bash
rm frontend/src/core/routing/home-page.tsx
```

- [ ] **Step 7: Run the page tests**

Run:

```bash
npx vitest run frontend/src/features/home/pages/home-page.test.tsx frontend/src/features/home/pages/home-page.a11y.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/home/pages/home-page.tsx frontend/src/features/home/pages/home-page.test.tsx frontend/src/features/home/pages/home-page.a11y.test.tsx frontend/src/core/routing/route-tree.tsx
git rm frontend/src/core/routing/home-page.tsx
git commit -m "feat(home): implement OS-simulator homepage"
```

---

### Task 9: Quality gates

- [ ] **Step 1: Run the frontend typecheck**

```bash
cd frontend && npm run typecheck
```

Expected: no errors.

- [ ] **Step 2: Run the frontend linter/formatter check**

```bash
cd frontend && npm run check
```

Expected: no errors.

- [ ] **Step 3: Run the frontend test suite with coverage**

```bash
cd frontend && npm run test:coverage
```

Expected: all tests pass and coverage remains above the project threshold.

- [ ] **Step 4: Run the production build**

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit any fixes**

If any gate produced fixes, commit them:

```bash
git add -A
git commit -m "fix(home): address typecheck/lint/build findings"
```

---

## Self-Review

- **Spec coverage:**
  - NeoBrutalism OS visual style → Task 3-6 use existing hard-shadow tokens and primary/accent colors.
  - Top menu bar → Task 4.
  - Borderless desktop icons → Task 3.
  - Centered hero window → Task 5 + Task 8.
  - Plain light-grey background → Task 6 uses `bg-secondary`.
  - i18n in `en`/`vi`/`cn` → Task 1.
  - Links to Home, Register, Dashboard → Task 2 config + Task 3 icons.
  - Responsive behavior → Task 6 uses absolute icon dock and centered main; Task 7 flex layout.
  - Accessibility → focus rings, nav label, a11y test in Task 8.
  - Testing → tests included in each component task and a11y test for the page.
- **Placeholder scan:** No TBD/TODO/fill-in sections. Every step has exact file paths and complete code.
- **Type consistency:** `DesktopApp.labelKey` uses the exact keys present in `home.json`. `useTranslation("home")` is used consistently. The `home` namespace is registered in runtime, test, and type configs.
