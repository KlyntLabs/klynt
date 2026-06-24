import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import { RootLayout } from "@/app/layout/root-layout";
import { Spinner } from "@/components/ui/spinner";
import { GuestRoute, ProtectedRoute, RoleGuard } from "@/core/auth";
import { marketingRegistry } from "@/features/desktop/apps";
import { buildMarketingDesktop } from "@/features/desktop/factory/marketing-desktop";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import { MarketingShell } from "@/features/marketing/components/MarketingShell";
import { routePaths } from "./route-paths";

const DesktopEnvironment = lazy(() => import("@/features/desktop/components/DesktopEnvironment"));
const LoginPage = lazy(() =>
  import("@/features/auth").then((module) => ({ default: module.LoginPage }))
);
const RegisterPage = lazy(() =>
  import("@/features/auth").then((module) => ({ default: module.RegisterPage }))
);
const RegisterSuccessPage = lazy(() =>
  import("@/features/auth").then((module) => ({ default: module.RegisterSuccessPage }))
);
const VerifyEmailPage = lazy(() =>
  import("@/features/auth").then((module) => ({ default: module.VerifyEmailPage }))
);
const OnboardingPage = lazy(() =>
  import("@/features/auth").then((module) => ({ default: module.OnboardingPage }))
);
const ForgotPasswordPage = lazy(() =>
  import("@/features/auth").then((module) => ({ default: module.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import("@/features/auth").then((module) => ({ default: module.ResetPasswordPage }))
);
const DashboardPage = lazy(() => import("@/features/dashboard/pages/dashboard-page"));
const CreateTenantPage = lazy(() =>
  import("@/features/tenant").then((module) => ({ default: module.CreateTenantPage }))
);
const RolesPage = lazy(() =>
  import("@/features/tenant").then((module) => ({ default: module.RolesPage }))
);
const MembersPage = lazy(() =>
  import("@/features/tenant").then((module) => ({ default: module.MembersPage }))
);
const TenantSettingsPage = lazy(() =>
  import("@/features/tenant").then((module) => ({ default: module.TenantSettingsPage }))
);
const AdminPage = lazy(() => import("@/features/admin/pages/admin-page"));
const SessionsPage = lazy(() =>
  import("@/features/auth").then((module) => ({ default: module.SessionsPage }))
);
const NotFoundPage = lazy(() => import("./not-found-page"));

function PublicLayout() {
  return (
    <Suspense fallback={<Spinner />}>
      <Outlet />
    </Suspense>
  );
}

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
        <DesktopEnvironment config={buildMarketingDesktop()} />
      </Suspense>
    );
  }

  return <MarketingShell route={marketingRegistry.defaultApp.route} />;
}

const marketingRoutes = marketingRegistry.apps.map((app) => ({
  path: app.route,
  element: <MarketingShell route={app.route} />,
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
        element: <PublicLayout />,
        children: [{ path: routePaths.verifyEmail, element: <VerifyEmailPage /> }],
      },
      {
        element: <GuestLayout />,
        children: [
          { path: routePaths.login, element: <LoginPage /> },
          { path: routePaths.register, element: <RegisterPage /> },
          { path: routePaths.registerSuccess, element: <RegisterSuccessPage /> },
          { path: routePaths.forgotPassword, element: <ForgotPasswordPage /> },
          { path: routePaths.resetPassword, element: <ResetPasswordPage /> },
        ],
      },
      {
        element: <ProtectedLayout />,
        children: [
          { path: routePaths.dashboard, element: <DashboardPage /> },
          { path: routePaths.onboarding, element: <OnboardingPage /> },
          { path: routePaths.tenantsNew, element: <CreateTenantPage /> },
          { path: routePaths.tenantRoles, element: <RolesPage /> },
          { path: routePaths.tenantMembers, element: <MembersPage /> },
          { path: routePaths.tenantSettings, element: <TenantSettingsPage /> },
          { path: routePaths.settingsSessions, element: <SessionsPage /> },
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
