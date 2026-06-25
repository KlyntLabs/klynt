import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { ProtectedRoute } from "@/core/auth";

const TenantDesktopPage = lazy(() =>
  import("@/features/tenant").then((module) => ({ default: module.TenantDesktopPage }))
);

export function createTenantRouter(slug: string) {
  return createBrowserRouter([
    {
      path: "/*",
      element: (
        <ProtectedRoute>
          <Suspense fallback={<Spinner />}>
            <TenantDesktopPage slug={slug} />
          </Suspense>
        </ProtectedRoute>
      ),
    },
  ]);
}
