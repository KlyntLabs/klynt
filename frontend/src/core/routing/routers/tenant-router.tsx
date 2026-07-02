import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { ProtectedRoute } from "@/core/auth/route-guards";
import { TenantGuard } from "@/core/routing/components/tenant-guard";

const TenantDesktopPage = lazy(() =>
  import("@/features/tenant").then((module) => ({ default: module.TenantDesktopPage }))
);

export function createTenantRouter(slug: string) {
  return createBrowserRouter([
    {
      path: "/*",
      element: (
        <TenantGuard slug={slug}>
          <ProtectedRoute>
            <Suspense fallback={<Spinner />}>
              <TenantDesktopPage slug={slug} />
            </Suspense>
          </ProtectedRoute>
        </TenantGuard>
      ),
    },
  ]);
}
