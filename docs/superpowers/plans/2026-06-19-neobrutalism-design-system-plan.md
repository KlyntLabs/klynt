# NeoBrutalism Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the RetroUI NeoBrutalism design system into the Klynt frontend by updating global tokens, restyling existing `core/ui` primitives, and adding the most commonly used missing primitives.

**Architecture:** CSS-first Tailwind v4 tokens define the NeoBrutalist palette and hard shadows. Existing components are restyled through `cva` variants and `cn()`. New interactive components are built on Radix primitives where appropriate, co-located with stories and a11y tests.

**Tech Stack:** React 19, TypeScript 6, Tailwind CSS v4, CVA, Radix UI, Storybook, Vitest, i18next.

---

## File inventory

**Modify:**
- `frontend/src/index.css`
- `frontend/src/lib/utils.ts`
- `frontend/src/core/ui/button.tsx`
- `frontend/src/core/ui/card.tsx`
- `frontend/src/core/ui/input.tsx`
- `frontend/src/core/ui/label.tsx`
- `frontend/src/core/ui/badge.tsx`
- `frontend/src/core/ui/avatar.tsx`
- `frontend/src/core/ui/dialog.tsx`
- `frontend/src/core/ui/separator.tsx`
- `frontend/src/core/ui/skeleton.tsx`
- `frontend/src/core/ui/spinner.tsx`
- `frontend/src/core/ui/breadcrumb.tsx`
- `frontend/src/core/ui/empty-state.tsx`
- `frontend/src/core/ui/query-error.tsx`
- `frontend/src/locales/{en,vi,cn}/ui.json`
- `frontend/package.json` / `package-lock.json`

**Create:**
- `frontend/src/core/ui/alert.tsx` (+ stories/tests)
- `frontend/src/core/ui/accordion.tsx` (+ stories/tests)
- `frontend/src/core/ui/checkbox.tsx` (+ stories/tests)
- `frontend/src/core/ui/radio-group.tsx` (+ stories/tests)
- `frontend/src/core/ui/switch.tsx` (+ stories/tests)
- `frontend/src/core/ui/select.tsx` (+ stories/tests)
- `frontend/src/core/ui/textarea.tsx` (+ stories/tests)
- `frontend/src/core/ui/tabs.tsx` (+ stories/tests)
- `frontend/src/core/ui/tooltip.tsx` (+ stories/tests)
- `frontend/src/core/ui/progress.tsx` (+ stories/tests)
- `frontend/src/core/ui/slider.tsx` (+ stories/tests)
- `frontend/src/core/ui/table.tsx` (+ stories/tests)

---

## Task 1: Install Radix primitives and font dependency

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json` (via install)

- [ ] **Step 1: Install packages**

Run from `frontend/`:

```bash
npm install @radix-ui/react-accordion @radix-ui/react-checkbox @radix-ui/react-radio-group @radix-ui/react-select @radix-ui/react-slider @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-tooltip
```

- [ ] **Step 2: Verify install**

Run:

```bash
npm ls @radix-ui/react-tabs @radix-ui/react-tooltip
```

Expected: versions printed, no peer dependency errors.

---

## Task 2: Update global design tokens and base styles

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Replace the `@theme` block with NeoBrutalist tokens**

Replace the entire `@theme { ... }` block in `frontend/src/index.css` with:

```css
@theme {
  /* NeoBrutalist color tokens */
  --color-background: #ffffff;
  --color-foreground: #000000;

  --color-primary: #ffdc5f;
  --color-primary-foreground: #000000;

  --color-secondary: #f3f3f3;
  --color-secondary-foreground: #000000;

  --color-muted: #f3f3f3;
  --color-muted-foreground: #6b7280;

  --color-accent: #ff90e8;
  --color-accent-foreground: #000000;

  --color-destructive: #ef4444;
  --color-destructive-foreground: #ffffff;

  --color-success: #22c55e;
  --color-success-foreground: #000000;

  --color-warning: #f59e0b;
  --color-warning-foreground: #000000;

  --color-border: #000000;
  --color-ring: #000000;
  --color-ring-offset: #ffffff;

  --color-card: #ffffff;
  --color-card-foreground: #000000;

  /* Radius tokens */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;

  /* Hard shadow tokens */
  --shadow-hard: 4px 4px 0 0 #000000;
  --shadow-hard-sm: 2px 2px 0 0 #000000;
  --shadow-hard-lg: 6px 6px 0 0 #000000;

  /* Animation tokens */
  --animate-fade-in: fade-in 0.2s ease-out;
  --animate-fade-out: fade-out 0.2s ease-in;
  --animate-spin: spin 1s linear infinite;
  --animate-pulse: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
}
```

- [ ] **Step 2: Update dark mode overrides**

Replace the `.dark { ... }` block with:

```css
.dark {
  --color-background: #1a1a1a;
  --color-foreground: #ffffff;

  --color-primary: #ffdc5f;
  --color-primary-foreground: #000000;

  --color-secondary: #2a2a2a;
  --color-secondary-foreground: #ffffff;

  --color-muted: #2a2a2a;
  --color-muted-foreground: #a1a1aa;

  --color-accent: #ff90e8;
  --color-accent-foreground: #000000;

  --color-destructive: #ef4444;
  --color-destructive-foreground: #ffffff;

  --color-success: #22c55e;
  --color-success-foreground: #000000;

  --color-warning: #f59e0b;
  --color-warning-foreground: #000000;

  --color-border: #ffffff;
  --color-ring: #ffffff;
  --color-ring-offset: #1a1a1a;

  --color-card: #1a1a1a;
  --color-card-foreground: #ffffff;
}
```

- [ ] **Step 3: Update base body font**

In `@layer base`, replace the `body` rule font-family with:

```css
body {
  @apply bg-background text-foreground antialiased;
  font-family: "Space Grotesk", system-ui, Avenir, Helvetica, Arial, sans-serif;
  font-display: swap;
  min-width: 320px;
  min-height: 100vh;
}
```

- [ ] **Step 4: Verify build**

Run:

```bash
cd frontend && npm run typecheck
```

Expected: no TypeScript errors.

---

## Task 3: Add shared NeoBrutalist styling constants

**Files:**
- Modify: `frontend/src/lib/utils.ts`

- [ ] **Step 1: Append hard-shadow utilities**

Append to `frontend/src/lib/utils.ts`:

```ts
/** Hard offset shadow used by NeoBrutalist components. */
export const hardShadow = "shadow-hard border-2 border-border";

