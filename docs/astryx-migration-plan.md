# Astryx Migration Plan — COMPLETE

**Status: done (2026-07-14).** Tailwind is out of the build; Astryx is the whole styling layer.
ADR-015 is Accepted. This document is kept as the record of how it went and what it cost.

**If you are writing UI, you want `docs/astryx-marketing-conventions.md`, not this file** — that
is the live contract (component map, token map, the CSS-Module escape hatch).

## How the three open questions resolved

| Question the plan left open | Answer |
|---|---|
| StyleX, or something else, as the escape hatch? | **CSS Modules on Astryx CSS variables.** `xstyle` needs a compiler in the build; Astryx's own docs say most DOM styling should stay on the CSS-variable path. No new toolchain. |
| Does `features/desktop` survive the gate, or does ADR-015 reopen? | **Survives.** Zero swizzling. The window frame stays a `motion.div` — Astryx has no window primitive and `AppShell` owns page structure, the inverse of a window manager. |
| Marketing palette: adopt Astryx's neutrals, or preserve the bespoke one as token overrides? | **Adopted Astryx's**, with the visual shift accepted. Neutrals are warmer; the link blue is Astryx's. |

Dark mode works now, for the first time — `<Theme mode>` defaults to `system` with a real
toggle in the menubar. It never worked before: nothing ever applied the old `.dark` class.

Two hex values survive on purpose: the brand accent in `klynt-theme.ts` (the source `defineTheme`
derives everything from), and the three macOS traffic lights.

---

*Everything below is the original plan, preserved as written.*


Replacing `frontend/src/components/ui/` (shadcn/Radix/Tailwind) with Astryx. Decision: [ADR-015](adr/015-astryx-component-layer.md).

This plan follows Astryx's own migration guide (`bunx astryx docs migration --dense`) rather than an invented order. Its central rule: **treat this as a product-shell and workflow migration, not a global class replacement.** Migrate one route or surface at a time, keeping data, routing, and business logic intact.

Each phase ends green (`just check` + `just test-coverage`) and is a separate PR to `dev`.

## Two things that surprised us, up front

**Tailwind is removed LAST, not first.** It cannot be Phase 0. It is in 195 files (`className`), 77 (`cn()`), 13 (`cva`), plus `vite.config.ts` and `src/index.css`, and every remaining shadcn primitive is built on `cva` + `cn`. Astryx explicitly supports coexistence: *"Tailwind can coexist during migration. Use it for legacy wrappers and local layout while replacing interactive controls..."* CSS cascade layers keep both alive safely. Tailwind (and `tailwind-merge`, `clsx`, `class-variance-authority`, `cn()`) leaves with the final surface.

**We are not adopting StyleX yet.** Astryx offers `xstyle`/StyleX as its native override path, but also says *"most DOM styling should stay on the CSS-variable path."* Because Astryx components own layout and spacing (`No <div>`), most of the 195 `className` files should stop needing custom styling at all once rebuilt. Adding a StyleX compiler now would be a toolchain bet made before we know the residue. Revisit at Phase 4 (`features/desktop`) — the only place likely to need a real escape hatch — and decide with evidence.

## Inventory (2026-07-13)

| Fact | Count |
|---|---|
| Primitives in `components/ui/` | 56 |
| …used by app code | 28 |
| …dead (zero app imports) | 28 |
| Test/story files under `components/ui/` | 139 |
| Non-test app files importing `components/ui/` | 69 |
| `features/desktop` source files / lines | 79 / 6,450 |

Heaviest consumers: `button` (30), `spinner` (22), `input` (15), `dialog` (7), `form` (7), `label` (7), `card` (6).

## Phase 0 — Foundation ✅ DONE

1. ✅ Install `@astryxdesign/core`, `theme-neutral`, `cli`; agent docs into root `AGENTS.md`.
2. ✅ CSS layer order in `src/index.css` (Astryx reset/theme before Tailwind utilities).
3. ✅ `<Theme>` at the app root in `src/app/providers/index.tsx`.
4. ✅ Foundation smoke test (`src/app/providers/astryx-foundation.test.tsx`).

Two decisions were forced here and are worth knowing:

