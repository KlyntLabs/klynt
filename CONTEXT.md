# Klynt Frontend — Agent Context

This file captures domain terms and architectural seams introduced in recent refactors so future agents can navigate the codebase quickly.

## Domain Terms

- **MarketingShell** — `frontend/src/features/marketing/components/MarketingShell.tsx`
  Route-rendering adapter that resolves a marketing route through `marketingRegistry` and renders the matching app component inside a `Suspense` boundary.

- **MarketingNavigation** — `frontend/src/features/desktop/hooks/use-marketing-navigation.ts`
  The single seam that decides whether a marketing link opens a desktop window or navigates via React Router, based on the current `viewMode`.

- **ProductCatalog** — `frontend/src/features/marketing/components/product-catalog/ProductCatalog.tsx`
  Page-agnostic product-grid component that encapsulates icon mapping and category rendering for the Products page.

- **ContactForm** — `frontend/src/features/marketing/components/contact/ContactForm.tsx`
  Self-contained contact form built on the project’s `react-hook-form` + `zod` seam, with simulated submission and success state.

- **CommunityLayout** — `frontend/src/features/marketing/components/community/`
  Three-column newspaper-style layout decomposed into `CommunityHeader`, `CommunityLeftColumn`, `CommunityArticles`, and `CommunityRightColumn`.

- **SidebarAdapter** — `frontend/src/components/ui/sidebar/`
  Decomposed shadcn/ui-style sidebar primitive split into focused files (`sidebar-provider`, `use-sidebar`, `sidebar-menu`, etc.) with the public API preserved through `index.ts`.

## I18n Accessor

- **useMarketingTranslation** — `frontend/src/features/marketing/lib/use-marketing-translation.ts`
  Centralized `marketing` namespace accessor that exposes typed `array()` and `object()` helpers so pages and components avoid scattering `returnObjects` casts.