/** Active/pressed offset transform for hard-shadow components. */
export const hardShadowActive = "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";
```

- [ ] **Step 2: Run Biome check**

Run:

```bash
cd frontend && npm run lint
```

Expected: passes.

---

## Task 4: Update Button

**Files:**
- Modify: `frontend/src/core/ui/button.tsx`

- [ ] **Step 1: Replace button variants**

Replace `buttonVariants` with:

```ts
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-bold transition-all border-2 border-border",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground shadow-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        destructive:
          "bg-destructive text-destructive-foreground shadow-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        outline:
          "bg-background text-foreground shadow-hard hover:bg-muted hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-8 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);
```

- [ ] **Step 2: Verify Button stories still render**

Run Storybook and open the Button story, or run:

```bash
cd frontend && npm run test -- button
```

Expected: existing tests pass; visual style matches NeoBrutalist spec.

---

## Task 5: Update Card

**Files:**
- Modify: `frontend/src/core/ui/card.tsx`

- [ ] **Step 1: Update Card root styles**

Replace the `Card` className with:

```ts
className={cn(
  "rounded-lg border-2 border-border bg-card text-card-foreground shadow-hard",
  className
)}
```

- [ ] **Step 2: Update CardHeader padding**

Change `CardHeader` padding to `p-5` (chunkier NeoBrutalist spacing):

```ts
className={cn("flex flex-col space-y-1.5 p-5", className)}
```

- [ ] **Step 3: Update CardTitle and CardDescription**

Make `CardTitle` bold black:

```ts
className={cn("text-2xl font-bold leading-none tracking-tight text-card-foreground", className)}
```

Keep `CardDescription` as-is (uses `text-muted-foreground`).

- [ ] **Step 4: Verify Card story**

Run:

```bash
cd frontend && npm run test -- card
```

Expected: passes.

---

## Task 6: Update Input

**Files:**
- Modify: `frontend/src/core/ui/input.tsx`

- [ ] **Step 1: Read current input implementation**

Use `Read` to inspect the file, then apply the NeoBrutalist classes.

- [ ] **Step 2: Update input classes**

Ensure the input uses:

```ts
className={cn(
  "flex h-10 w-full rounded-md border-2 border-border bg-background px-3 py-2 text-sm text-foreground shadow-hard-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  hasError && "border-destructive ring-destructive",
  className
)}
```

- [ ] **Step 3: Verify Input story/tests**

Run:

```bash
cd frontend && npm run test -- input
```

Expected: passes.

---

## Task 7: Update Label, Badge, Avatar, Separator, Skeleton, Spinner, Breadcrumb, EmptyState, QueryError

**Files:**
- Modify: `frontend/src/core/ui/label.tsx`
- Modify: `frontend/src/core/ui/badge.tsx`
- Modify: `frontend/src/core/ui/avatar.tsx`
- Modify: `frontend/src/core/ui/separator.tsx`
- Modify: `frontend/src/core/ui/skeleton.tsx`
- Modify: `frontend/src/core/ui/spinner.tsx`
- Modify: `frontend/src/core/ui/breadcrumb.tsx`
- Modify: `frontend/src/core/ui/empty-state.tsx`
- Modify: `frontend/src/core/ui/query-error.tsx`

- [ ] **Step 1: Apply NeoBrutalist styling to each**

For each file, update class names to use black borders, hard shadows, and the new tokens where appropriate:

- **Label:** `font-bold text-foreground`
- **Badge:** add `border-2 border-border shadow-hard-sm`; default variant uses `bg-primary text-primary-foreground`; outline variant uses `bg-background text-foreground`
- **Avatar:** add `border-2 border-border`
- **Separator:** change to `bg-border` (now black) and keep `h-[1px]` / `w-[1px]`
- **Skeleton:** change to `bg-muted` with no gradient animation (flat pulse)
- **Spinner:** default to `text-foreground`; primary variant to `text-primary`
- **Breadcrumb:** use `text-foreground` and `text-muted-foreground`; separator uses `text-foreground`
- **EmptyState:** wrap content in a `Card`-like container (`rounded-lg border-2 border-border bg-card shadow-hard p-6`)
- **QueryError:** same card-like container treatment

- [ ] **Step 2: Run component tests**

Run:

```bash
cd frontend && npm run test -- core/ui
```

Expected: all existing tests pass.

---

## Task 8: Update Dialog

**Files:**
- Modify: `frontend/src/core/ui/dialog.tsx`

- [ ] **Step 1: Update DialogContent styling**

Find `DialogContent` and update its className to:

```ts
className={cn(
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border-2 border-border bg-card p-6 shadow-hard duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
  className
)}
```

- [ ] **Step 2: Verify Dialog test**

Run:

```bash
cd frontend && npm run test -- dialog
```

Expected: passes.

---

## Task 9: Add Alert component

**Files:**
- Create: `frontend/src/core/ui/alert.tsx`
- Create: `frontend/src/core/ui/alert.stories.tsx`
- Create: `frontend/src/core/ui/alert.a11y.test.tsx`

- [ ] **Step 1: Write Alert component**

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

const alertVariants = cva(
  "relative w-full rounded-lg border-2 border-border p-4 shadow-hard [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:h-4 [&>svg]:w-4",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "bg-destructive text-destructive-foreground [&>svg]:text-destructive-foreground",
        success: "bg-success text-success-foreground [&>svg]:text-success-foreground",
        warning: "bg-warning text-warning-foreground [&>svg]:text-warning-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
  )
);
Alert.displayName = "Alert";

export const AlertTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("mb-1 font-bold leading-none tracking-tight", className)} {...props} />
  )
);
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm", className)} {...props} />
  )
);
AlertDescription.displayName = "AlertDescription";
```

