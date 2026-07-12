# Astryx Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install Astryx (`@astryxdesign/core`) as Klynt's design-system dependency, wire its theme and SPA-aware link provider, delete unused shadcn primitives, relocate the components Klynt keeps owning, and update agent docs — leaving the app visually unchanged and CI green, ready for per-feature migration.

**Architecture:** Astryx ships prebuilt CSS and precompiled StyleX class names, so it coexists with the existing Tailwind 4 setup through an explicit `@layer` cascade and a token bridge. A `defineTheme` theme seeded from the Klynt brand orange replaces the ad-hoc `--color-brand*` tokens. Astryx's `Theme` provider takes over dark mode via `data-theme` on `<html>`; a one-line `@custom-variant` change re-points the existing 20 files of `dark:` variants at it. No Astryx components are rendered in feature code yet — this plan only establishes the foundation.

**Tech Stack:** React 19, Vite 8, Tailwind CSS 4 (`@tailwindcss/vite`), TypeScript 6, React Router 7, Vitest 4, Playwright, Bun 1.3, Biome. New: `@astryxdesign/core`, `@stylexjs/stylex`, `@astryxdesign/cli`.

## Global Constraints

Copied verbatim from the spec and repo. Every task's requirements implicitly include this section.

- **Exact version pins.** `@astryxdesign/*` and `@stylexjs/stylex` are added with `bun add --exact` — no caret. Under `0.x`, minor releases may break. Bumps are deliberate commits.
- **File size ≤ 300 lines.** Lefthook enforces `frontend/scripts/check-file-size.sh` on staged `frontend/src/**/*.{ts,tsx,js,jsx,css}`. Split rather than raise the limit.
- **i18n order.** User-facing strings use namespaces (`common`, `auth`, `errors`, `ui`, `validation`); add keys to `en` first, then mirror in `vi` and `cn`. (No new strings expected in this plan; the constraint applies if any appear.)
- **Coverage gate** (`frontend/vitest.config.ts`): lines 92, statements 92, functions 87, branches 73. Do not lower without a written justification recorded in the plan changelog and the PR.
- **Commands run from `frontend/`** unless stated. Use `bun`, not `npm`/`pnpm`.
- **Commit trailer.** End every commit message with:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- **Node ≥ 22.13** required by `@astryxdesign/cli` (the environment has v26 — fine).

## File Structure

**Created:**
- `frontend/src/theme/klynt-theme.ts` — the `defineTheme` theme object seeded from `#f76e18`. One responsibility: theme definition.
- `frontend/src/theme/klynt-theme.css` — generated token CSS (via `astryx theme build`) OR omitted if runtime injection is used (see Task 6). Committed if generated.
- `frontend/src/app/router-link.tsx` — `RouterLink`, the adapter mapping Astryx's `href` prop to React Router's `to`. One responsibility: link interop.
- `frontend/src/components/glass-panel.tsx`, `frontend/src/components/scroll-area.tsx`, `frontend/src/components/form.tsx` — relocated Klynt-owned components (moved from `ui/`).
- Their co-located test/story files move alongside them.

**Modified:**
- `frontend/src/index.css` — cascade reorder, Astryx imports, `dark` variant flip, `.dark` block and `--color-brand*` removal.
- `frontend/src/app/providers/index.tsx` — add `<Theme>` and `<LinkProvider>`.
- `frontend/package.json` — add Astryx deps, drop orphaned deps.
- `frontend/vitest.config.ts` — only if the gate decision in Task 1 requires it.
- `.github/dependabot.yml` — ignore rule for `@astryxdesign/*`.
- `AGENTS.md` — Component Vocabulary section, stack table, architecture note.
- Import paths in the 13 files consuming the relocated components.

**Deleted (dead — zero non-test consumers, verified):**
- `ui/chart.tsx`, `ui/chart-context.tsx`, `ui/chart-tooltip-content.tsx`, `ui/input-otp.tsx`, `ui/menubar.tsx`, `ui/drawer.tsx`, `ui/carousel.tsx`, `ui/sheet.tsx`, `ui/sidebar/` — plus every co-located `.test.tsx`, `.a11y.test.tsx`, `.interaction.test.tsx`, `.stories.tsx`. `sheet` and `sidebar` are dead as a pair: `sheet` is imported only by `sidebar`, and nothing outside `ui/` imports `sidebar`.

