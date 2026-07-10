# Astryx Frontend Migration Design

## Context

The Klynt frontend is a React 19 + Vite 8 + Tailwind 4 SPA. Its UI layer is shadcn/ui: 55 vendored primitives in `src/components/ui/`, built on Radix, `class-variance-authority`, and `tailwind-merge`. The codebase is 653 TS/TSX files (~40k lines): 258 non-test app files, 244 tests, 65 Storybook stories, 5 Playwright e2e specs. 51 app files import from `src/components/ui/`; 195 files carry Tailwind `className` strings.

[Astryx](https://astryx.atmeta.com) is a design system published by Meta (`@astryxdesign/*`, MIT). `@astryxdesign/core@0.1.4` exports 119 components and ships `docs.mjs`, a zero-dependency CLI that emits per-component agent documentation: anatomy tables, prop tables with defaults, and explicit Do/Don't guidance.

**The motivating goal is agent ergonomics.** AI coding agents produce better frontend code against a documented, constrained component vocabulary. The current shadcn layer has no such documentation; `AGENTS.md` says only "Styling: Tailwind CSS 4".

### Distribution model: the critical difference

shadcn/ui is a **vendoring** model. `src/components/ui/button.tsx` is Klynt-owned source. There is no `shadcn` entry in `package.json`. Those components cannot break, because nobody outside this repo can change them.

Astryx is a **library dependency**. Components live in `node_modules`; `@astryxdesign/cli` (102-line `bin/astryx.mjs`) has no `add`, `eject`, or `vendor` command and never writes component source. There is no supported way to own Astryx components the way we own the shadcn ones.

### Risk, accepted explicitly

`@astryxdesign/core` was first published 2026-06-24. `0.1.4` shipped 2026-07-07. Four minor releases in sixteen days; no published stability statement. Under semver, `0.x` minors may introduce breaking changes. Astryx's API is not shape-compatible with shadcn — `Button` requires a `label` prop and uses `clickAction` for async handlers; form controls use `changeAction` and `status={{type, message}}`. No codemod will migrate call sites cleanly.

This risk was presented and accepted. The migration is sequenced so that it can be abandoned after the first feature at low cost.

## Goals

1. Make `@astryxdesign/core` the single component vocabulary for Klynt's frontend.
2. Give AI agents a discoverable, documented component API via `docs.mjs` and `AGENTS.md`.
3. Preserve Klynt's brand identity (`#f76e18`) and ship a working dark mode.
4. Keep the repository always-green: every commit builds, typechecks, and passes CI.
5. Make the migration abortable after the first feature.

## Non-Goals

- Migrating the backend, or any change to `backend/`.
- Replacing `framer-motion`, `@tanstack/react-query`, `react-hook-form`, `zustand`, or `react-router-dom`.
- Replacing the toast layer in `src/core/notifications/` (a store, not a primitive).
- Adopting StyleX as an authoring style. StyleX is installed as a required runtime peer dependency only; Astryx ships precompiled class names and `stylex.props` is a runtime merge helper.
- Reaching Astryx 1.0 before starting.

## Feasibility findings

Verified by unpacking `@astryxdesign/core@0.1.4` and `@astryxdesign/theme-neutral@0.1.4` from the npm registry.

| Question | Finding |
|---|---|
| Build plugin required? | **No.** Ships prebuilt `dist/astryx.css` (123KB) and precompiled StyleX class names. README: "No build plugins, no PostCSS, no Babel config." |
| Coexists with Tailwind 4? | **Yes**, by design. Ships `tailwind-theme.css` mapping Astryx tokens to Tailwind utilities via `@theme inline`. |
| Peer dependencies | `react >=19`, `react-dom >=19`, `@stylexjs/stylex ^0.18.3`. `peerDependenciesMeta` is `null` — StyleX is **required**, not optional. |
| Brand color | `defineTheme({ color: { accent } })` derives the color scale from one accent via the HCT perceptual color model. Explicit `tokens` entries take precedence. |
| Dark mode | `Theme` takes `mode?: 'light' \| 'dark' \| 'system'` and syncs `data-theme` on `document.documentElement`. It does **not** use a `.dark` class. |
| Light/dark tokens | Token values accept `[light, dark]` tuples, compiled to CSS `light-dark()`. |
| Theme precompilation | `npx astryx theme build` emits a CSS file instead of runtime `<style>` injection. |
| SPA routing | `LinkProvider component={...}` registers the component that Astryx `Link` — and `Button` with `href` — renders through. |
| Agent docs | `node node_modules/@astryxdesign/core/docs.mjs --list --brief` (catalog) and `docs.mjs <Component>` (full page). `npx astryx docs <topic>` covers `theme`, `color`, `spacing`, `layout`, `principles`, `working-with-ai`, and 12 more. |

## Component inventory

### Dead on arrival — delete, do not migrate

Zero app files import these; they are unused shadcn scaffolding.

`chart`, `chart-context`, `chart-tooltip-content`, `input-otp`, `menubar`, `drawer`, `sheet`

Deleting them orphans `recharts`, `vaul`, `embla-carousel-react`, and `input-otp` as dependencies. (`features/desktop/components/Menubar.tsx` is a hand-rolled component and does not use `ui/menubar`.)

`embla-carousel-react` backs `ui/carousel`, which Astryx `Carousel` replaces; it is removed when `ui/carousel` is deleted.

### Klynt-owned permanently — move out of `ui/`

Astryx has no equivalent. These relocate to `src/components/` so that "everything remaining in `ui/` is dead" stays literally true.

| Component | Consumers | Rationale |
|---|---|---|
| `glass-panel` | 3 app files | Klynt-specific design |
| `scroll-area` | 3 app files | No Astryx equivalent |
| `form` | 7 app files | React Hook Form binding over Astryx `Field` / `FieldStatus` / `FormLayout` |

`framer-motion` (30 files) also stays. Astryx ships motion *tokens*, not an animation library.

### Migrated to Astryx

The remaining ~45 primitives. Representative mapping:

`button`→`Button`, `input`→`TextInput`, `textarea`→`TextArea`, `checkbox`→`CheckboxInput`, `radio-group`→`RadioList`, `select`→`Selector`, `switch`→`Switch`, `slider`→`Slider`, `alert`→`Banner`, `separator`→`Divider`, `progress`→`ProgressBar`, `tabs`→`TabList`, `command`→`CommandPalette`, `empty`→`EmptyState`, `breadcrumb`→`Breadcrumbs`, `toggle`→`ToggleButton`, `toggle-group`→`ToggleButtonGroup`, `navigation-menu`→`NavMenu`. `accordion`→`Collapsible` (confirm whether a multi-panel `CollapsibleGroup` is exported before converting accordion call sites; it appears in the docs category map but not in the package's export list). Dialog, Popover, Tooltip, HoverCard, ContextMenu, DropdownMenu, AlertDialog, Table, Card, Badge, Avatar, Calendar, Carousel, Pagination, Resizable, Skeleton, Spinner, Kbd, Item, AspectRatio, InputGroup, ButtonGroup, Collapsible, Field map by name.

Astryx additionally provides `AppShell`, `SideNav`, `TopNav`, `MobileNav`, `TreeList`, `PowerSearch`, `Toolbar`, `MoreMenu`, and `Chat` — relevant to the `desktop` feature, which currently hand-rolls equivalents.

## Architecture

### Dependencies

Added with `bun add --exact` (no caret — `0.x` minors may break):

- `@astryxdesign/core@0.1.4` (runtime)
- `@stylexjs/stylex` (runtime, required peer) — resolve the exact latest version satisfying `^0.18.3` at install time and pin it
- `@astryxdesign/cli@0.1.4` (dev)

No theme package is installed. The theme is defined locally (see below).

### Stylesheet cascade

`src/index.css` begins with an explicit layer order, then imports in this exact sequence:

```css
@layer reset, theme, base, astryx-base, astryx-theme, components, utilities;

@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/preflight.css' layer(base);
@import '@astryxdesign/core/reset.css';
@import '@astryxdesign/core/astryx.css';
@import './theme/klynt-theme.css';        /* generated by `astryx theme build` */
@import '@astryxdesign/core/tailwind-theme.css';
@import 'tailwindcss/utilities.css' layer(utilities);
```

`tailwind-theme.css` is what keeps the existing 195 files of Tailwind classes working: `bg-surface`, `text-primary`, and `rounded-lg` resolve to Astryx tokens. New Tailwind written during and after migration is token-correct by construction.

### Theme

`src/theme/klynt-theme.ts`:

```ts
import { defineTheme } from '@astryxdesign/core/theme';

export const klyntTheme = defineTheme({
  name: 'klynt',
  color: { accent: '#f76e18' },
  tokens: { /* explicit overrides where HCT derivation is wrong */ },
});
```

Precompiled to `src/theme/klynt-theme.css` via `npx astryx theme build`, committed, and regenerated whenever `klynt-theme.ts` changes. This avoids a flash of unthemed content from runtime `<style>` injection.

The existing `--color-brand`, `--color-brand-hover`, and `--color-brand-foreground` custom properties are removed from `src/index.css`; Astryx's accent tokens replace them.

### Dark mode

Astryx `Theme` owns color mode and sets `data-theme` on `<html>`. One line in `src/index.css` bridges the 20 files that use `dark:` variants:

```css
/* was: @custom-variant dark (&:where(.dark, .dark *)); */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

The `.dark { … }` block in `src/index.css` is deleted. Existing `dark:` variants then follow Astryx automatically with no per-file churn. They are retired feature-by-feature as components convert to Astryx tokens.

Klynt gains a working dark mode, which it does not have today: `.dark` exists but nothing sets it and there is no theme switcher.

### Providers

In `src/app/providers/index.tsx`, wrapping the `AuthHydrator` subtree:

```tsx
<Theme theme={klyntTheme} mode="system">
  <LinkProvider component={RouterLink}>{children}</LinkProvider>
</Theme>
```

`LinkProvider` is mandatory. Astryx `Link`, and `Button` with an `href`, render through the registered component. Omitting it makes every Astryx link perform a full-page navigation, silently defeating React Router. This fails no test — it must be verified manually in the pilot.

## The agent vocabulary

`AGENTS.md` gains a **Component Vocabulary** section stating three rules:

1. **Canonical.** Import UI components from `@astryxdesign/core/<Component>`.
2. **Frozen.** `src/components/ui/` is deprecated. Never add to it. Never import from it in new code.
3. **Discovery.** Catalog: `node node_modules/@astryxdesign/core/docs.mjs --list --brief`. Component detail: `node node_modules/@astryxdesign/core/docs.mjs <Component>`. Design guidance: `npx astryx docs <topic>` (`theme`, `color`, `spacing`, `layout`, `principles`, `working-with-ai`).

The Technology Stack table's "Styling" row changes from "Tailwind CSS 4" to "Astryx design system (`@astryxdesign/core`); Tailwind 4 for layout utilities via the Astryx token bridge".

A fourth rule names the permanent exceptions: `glass-panel`, `scroll-area`, and `form` live in `src/components/` and are Klynt-owned; `framer-motion` is the animation library.

`@storybook/addon-mcp` is retained. Its scope shrinks to the three Klynt-owned components — Astryx's own components are documented by `docs.mjs`, and stories for them would document `node_modules`.

## Migration strategy: strangler by feature

Order: `marketing` → `auth` → `dashboard` → `tenant` / `admin` → `desktop`.

`marketing` first: leaf pages, no auth or shared state, and it exercises both the `glass-panel` and `scroll-area` gaps early. `desktop` last: newest, most complex, just shipped — and the feature that benefits most from `AppShell`/`SideNav`/`ContextMenu`/`CommandPalette`, so it should be migrated with the most Astryx experience in hand.

A shadcn primitive is deleted from `src/components/ui/` the moment its last consumer is gone. Both vocabularies coexist transiently; `AGENTS.md` resolves the ambiguity by declaring `ui/` frozen.

### Abort criterion

After `marketing` ships, absorb the next two Astryx releases and record, for each: the number of Klynt files requiring edits, and whether Phase 2's e2e specs passed without modification. **Stop if either upgrade required edits to more than 10% of migrated files, or if either broke an e2e spec.** On stop: the remaining features stay on shadcn, `ui/` unfreezes, and `marketing` is either reverted or kept as an isolated exception documented in `AGENTS.md`. The cost of stopping here is one feature, not five.

## Regression strategy

A UI-layer rewrite is precisely the change unit tests cannot catch: the rendering is what changes, so component tests are rewritten alongside the components and cannot serve as a control.

**Playwright is the only real net, and it currently covers `/`, `/login`, `/register`, `/tenants/acme-test`, and the admin host — 5 specs.** `marketing` alone is 43 components across 10 pages, of which e2e touches one.

Therefore: **before migrating any feature, write Playwright specs covering that feature's pages against the current UI.** Those specs are the contract the Astryx rewrite must satisfy. They are written, reviewed, and merged as their own PR, green against shadcn, before any Astryx component enters the feature.

For `marketing` this means specs for all 10 pages: `HomePage`, `ProductsPage`, `PricingPage`, `CommunityPage`, `AboutPage`, `CustomersPage`, `DocsPage`, `TalkToHumanPage`, `ProductAnalyticsPage`, `TrashPage`. Assertions target user-visible behavior (headings, navigation, form submission, tab switching, pricing calculator arithmetic), not DOM structure or class names — structure changes by definition.

Astryx's own components are not unit-tested by Klynt. Testing `@astryxdesign/core`'s `Button` is testing `node_modules`. Deleted primitives take their `.a11y.test.tsx` and `.interaction.test.tsx` files with them. Accessibility coverage shifts to `@storybook/addon-a11y` and `axe-core` at the page level in e2e.

## Coverage gate

`vitest.config.ts` enforces 92% lines and statements. Most of the 244 tests live in `src/components/ui/`, covering Klynt's best-covered files. Deleting them removes both the tests and the covered lines; Astryx's components sit in `node_modules` and are excluded from coverage instrumentation, contributing nothing back. The net effect on the ratio is not predictable by inspection.

**Foundation step 0, before any deletion:** run `bun run test:coverage`, record the baseline, and compute the projected ratio with `src/components/ui/**` excluded. Only then decide:

- If projected ≥ 92%: hold the gate unchanged.
- If projected < 92%: backfill app-level tests to close the gap, or lower the gate with a written justification recorded in this document's changelog and in the PR. Lowering is a decision, not a default.

The measurement is a scripted, reproducible step, and its output is pasted into the foundation PR description.

## Dependency risk controls

- **Exact pins.** `@astryxdesign/*` and `@stylexjs/stylex` are pinned without a caret. Version bumps are deliberate commits.
- **Dependabot ignore rule.** `.github/dependabot.yml` gains an `ignore` entry for `@astryxdesign/*` covering `version-update:semver-minor` and `version-update:semver-patch` in the `bun` ecosystem. Without it, the weekly `bun` job opens PRs bumping exactly the releases permitted to break us.
- **Manual upgrade drill.** Read `node_modules/@astryxdesign/core/CHANGELOG.md`; `bun add --exact @astryxdesign/core@<version>` (and the CLI in lockstep); run `bun run typecheck && bun run test && bunx playwright test`; regenerate `klynt-theme.css`. One PR per upgrade.
- **Revisit at 1.0.** When Astryx reaches 1.0 with a stability statement, drop the ignore rule and restore caret ranges.

## Phases

Each phase is one or more PRs. Every PR leaves `main` green.

### Phase 0 — Measurement

Run coverage, record the baseline and the projected post-deletion ratio. Decide the gate. No source changes. Output pasted into the Phase 1 PR.

### Phase 1 — Foundation

Install pinned dependencies. Delete the 7 dead primitive files and drop `recharts`, `vaul`, `input-otp` from `package.json`. Move `glass-panel`, `scroll-area`, and `form` to `src/components/`, updating their 13 consumers' imports. Author `klynt-theme.ts`, generate `klynt-theme.css`, rewrite the `src/index.css` cascade, flip the `dark` custom variant, delete the `.dark` block and the `--color-brand*` tokens. Wire `Theme` and `LinkProvider` into `AppProviders`. Add the Dependabot ignore rule. Update `AGENTS.md` with the Component Vocabulary section.

Verification: `bun run typecheck && bun run build && bun run test && bunx playwright test` all green, and a **manual check that SPA navigation still works** — the `LinkProvider` failure mode is invisible to tests. Render one Astryx `Button` in a throwaway route to confirm the theme and cascade resolve, then remove it.

### Phase 2 — Marketing e2e baseline

Playwright specs for all 10 marketing pages, written against the current shadcn UI and green before merge. No production source changes.

### Phase 3 — Marketing migration

Convert 43 components to Astryx. Rewrite affected unit tests. Delete each `ui/` primitive as its last consumer disappears. Phase 2's e2e specs must pass unchanged — any edit to them requires explicit justification in review, since they are the contract.

Retire `dark:` variants in marketing files in favor of Astryx tokens.

### Phase 4 — Abort checkpoint

Absorb two Astryx upgrades. Measure churn per upgrade. Decide whether to continue. Record the decision in this document.

### Phase 5+ — Remaining features

`auth` → `dashboard` → `tenant` / `admin` → `desktop`. Each repeats the Phase 2/3 pattern: e2e baseline PR, then migration PR. `desktop` additionally replaces its hand-rolled `Menubar.tsx` and context-menu machinery with Astryx `Toolbar`, `MoreMenu`, `ContextMenu`, `CommandPalette`, and evaluates `AppShell` / `SideNav` / `TopNav`.

Final step: `src/components/ui/` is empty and deleted; `@radix-ui/*`, `class-variance-authority`, `cmdk`, and `sonner` are dropped from `package.json` if no consumers remain. `tailwind-merge` and `clsx` are re-evaluated. `AGENTS.md` drops the "frozen" rule, leaving one vocabulary.

## Open risks

- **Astryx `Button` requires `label`.** Klynt is i18n'd via `react-i18next`; `label={t('...')}` is straightforward, but `label` doubles as the accessible name and cannot be omitted for icon-only buttons. Every `<Button>` call site changes shape.
- **`docs.mjs` documents `0.1.4`.** As Astryx moves, the agent docs move with it. `AGENTS.md` must point at the CLI, never at a copied snapshot, or agents will code against a stale API.
- **Three Klynt-owned components in `src/components/` are a second vocabulary,** small but real. They are named explicitly in `AGENTS.md` to keep the boundary legible.
- **`astryx init` is unexamined.** It "sets up AI agent docs and picks a starter template" and may write files. Run it in a scratch directory during Phase 1 and adopt only what is wanted; do not run it against the repo blind.

## Changelog

- 2026-07-10 — Initial design. Decisions: strangler by feature; `marketing` first; custom theme via `defineTheme`; Astryx owns dark mode; e2e baseline before each migration; measure coverage before deleting; Dependabot ignores Astryx minors.
