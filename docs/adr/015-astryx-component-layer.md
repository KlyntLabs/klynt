# ADR-015: Astryx as the Frontend Component Layer

## Status

**Accepted** — 2026-07-14. **Amended 2026-07-14: all exceptions revoked. The product is adapted to
Astryx, never the reverse.** There is no marketing exception and no desktop exception. Where a
surface could not be expressed in Astryx, the *UI was redesigned* until it could — the design
system's constraints win, and the visual consequences are listed below and were accepted.

**Every design value in the frontend now comes from Astryx. There are no exceptions to that rule.**

| In `frontend/src` | Count |
|---|---|
| `<div>` / `<span>` / `motion.div` | **0** |
| `dangerouslySetInnerHTML` | **0** |
| Hardcoded colour (hex / `rgb()`) | **0** |
| Raw `px` in CSS | **0**, except the sr-only clip (see below) |
| `@media (min-width: …)` breakpoints | **0** |
| CSS `svg` selectors / icons sized in CSS | **0** |
| `*.module.css` files | **48** (was 59) |

`bunx tsc`, `bunx biome check`, **666 tests**, and the production build all pass. `marked` and
`isomorphic-dompurify` are removed from `package.json`.

### What is left, and why it is not a design value

This is the whole list. Nothing here is a styling exception; each is a mechanism the design system
does not model, and none can be closed by redesigning a screen.

1. **`z-index` — 9 integers.** Astryx ships **no z-index token at all**; its own overlays hardcode
   `500` and `9999`. A stacking order is compositional architecture, not a design value, and the
   window manager's `zIndex` is literally *application state* (which window is on top). Nothing to
   tokenise. Note the toast viewport needed no integer at all: Astryx's `LayerProvider` promotes it
   into the **CSS top layer** via `popover="manual"`, which is why `src/core/notifications/` was
   deleted outright rather than restyled.
2. **`width: 1px; height: 1px` in `skip-link.module.css`.** The WAI-recommended visually-hidden
   clip. It is not spacing — it is the mechanism that keeps the link in the accessibility tree and
   tab order while invisible. Astryx's `VisuallyHidden` is *not* the primitive for this despite the
   name: its docs say it "deliberately has no styling props; the whole point is to stay invisible",
   and a skip link must do the opposite on focus.
3. **`@media (prefers-reduced-motion: reduce)` — 3 blocks.** An accessibility requirement, not a
   breakpoint.
4. **`min-width: 10rem`** (context menu) and the `inputMode` / `maxLength` casts. `StackProps` has
   `width`/`maxWidth`/`minHeight` but **no `minWidth`**, and `BaseProps` explicitly `Omit`s
   `inputMode`. Upstream gaps; re-test on every Astryx bump.
5. **The `color-scheme` override in `index.css`.** **This is a patch for an upstream Astryx defect,
   not an exception to Astryx.** `core/src/reset.css:379-388` maps `html[data-theme]` →
   `color-scheme` in `@layer reset`, but `theme-neutral/dist/theme.css:79-80` re-declares an
   unconditional `:root { color-scheme: light dark }` in the higher `@layer astryx-theme`; layer
   order beats specificity, so the theme wins and every portalled surface falls back to the OS
   preference. Deleting it would not make us more native — it would ship broken dark mode, which
   now matters because the app defaults to `mode="system"`. Report upstream; retest on every bump.

### The reasoning this ADR originally used was wrong, and the correction is the main lesson

The first version of this ADR concluded: *"Astryx has no window primitive, therefore the window
frame must stay a `motion.div`."* **That is a non-sequitur, and it cost us a whole exempt
directory.** It conflates two separable things:

- a **surface** — border, elevation, radius, background. That is `Card`.
- a **behaviour** — drag, z-order, absolute position, spring physics. That is framer-motion.

You never needed a window *primitive*. You needed a ref-forwarding surface to attach behaviour to,
and **every Astryx component is one by design**: `BaseProps` explicitly documents that it keeps
`ref`, `style`, `className`, and event handlers. So the frame is now:

```tsx
const MotionCard = motion.create(Card);   // an Astryx Card that framer-motion drives
```

