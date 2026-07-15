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

| Family | Why there is no token | Where it lives |
|---|---|---|
| **Opacity** | Astryx ships no `--opacity-*` scale. (`0`/`1` inside `@keyframes` are endpoints — "hidden"/"shown" — not design values.) | **4** raw `opacity:` in marketing/desktop CSS. |
| **Letter-spacing / tracking** | Astryx's typography tokens are size/weight/family only — there is no tracking token. | **5** `letter-spacing: 0.05em`/`0.08em` on eyebrow labels. |
| **Serif font family** | Astryx ships `--font-family-{body,heading,code}` but **no serif/editorial family**. The Community page is a *newspaper*, and its masthead deliberately keeps a Georgia serif — a brand identity, not a system value. Implemented the Astryx-sanctioned way: a scoped `--font-family-heading` retarget on `.masthead` so the `Heading` component picks it up, not a font hardcoded on the element. **Deliberate product deviation — flagged for the owner; revert to Astryx's heading font if system-purity is preferred.** | `community-header.module.css` `.masthead`. |
| **Gradient geometry** | The *colours* of every gradient are `var(--color-*)`; the *angle* (`135deg`) and repeat pattern are geometry, which no design system tokenizes. | 2 marketing gradients. |
| **z-index** | Astryx ships **no z-index token at all** — its own overlays hardcode `500`/`9999`. Stacking order is compositional; the window manager's `zIndex` is literally application state. | 9 integers in desktop/marketing CSS. |
| **Breakpoints** | CSS forbids `var()` in a media-query condition, and Astryx ships no breakpoint constant. Container-driven layout (`Grid columns={{minWidth}}`) replaced every CSS `@media (min-width)`; what remains is one JS `useMediaQuery("(max-width: 1023px)")` for the mobile-fallback swap. | `DesktopEnvironment.tsx`. |
| **Spring physics** | Astryx's motion model is tween-only (duration + easing). There is no stiffness/damping token. | 2 springs: the window drag (`Window.tsx`) and the slide-deck (`SlideDeck.tsx`). |
| **Ambient-loop timing** | Infinite decorative loops (float, caret-blink, pulse) run 1–3s — beyond Astryx's slowest token (`--duration-slow-max` = 1300ms) — and want symmetric `ease-in-out`, which Astryx does not ship (only `--ease-standard`, an ease-*out* curve for entrances). | 3 CSS `@keyframes` + 1 framer-motion loop. |
| **Dimensions > 48px** | Astryx's spacing scale stops at 48px and it ships no dimension token above it — its API states "numbers are treated as pixels" and expects dimensions to travel as **component props**. So these are `<Card width={280}>`-style props via named consts, not CSS. | Named consts in marketing/desktop. |
| **`min-width: 10rem`** | `StackProps` exposes `width`/`maxWidth`/`minHeight` but no `minWidth`, and there is no spacing token at 160px. | Context-menu min width. |
| **Token values mirrored into JS** | A CSS custom property can't appear in JS arithmetic (`Math.max`, `innerHeight - x`, `100 - 2*p`). Where a spacing/size *token* is needed as a number, it lives as a single named constant that names its token and must stay equal to it — not a free magic number. `MENUBAR_HEIGHT = 40` (`--spacing-10`, exported, one source of truth), `DOC_CARD_PADDING_PX = 16` (`--spacing-4`). The motion module (`astryx-motion.ts`) is the systematic version — it *reads* the live token rather than mirroring it. | `window-module.ts`, `DocSection.tsx`. |
| **sr-only `1px` clip** | Not a design value — the WAI visually-hidden mechanism. `0` drops the node from the a11y tree; `display:none` drops it from tab order. | `skip-link.module.css`. |
| Choreography (`delay`, stagger) | Not a token family: *when* a step starts in a sequence, not a reusable design constant. Astryx ships no delay/stagger token. | framer-motion `delay`/`index*n` throughout. |

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