- **`mode` is pinned to `"light"`, not `"system"`.** The legacy layer has no working dark mode — nothing ever applies the `.dark` class. With `mode="system"` on a dark-mode OS, Astryx components render dark inside a hard-light app. Flip to `"system"` only when a real theme control exists (Astryx's guide puts it in a settings popover, with a `Switch` driving `Theme`'s `mode` prop — never a stray body class).
- **A portal color-mode fix was required** (see the comment block in `src/index.css`). Astryx's reset maps `html[data-theme]` → `color-scheme` so portalled content resolves its `light-dark()` tokens. But `theme.css` re-declares `:root { color-scheme: light dark }` in the higher `astryx-theme` layer, which outranks it. Under Astryx's own documented layer order the portal mapping is dead, and every Dialog/Popover/Toast/Tooltip/DropdownMenu (all portalled to `<body>`) falls back to the OS preference. We re-assert the mapping from the `components` layer. **Re-check this on every Astryx upgrade**; it should become unnecessary if upstream drops the unconditional `:root` declaration.

## Phase 1 — Delete the dead layer ✅ DONE

Pure subtraction; highest value, lowest risk.

**31 primitives deleted, not 28.** Deadness has to be computed as a fixpoint, not a single grep: removing `sidebar` orphans `sheet` and `tooltip`; removing `toggle-group` orphans `toggle`. A naive "does app code import it" pass keeps those three alive by mistake. 106 files removed in total (31 primitives + their tests and stories); 25 primitives remain.

**21 dependencies removed**, including 13 `@radix-ui/*`, plus `cmdk`, `vaul`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `sonner` — **and `recharts`**. Recharts' only consumer was the dead `chart.tsx`, so the app has no charts at all today. (ADR-015 originally said keep it. If charts get built, re-add it and theme it via `useTheme()` / `resolveThemeTokens()` and the `--color-data-categorical-*` tokens — Astryx has no charting of its own.)

**Coverage gate re-baselined** in `vitest.config.ts`. The deleted primitives were near-fully covered by dedicated a11y/interaction tests, so their removal dropped the averages without any app code getting worse — the old numbers were flattered by presentational wrappers. Statements went to 91 (from 92); functions to 90 (from 87) and branches to 80 (from 73), tightening the gate where real headroom was hiding. Net: 737 tests passing, gate green.

## Phase 2 — Move the app frame — 🔬 SPIKE DONE (Menubar → TopNav)

Per the decision to follow Astryx's guide literally ("frame first"), and since Klynt's frame *is* the desktop, ADR-015's `features/desktop` spike gate was pulled forward and run on the **Menubar** — the frame's header, and the piece Astryx maps most directly (`Header → TopNav`).

**Result: Astryx can express it, and the migration is a net simplification — but only after working around three real defects.** `Menubar.tsx` now uses `TopNav` + `DropdownMenu` + `HStack`. Deleted: the `openMenu`/`menuRef` click-outside `useEffect`, and `menu-dropdown.tsx` (62 lines of hand-rolled framer-motion popover). Astryx's `DropdownMenu` owns open/close, outside-dismiss, keyboard nav, typeahead, and focus return.

### What the spike found

1. **`TopNavMenu` is the wrong component, despite the name.** It is a marketing-style hover menu (icon + title + description) with **no divider and no keyboard-shortcut slot**. Our menubars use dividers (`admin-menubar.ts`, `tenant-menubar.ts`, `user-menubar.ts`). `DropdownMenu` — which Astryx's own migration table prescribes for "dropdown action menu" — supports `{type: "divider"}` and sections, and is the correct target.
2. **`DropdownMenu` silently drops rest props.** It destructures `...props` but never spreads them onto any element, so an `onMouseEnter` passed at the top level vanishes. This contradicts Astryx's styling docs ("components extend HTML attributes and spread rest props onto their root DOM element"). Workaround: pass DOM handlers through the `button` prop. **Candidate upstream bug.**
3. **Controlled `onOpenChange` needs care with `popover="auto"`.** Opening menu B evicts menu A from the top layer, which fires `onOpenChange(false)` on **A** — after B has already been set. A naive `setOpenMenu(null)` there cancels the menu just opened, silently breaking macOS-style hover switching. The setter must only clear when the closing menu is the current one.

### Fidelity

