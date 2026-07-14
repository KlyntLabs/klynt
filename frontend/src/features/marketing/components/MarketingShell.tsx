import { Spinner } from "@astryxdesign/core/Spinner";
import { VStack } from "@astryxdesign/core/VStack";
import { lazy, Suspense } from "react";
import { marketingRegistry } from "@/features/desktop/apps";

const NotFoundPage = lazy(() => import("@/core/routing/not-found-page"));

/* The centred loading plate the lazy routes fall back to. */
const loadingFallback = (
  <VStack align="center" paddingBlock={10}>
    <Spinner />
  </VStack>
);

interface MarketingShellProps {
  route: string;
}

export function MarketingShell({ route }: MarketingShellProps) {
  const app = marketingRegistry.apps.find((app) => app.route === route);

  if (!app) {
    return (
      <Suspense fallback={loadingFallback}>
        <NotFoundPage />
      </Suspense>
    );
  }

  const AppComponent = app.component;

  return (
    <Suspense fallback={loadingFallback}>
      <AppComponent />
    </Suspense>
  );
}
