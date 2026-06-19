# NeoBrutalism Design System Implementation

## Goal

Adopt the visual language of the **NeoBrutalism Web Components | RetroUI (Community)** Figma file for the Klynt Education Platform frontend. This means updating global design tokens, restyling existing UI primitives, and adding the missing primitives so the product shares the same bold, high-contrast, hard-shadow aesthetic shown in the source file.

## Source

- **Figma file:** `NeoBrutalism Web Components | RetroUI (Community)`
- **URL:** https://www.figma.com/design/3VOlzlQYjijexvaxREGm5g/NeoBrutalism-Web-Components-%7C-RetroUI--Community---Community-
- **Design-code parity reference:** RetroUI (`https://www.retroui.dev`) — the Figma file is the matching design kit for this React + Tailwind library.

## Visual summary

The design system is defined by:

- **Thick black borders** (`#000000`, ~2px) on almost every element.
- **Hard, offset drop shadows** (black, offset right and down, no blur) to create the "lifted paper" look.
- **Bright, flat primary accent:** a vivid yellow (`#FFDC5F` / `#FFD93D`).
- **High-contrast text:** black on white/off-white backgrounds.
- **Bold, geometric typography:** Space Grotesk for UI text, Archivo Black for display, Space Mono for code/mono accents.
- **Slightly rounded corners** (small, consistent radius) that still feel chunky.
- **No gradients, no soft shadows, no blur-heavy overlays.**

## Design tokens

### Colors

| Token | Light value | Dark value (TBD) | Usage |
|-------|-------------|------------------|-------|
| `--color-background` | `#FFFFFF` | `#1A1A1A` | Page background |
| `--color-foreground` | `#000000` | `#FFFFFF` | Primary text |
| `--color-primary` | `#FFDC5F` | `#FFDC5F` | Primary buttons, highlights |
| `--color-primary-foreground` | `#000000` | `#000000` | Text on primary |
| `--color-secondary` | `#F3F3F3` | `#2A2A2A` | Secondary buttons / muted surfaces |
| `--color-secondary-foreground` | `#000000` | `#FFFFFF` | Text on secondary |
| `--color-muted` | `#F3F3F3` | `#2A2A2A` | Muted backgrounds |
| `--color-muted-foreground` | `#6B7280` | `#A1A1AA` | Placeholder / helper text |
| `--color-accent` | `#FF90E8` | `#FF90E8` | Accent surfaces (pink) |
| `--color-accent-foreground` | `#000000` | `#000000` | Text on accent |
| `--color-destructive` | `#EF4444` | `#EF4444` | Errors / destructive actions |
| `--color-destructive-foreground` | `#FFFFFF` | `#FFFFFF` | Text on destructive |
| `--color-success` | `#22C55E` | `#22C55E` | Success states |
| `--color-success-foreground` | `#000000` | `#000000` | Text on success |
| `--color-warning` | `#F59E0B` | `#F59E0B` | Warning states |
| `--color-warning-foreground` | `#000000` | `#000000` | Text on warning |
| `--color-border` | `#000000` | `#FFFFFF` | Component borders |
| `--color-ring` | `#000000` | `#FFFFFF` | Focus rings |
| `--color-card` | `#FFFFFF` | `#1A1A1A` | Card backgrounds |
| `--color-card-foreground` | `#000000` | `#FFFFFF` | Text on cards |
| `--color-ring-offset` | `#FFFFFF` | `#1A1A1A` | Focus ring offset |

### Shadows

- `--shadow-hard`: `4px 4px 0 0 #000000`
- `--shadow-hard-sm`: `2px 2px 0 0 #000000`
- `--shadow-hard-lg`: `6px 6px 0 0 #000000`
- Active/pressed state removes the offset shadow and shifts element (`translate-x-[2px] translate-y-[2px]`).

### Border width

- Default component border: `2px` (`border-2`).
- Thicker variant for emphasis: `3px` (`border-3`).

### Border radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `0.25rem` | Small controls |
| `--radius-md` | `0.375rem` | Inputs, buttons |
| `--radius-lg` | `0.5rem` | Cards, dialogs |
| `--radius-xl` | `0.75rem` | Large cards, modals |

### Typography

- **Font family (body/UI):** `"Space Grotesk", system-ui, sans-serif`
- **Font family (display/headings):** `"Archivo Black", "Space Grotesk", system-ui, sans-serif`
- **Font family (mono):** `"Space Mono", ui-monospace, monospace`
- Existing headings hierarchy preserved (h1 page, h2 section, h3 subsection).

### Spacing

Reuse the existing Tailwind spacing scale. The NeoBrutalist look needs consistent, slightly chunky internal padding:

- Buttons: `px-4 py-2` (default), `px-3 py-1.5` (sm), `px-6 py-3` (lg).
- Cards: `p-6`.
- Inputs: `px-4 py-2`.
- Maintain existing scale; avoid arbitrary pixel values.

## Component inventory

### Existing primitives to restyle

Located in `frontend/src/core/ui/`:

1. `button.tsx`
2. `card.tsx`
3. `input.tsx`
4. `label.tsx`
5. `badge.tsx`
6. `avatar.tsx`
7. `dialog.tsx`
8. `separator.tsx`
9. `skeleton.tsx`
10. `spinner.tsx`
11. `breadcrumb.tsx`
12. `empty-state.tsx`
13. `query-error.tsx`

