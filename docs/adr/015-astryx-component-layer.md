# ADR-015: Astryx as the Frontend Component Layer

## Status

**Accepted** — 2026-07-14. Migration complete.

Astryx is the entire component and styling layer. `components/ui/` is deleted, Radix is at zero,
and Tailwind (`tailwindcss`, `@tailwindcss/vite`, `tailwind-merge`, `clsx`,
`class-variance-authority`, the `cn()` helper, the Vite plugin) is out of the build. The 912
`className` sites and 644 hardcoded hex values are gone.

Three questions this ADR left open were answered by doing the work:

- **The escape hatch is CSS Modules on Astryx CSS variables, not StyleX.** `xstyle` needs a
  compiler in the build; Astryx's own guidance is that "most DOM styling should stay on the
  CSS-variable path". No new toolchain was added. Pattern and token map:
  `docs/astryx-marketing-conventions.md`.
- **The `features/desktop` gate resolved in favour of proceeding.** No swizzling was needed.
  The window frame stays a `motion.div` — Astryx has no window primitive, and `AppShell`/`Layout`
  own *page* structure, which is the inverse of what a window manager needs.
- **The marketing palette question resolved by adopting Astryx's tokens**, accepting the visual
  shift. The neutrals are warmer than the old bespoke palette, and the link blue is Astryx's.

**No hardcoded colour survives, and there are no exceptions.** The app runs on Astryx's stock
`neutralTheme`: no `defineTheme`, no accent, no token overrides. That means it has **no brand
colour** — the accent is Astryx's near-black/near-white, so every CTA is monochrome and the Klynt
orange is gone from the product. The macOS traffic lights are gone too, replaced by Astryx's
categorical hues, so the window controls read as red/amber/green but are no longer *the* macOS
lights. Both were knowing trades for being 100% native to the design system.

Dark mode now works for the first time — `<Theme mode>` defaults to `system` and is driven by a
real control. It never worked before: nothing ever applied the old `.dark` class.

## Date

2026-07-13

## Context

The frontend's component layer is `frontend/src/components/ui/` — 56 shadcn/ui-style primitives built on Radix, carried over from the `frontend-v2` migration and adapted for Tailwind CSS v4. Maintaining them is our cost: every primitive is hand-written, hand-tested, and hand-kept-consistent, and the 92% frontend coverage gate means each one also carries a test and story burden (139 test/story files sit under `components/ui/` today).

An inventory of what is actually in use changes the shape of the problem:

- **28 of the 56 primitives are imported by no application code at all.** `chart`, `carousel`, `command`, `context-menu`, `drawer`, `resizable`, `input-otp`, `sonner`, `popover`, `menubar`, `navigation-menu`, `sidebar`, `progress`, `radio-group`, `switch`, `toggle-group`, `hover-card`, `kbd`, `item`, `empty`, `pagination`, `input-group`, `aspect-ratio`, `button-group`, `calendar`, `collapsible`, and the three `chart-*` files are dead scaffolding. They are carrying test, story, and dependency weight for zero delivered UI.
- **28 primitives are genuinely used**, concentrated in a few: `button` (30 consumers), `spinner` (22), `input` (15), `dialog` (7), `form` (7), `label` (7), `card` (6).
- **69 non-test application files** import from `components/ui/`, spread across `marketing`, `auth`, `tenant`, `routing`, and `desktop`.

Astryx (`@astryxdesign/core`, 149 components) is a maintained, token-driven design system that supplies 24 of the 28 primitives we actually use, and supplies layout and page-frame components (`AppShell`, `Layout`, `SideNav`, `TopNav`) that we currently hand-roll. Adopting it moves the primitive layer from "code we own and test" to "dependency we consume", and lets the coverage gate apply to Klynt's own logic instead of to re-tested Radix wrappers.

Astryx is opinionated in ways that are not free. It owns layout (`No <div>` — components do all layout and spacing), it owns the page frame (`AppShell`), and it requires every value to come from a token.

We also intend to remove Tailwind entirely. Astryx's migration guide is explicit that this cannot be the starting move: *"Tailwind can coexist during migration. Use it for legacy wrappers and local layout while replacing interactive controls, navigation, command surfaces, forms, alerts, dialogs, and settings UI with components."* Tailwind is load-bearing in 195 files and underpins every remaining shadcn primitive (`cva` + `cn`). It is removed surface-by-surface and leaves with the last one, with CSS cascade layers keeping both systems safe in the interim.

## Decision

Adopt Astryx as the sole frontend component layer and remove `frontend/src/components/ui/`.

Specifically:

1. **Delete, do not migrate, the 28 unused primitives** and their tests and stories. They are not part of the migration; they are cleanup that happens to be unblocked by it.
2. **Replace the 28 used primitives with their Astryx equivalents**, most of which are renames (`alert`→`Banner`, `input`→`TextInput`, `select`→`Selector`, `separator`→`Divider`, `label`→`FieldLabel`, `accordion`→`Collapsible`, `toggle`→`ToggleButton`, `empty`→`EmptyState`, `command`→`CommandPalette`, `sidebar`→`SideNav`).
3. **Write a React Hook Form ↔ Astryx `Field` bridge once.** Astryx ships `FormLayout`, `Field`, `FieldLabel`, and `FieldStatus` but no RHF binding; our `form.tsx` (7 consumers) is a RHF + Zod wrapper. This bridge is the one piece of primitive-layer code we keep owning.
4. **Migrate `features/desktop` to Astryx as well**, using `astryx swizzle` to eject and customize components where the window-manager chrome demands it. This is sequenced **last** and gated (see Consequences).
5. **A screen is either fully migrated or not migrated.** Mixed Astryx/shadcn screens are prohibited; they are the failure mode that makes a migration impossible to finish.
6. **Remove Tailwind at the end, and do not replace it with StyleX yet.** Astryx offers `xstyle`/StyleX as its native override path but also states that *"most DOM styling should stay on the CSS-variable path."* Since Astryx components own layout and spacing, most custom styling should simply disappear rather than move. Adopting a StyleX compiler now is a toolchain bet placed before we know the size of the residue. Revisit at the `features/desktop` spike — the only place likely to need a real escape hatch — and decide against real code.

