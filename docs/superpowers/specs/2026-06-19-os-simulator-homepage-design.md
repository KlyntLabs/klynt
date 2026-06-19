# OS-Simulator Homepage Design

## Overview

Replace the current placeholder Klynt homepage (`/`) with a NeoBrutalism-style “OS simulator” landing page. The page looks and feels like a toy operating system desktop: a top menu bar, borderless desktop-icon shortcuts, and a centered hero window. It is a CSS-only stage set for the first version — visually convincing but intentionally lightweight.

This design extends the NeoBrutalism design system already in `frontend/src/core/ui/`.

## Goals

- Give Klynt a memorable, on-brand first impression.
- Surface the most important navigation paths (Register, Dashboard) as desktop apps.
- Keep the implementation small, testable, and accessible.
- Avoid scope creep: no drag/resize/minimize for v1.

## Visual Direction

- **OS style:** Custom NeoBrutalism OS.
  - Thick black borders.
  - Hard shadows (`--shadow-hard`).
  - Primary yellow (`--color-primary`) for the menu bar and accents.
  - Pink (`--color-accent`) for the primary CTA.
  - Space Grotesk typography.
- **Layout (approved mockup):**
  - Plain light-grey desktop background (`--color-secondary` / `#f3f3f3`).
  - Small, macOS-like yellow OS top menu bar:
    - Left: Klynt logo icon that opens an OS menu, followed by dropdown menus for Docs, Community, Courses, Teachers.
    - Right: flag-icon language switcher, Get started button, user avatar icon, chat icon.
  - Vertical icon dock on the left with borderless icons and labels.
  - Centered hero “browser” window with title-bar dots and filename.
  - No separate global header — the OS top bar is the only chrome on the homepage.
- **Mockup files:**
  - `.superpowers/brainstorm/43582-1781854111/content/os-homepage-mockup-v4.html`

## Component Architecture

New feature folder: `frontend/src/features/home/`

| File | Responsibility |
| --- | --- |
| `features/home/pages/home-page.tsx` | Route page. Registers `home` i18n namespace and composes the OS shell. Replaces the current `core/routing/home-page.tsx` content. |
| `features/home/components/os-desktop.tsx` | Full-screen desktop container: background, top bar, icon dock, hero window. |
| `features/home/components/os-top-bar.tsx` | Small yellow NeoBrutalist menu bar: Klynt logo menu, Docs/Community/Courses/Teachers dropdown menus, language switcher, Get started button, user/chat icons. |
| `features/home/components/os-window.tsx` | Reusable window chrome: title bar with three dots + filename, bordered body with hard shadow. |
| `features/home/components/os-icon.tsx` | Borderless desktop icon: Lucide icon + label wrapped in a React Router `Link`. |
| `features/home/lib/desktop-apps.ts` | Static config array mapping apps to `{ id, labelKey, icon, route }`. |

Design-system primitives reused:

- `core/ui/logo.tsx` provides the `KlyntLogo` SVG icon used in the OS top bar.
- `core/ui/button.tsx` exports `buttonVariants` for styling CTA links. Button size variants were shrunk globally so the default button is smaller.
- `core/i18n/language-switcher.tsx` is embedded in the OS top bar and uses flag icons.
- Existing color/shadow/radius tokens from `index.css`.

## Routing

`core/routing/route-tree.tsx` updates its lazy import of `HomePage` to point to `features/home/pages/home-page.tsx`.

No new route paths are introduced.

## Content & Internationalization

New namespace: `frontend/src/locales/{en,vi,cn}/home.json`.

Keys (mirrored across `en`, `vi`, `cn`):

- `topBar.startLabel`
- `topBar.windowTitle`
- `topBar.menu.label`, `topBar.menu.about`, `topBar.menu.docs`, `topBar.menu.register`, `topBar.menu.dashboard`
- `topBar.nav.placeholder`, `topBar.nav.docs`, `topBar.nav.community`, `topBar.nav.courses`, `topBar.nav.teachers`
- `topBar.actions.getStarted`, `topBar.actions.user`, `topBar.actions.chat`
- `hero.title`
- `hero.subtitle`
- `hero.body`
- `hero.cta`
- `desktop.apps.home.label`
- `desktop.apps.register.label`
- `desktop.apps.dashboard.label`

## Interactions & Behavior

- Desktop icons are React Router `<Link>` navigations.
- Klynt logo opens a dropdown menu with links to Home, Register, and Dashboard.
- Docs, Community, Courses, Teachers are dropdown menus with placeholder "Coming soon" items.
- Hero CTA and top-bar Get started button navigate to `/register`.
- Hover/focus states use the existing hard-shadow shift pattern.
- **Out of scope for v1:** dragging, resizing, minimizing, maximizing, multiple windows.

## Responsive Behavior

- **Desktop:** top menu bar, vertical icon dock on the left, centered hero window.
- **Tablet/Mobile:**
  - Icon dock collapses to a small horizontal row near the top-left or hides behind the start menu.
  - Hero window becomes a full-width card with margins, dropping absolute centering so the page scrolls naturally.
  - Touch targets are at least 44×44 px.

## Accessibility

- A single `main` landmark on the page (`RootLayout` no longer renders an additional global header).
- Desktop icon dock is a `<nav>` with an `aria-label`.
- Each icon link has a visible `focus-visible` ring.
- Text uses existing high-contrast tokens (black on yellow/white/pink).
- The existing skip-link from `RootLayout` continues to apply.

## Testing

- `features/home/pages/home-page.test.tsx` — renders OS desktop, icons, and hero text.
- Axe-core a11y scan on `HomePage`.
- Update `core/routing/route-paths.test.ts` only if paths change (no new paths expected).
- Optional Storybook story for the OS desktop under `features/home/components/os-desktop.stories.tsx`.

## Out of Scope

- Draggable or resizable windows.
- Multiple open windows / window manager state.
- A real taskbar at the bottom.
- Animated wallpapers or dot-grid backgrounds.
- Backend integration — the clock and all content are client-side.

## Open Questions

- Should the mobile icon dock remain visible or collapse into the “Klynt” start menu? Decision: keep visible as a compact horizontal row for v1.
- Should we add a second feature window below the hero? Decision: defer to a later polish pass.
- Should there be a Docs desktop app? Decision: defer until a docs route/page exists; v1 uses Home, Register, and Dashboard.