- [ ] **Step 2: Write Alert story**

Create a story file showing default, destructive, success, and warning variants.

- [ ] **Step 3: Write Alert a11y test**

Use the existing a11y test pattern (axe + render) to verify `role="alert"` and color contrast.

---

## Task 10: Add Accordion component

**Files:**
- Create: `frontend/src/core/ui/accordion.tsx`
- Create: `frontend/src/core/ui/accordion.stories.tsx`
- Create: `frontend/src/core/ui/accordion.a11y.test.tsx`

- [ ] **Step 1: Install accordion primitive**

Already installed in Task 1.

- [ ] **Step 2: Write Accordion wrapper**

Wrap `@radix-ui/react-accordion` with NeoBrutalist styles: each item has `border-2 border-border bg-card rounded-md shadow-hard-sm`; trigger is `flex w-full items-center justify-between p-4 font-bold`; content is `p-4 pt-0`.

- [ ] **Step 3: Add stories and a11y test**

---

## Task 11: Add Checkbox, Radio Group, and Switch

**Files:**
- Create: `frontend/src/core/ui/checkbox.tsx`
- Create: `frontend/src/core/ui/radio-group.tsx`
- Create: `frontend/src/core/ui/switch.tsx`
- Create stories and a11y tests for each.

- [ ] **Step 1: Implement Checkbox**

Use `@radix-ui/react-checkbox`. Style:

```tsx
"peer h-5 w-5 shrink-0 rounded-sm border-2 border-border bg-background shadow-hard-sm data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
```

Checked icon uses `lucide-react` `Check`.

- [ ] **Step 2: Implement Radio Group**

