# The Astryx contract

**The frontend is 100% native Astryx. There are no exceptions — not for marketing, not for the
desktop.** This is the contract every file in `frontend/src` follows.

Reference implementations:
- `frontend/src/features/desktop/components/Window.tsx` — the hardest case. Read this one first.
- `frontend/src/features/marketing/sections/HeroSection.tsx` + `hero-section.module.css`.

## The rules

1. **No Tailwind. No `className="flex gap-3 ..."`.** No `cn()`, no `clsx`, no `cva`. Tailwind is
   out of the build; a single surviving utility class would bring it back.
2. **No hardcoded colour.** Zero `#rrggbb`, zero `rgb()`, zero named colours. Every colour comes
   from an Astryx token.
3. **No raw `px`.** This is the other half of Astryx's own `No raw hex/px` rule, and it is not
   optional. Values ≤48px on the 4px grid are `var(--spacing-N)` (the scale is
   `--spacing-0`…`--spacing-12` = 0…48px). Values above 48px have **no token by design** — Astryx
   expects dimensions to travel as *component props*, not CSS: every `SizeValue` prop states
   "numbers are treated as pixels", so `<Card width={280}>` and `<HStack maxWidth={720}>` are the
   native path. Move the number out of the stylesheet and onto the component.

   **There are no carve-outs.** An earlier version of this contract listed three, and all three
   were wrong — they are recorded here because each was a premise nobody re-tested:
   - ~~Hairline borders — "Astryx ships no border-width token."~~ **It does: `--border-width`.**
   - ~~`blur()` radii — "Astryx ships no blur token."~~ True, and the answer was to *delete the
     blur*, not to keep the px. Astryx not having a token is a statement about the design system's
     opinion; the response is to take the opinion.
   - ~~`@media (min-width: …)` — "CSS forbids `var()` in a media condition."~~ Still true, and
     still irrelevant: `Grid columns={{minWidth, max}}` reflows on the **container**, so the media
     query does not need tokenising — it needs deleting. All 16 are gone.

   When you find something Astryx "cannot express", assume you are wrong before you assume it is.
   The one thing you may never do is launder a value into a token that happens to share its
   arithmetic — `blur(4px)` is not `var(--spacing-1)`, and making a grep come out clean that way is
   worse than leaving the number honest.

   The only px left in the app is the sr-only clip in `skip-link.module.css` (`width: 1px`), which
   is an accessibility *mechanism*, not spacing. `@media (prefers-reduced-motion)` likewise stays —
   it is an a11y requirement, not a breakpoint.
4. **No `<div>`.** Astryx's rule is "components do all layout/spacing". `<VStack>` / `<HStack>` /
   `<Grid>` / `<Section>` / `<Card>` do the work. A `<div>` in a diff is a review blocker.
5. **No raw SVG, and never size an icon in CSS.** Astryx's `Icon` doc says it twice: *"Don't
   resize icons with arbitrary pixel values; use the provided size props"* and *"Don't render raw
   SVG elements; always wrap in Icon."* So `<BookOpen className={styles.rowIcon} />` plus
   `.rowIcon svg { width: 16px }` becomes `<Icon icon={BookOpen} size="sm" />` and the CSS rule is
   deleted. Note `Icon` takes a **component** (`icon={BookOpen}`), unlike `Button`, which takes an
   **element** (`icon={<Copy />}`).
6. **Behaviour composes onto Astryx; it does not replace it.** Astryx has no window primitive, and
   it does not need one. A window is a *surface* (border, elevation, radius — that is `Card`) with
   *behaviour* attached (drag, z-order, absolute position — that is framer-motion). Every Astryx
   component extends `BaseProps`, which deliberately keeps `ref`, `style`, `className` and event
   handlers, so `motion.create(Card)` drives one directly. **Reaching for a raw `motion.div`
   because "Astryx has no X" is the mistake this rule exists to prevent** — ask instead which
   Astryx surface the behaviour should be attached *to*. See `Window.tsx`.
