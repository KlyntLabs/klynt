import { Spinner } from "@astryxdesign/core/Spinner";
import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { buildApexUrl } from "@/core/routing/subdomain-router";
import { AdminLayout } from "./shared-layouts";

const DashboardPage = lazy(() => import("@/features/dashboard/pages/dashboard-page"));
const AdminPage = lazy(() => import("@/features/admin/pages/admin-page"));

export function createAdminRouter() {
  return createBrowserRouter([
    {
      path: "/",
      element: (
        <AdminLayout redirectTo={buildApexUrl("/")}>
          <Suspense fallback={<Spinner />}>
            <DashboardPage />
          </Suspense>
        </AdminLayout>
      ),
    },
    {
      path: "/admin",
      element: (
        <AdminLayout redirectTo={buildApexUrl("/")}>
          <Suspense fallback={<Spinner />}>
            <AdminPage />
          </Suspense>
        </AdminLayout>
      ),
    },
    { path: "*", element: <Navigate to="/" replace /> },
  ]);
}
