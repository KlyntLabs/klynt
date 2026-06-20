import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { getAppByRoute, marketingRegistry } from "@/features/desktop/apps";

interface MarketingShellProps {
  route: string;
}

export function MarketingShell({ route }: MarketingShellProps) {
  const app = getAppByRoute(marketingRegistry, route);

  if (!app) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[#9CA3AF]">
        Unknown app: {route}
      </div>
    );
  }

  const AppComponent = app.component;

  return (
    <Suspense fallback={<Spinner className="mx-auto my-12" />}>
      <AppComponent />
    </Suspense>
  );
}