---

## Task 1: Measure coverage and install Astryx dependencies

Combined because the measurement is what decides whether the install PR must also touch the coverage gate — a reviewer evaluates them together.

**Files:**
- Modify: `frontend/package.json`
- Modify (only if gate decision requires): `frontend/vitest.config.ts`
- Produce: a measurement note pasted into the PR description and appended to this plan's changelog.

**Interfaces:**
- Produces: installed `@astryxdesign/core`, `@stylexjs/stylex`, `@astryxdesign/cli` at pinned exact versions; a recorded baseline + end-state coverage projection; the working `docs.mjs` command later tasks and `AGENTS.md` reference.

- [ ] **Step 1: Record the coverage baseline**

Run (from `frontend/`):
```bash
bun run test:coverage 2>&1 | tail -25
```
Expected: a coverage table and PASS. Record the `% Lines` and `% Stmts` totals — call this the baseline.

- [ ] **Step 2: Compute the end-state projection**

The full migration eventually deletes all of `src/components/ui/`. Measure what coverage would be with that directory's tests gone, so the strategic gate decision is made on data, not guesswork:
```bash
bunx vitest run --coverage --coverage.exclude='src/components/ui/**' 2>&1 | tail -25
```
Expected: a coverage table. Record `% Lines` / `% Stmts` — call this the projection.

- [ ] **Step 3: Decide the gate**

Write one of these decisions into the PR description and this plan's changelog:
- Projection ≥ 92 → "Hold gate at 92."
- Projection < 92 → "Gate at risk: projection is N%. Phase 1 deletes only dead primitives (small impact); re-measure in Task 4. Backfill or adjust deferred to the feature that first breaches the gate." Do **not** lower the gate in this task.

No `vitest.config.ts` change is expected in Phase 1 — only the dead primitives are deleted here, and they are re-measured in Task 4.

- [ ] **Step 4: Install the dependencies (exact pins)**

Run (from `frontend/`):
```bash
bun add --exact @astryxdesign/core@0.1.4 @stylexjs/stylex
bun add --exact --dev @astryxdesign/cli@0.1.4
```
Then pin StyleX exactly: open `package.json`, confirm `@stylexjs/stylex` has no `^`. If it does, replace with the resolved exact version bun installed (read it from the same line, e.g. `"@stylexjs/stylex": "0.18.3"`).

- [ ] **Step 5: Verify the toolchain and docs CLI work**

Run (from `frontend/`):
```bash
bun run typecheck && bun run build
node node_modules/@astryxdesign/core/docs.mjs --list --brief | head -5
node node_modules/@astryxdesign/core/docs.mjs Button | head -5
```
Expected: typecheck and build PASS (nothing imports Astryx yet, so no behavior change); the `docs.mjs` calls print a component catalog and a Button page. If `docs.mjs` errors, stop — the agent-docs goal depends on it.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/bun.lock
git commit -m "$(cat <<'EOF'
build(frontend): add Astryx design-system dependencies (pinned exact)

Adds @astryxdesign/core, @stylexjs/stylex (required peer), and the
@astryxdesign/cli dev dep at exact versions — no caret, since 0.x minors
may break. Nothing imports Astryx yet; build and typecheck unaffected.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Relocate the three Klynt-owned components out of `ui/`

Moving these before any deletion keeps `ui/` converging toward "everything here is dead". Pure move + import rewrite; no behavior change.

**Files:**
- Move: `ui/glass-panel.tsx` → `src/components/glass-panel.tsx` (and its `.stories.tsx` / test files)
- Move: `ui/scroll-area.tsx` → `src/components/scroll-area.tsx` (and co-located tests/stories)
- Move: `ui/form.tsx` → `src/components/form.tsx` (and co-located tests/stories)
- Modify: import paths in these consumers —
  - glass-panel: `src/features/desktop/components/Menubar.tsx`, `src/features/desktop/components/menubar/user-menu.tsx`, `src/features/desktop/components/menubar/menu-dropdown.tsx`
  - scroll-area: `src/features/marketing/pages/CommunityPage.tsx`, `AboutPage.tsx`, `TrashPage.tsx`
  - form: `src/features/tenant/pages/tenant-settings-page.tsx`, `src/features/auth/components/{register,reset-password,forgot-password,login,join-tenant}-form.tsx`, `src/features/marketing/components/contact/ContactForm.tsx`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `@/components/glass-panel`, `@/components/scroll-area`, `@/components/form` as the new import paths. `form.tsx` continues to import `@/components/ui/label` unchanged (label migrates in a later feature phase).