### New primitives to add

Based on the RetroUI component list and the Figma cover:

1. `alert.tsx`
2. `accordion.tsx`
3. `checkbox.tsx`
4. `radio-group.tsx`
5. `switch.tsx`
6. `select.tsx`
7. `textarea.tsx`
8. `tabs.tsx`
9. `tooltip.tsx`
10. `progress.tsx`
11. `slider.tsx`
12. `table.tsx`
13. `popover.tsx`
14. `command.tsx`
15. `sonner.tsx` (toasts)
16. `toggle.tsx`
17. `toggle-group.tsx`
18. `menu.tsx` / dropdown menu
19. `context-menu.tsx`
20. `text.tsx` (typography primitives)

### Out of scope for this pass

Charts (`bar-chart`, `line-chart`, `area-chart`, `pie-chart`) are listed in RetroUI but are data-visualization components that require dedicated dependencies and are not visible in the core UI kit cover. They are excluded from this implementation.

## Implementation approach

We will deliver the work in three incremental phases. Each phase lands independently and keeps the app buildable and testable.

### Phase 1 — Tokens, CSS, and utilities

- Update `frontend/src/index.css` with NeoBrutalist color, shadow, border, radius, and font tokens.
- Add hard-shadow utility classes.
- Update `frontend/src/lib/utils.ts` if new shared utilities are needed (e.g., `hardShadow`, `hardShadowActive`).
- Add Space Grotesk / Archivo Black / Space Mono fonts via Google Fonts or local font files.

### Phase 2 — Restyle existing primitives

Apply the new tokens to the existing components in `frontend/src/core/ui/`:

- **Button:** primary filled yellow with black border + hard shadow; secondary/outline white with black border; destructive red; active state shifts down/right and removes shadow.
- **Card:** white background, black border, hard shadow, rounded-lg.
- **Input:** white background, black border, hard shadow on focus, placeholder muted.
- **Label:** bold, black text.
- **Badge:** variants for default (yellow), secondary, outline, destructive.
- **Avatar:** circular, black border.
- **Dialog:** white panel, thick black border, hard shadow.
- **Separator:** black line.
- **Skeleton:** muted background with no gradient (flat).
- **Spinner:** black or primary yellow.
- **Breadcrumb:** black text, separators as `>` or `/`.
- **EmptyState / QueryError:** card-like container with bold heading.

### Phase 3 — Add new primitives

Add the high-impact missing components, prioritizing form and feedback primitives:

1. **Alert** — simple composable alert with icon, title, description.
2. **Accordion** — built on `@radix-ui/react-accordion`.
3. **Checkbox / Radio / Switch** — built on respective Radix primitives.
4. **Select / Textarea** — styled native/select primitive.
5. **Tabs** — built on `@radix-ui/react-tabs`.
6. **Tooltip** — built on `@radix-ui/react-tooltip`.
7. **Progress / Slider** — built on respective Radix primitives.
8. **Table** — composable table components.
9. **Popover / Command / Sonner / Toggle / ToggleGroup / Menu / ContextMenu** — added after the core set if time permits.

Each new component follows the existing conventions:

- Co-located `.tsx`, `.stories.tsx`, and `.a11y.test.tsx`.
- Uses `cva` for variants.
- Uses `cn()` for class composition.
- Forwards refs.
- Includes proper ARIA attributes.
- User-facing strings use the `ui` i18n namespace and are mirrored in `en`, `vi`, `cn`.

## Dependencies

New runtime dependencies likely required:

- `@radix-ui/react-accordion`
- `@radix-ui/react-checkbox`
- `@radix-ui/react-radio-group`
- `@radix-ui/react-select`
- `@radix-ui/react-slider`
- `@radix-ui/react-switch`
- `@radix-ui/react-tabs`
- `@radix-ui/react-tooltip`
- `@radix-ui/react-popover`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-context-menu`
- `@radix-ui/react-toggle`
- `@radix-ui/react-toggle-group`
- `cmdk` (for Command)
- `sonner` (for Toaster)

Only install the packages needed for the components actually implemented in this session.

## File changes

- `frontend/src/index.css` — theme tokens and base styles.
- `frontend/src/lib/utils.ts` — shared styling constants (optional).
- `frontend/src/core/ui/*.tsx` — restyled existing components.
- `frontend/src/core/ui/*.stories.tsx` — updated stories.
- `frontend/src/core/ui/*.a11y.test.tsx` — updated/added a11y tests.
- `frontend/src/locales/{en,vi,cn}/ui.json` — new UI strings.
- `frontend/package.json` / `package-lock.json` — new dependencies.

## Testing & quality gates

- Run `npm run typecheck` after component changes.
- Run `npm run lint` (Biome) and fix any warnings.
- Run `npm run test:coverage` and ensure thresholds remain met.
- Use Storybook to visually verify each primitive.
- Keyboard-navigate and run axe checks for new interactive components.

## Success criteria

- Global tokens reflect the NeoBrutalist palette (yellow primary, black borders, hard shadows).
- All existing `core/ui` components visually match the Figma/RetroUI style.
- At least the Phase 3 core new primitives are implemented, typed, tested, and storied.
- `npm run check` (lint + typecheck) passes.
- `npm run test:coverage` passes with no regressions.
- No arbitrary pixel values or inline styles; all styling flows through tokens, `cn()`, and `cva`.
