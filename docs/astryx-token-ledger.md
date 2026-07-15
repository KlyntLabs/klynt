# Design-token ledger

Every design-token family in the frontend, and where its values come from. The rule (ADR-015): a
value that Astryx's token system *can* express must come from a token; a value it *cannot* express
is an explicit, enumerated exception with a stated reason. This file is the complete accounting —
if a family is not listed here, it does not exist in the app.

Re-verify with the audit script at the bottom on any Astryx upgrade.

## Tokenized — sourced from Astryx, zero hardcoded values

| Family | Astryx token | How we consume it |
|---|---|---|
| Colour | `--color-*` (132) | Component props + `var(--color-*)` in CSS modules. Zero hex/rgb/hsl. |
| Spacing | `--spacing-0…12` (0–48px) | `gap`/`padding` props + `var(--spacing-*)`. Zero raw px ≤48px. |
| Typography | `--font-size-*`, `--font-weight-*`, `--font-family-*` | `Text`/`Heading` props + `var(--font-*)`. Zero raw font values. |
| Radius | `--radius-*` (11) | `Card` etc. + `var(--radius-*)`. Zero raw radii. |
| Shadow / elevation | `--shadow-*` (11) | `var(--shadow-*)`. Zero raw box-shadow. |
| Element size | `--size-sm/md/lg`, `IconSize` | `Icon size=`, component size props. Zero icons sized in CSS. |
| Border width | `--border-width` | `var(--border-width)`. |
| **Motion — duration** | `--duration-*` (9 bands) | CSS: `var(--duration-*)`. framer-motion: `tween()` from `src/core/motion/astryx-motion.ts`, which reads the live token and reshapes it (ms→s). |
| **Motion — easing** | `--ease-standard` | CSS: `var(--ease-standard)`. framer-motion: `easeStandard()`, which parses the live token into a bezier array. |
| Transition | `--transition-*` | `var(--transition-*)`. |

**The motion module is the one place the two systems are bridged.** framer-motion needs JS numbers
(seconds) and a bezier array; Astryx ships CSS custom properties (ms, a `cubic-bezier()` string).
`astryx-motion.ts` reads the *real* token off the document root — the value flows from Astryx, not
a copy — with the shipped values as a fallback only for environments that can't read CSS (jsdom).

> **Docs-vs-shipped warning.** Astryx's `docs motion` page lists durations of 175/410/975ms, but
> `@astryxdesign/theme-neutral` 0.1.5 *actually ships* 125/300/700ms (verified against the live
> browser value). The module's jsdom fallback mirrors the **shipped** values. This is the same
> class of discrepancy as `Icon`'s under-reported colours and `Toast`'s `onDismiss` — trust the
> shipped token/`.d.ts`, never the CLI docs.

## Exceptions — Astryx ships no token for this family

Each of these is a value with no Astryx token *by design*. None is a matter of effort. If a future
Astryx release adds the token, migrate it and delete the row.

Only three things remain, and each is **technically impossible** to express as an Astryx token —
not a matter of taste or effort. Everything that was merely *un-tokenizable-but-decorative* has been
**deleted** rather than kept (see "Flourishes removed" below).

| Family | Why it is impossible, not just tokenless | Where it lives |
|---|---|---|
| **z-index** | Stacking order is not a design value any system tokenizes — Astryx's own overlays hardcode `500`/`9999`, and it ships no z-index token. Every instance is *compositional or stateful*: the window manager's `zIndex` is per-window application state (`Z_INDEX_BASE + focus order`); the desktop chrome (menubar, cookie banner, icon field) must sit above that dynamic range; the customers filter bar is `position: sticky` over a scrolling table; the skip link must overlay the page when focused. None can be a CSS value. | 9 declarations: `window-module.ts` (state), desktop chrome, `customers-page` (sticky), `skip-link`. |
| **Viewport breakpoint** | CSS forbids `var()` in a media-query condition, and Astryx ships no breakpoint constant. This is the *last* one: every CSS `@media (min-width)` was replaced by container-driven `Grid columns={{minWidth}}`. What remains is a single **JS** `useMediaQuery("(max-width: 1023px)")` that swaps the whole desktop for a mobile fallback — a control-flow decision, not styling, and a `window.matchMedia` string that cannot hold a token. | `DesktopEnvironment.tsx`. |
| **sr-only `1px` clip** | The WAI visually-hidden mechanism, explicitly an accessibility requirement. `0×0` drops the node from the accessibility tree; `display:none` / `visibility:hidden` drop it from tab order — both defeat a skip link. The `1px` is the mechanism, not a design value. | `skip-link.module.css`. |

### Not exceptions — these *are* the Astryx pattern

- **Dimensions > 48px** (`<Card width={280}>` via named consts). Astryx's own sizing API states
  "numbers are treated as pixels" and expects dimensions to travel as component props. Passing a
  number to a `SizeValue` prop is using Astryx as designed, not deviating from it.
- **Spacing tokens read into JS.** `MENUBAR_HEIGHT = spacingPx(10)` and
  `DOC_CARD_PADDING_PX = spacingPx(4)` *read the live `--spacing-*` token* off the root (via
  `core/theme/astryx-tokens.ts`), the same way the motion module reads `--duration-*`. The value
  flows from Astryx; only the jsdom fallback is a literal. Needed because JS arithmetic
  (`Math.max`, `innerHeight - x`) can't contain a `var()`.
- **Choreography** (`delay`, stagger). *When* a step starts in a sequence — orchestration, not a
  reusable design value. Durations and easings within each step come from `tween()` tokens.

### Flourishes removed (rather than kept as exceptions)

Per the "strict adherence over the current look" directive, everything Astryx couldn't express and
that was purely decorative was **deleted**, not documented:

- **Opacity dimming** → gone. The hedgehog garden (desktop) and the faint docs banner image were
  deleted outright; slide-deck thumbnail dimming now uses an Astryx selected-state border, not a
  bespoke `opacity`.
- **Letter-spacing / tracking** (5 eyebrow labels) → removed; the labels keep their uppercase.
- **Gradients** (2) → the accent-orange plate and the docs barber-pole are solid `--color-*` now.
- **Spring physics** (2) → the window open/settle and slide-deck transition are `tween()` tokens;
  the springy overshoot is gone.
- **Ambient loops** (4) → the hero mascot float, the typewriter blinking caret, the analytics
  pulse, and the About mascot bob are all deleted; those elements sit still.
- The docs hero's `MediaTheme mode="dark"` accent band (which went white-on-white in dark mode once
  the scrim was removed) is now a plain muted surface with a default Heading — a real contrast fix.

## Audit script

Run from `frontend/`. Any hit outside the exception rows above is a regression.

```sh
# colour
grep -rnE '#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(' --include='*.module.css' src | grep -v 'var('
# raw px in CSS (only the sr-only clip should show)
grep -rnE '[^a-zA-Z-][0-9]+px' --include='*.module.css' src | grep -vE '^\s*\*|/\*'
# hardcoded framer-motion timing (should be empty — use tween()/easeStandard())
grep -rnE 'duration:\s*[0-9.]+|ease:\s*\[' --include='*.tsx' src | grep -v test | grep -v 'Infinity'
# @media (min-width) breakpoints (should be empty — use Grid columns={{minWidth}})
grep -rn '@media (min-width' --include='*.module.css' src
```
