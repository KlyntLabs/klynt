import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import { RootLayout } from "@/app/layout/root-layout";
import { Spinner } from "@/components/ui/spinner";
import { GuestRoute, ProtectedRoute, RoleGuard } from "@/core/auth";
import { marketingRegistry } from "@/features/desktop/apps";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import { MarketingShell } from "@/features/marketing/components/MarketingShell";
import { routePaths } from "./route-paths";

const DesktopEnvironment = lazy(() => import("@/features/desktop/components/DesktopEnvironment"));
const RegisterPage = lazy(() =>
  import("@/features/auth").then((module) => ({ default: module.RegisterPage }))
);
const RegisterSuccessPage = lazy(() =>
  import("@/features/auth").then((module) => ({ default: module.RegisterSuccessPage }))
);
const DashboardPage = lazy(() => import("@/features/dashboard/pages/dashboard-page"));
const CreateTenantPage = lazy(() =>
  import("@/features/tenant").then((module) => ({ default: module.CreateTenantPage }))
);
const AdminPage = lazy(() => import("@/features/admin/pages/admin-page"));
const NotFoundPage = lazy(() => import("./not-found-page"));

function GuestLayout() {
  return (
    <GuestRoute>
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
    </GuestRoute>
  );
}

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
    </ProtectedRoute>
  );
}

function AdminLayout() {
  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={["admin"]}>
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </RoleGuard>
    </ProtectedRoute>
  );
}

function IndexRoute() {
  const { viewMode } = useDesktopStore();

  if (viewMode === "desktop") {
    return (
      <Suspense fallback={<Spinner />}>
        <DesktopEnvironment />
      </Suspense>
    );
  }

  return <MarketingShell route={marketingRegistry.defaultApp.manifest.route} />;
}

const marketingRoutes = marketingRegistry.apps.map((app) => ({
  path: app.manifest.route,
  element: <MarketingShell route={app.manifest.route} />,
}));

export const router = createBrowserRouter([
  {
    path: routePaths.home,
    element: <RootLayout />,
    hydrateFallbackElement: <Spinner />,
    children: [
      { index: true, element: <IndexRoute /> },
      ...marketingRoutes,
      {
        element: <GuestLayout />,
        children: [
          { path: routePaths.register, element: <RegisterPage /> },
          { path: routePaths.registerSuccess, element: <RegisterSuccessPage /> },
        ],
      },
      {
        element: <ProtectedLayout />,
        children: [
          { path: routePaths.dashboard, element: <DashboardPage /> },
          { path: routePaths.tenantsNew, element: <CreateTenantPage /> },
        ],
      },
      {
        element: <AdminLayout />,
        children: [{ path: routePaths.admin, element: <AdminPage /> }],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