Use `@radix-ui/react-radio-group`. Style radio item as circular with thick black border; checked state has a primary-filled inner circle.

- [ ] **Step 3: Implement Switch**

Use `@radix-ui/react-switch`. Track is `rounded-full border-2 border-border bg-muted shadow-hard-sm`; thumb is `rounded-full bg-background border-2 border-border`; checked track becomes `bg-primary`.

- [ ] **Step 4: Add stories and a11y tests**

---

## Task 12: Add Select and Textarea

**Files:**
- Create: `frontend/src/core/ui/select.tsx`
- Create: `frontend/src/core/ui/textarea.tsx`
- Create stories and a11y tests.

- [ ] **Step 1: Implement Select**

Use `@radix-ui/react-select`. Trigger uses input styling (`border-2 border-border bg-background shadow-hard-sm rounded-md`). Content panel uses `border-2 border-border bg-card shadow-hard rounded-md`. Items have hover `bg-muted`.

- [ ] **Step 2: Implement Textarea**

Plain textarea with:

```tsx
"flex min-h-[80px] w-full rounded-md border-2 border-border bg-background px-3 py-2 text-sm shadow-hard-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
```

- [ ] **Step 3: Add stories and a11y tests**

---

## Task 13: Add Tabs and Tooltip

**Files:**
- Create: `frontend/src/core/ui/tabs.tsx`
- Create: `frontend/src/core/ui/tooltip.tsx`
- Create stories and a11y tests.

- [ ] **Step 1: Implement Tabs**

Use `@radix-ui/react-tabs`. List has `border-2 border-border bg-muted p-1 rounded-lg`. Trigger has `rounded-md px-3 py-1 text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-hard-sm`. Content is `mt-4`.

- [ ] **Step 2: Implement Tooltip**

Use `@radix-ui/react-tooltip`. Content uses `rounded-md border-2 border-border bg-foreground px-3 py-1.5 text-xs text-background shadow-hard`.

- [ ] **Step 3: Add stories and a11y tests**

---

## Task 14: Add Progress, Slider, and Table

**Files:**
- Create: `frontend/src/core/ui/progress.tsx`
- Create: `frontend/src/core/ui/slider.tsx`
- Create: `frontend/src/core/ui/table.tsx`
- Create stories and a11y tests.

- [ ] **Step 1: Implement Progress**

Use `@radix-ui/react-progress`. Container: `relative h-4 w-full overflow-hidden rounded-full border-2 border-border bg-muted shadow-hard-sm`. Indicator: `h-full w-full flex-1 bg-primary transition-all`.

- [ ] **Step 2: Implement Slider**

Use `@radix-ui/react-slider`. Track: `relative flex w-full touch-none select-none items-center h-5`. Range: `absolute h-full rounded-full bg-primary`. Thumb: `block h-5 w-5 rounded-full border-2 border-border bg-background shadow-hard`.

- [ ] **Step 3: Implement Table**

Create composable `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`. Header has `border-b-2 border-border bg-muted`. Rows have `border-b border-border`. Cells have `p-4`.

- [ ] **Step 4: Add stories and a11y tests**

---

## Task 15: Update i18n strings

**Files:**
- Modify: `frontend/src/locales/en/ui.json`
- Modify: `frontend/src/locales/vi/ui.json`
- Modify: `frontend/src/locales/cn/ui.json`

- [ ] **Step 1: Add common UI strings**

Add or update keys used by new components (e.g., `loading`, `close`, `expand`, `collapse`, `selectPlaceholder`, `noResults`). Mirror across all three locale files.

- [ ] **Step 2: Verify type safety**

Run:

```bash
cd frontend && npm run typecheck
```

Expected: passes.

---

## Task 16: Final verification

- [ ] **Step 1: Run lint**

```bash
cd frontend && npm run lint
```

Expected: no Biome errors.

- [ ] **Step 2: Run typecheck**

```bash
cd frontend && npm run typecheck
```

Expected: passes.

- [ ] **Step 3: Run tests with coverage**

```bash
cd frontend && npm run test:coverage
```

Expected: coverage thresholds met.

- [ ] **Step 4: Build production bundle**

```bash
cd frontend && npm run build
```

Expected: build succeeds.

---

## Follow-up work (out of scope for this plan)

The following RetroUI components are identified but not implemented here:

- `command.tsx` (requires `cmdk`)
- `sonner.tsx` (requires `sonner`)
- `popover.tsx`
- `toggle.tsx`
- `toggle-group.tsx`
- `menu.tsx` / dropdown menu
- `context-menu.tsx`
- `text.tsx` typography primitives
- Charts (bar, line, area, pie)

These can be added in a subsequent plan using the same patterns established above.