Preserved: dividers, hover-switching between menus, click-outside dismissal, logo action, trailing actions. **Lost:** the keyboard-shortcut hint slot (`MenuItem.shortcut`) — Astryx's `DropdownMenu` has no place for it. This costs nothing today because **no menubar schema actually sets a shortcut**; the field was plumbed through but never populated. If shortcuts are ever wanted, they need a swizzled `DropdownMenuItem` or a custom `children` render function.

### The test-harness finding that matters most

jsdom ships the UA rule `[popover] { display: none }` but implements **none** of the Popover JS API. Astryx's `Layer` calls `showPopover()` when present and otherwise falls back to `style.display`. So in plain jsdom the fallback runs and popovers are **permanently visible** — `getByRole("menu")` matches whether the menu is open or closed, and outside-click light-dismiss never happens. The pre-existing "closes an open menu when clicking outside" test was not merely failing; the *passing* assertions were hollow, matching a closed menu.

`src/test/popover-shim.ts` now gives jsdom show/hide, `toggle` events, `:popover-open` matching, and light-dismiss. **Every popover-based Astryx surface migrated from here on depends on it.** (`@oddbird/popover-polyfill` was tried first and rejected: it needs constructable stylesheets, which jsdom lacks, and its CSS machinery is useless where no CSS is evaluated.)

### Menubar complete: `UserMenu`, `glass-panel`, and the brand theme

`UserMenu` moved to `Popover` + `Item` + `Avatar` + `Divider`, deleting another click-outside listener, another framer-motion popover wrapper, and the last `GlassPanel` usage. **`components/ui/glass-panel.tsx` is now deleted** — the bespoke desktop surface is retired, and 24 shadcn primitives remain.

Two things fell out of it:

- **Astryx's `Popover` keeps its content mounted (hidden) rather than conditionally rendering it.** The framer-motion version unmounted closed content. So elements inside a closed popover are still in the DOM and still match `getByText`. `user-menu.test.tsx`'s `getByText("JN")` started failing with "found multiple elements" — the avatar exists in both the trigger and the (closed) menu header. Scope such assertions to the trigger. Expect this in every popover migration.
- **The brand had to be themed, immediately.** Migrated Astryx components render in neutral-theme colours, so "Sign In" lost its orange the moment it became an Astryx `Button` — sitting next to the still-legacy orange "Get started – free". `src/app/theme/klynt-theme.ts` now defines a `klynt` theme extending `neutralTheme` with `color: { accent: "#f76e18", neutralStyle: "warm" }`. Declared through `defineTheme`, **not** by overriding `--color-*` in `:root` (which Astryx forbids): the pipeline derives hover/active/on-accent/border tokens for both color modes from the accent via HCT, and a raw override desyncs them. Verified: `--color-accent` resolves to `light-dark(#f76e18, #ff8a3d)` and the Astryx button computes to `rgb(247, 110, 24)`.

**Every surface migrated from here inherits the brand automatically.** Before migrating any further component, expect an unbranded flash if the theme is bypassed.

### `Window.tsx` — the ADR-015 gate, resolved

This is the file ADR-015 said to stop and reopen the decision over. **The answer is clear: Astryx dresses the window, but it cannot be the window — and that split is clean, not a fudge.**

Migrated to Astryx: the toolbar (`Toolbar` + `IconButton` + `Divider` + `Button`), the title (`Text`), the loading state (`Spinner`), and the error fallback (`EmptyState` + `Button`). `Window.tsx` went from **~20 hardcoded hex colours to zero**, and the Share button's `#F76E18` is now the theme accent. Astryx's `Toolbar` also adds roving arrow-key navigation across the controls, which the hand-rolled button row never had — a real accessibility gain, not just a reskin.

**Two deliberate, bounded exceptions.** They are documented in the code and are the whole of the escape hatch — *not* "swizzle most of it":

1. **The window frame stays a `motion.div`** (`Window.tsx`). Astryx has no window primitive: nothing expresses an absolutely-positioned, draggable, z-ordered surface, and `AppShell`/`Layout` exist to own *page* structure, which is the opposite of what a window manager needs. Forcing `AppShell` here would fight the metaphor rather than express it.
2. **The traffic lights keep raw hex** (`window-controls.tsx`). `#FF5F57` / `#FEBC2E` / `#28C840` are not brand or semantic values that should follow a theme — they are literal quotations of macOS, and the desktop metaphor depends on users recognising them. Mapping them onto Astryx status tokens would make them theme-dependent and, in dark mode, no longer red/amber/green.