- [ ] **Step 1: Move the files with git**

Run (from `frontend/`), moving each component plus every co-located `*.stories.tsx`, `*.test.tsx`, `*.a11y.test.tsx`, `*.interaction.test.tsx` that shares its basename:
```bash
git mv src/components/ui/glass-panel.tsx src/components/glass-panel.tsx
git mv src/components/ui/scroll-area.tsx src/components/scroll-area.tsx
git mv src/components/ui/form.tsx src/components/form.tsx
# repeat git mv for any glass-panel.*/scroll-area.*/form.* sibling test & story files
ls src/components/ui/{glass-panel,scroll-area,form}.* 2>/dev/null   # should print nothing
```

- [ ] **Step 2: Rewrite consumer imports**

Run (from `frontend/`):
```bash
grep -rl "@/components/ui/glass-panel" src | xargs sed -i '' 's#@/components/ui/glass-panel#@/components/glass-panel#g'
grep -rl "@/components/ui/scroll-area" src | xargs sed -i '' 's#@/components/ui/scroll-area#@/components/scroll-area#g'
grep -rl "@/components/ui/form"        src | xargs sed -i '' 's#@/components/ui/form#@/components/form#g'
```
Then, inside the moved files themselves, fix any self-relative or sibling `@/components/ui/...` import that pointed at a now-different depth — except `@/components/ui/label` in `form.tsx`, which stays. Verify:
```bash
grep -rn "@/components/ui/\(glass-panel\|scroll-area\|form\)\b" src   # should print nothing
```

- [ ] **Step 3: Verify typecheck and tests pass**

Run (from `frontend/`):
```bash
bun run typecheck && bun run test 2>&1 | tail -15
```
Expected: PASS. The moved test files run from their new location; no assertion changes.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(frontend): move Klynt-owned UI out of components/ui

glass-panel, scroll-area, and form have no Astryx equivalent and stay
Klynt-owned. Relocating them to src/components/ keeps components/ui/ on a
path to holding only shadcn primitives slated for Astryx replacement.
Pure move; no behavior change.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Delete dead shadcn primitives and drop orphaned dependencies

**Files:**
- Delete: `ui/chart.tsx`, `ui/chart-context.tsx`, `ui/chart-tooltip-content.tsx`, `ui/input-otp.tsx`, `ui/menubar.tsx`, `ui/drawer.tsx`, `ui/carousel.tsx`, `ui/sheet.tsx`, `ui/sidebar/` (whole dir) — and every co-located test/story file.
- Modify: `frontend/package.json` — remove `recharts`, `vaul`, `embla-carousel-react`, `input-otp`.

**Interfaces:**
- Consumes: nothing.
- Produces: a smaller `ui/` and dependency set. No new exports.

- [ ] **Step 1: Re-confirm each target is dead**

Run (from `frontend/`) — every line must print `0`:
```bash
for c in chart chart-context chart-tooltip-content input-otp menubar drawer carousel sheet sidebar; do
  n=$(grep -rl "components/ui/$c\b" src --include='*.tsx' --include='*.ts' \
      | grep -v "components/ui/$c" | grep -vE '\.test\.|\.a11y\.|\.interaction\.|\.stories\.' | wc -l | tr -d ' ')
  echo "$c: $n"
done
```
If any is non-zero, stop and reconcile — the spec assumed dead; the code disagrees.

- [ ] **Step 2: Delete the files**

```bash
git rm src/components/ui/chart.tsx src/components/ui/chart-context.tsx src/components/ui/chart-tooltip-content.tsx \
       src/components/ui/input-otp.tsx src/components/ui/menubar.tsx src/components/ui/drawer.tsx \
       src/components/ui/carousel.tsx src/components/ui/sheet.tsx
git rm -r src/components/ui/sidebar
# delete co-located tests/stories for the single-file primitives:
git rm src/components/ui/{chart,input-otp,menubar,drawer,carousel,sheet}.{stories.tsx,test.tsx,a11y.test.tsx,interaction.test.tsx} 2>/dev/null || true
```

