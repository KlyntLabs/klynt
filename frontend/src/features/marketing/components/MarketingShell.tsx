import { lazy, Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { marketingRegistry } from "@/features/desktop/apps";

const NotFoundPage = lazy(() => import("@/core/routing/not-found-page"));

interface MarketingShellProps {
  route: string;
}

export function MarketingShell({ route }: MarketingShellProps) {
  const app = marketingRegistry.apps.find((app) => app.manifest.route === route);

  if (!app) {
    return (
      <Suspense fallback={<Spinner className="mx-auto my-12" />}>
        <NotFoundPage />
      </Suspense>
    );
  }

  const AppComponent = app.component;

  return (
    <Suspense fallback={<Spinner className="mx-auto my-12" />}>
      <AppComponent />
    </Suspense>
  );
}