No swizzling was needed at all. `swizzle` remains available but has not been used.

### Two more Astryx defects found here

- **A vertical `Divider` collapses to `height: 0px` inside a `Toolbar`.** It has no intrinsic height and `Toolbar` does not stretch it, so the separators simply vanish — silently, with no error. The consumer must supply a height (`className="h-4"` here). Check any vertical divider visually; tests will not catch it.
- **`Button` has only a *leading* `icon` slot — there is no trailing-icon prop.** A "100% ⌄" style control cannot be expressed; passing `icon` puts the chevron in front of the label. The zoom control drops the chevron for now; when it becomes functional it should be a `DropdownMenu`, which renders a trailing chevron for free (`hasChevron`).

## Phase 2 (remaining) — the rest of the frame — ⚠️ read this first

Astryx's guide says migrate the persistent frame first. **Klynt has a problem here that the guide does not anticipate: our persistent frame *is* the desktop.** The apex shell is a virtual-desktop OS metaphor — menubar, desktop icons, draggable windows — not the `TopNav` + `SideNav` + content frame Astryx assumes. "Frame first" therefore collides head-on with ADR-015's decision to migrate `features/desktop` **last**, behind a spike gate, because it is the riskiest surface.

They cannot both be honoured. Resolve before starting Phase 2. The options:

- **Frame-first only where the frame is conventional.** `HostRouter` splits the app across apex (marketing + desktop), `login`, `admin`, and tenant subdomains. The admin and tenant workspaces are ordinary app shells and map cleanly onto `AppShell` + `SideNav` + `TopNav`. Migrate *those* frames now, and leave the apex desktop shell to the Phase 4 gate. This honours the spirit of "frame first" (page migration happens inside its final frame) without touching the risky surface early.
- **Desktop-frame-first anyway.** Follow the guide literally, and pull the `features/desktop` spike forward to Phase 2. Front-loads the biggest unknown, which is either brave or reckless depending on how much the answer changes the plan.
- **Skip the frame; go primitives-first.** Migrate shared primitives inside the existing shells and defer all frame work. Departs from Astryx's guidance and risks rebuilding pages twice — once inside the old frame, once inside `AppShell`.

## Phase 2 — Move the app frame (`AppShell`)

Astryx's guide is emphatic that the shell comes before any page: *"Start with AppShell so page migration happens inside the final navigation, spacing, surface, and responsive frame. This also exposes theme and color issues early because every route shares the same shell."*

Reference skeleton: `bunx astryx template AppShellTopNavWithSideNav --skeleton`.

| Legacy surface | Astryx |
|---|---|
| Header | `TopNav` |
| Sidebar | `SideNav` (sections + nested items; selection driven by the router) |
| Main page wrapper | `AppShell` + `Layout` |
| Mobile drawer nav | `MobileNav` / `AppShell` mobile behavior |
| Settings menu | `Popover` + `Layout` + `Switch` (home for the future theme toggle) |

## Phase 3 — Replace shared primitives, surface by surface

Order by ascending risk: `routing` (6 files) → `marketing` (11) → `auth` (8) → `tenant` (9).

**A surface is fully migrated or not migrated — never mixed.** Per surface: read the docs for the pattern, inspect the template skeleton, read `bunx astryx component <Name>` before editing, swap primitives, strip that surface's Tailwind classes, then verify.

Do **not** wrap old shadcn components in Astryx styles. Astryx: *"Replace the primitive with the component that owns the behavior, accessibility, state classes, and token usage."*

**Rename map (the 28 in use → Astryx):**

