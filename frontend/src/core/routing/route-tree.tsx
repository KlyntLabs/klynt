import { RootLayout } from "@/app/layout/root-layout";
import { GuestRoute, ProtectedRoute, RoleGuard } from "@/core/auth";
import { Spinner } from "@/core/ui/spinner";
import { Suspense, lazy } from "react";
import { Outlet, createBrowserRouter } from "react-router-dom";
import { routePaths } from "./route-paths";

const HomePage = lazy(() => import("./home-page"));
const RegisterPage = lazy(() => import("@/features/auth/pages/register-page"));
const RegisterSuccessPage = lazy(() => import("@/features/auth/pages/register-success-page"));
const DashboardPage = lazy(() => import("@/features/dashboard/pages/dashboard-page"));
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

export const router = createBrowserRouter([
  {
    path: routePaths.home,
    element: <RootLayout />,
    hydrateFallbackElement: <Spinner />,
    children: [
      { index: true, element: <HomePage /> },
      {
        element: <GuestLayout />,
        children: [
          { path: routePaths.register, element: <RegisterPage /> },
          { path: routePaths.registerSuccess, element: <RegisterSuccessPage /> },
        ],
      },
      {
        element: <ProtectedLayout />,
        children: [{ path: routePaths.dashboard, element: <DashboardPage /> }],
      },
      {
        element: <AdminLayout />,
        children: [{ path: routePaths.admin, element: <AdminPage /> }],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