- [ ] **Step 3: Drop orphaned dependencies**

Run (from `frontend/`):
```bash
bun remove recharts vaul embla-carousel-react input-otp
```

- [ ] **Step 4: Verify nothing broke and re-measure coverage**

Run (from `frontend/`):
```bash
bun run typecheck && bun run build && bun run test:coverage 2>&1 | tail -25
```
Expected: PASS, coverage still ≥ gate. If coverage dropped below 92, apply the Task 1 decision: the deleted primitives were well-tested, so a dip is possible — backfill app-level tests until green, or record a justified gate change in the changelog + PR. Do not silently lower the gate.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore(frontend): delete unused shadcn primitives and orphaned deps

chart, input-otp, menubar, drawer, carousel, and the sheet/sidebar pair
have zero non-test consumers — dead scaffolding. Removing them drops
recharts, vaul, embla-carousel-react, and input-otp.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Define the Klynt theme

**Files:**
- Create: `frontend/src/theme/klynt-theme.ts`
- Create (conditional): `frontend/src/theme/klynt-theme.css`

**Interfaces:**
- Consumes: `defineTheme` from `@astryxdesign/core/theme` (Task 1).
- Produces: `export const klyntTheme` — a `DefinedTheme` consumed by `<Theme theme={klyntTheme}>` in Task 6. If a built CSS file is produced, its path is `@/theme/klynt-theme.css`, imported by `index.css` in Task 5.

- [ ] **Step 1: Write the theme definition**

Create `frontend/src/theme/klynt-theme.ts`:
```ts
import { defineTheme } from "@astryxdesign/core/theme";

/**
 * Klynt's Astryx theme. The color scale is derived from the brand orange
 * via Astryx's HCT model; explicit `tokens` entries override where the
 * derivation is wrong. Keep this the single source of brand token truth —
 * the old --color-brand* custom properties were removed from index.css.
 */
export const klyntTheme = defineTheme({
  name: "klynt",
  color: { accent: "#f76e18" },
  tokens: {
    // Add [light, dark] tuple overrides here only when the HCT-derived
    // value is visibly wrong. Start empty; refine during marketing migration.
  },
});
```

- [ ] **Step 2: Typecheck the theme in isolation**

Run (from `frontend/`):
```bash
bun run typecheck
```
Expected: PASS. If `defineTheme`'s input type rejects `color: { accent }`, consult `node node_modules/@astryxdesign/core/docs.mjs` and `npx astryx docs theme`, and adjust to the documented shape. The theme is not yet imported anywhere, so this only validates the object.

- [ ] **Step 3: Attempt to precompile the theme to CSS (avoids FOUC)**

Run (from `frontend/`):
```bash
bunx astryx theme build --help 2>&1 | head -20
```
- If a build subcommand exists and can emit CSS for `src/theme/klynt-theme.ts`, run it, output to `src/theme/klynt-theme.css`, and note in the PR that the built path is used.
- If the CLI surface differs or the step is fiddly, **fall back to runtime injection**: skip the CSS file entirely. `<Theme theme={klyntTheme}>` injects a `<style>` tag at runtime (documented behavior). Record "runtime injection; built-CSS deferred" in the changelog. This is a known, supported mode — not a workaround.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/theme/
git commit -m "$(cat <<'EOF'
feat(frontend): define Klynt Astryx theme from brand orange

Adds klynt-theme via defineTheme, deriving the color scale from #f76e18.
Single source of brand token truth, replacing the ad-hoc --color-brand*
custom properties.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Rewrite the stylesheet cascade and hand dark mode to Astryx

The highest-risk task: it changes global CSS. Astryx's `reset.css` loads alongside Tailwind's preflight, so the gate is a **build + visual** check, not just a passing test suite.

**Files:**
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: `@/theme/klynt-theme.css` if Task 4 produced it; otherwise nothing (runtime injection).
- Produces: an `@layer` order and Astryx imports that later Astryx components render correctly against. The `dark` custom variant now keys off `[data-theme="dark"]`, which Astryx's `Theme` sets on `<html>`.

- [ ] **Step 1: Reorder the top of `index.css` to the Astryx + Tailwind cascade**