| shadcn | Astryx | | shadcn | Astryx |
|---|---|---|---|---|
| `button` | `Button` / `IconButton` | | `label` | `FieldLabel` |
| `spinner` | `Spinner` | | `select` | `Selector` / `Typeahead` |
| `input` | `TextInput` | | `separator` | `Divider` |
| `dialog` | `Dialog` | | `alert` | `Banner` / `Toast` |
| `alert-dialog` | `AlertDialog` | | `accordion` | `Collapsible` |
| `card` | `Card` | | `toggle` | `ToggleButton` |
| `table` | `Table` | | `textarea` | `TextArea` |
| `tabs` | `Tabs` / `TabList` | | `checkbox` | `CheckboxInput` / `CheckboxList` |
| `badge` | `Badge` | | `avatar` | `Avatar` |
| `breadcrumb` | `Breadcrumbs` | | `dropdown-menu` | `DropdownMenu` / `MoreMenu` |
| `skeleton` | `Skeleton` | | `slider` | `Slider` |
| `tooltip` | `Tooltip` | | `field` | `Field` |

Needing judgement rather than a swap:
- **`form` (7 consumers)** — ✅ **BRIDGE DONE.** `src/components/form/` now holds `FormTextInput`, `FormTextArea`, and `FormSelector` (13 tests). Astryx ships no RHF binding, and its docs say `TextInput` must NOT be wrapped in `Field` — it already owns its label, description and status. So the bridge is thin: RHF owns the value, and `fieldState.error` becomes Astryx's `status`, which is what sets `aria-invalid` and renders the message. Six of the seven consumers are migrated (login, register, reset-password, forgot-password, join-tenant, ContactForm). `tenant-settings-page` is deliberately **deferred** — see below.

  Three things this surfaced, which apply to every remaining surface:
  - **`TextInput` has no `autoComplete`.** Astryx's `BaseProps` extends `React.HTMLAttributes`, not `InputHTMLAttributes`, so input-only attributes (`autoComplete`, `maxLength`, `readOnly`, `pattern`) are absent from the prop types — though rest props DO reach the input, so they work at runtime. Passed through with a narrow cast and pinned by a test. Without it, password managers stop working on the auth forms.
  - **Astryx `Selector` is a combobox, not a native `<select>`.** `user.selectOptions()` does not work on it; tests must open the combobox and click the option. Its option list also stays mounted when closed, so assert on the *selected value* (scoped to the trigger), never on an option's presence.
  - **`register-form` has no `autoComplete` at all** — a pre-existing gap, not caused by the migration. Left as-is to keep the diff faithful, but worth fixing: a registration form without `autocomplete="new-password"` won't prompt a password manager to save the credential.

- **`tenant-settings-page` deferred, on purpose.** Its form is only part of the page; the rest is `Card`, `Alert`, and `AlertDialog`. Migrating just the fields would leave Astryx inputs inside shadcn chrome — precisely the mixed screen that ADR-015 and `AGENTS.md` prohibit. It gets migrated whole, with the `tenant` surface.
- **`scroll-area` (3 marketing pages)** — check whether Astryx `Layout` absorbs it.
- **`sheet`** — only used inside the dead `sidebar`; should vanish in Phase 1.

## Phase 4 — `features/desktop` (gated)

79 files, 6,450 lines of window-manager chrome — the newest code in the repo and the least compatible with Astryx's layout model. Migrates via `swizzle`, last, behind a gate.

1. **Spike one window end-to-end** (chrome + menubar + context menu), swizzling where needed.
2. **Then decide explicitly.** If most of the chrome needs swizzling, that is opting out of the design system exactly where our UI is most custom — **stop and reopen ADR-015.** This is also the moment to decide whether the residue justifies adopting StyleX.
3. On proceed: migrate the remaining windows, replace `glass-panel`, move the desktop context menu onto Astryx's `ContextMenu`.

## Phase 5 — Close out — ⚠️ TAILWIND REMOVAL IS BLOCKED ON A DESIGN DECISION

**Everything else is done.** `components/ui/` is deleted, Radix is at zero, 62 dependencies are down to 27. Tailwind is the only thing left — and it is not a migration task any more, it is a marketing redesign.

### The numbers

| Area | `className` sites | hardcoded hex |
|---|---|---|
| `features/marketing` | **748** | **586** |
| `features/desktop` | 110 | 24 (traffic lights + glass) |
| everything else | 54 | ~0 |

Tailwind cannot be removed from the build while 748 class sites remain, so partial removal buys nothing. The work is concentrated almost entirely in marketing.

### Why it is a decision, not a task

Marketing carries its own **bespoke palette**, and it is not Astryx's:

