import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import NotFoundPage from "@/core/routing/not-found-page";
import { getAppByRoute, marketingRegistry } from "@/features/desktop/apps";

interface MarketingShellProps {
  route: string;
}

export function MarketingShell({ route }: MarketingShellProps) {
  const app = getAppByRoute(marketingRegistry, route);

  if (!app) {
    return <NotFoundPage />;
  }

  const AppComponent = app.component;

  return (
    <Suspense fallback={<Spinner className="mx-auto my-12" />}>
      <AppComponent />
    </Suspense>
  );
}