The same move deleted all 67 other `motion.div`s in the app (`MotionSection`,
`MotionClickableCard`, `MotionGrid`, …), and in most cases removed the wrapper element entirely
rather than renaming it. **The generalised rule — "ask which Astryx surface the behaviour attaches
*to*, never reach for a raw `motion.div` because Astryx lacks X" — is now rule 6 of
`docs/astryx-marketing-conventions.md`.**

Two other claims in the original ADR also turned out to be false, both discovered by grepping
rather than by reading the doc:

- **CSS Modules were never an "escape hatch" from Astryx.** `bunx astryx docs styling` lists CSS
  Modules as one of its four *supported* styling approaches ("all approaches resolve to the same
  design tokens"). The 57 co-located `*.module.css` files are native, and always were. What they
  must not carry is any *value* — only structural residue (`flex`, `overflow`, `min-width: 0`).
- **`No raw hex/px` was enforced at half strength.** `astryx-marketing-conventions.md` rule 2 said
  "no hardcoded colour" and silently dropped the `px` half of Astryx's actual rule. That is exactly
  why colour landed at a perfect 0/644 while 133 raw `px` survived. The contract enforced the half
  it had written down. Rule 3 now carries the `px` half explicitly.

**No hardcoded colour survives, and there are no exceptions.** The app runs on Astryx's stock
`neutralTheme`: no `defineTheme`, no accent, no token overrides. That means it has **no brand
colour** — the accent is Astryx's near-black/near-white, so every CTA is monochrome and the Klynt
orange is gone from the product. The macOS traffic lights are gone too, replaced by Astryx's
categorical hues, so the window controls read as red/amber/green but are no longer *the* macOS
lights. Both were knowing trades for being 100% native to the design system.

Note that this trade was *not* the price of being native, and the earlier version of this ADR was
wrong to imply it was: `defineTheme` **is** Astryx's sanctioned brand path ("brand/accent via
`astryx theme`"). Using it would keep the orange *and* keep zero hardcoded hex. Restoring a brand
colour is a one-file product decision, not a violation of this ADR.

Dark mode now works for the first time — `<Theme mode>` defaults to `system` and is driven by a
real control. It never worked before: nothing ever applied the old `.dark` class.

### How each former blocker was closed

Every item on the previous version of this list is gone. They are recorded here because *how* they
fell matters more than that they fell: in almost every case the blocker was a **premise nobody had
re-tested**, not a limit of the design system.

| Former blocker | How it was closed |
|---|---|
| The window frame "must" be a `motion.div` | `motion.create(Card)`. A window is a *surface* (Card) plus *behaviour* (framer-motion). `BaseProps` keeps `ref`/`style`/`className` by design, so framer-motion can drive any Astryx component. The premise — "Astryx has no window primitive" — was true and irrelevant. |
| The last `<div>` (`dangerouslySetInnerHTML`) | Astryx's `<Markdown>` takes the markdown *string* and renders components. `marked` + `DOMPurify` + `innerHTML` are deleted, and both deps removed. **A security improvement, not a swap:** there is no longer an HTML string to sanitise. Sanitising markup you never construct beats sanitising it well. |
| The 80px decorative glyph | `IconSize` tops out at `lg` (24px) and Astryx has no illustration primitive — so the *slide was redesigned*. The oversized bar-chart plate is gone; the six items are a `Grid` of `Card`s. |
| 16 `@media (min-width: …)` breakpoints | `Grid columns={{minWidth, max}}` — container-driven reflow, no media query. |
| `flex: 3` / `flex: 2` ratio | Redesigned to `columns={{minWidth, max: 2}}`. **The ratio was the thing we gave up**: Astryx cannot express a ratio that *also* reflows, and between a 3:2 split and a layout that works on a phone, reflow is the one users feel. See the note below. |
| `flex: 1` on `<main>` | `StackItem size="fill"` wrapping the `VStack`. StackItem is a flex *item* and `<main>` must also be a flex *container*, so the two compose rather than merge. |
| 4 `<span>`s | `Text as="span" display="inline"`, and the overlaid notification dot became an adjacent `StatusDot` — the primitive Astryx names for it. |
| `z-index: 50` on the toast viewport | `LayerProvider` promotes it into the **CSS top layer**. The integer did not need a token; it needed to not exist. |
| 1px hairline borders | **`--border-width` exists.** The claim that Astryx has no border-width token was simply false. |
| `body { min-width: 320px }` | Deleted. A legacy Tailwind guard; Astryx's grids are container-driven, and 320px is the narrowest real device. |
| macOS traffic lights "keep raw hex" | Already tokenised. Only the *comment* claiming an exception survived. |

**Four comments in this codebase were defending exceptions that did not exist**: the traffic-light
"raw hex" carve-out (already tokenised), a `--z-index-toast` token (Astryx ships none), "brand
orange from the klynt theme accent" (there is no klynt theme), and "StatusDot is not an 'something
is new' badge" (StatusDot has an `accent` variant). **A stated exception decays into an
unchallenged one.** Grep before believing this ADR.

### Visual changes this amendment introduced — eyeball before merge

Adapting the product to the design system has a bill, and it was paid knowingly:

- **Icons snap to Astryx's 12/16/20/24 scale.** The 28/32/48px marks (hero wordmark, product tiles)
  clamp to 24px; the traffic lights go 8px → 12px (`xsm` is the floor).
- **Desktop icons are Astryx `Card`s.** The backdrop blur, translucent chip, `scale(1.05)` hover and
  caption scrim are gone (Astryx has no blur token). The icon field is a centred 720px column, not
  full-bleed, so icons cluster centrally.
- **The Product Analytics "Track" slide lost its bar-chart illustration** and is now a card grid.
- **Pricing hero is 50/50, not 3:2**, and the community rails are equal thirds, not 25/50/25 —
  `columns={{minWidth}}` yields equal tracks.
- **Success toasts are no longer green.** Astryx's Toast is `info | error` only.
- The docs sidebar now stacks on narrow screens instead of hiding below 1024px.

### Astryx's CLI docs are unreliable — trust the `.d.ts`

Three separate under-reports were hit while doing this. **Read the types, not the CLI tables.**

- `Icon`'s `color` doc lists only the semantic set; `Icon.d.ts` also carries
  `blue|red|green|gray|cyan|teal|yellow|orange|pink|purple` → `--color-icon-<hue>`.
- `Toast`'s doc names the callback `onHide`; `Toast.d.ts` says `onDismiss`.
- Border tokens exist (`--border-width`) despite a migration brief asserting they did not.

Plus the `color-scheme` layer defect (Status, item 5), which is a genuine upstream bug.

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
- **`features/desktop` was the load-bearing risk, and the gate has now been run twice.** The first
  pass concluded *"Astryx dresses the window but cannot be the window"* and left two exceptions.
  **Both have since been closed, and both were mistakes rather than limits:**
  1. ~~The window frame remains a `motion.div`.~~ **Closed.** It is `motion.create(Card)` — an
     Astryx Card that framer-motion drives. The error was assuming a draggable surface needs a
     *window primitive*; it needs a *ref-forwarding surface*, which every Astryx component is. See
     the Status section.
  2. ~~The macOS traffic lights keep raw hex.~~ **Closed**, and in fact this one had already been
     fixed in the CSS (`--color-icon-red/yellow/green`) while `window-controls.tsx` went on
     carrying a comment declaring a "DELIBERATE ASTRYX EXCEPTION … raw hex" that described code
     which no longer existed. The comment was deleted.

  The lesson generalises past this ADR: **both "exceptions" were load-bearing comments, not
  load-bearing code.** A stated exception decays into an unchallenged one. When this ADR says
  something cannot be done, grep before believing it — the enumerated residue list in Status exists
  so that each remaining claim names the exact doc line or spec rule that blocks it, and can be
  re-tested in seconds.
- **Theme and brand go through `astryx theme`.** `--color-*` must never be overridden in `:root`; `@astryxdesign/theme-neutral` is the starting theme.
- **The `astryx` agent-docs block lives in root `AGENTS.md`** between `<!-- ASTRYX:START/END -->` markers. It must be regenerated from `frontend/` (`bunx astryx init --features agents --agent-docs-path <path>`) — running it from the repo root produces a *generic* block with wrong facts (`npx` instead of `bunx`, "90+ components", and a false "no Tailwind here" rule), because there is no `package.json` at the root for the CLI to detect from.
- **i18n is unaffected.** All user-facing strings stay in the `common`/`auth`/`errors`/`ui`/`validation` namespaces; only the components rendering them change.