Replace the current first line `@import "tailwindcss";` with the explicit layered form. The new top of `frontend/src/index.css` becomes (keep the entire existing `@theme { … }` block, `:root { … }`, `@layer base { … }` below it, with the edits in Steps 2–4):
```css
@layer reset, theme, base, astryx-base, astryx-theme, components, utilities;

@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "@astryxdesign/core/reset.css";
@import "@astryxdesign/core/astryx.css";
/* If Task 4 produced a built theme CSS, import it here; otherwise omit
   (runtime injection via <Theme> covers it): */
@import "@/theme/klynt-theme.css";
@import "@astryxdesign/core/tailwind-theme.css";
@import "tailwindcss/utilities.css" layer(utilities);
```
If Task 4 used runtime injection, delete the `@import "@/theme/klynt-theme.css";` line.

- [ ] **Step 2: Flip the dark custom variant**

Change line ~152 from:
```css
@custom-variant dark (&:where(.dark, .dark *));
```
to:
```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

- [ ] **Step 3: Delete the `.dark { … }` block**

Remove the entire `.dark { … }` rule (currently lines ~191–225). Astryx's theme now supplies dark values via `light-dark()`. The `:root { … }` light block stays for now; its tokens are retired per-feature later.

- [ ] **Step 4: Remove the dead brand tokens**

Delete these three lines from the `@theme` block (currently ~62–64):
```css
--color-brand: #f76e18;
--color-brand-hover: #e56310;
--color-brand-foreground: #ffffff;
```
Verify nothing references them:
```bash
grep -rn "color-brand" src   # should print nothing
```
If anything does, it belongs to a later feature — leave the token but note it; do not break a consumer in the foundation PR.

- [ ] **Step 5: Verify build and file size**

Run (from `frontend/`):
```bash
bun run build
wc -l src/index.css   # must be < 300
```
Expected: build PASS. If the split Tailwind imports fail under `@tailwindcss/vite`, consult `npx astryx docs styling-libraries` and the Tailwind 4 docs; the layered form is the documented Astryx+Tailwind recipe, so a failure here is a config detail to resolve, not a reason to abandon the cascade.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/index.css
git commit -m "$(cat <<'EOF'
style(frontend): adopt Astryx+Tailwind layer cascade, hand dark mode to Astryx

Reorders index.css into the explicit @layer cascade so Astryx component CSS
sits between Tailwind base and utilities. Flips the dark custom variant to
[data-theme="dark"] (set by Astryx's Theme provider) so existing dark:
variants follow Astryx, and deletes the now-dead .dark block and
--color-brand* tokens.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Wire the Theme and SPA-aware LinkProvider into providers

**Files:**
- Create: `frontend/src/app/router-link.tsx`
- Modify: `frontend/src/app/providers/index.tsx`

**Interfaces:**
- Consumes: `klyntTheme` from `@/theme/klynt-theme` (Task 4); `Theme` from `@astryxdesign/core/theme`; `LinkProvider` from `@astryxdesign/core/Link`.
- Produces: an app tree where every Astryx `Link` and `href`-bearing `Button` routes through React Router. `RouterLink` is the adapter other code may reuse.

- [ ] **Step 1: Write the failing test for the link adapter**

Astryx passes `href`/`className`/`style`/`children` to the registered component, but React Router's `Link` expects `to`. The adapter maps them. Create `frontend/src/app/router-link.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RouterLink } from "./router-link";

test("maps href to a client-side router link", () => {
  render(
    <MemoryRouter>
      <RouterLink href="/dashboard" className="x">go</RouterLink>
    </MemoryRouter>,
  );
  const link = screen.getByRole("link", { name: "go" });
  expect(link).toHaveAttribute("href", "/dashboard");
  expect(link).toHaveClass("x");
});