| Marketing | Count | Nearest Astryx token | Same? |
|---|---|---|---|
| `#1A1A1A` (body text) | 106 | `--color-text-primary` = `#0A1317` | no |
| `#6B6B6B` (secondary) | 119 | `--color-text-secondary` = `#4E606F` | no |
| `#9CA3AF` (muted) | 55 | — | — |
| `#E5E5E5` / `#D1D1D1` (borders) | 76 | `--color-border-emphasized` = `#CCD3DB` | no |
| `#2563EB` (link blue) | 44 | — (theme accent is Klynt orange) | no |
| `#F5F3EF` / `#FAFAF8` (surfaces) | 53 | `--color-background-surface` = `#ffffff` | no |

These are close to Astryx's neutrals but **not equal** to them. Mapping 586 hex values onto tokens means accepting a visible shift in the marketing site's colour: warmer greys become cooler, the blue links have no token at all, and the off-white surfaces become white. That is a design call, not a refactor, and it must be made by someone who owns the marketing look.

The layouts are the same story: hero sections, product slides, pricing tables and the docs page are bespoke marketing compositions, not app screens. Astryx's components do not express them; they would move to CSS Modules with `var(--color-*)`, or be redesigned onto Astryx primitives.

### Recommended sequence

1. **Decide the palette.** Either (a) adopt Astryx's neutrals and accept the colour shift, or (b) extend `klynt-theme.ts` with the marketing palette as explicit token overrides via `defineTheme` (the accent already works this way), so the marketing colours become tokens instead of hex.
2. **Then** convert marketing surface-by-surface, with a **browser pass per page** — this is the one area where a silent visual regression is both likely and invisible to the test suite.
3. Remove `tailwindcss`, `@tailwindcss/vite`, `tailwind-merge`, `clsx`, the `cn()` helper, the Vite plugin, and the layer block in `index.css`.
4. Flip `Theme` `mode` from `"light"` to `"system"` and add the theme control.
5. Regenerate the agent block (it switches to the no-Tailwind variant automatically once Tailwind leaves `package.json`).
6. Mark ADR-015 **Accepted**.

Option (b) is the cheaper and safer path: it makes the marketing palette theme-driven without changing a single rendered colour, and it removes the hex without a redesign.

## Phase 5 — original close-out checklist

1. Delete `frontend/src/components/ui/`; remove the last `@radix-ui/*`.
2. **Remove Tailwind**: `tailwindcss`, `@tailwindcss/vite`, `tailwind-merge`, `clsx`, `class-variance-authority`, the `cn()` helper, the Vite plugin, and the layer/bridge block in `index.css`.
3. Add the real theme control and flip `Theme` `mode` from `"light"` to `"system"`.
4. Update `AGENTS.md` (drop the in-transition framing; Tailwind out of the stack table; drop the `cn()` convention). Regenerate the Astryx agent block — it will switch to the no-Tailwind variant automatically once Tailwind leaves `package.json`.
5. Mark ADR-015 **Accepted**.

## Verification (every surface, before moving on)

Astryx's checklist, plus ours:

- Light **and** dark mode: surfaces, borders, text, icons, hover, focus rings, status colors.
- Keyboard nav; focus returns to trigger after dialogs/palette.
- Empty / error / loading states.
- **Verify portals in a real browser, not just jsdom.** jsdom does not evaluate CSS, so it cannot catch `color-scheme` / `light-dark()` faults — the portal bug above passed 860 green tests and a clean build. Dialogs, popovers, and toasts need a browser pass.
- Screenshot the surface. Wait for entry animations to settle first — the desktop window fades in, and screenshotting early produces a convincing but false "everything is broken" image.
- Grep for leftover hardcoded hex/`px` and one-off hover colors after each surface.

## Notes

- **Regenerating agent docs:** always run from `frontend/` (`bunx astryx init --features agents --agent-docs-path <path>`). From the repo root the CLI finds no `package.json`, falls back to a generic block, and writes wrong facts into `AGENTS.md` (`npx` not `bunx`, "90+ components", a false "no Tailwind compiler here" rule). Splice the frontend-generated block between the `<!-- ASTRYX:START/END -->` markers.
- **`bunx astryx upgrade --apply`** after any `@astryxdesign/core` bump — then re-check the portal fix.