## Alternatives Considered

### Keep the hand-rolled shadcn layer
- Pros: zero migration cost; full control; no new dependency.
- Cons: we keep paying to build, test, and maintain primitives that a maintained design system supplies; the coverage gate keeps taxing presentational wrappers; layout and page-frame components stay hand-rolled.
- Rejected.

### Adopt Astryx only for new UI; leave existing screens on shadcn
- Pros: no rewrite; incremental by default.
- Cons: two component layers permanently. Two sets of tokens, two dialog implementations, two focus-management models. The "temporary" state never ends, and every screen becomes a judgement call.
- Rejected. The half-migrated state is worse than either endpoint, which is why the migration is time-boxed rather than open-ended.

### Adopt Astryx everywhere except `features/desktop`
- Pros: lowest risk. The desktop is 79 files / 6,450 lines of window-manager chrome (`glass-panel`, menubar, context menus, mini-apps) shipped in `27cc880`, and it is precisely the UI that Astryx's `No <div>` / `AppShell` rules cannot express.
- Cons: leaves a permanent bespoke island and a second styling vocabulary inside the app.
- **Rejected by decision, with eyes open.** We accept the risk in exchange for a single component vocabulary. See Consequences.

## Consequences

- **Astryx CSS must be imported in `frontend/src/main.tsx`** (`@astryxdesign/core/reset.css`, then `@astryxdesign/core/astryx.css`) before any Astryx component renders. Without it, components render unstyled — this is the first task, and it is what makes "browser-default styling" a reliable signal of a wiring bug.
- **Coverage gate moves in our favour, then must be re-baselined.** Deleting 28 unused primitives retires a large share of the 139 test/story files under `components/ui/`, and Astryx components live in `node_modules` and leave the coverage denominator entirely. The 92%/87%/73% thresholds should be re-measured after Phase 1, not assumed to hold.
- **Radix, and several direct dependencies, become removable.** `@radix-ui/*` (24 packages), plus `cmdk`, `vaul`, `embla-carousel-react`, `input-otp`, `react-resizable-panels`, `sonner`, and `react-day-picker` are candidates for removal once their primitives are gone. `recharts` is **not** — Astryx has no charting; charts stay on recharts, themed via `useTheme()` / `resolveThemeTokens()` and the `--color-data-categorical-*` tokens.
- **Color mode is pinned to `light` until the migration completes.** The legacy layer never applies its `.dark` class, so the app is light-only. `mode="system"` would render Astryx components dark inside a hard-light app on a dark-mode OS. Phase 5 adds a real theme control and flips this to `"system"`.
- **An Astryx CSS-layer defect requires a local fix, documented in `src/index.css`.** Astryx's `reset.css` maps `html[data-theme]` → `color-scheme` so portalled content resolves its `light-dark()` tokens, but `theme.css` re-declares `:root { color-scheme: light dark }` in the higher `astryx-theme` layer, which outranks it. Under Astryx's own documented layer order, every portalled surface (Dialog, Popover, Toast, Tooltip, DropdownMenu) falls back to the OS preference. We re-assert the mapping from the `components` layer. This is a candidate upstream bug report; re-check on every Astryx upgrade.
- **jsdom cannot catch this class of bug.** It does not evaluate CSS, so `color-scheme` / `light-dark()` faults pass a fully green unit suite and a clean build. Every migrated surface needs a real-browser pass, per Astryx's own verification checklist.
- **`features/desktop` was the load-bearing risk, and the gate has now been run.** The spike migrated the Menubar and `Window.tsx` (see `docs/astryx-migration-plan.md`). **Outcome: Astryx dresses the window but cannot be the window, and no swizzling was required.** The window's contents are Astryx (`Toolbar`, `Text`, `Spinner`, `EmptyState`, `Button`) and its hardcoded colours dropped from ~20 to zero. Two bounded exceptions stand, documented in the code:
  1. **The window frame remains a `motion.div`.** Astryx has no window primitive — nothing expresses an absolutely-positioned, draggable, z-ordered surface, and `AppShell`/`Layout` own *page* structure, which is the opposite of a window manager's need.
  2. **The macOS traffic lights keep raw hex.** They are literal quotations of the OS, not themeable brand or status values; tokenising them would make them theme-dependent and, in dark mode, no longer red/amber/green.

  This ADR therefore does **not** need reopening: the escape hatch is two small, named places, not "most of the chrome".
- **Theme and brand go through `astryx theme`.** `--color-*` must never be overridden in `:root`; `@astryxdesign/theme-neutral` is the starting theme.
- **The `astryx` agent-docs block lives in root `AGENTS.md`** between `<!-- ASTRYX:START/END -->` markers. It must be regenerated from `frontend/` (`bunx astryx init --features agents --agent-docs-path <path>`) — running it from the repo root produces a *generic* block with wrong facts (`npx` instead of `bunx`, "90+ components", and a false "no Tailwind here" rule), because there is no `package.json` at the root for the CLI to detect from.
- **i18n is unaffected.** All user-facing strings stay in the `common`/`auth`/`errors`/`ui`/`validation` namespaces; only the components rendering them change.