test("renders external hrefs as a plain anchor", () => {
  render(
    <MemoryRouter>
      <RouterLink href="https://example.com">out</RouterLink>
    </MemoryRouter>,
  );
  expect(screen.getByRole("link", { name: "out" })).toHaveAttribute(
    "href",
    "https://example.com",
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `frontend/`):
```bash
bun run test src/app/router-link.test.tsx 2>&1 | tail -15
```
Expected: FAIL — `router-link` module not found.

- [ ] **Step 3: Implement the adapter**

Create `frontend/src/app/router-link.tsx`:
```tsx
import { forwardRef } from "react";
import { Link } from "react-router-dom";

/**
 * Adapter registered with Astryx's LinkProvider. Astryx renders links as
 * <Component href=... className=... style=... children=...>; React Router's
 * Link expects `to`. This maps href→to for in-app paths and falls back to a
 * plain <a> for external/absolute URLs and hash/mailto links.
 */
export const RouterLink = forwardRef<
  HTMLAnchorElement,
  { href?: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>
>(function RouterLink({ href, children, ...rest }, ref) {
  const isInternal =
    !!href && href.startsWith("/") && !href.startsWith("//");
  if (isInternal) {
    return (
      <Link to={href} ref={ref} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} ref={ref} {...rest}>
      {children}
    </a>
  );
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run (from `frontend/`):
```bash
bun run test src/app/router-link.test.tsx 2>&1 | tail -15
```
Expected: PASS.

- [ ] **Step 5: Wrap the app in Theme + LinkProvider**

Edit `frontend/src/app/providers/index.tsx`. Add imports:
```tsx
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import { klyntTheme } from "@/theme/klynt-theme";
import { RouterLink } from "@/app/router-link";
```
Wrap the existing `{children}` inside `AuthHydrator` so Astryx theming and links cover the routed tree. Change:
```tsx
<AuthHydrator>{children}</AuthHydrator>
```
to:
```tsx
<AuthHydrator>
  <Theme theme={klyntTheme} mode="system">
    <LinkProvider component={RouterLink}>{children}</LinkProvider>
  </Theme>
</AuthHydrator>
```

- [ ] **Step 6: Verify typecheck, tests, and build**

Run (from `frontend/`):
```bash
bun run typecheck && bun run test 2>&1 | tail -15 && bun run build
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/
git commit -m "$(cat <<'EOF'
feat(frontend): wire Astryx Theme and SPA-aware LinkProvider

Wraps the routed tree in Astryx's Theme (klyntTheme, mode=system) and a
LinkProvider backed by RouterLink — an adapter mapping Astryx's href prop
to React Router's `to`, so Astryx links and href-buttons keep client-side
navigation instead of full page loads.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Manual integration verification (smoke the foundation)

No automated test covers the two failure modes that matter here: a broken CSS cascade (visual) and a broken LinkProvider (full-page nav instead of SPA nav). This task verifies them with a temporary Astryx component, then removes it.

**Files:**
- Temporary: a throwaway Astryx `Button` in one existing route, reverted at the end. No permanent file change.

**Interfaces:**
- Consumes: everything from Tasks 4–6.
- Produces: confidence (recorded in the PR) that theme, cascade, and routing work. No committed code.

- [ ] **Step 1: Drop a temporary themed, linking Astryx Button into a route**

In an existing top-level page (e.g. the marketing `HomePage.tsx`), temporarily add:
```tsx
import { Button } from "@astryxdesign/core/Button";
// ...inside the rendered tree:
<Button label="Astryx smoke test" href="/pricing" variant="primary" />
```

- [ ] **Step 2: Run the dev server and verify three things**

Run (from `frontend/`):
```bash
bun run dev
```
Open the page and confirm:
1. **Theme** — the button is styled and shows Klynt orange (`#f76e18`), not a default blue/gray. Cascade + theme work.
2. **SPA navigation** — clicking it navigates to `/pricing` **without a full page reload** (network tab shows no document request; React devtools state persists). LinkProvider + RouterLink work.
3. **Dark mode** — toggle OS appearance (or temporarily set `mode="dark"` on `Theme`); the button and page respond. Existing `dark:` variants still resolve. Revert any `mode` change.

If any check fails, fix in the relevant task (5 for theme/cascade, 6 for navigation) before proceeding. Do not paper over it.

- [ ] **Step 3: Remove the temporary button**

Delete the temporary import and JSX. Verify:
```bash
git diff --stat   # should show no lingering changes to HomePage.tsx
bun run typecheck && bun run build
```
Expected: clean tree, PASS.

- [ ] **Step 4: Run the full e2e suite as the regression gate**

Run (from `frontend/`):
```bash
bunx playwright test 2>&1 | tail -20
```
Expected: the 5 existing specs PASS — the foundation changed global CSS and providers, so this confirms no route regressed. Record the result in the PR.

---

## Task 8: Update agent docs and Dependabot

**Files:**
- Modify: `AGENTS.md`
- Modify: `.github/dependabot.yml`

**Interfaces:**
- Consumes: the working `docs.mjs` command (Task 1).
- Produces: the canonical/frozen/discovery rules future agents follow; a Dependabot ignore rule preventing auto-bump of `@astryxdesign/*` minors.

- [ ] **Step 1: Update the Technology Stack row**

In `AGENTS.md`, change the Styling row (line ~28) from:
```
| Styling | Tailwind CSS 4 |
```
to:
```
| Styling | Astryx design system (`@astryxdesign/core`); Tailwind 4 for layout utilities via the Astryx token bridge |
```

- [ ] **Step 2: Rewrite the UI Components section**

Replace the `### UI Components` body (lines ~103–107) with:
```markdown
### UI Components

- **Canonical vocabulary:** import UI components from `@astryxdesign/core/<Component>` (e.g. `import { Button } from "@astryxdesign/core/Button"`).
- **Discovery (do this before building UI):**
  - Catalog: `node frontend/node_modules/@astryxdesign/core/docs.mjs --list --brief`
  - Component detail (props, anatomy, Do/Don't): `node frontend/node_modules/@astryxdesign/core/docs.mjs <Component>`
  - Design guidance: `cd frontend && npx astryx docs <topic>` (`theme`, `color`, `spacing`, `layout`, `principles`, `working-with-ai`)
- **Frozen:** `frontend/src/components/ui/` holds legacy shadcn primitives being replaced by Astryx feature-by-feature. Do not add to it; do not import from it in new code.
- **Klynt-owned exceptions** (no Astryx equivalent — keep using these): `@/components/glass-panel`, `@/components/scroll-area`, `@/components/form`. Animation uses `framer-motion`.
- New UI must feel native to Klynt — browser-default styling signals a missing Astryx component or a wrong prop.
```

- [ ] **Step 3: Update the architecture note**

In `AGENTS.md` "Architecture at a Glance → Frontend" (line ~144), change:
```
- `components/ui/` — design-system primitives
```
to:
```
- `components/` — Klynt-owned UI (glass-panel, scroll-area, form); `components/ui/` — frozen legacy shadcn primitives, being replaced by @astryxdesign/core
```

- [ ] **Step 4: Add the Dependabot ignore rule**

In `.github/dependabot.yml`, under the `package-ecosystem: bun` block (after line 17, inside that update entry), add:
```yaml
    ignore:
      - dependency-name: "@astryxdesign/*"
        update-types:
          - "version-update:semver-minor"
          - "version-update:semver-patch"
```
This stops the weekly bun job from auto-opening PRs that bump exactly the 0.x releases allowed to break us. Upgrades stay a manual, reviewed drill.

- [ ] **Step 5: Verify YAML and commit**

Run:
```bash
python3 -c "import yaml,sys; yaml.safe_load(open('.github/dependabot.yml')); print('dependabot.yml OK')"
```
Expected: `dependabot.yml OK`. Then:
```bash
git add AGENTS.md .github/dependabot.yml
git commit -m "$(cat <<'EOF'
docs(agents): make Astryx the canonical UI vocabulary; pin its Dependabot policy

AGENTS.md now points agents at @astryxdesign/core and its docs.mjs CLI,
freezes components/ui/, and names the Klynt-owned exceptions. Dependabot
ignores @astryxdesign minor/patch bumps so 0.x upgrades stay manual.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Final foundation verification

**Files:** none — verification only.

- [ ] **Step 1: Run the full local gate**

Run (from `frontend/`):
```bash
bun run typecheck && bun run build && bun run test:coverage 2>&1 | tail -25 && bunx playwright test 2>&1 | tail -20
```
Expected: all PASS; coverage ≥ gate (or the recorded, justified decision). Paste the coverage total and e2e result into the PR description alongside the Task 1 measurement.

- [ ] **Step 2: Confirm the foundation invariants**

Verify each, from `frontend/`:
```bash
grep -rn "color-brand" src            # nothing
grep -rn "\.dark " src/index.css      # nothing (dark block gone)
grep -rn "@/components/ui/\(glass-panel\|scroll-area\|form\)\b" src   # nothing
ls src/components/ui/{chart,sheet,sidebar,menubar,drawer,carousel,input-otp}.* 2>/dev/null   # nothing
```
Expected: all empty. The app renders unchanged; Astryx is installed, themed, link-wired, and documented; nothing in feature code imports an Astryx component yet.

---

## Self-Review

**Spec coverage** (against `2026-07-10-astryx-frontend-migration-design.md`):
- Phase 0 Measurement → Task 1 Steps 1–3. ✓
- Pinned exact deps + StyleX peer → Task 1 Step 4, Global Constraints. ✓
- Delete 7… **corrected to 9** dead files (`sheet`+`sidebar` added: `sheet` is consumed only by the dead `sidebar`) → Task 3. Drop `recharts`/`vaul`/`input-otp`/`embla` → Task 3 Step 3. ✓ (Spec listed `sheet` as dead standalone; verified it's dead *via* `sidebar`. Recorded as a correction.)
- Move `glass-panel`/`scroll-area`/`form` to `src/components/` → Task 2. ✓
- `klynt-theme.ts` via `defineTheme` from `#f76e18`; built CSS with runtime fallback → Task 4. ✓
- index.css cascade, `dark` variant flip, `.dark`/`--color-brand*` removal → Task 5. ✓
- `Theme` + `LinkProvider` + the href→to adapter → Task 6 (adapter is a spec-implied necessity the spec named as a risk; made concrete here). ✓
- Manual SPA-nav + theme verification (LinkProvider failure is invisible to tests) → Task 7. ✓
- AGENTS.md Component Vocabulary + stack + architecture → Task 8 Steps 1–3. ✓
- Dependabot ignore rule → Task 8 Step 4. ✓
- Coverage gate measured before deletion, re-measured after → Task 1 + Task 3 Step 4. ✓

**Deferred to later per-feature plans (correctly out of scope):** all feature migrations (marketing→auth→dashboard→tenant/admin→desktop), the Phase 2 e2e baselines, the Phase 4 abort checkpoint, and final `ui/` deletion / Radix removal. This plan is Phase 0 + Phase 1 only.

**Placeholder scan:** the `tokens: {}` block in `klynt-theme.ts` is intentionally empty with a comment explaining when to fill it — a real starting state, not a TODO. No "TBD"/"implement later" steps. Two genuine unknowns (the Tailwind-split CSS cascade, the `astryx theme build` CLI surface) carry concrete best-known content plus a documented, supported fallback and a verification gate — not a placeholder.

**Type consistency:** `klyntTheme` (Task 4) is imported by the same name in Task 6. `RouterLink` (Task 6 Step 3) matches its test (Step 1) and the `LinkProvider component={RouterLink}` usage (Step 5). Import paths `@/components/{glass-panel,scroll-area,form}` are consistent between Task 2 and Task 8's AGENTS.md exceptions list.

## Changelog

- 2026-07-11 — Initial foundation plan (spec Phases 0–1). Correction vs spec: dead set is 9 files, not 7 — `sheet` is dead only because its sole consumer `sidebar` is itself unused; both are deleted together. Coverage gate decision and `astryx theme build` vs runtime-injection outcome to be recorded here during execution.
- 2026-07-11 — Task 1 complete. Baseline coverage: Statements 92.2% (3597/3901), Lines 93.3% (3428/3674), 244 test files / 857 tests passing. End-state projection (with `src/components/ui/**` excluded, via `bunx vitest run --coverage --coverage.exclude='src/components/ui/**'` — the direct flag form worked, no `vitest.config.ts` fallback needed): Statements 91.21% (2992/3280), Lines 92.39% (2831/3064). Gate decision: **Gate at risk: projection is 91.21% (statements; lines projects to 92.39%). Phase 1 deletes only dead primitives (small impact); re-measure in Task 4. Backfill or adjust deferred to the feature that first breaches the gate.** Gate not lowered; `vitest.config.ts` untouched. Installed exact pins: `@astryxdesign/core@0.1.4`, `@stylexjs/stylex@0.18.3` (pinned down from the initially-resolved `0.19.0`, which failed the `@astryxdesign/core` peer range `^0.18.3`), `@astryxdesign/cli@0.1.4` (dev). `typecheck`, `build`, and both `docs.mjs` invocations passed. Commit `8e5dd69`.