7. **Astryx components first.** Reach for a component before you reach for CSS:
   | Instead of | Use |
   |---|---|
   | `<h1>`–`<h6>`, `text-4xl font-bold` | `<Heading level={1}>`, `type="display-1\|2\|3"` for hero copy |
   | `<p>`, `<span>`, `text-sm text-[#6B6B6B]` | `<Text type="body\|large\|label\|supporting\|code" color="secondary">` |
   | `<button className="bg-[#F76E18] ...">` | `<Button variant="primary\|secondary\|ghost\|destructive" label=... icon={<Icon />}>` |
   | icon-only button | `<IconButton label=... icon={<Icon />}>` (`label` is the accessible name) |
   | `flex flex-col gap-4` | `<VStack gap={4}>` |
   | `flex items-center gap-2` | `<HStack gap={2} align="center">` |
   | `grid grid-cols-3 gap-4` | `<Grid>` / `<GridSpan>` |
   | a page region | `<Section>` (NOT `Card` — Card is for discrete items) |
   | a discrete item (one product, one profile) | `<Card>` / `<ClickableCard>` |
   | `border-t` between regions | `<Divider />`, or `<Section dividers={["top"]}>` |
   | a link | `<Link>` (real `<a>`); a *button* that opens a window is a `<Button>`, not a link |
   | status / count | `<Badge>`; state dot → `<StatusDot>` |
   | accordion | `<Collapsible>` / `<CollapsibleGroup>` |
   | code sample | `<CodeBlock>` or `<Text type="code">` |

8. **CSS Modules are native, and carry structural residue only.** A co-located
   `kebab-case.module.css` is *not* an escape from Astryx — `bunx astryx docs styling` lists CSS
   Modules as one of its four supported styling approaches, and notes that "all approaches resolve
   to the same design tokens, so theming and dark mode work regardless of which you choose."

   What belongs in one is the residue that expresses **no design value at all**: `flex: 1`,
   `min-width: 0`, `overflow`, `user-select`, `position`, `cursor`, `grid-template-areas`. Astryx
   has no prop for these because they are not tokens — they are layout mechanics.

   What does **not** belong in one is any *value*: spacing, size, colour, radius, icon dimensions.
   Those go to a token or a component prop. If a `.module.css` is growing rules that set values,
   the component above it is under-using Astryx.

   Do **not** reach for StyleX/`xstyle` — the compiler is not in this build (see ADR-015).

## The token map

Resolved from Astryx's stock `neutralTheme`. There is no custom theme and no accent override.

| Old marketing hex | Meaning | Token |
|---|---|---|
| `#1A1A1A` | body text | `var(--color-text-primary)` |
| `#6B6B6B` | secondary text | `var(--color-text-secondary)` |
| `#9CA3AF` | muted / metadata | `var(--color-text-disabled)` |
| `#2563EB` | link blue | `var(--color-text-blue)` |
| `#F76E18` | (was brand orange) | `var(--color-accent)` — now Astryx's near-black/near-white. There is no brand colour. |
| `#E5E5E5` | hairline border | `var(--color-border)` |
| `#D1D1D1` | stronger border | `var(--color-border-emphasized)` |
| `#FFFFFF` | card / raised surface | `var(--color-background-surface)` |
| `#F5F3EF`, `#FAFAF8` | tinted surface | `var(--color-background-muted)` |
| `#22C55E` | success | `var(--color-text-green)` / `--color-background-green` |
| `#DC2626` | error | `var(--color-text-red)` / `--color-error` |
| `#1A1A2E` | inverted plate | `var(--color-background-inverted)` |

Spacing `var(--spacing-0…12)` · radius `var(--radius-element\|container\|page\|full)` ·
shadow `var(--shadow-low\|med\|high)` · type `var(--font-size-*)`, `var(--font-weight-*)`.

Full lists: `bunx astryx docs tokens`, `… docs color`, `… docs spacing`, `… docs shape`.

## Expect a visual change

We adopted Astryx's palette wholesale — its **stock `neutralTheme`**, with no `defineTheme`, no
accent and no token overrides. The app is 100% native to the design system and has **no brand
colour of its own**: the accent is Astryx's near-black (`#262626`) in light and near-white
(`#ebebeb`) in dark, so every primary button and CTA is monochrome. The Klynt orange is gone.

That shift is intended and signed off. Do not reintroduce a hex to "fix" it — reintroducing a
brand colour means reintroducing `defineTheme`, which is a decision, not a patch.

## Non-negotiables

- Keep every i18n key, `data-testid`, `aria-label` and `onClick` behaviour.
- Icons stay `lucide-react`; pass them as **elements** (`icon={<Copy />}`), never components.
- Tests must stay green. Query by accessible name (`getByRole("button", {name})`) rather than
  `title` — Astryx exposes `label` as `aria-label`.
- Run `bunx tsc --noEmit -p tsconfig.app.json` and the file's tests before you call it done.
