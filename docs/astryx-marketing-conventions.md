# Migrating a surface off Tailwind onto Astryx

The contract every migrated file follows. Reference implementation:
`frontend/src/features/marketing/sections/HeroSection.tsx` + `hero-section.module.css`.

## The rules

1. **No Tailwind. No `className="flex gap-3 ..."`.** No `cn()`, no `clsx`, no `cva`. These are
   being removed from the build; a single surviving utility class keeps Tailwind alive.
2. **No hardcoded colour.** Zero `#rrggbb`, zero `rgb()`, zero named colours. Every colour comes
   from an Astryx token.
3. **Astryx components first.** Reach for a component before you reach for CSS:
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

4. **CSS Modules for what Astryx cannot express.** Bespoke marketing layout — responsive
   multi-column heroes, slide decks, pricing tables — goes in a co-located
   `kebab-case.module.css`, using **only** Astryx CSS variables. This is Astryx's own documented
   path: *"Most DOM styling should stay on the CSS-variable path"*
   (`bunx astryx docs styling-libraries`). Do **not** reach for StyleX/`xstyle` — the compiler is
   not in this build.

## The token map

Resolved from the live theme (warm neutrals, derived from the Klynt orange accent).

| Old marketing hex | Meaning | Token |
|---|---|---|
| `#1A1A1A` | body text | `var(--color-text-primary)` |
| `#6B6B6B` | secondary text | `var(--color-text-secondary)` |
| `#9CA3AF` | muted / metadata | `var(--color-text-disabled)` |
| `#2563EB` | link blue | `var(--color-text-blue)` |
| `#F76E18` | brand orange | `var(--color-accent)` |
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

We are adopting Astryx's palette, not preserving the old one. The neutrals are **warm**
(`--color-text-primary` is `#241914`, not `#1A1A1A`; the body ground is a warm cream, not white)
and the link blue is Astryx's, not `#2563EB`. That shift is intended and signed off — do not
reintroduce the old hex to "fix" it.

## Non-negotiables

- Keep every i18n key, `data-testid`, `aria-label` and `onClick` behaviour.
- Icons stay `lucide-react`; pass them as **elements** (`icon={<Copy />}`), never components.
- Tests must stay green. Query by accessible name (`getByRole("button", {name})`) rather than
  `title` — Astryx exposes `label` as `aria-label`.
- Run `bunx tsc --noEmit -p tsconfig.app.json` and the file's tests before you call it done.
