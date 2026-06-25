import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "@/app/layout/root-layout";
import { Spinner } from "@/components/ui/spinner";
import { marketingRegistry } from "@/features/desktop/apps";
import { buildMarketingDesktop } from "@/features/desktop/factory/marketing-desktop";
import { MarketingShell } from "@/features/marketing/components/MarketingShell";
import {
  RedirectToAdmin,
  RedirectToAdminPage,
  RedirectToLogin,
  RedirectToProfile,
  RedirectToTenant,
} from "../redirects";
import { routePaths } from "../route-paths";
import { GuestLayout, ProtectedLayout, PublicLayout } from "./shared-layouts";

const DesktopEnvironment = lazy(() => import("@/features/desktop/components/DesktopEnvironment"));
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
const CreateTenantPage = lazy(() =>
  import("@/features/tenant").then((module) => ({ default: module.CreateTenantPage }))
);
const UserDesktopPage = lazy(() => import("@/features/user/pages/user-desktop-page"));
const SessionsPage = lazy(() =>
  import("@/features/auth").then((module) => ({ default: module.SessionsPage }))
);
const NotFoundPage = lazy(() => import("../not-found-page"));

function IndexRoute() {
  return (
    <Suspense fallback={<Spinner />}>
      <DesktopEnvironment config={buildMarketingDesktop()} />
    </Suspense>
  );
}

const marketingRoutes = marketingRegistry.apps
  .filter((app): app is typeof app & { route: string } => Boolean(app.route))
  .map((app) => ({
    path: app.route,
    element: <MarketingShell route={app.route} />,
  }));

export function createApexRouter() {
  return createBrowserRouter([
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
            { path: routePaths.login, element: <RedirectToLogin /> },
            { path: routePaths.register, element: <RegisterPage /> },
            { path: routePaths.registerSuccess, element: <RegisterSuccessPage /> },
            { path: routePaths.forgotPassword, element: <ForgotPasswordPage /> },
            { path: routePaths.resetPassword, element: <ResetPasswordPage /> },
          ],
        },
        {
          element: <ProtectedLayout />,
          children: [
            { path: routePaths.onboarding, element: <OnboardingPage /> },
            { path: routePaths.tenantsNew, element: <CreateTenantPage /> },
            { path: routePaths.settingsSessions, element: <SessionsPage /> },
            { path: routePaths.userDesktop, element: <UserDesktopPage /> },
          ],
        },
        { path: routePaths.dashboard, element: <RedirectToAdmin /> },
        { path: routePaths.admin, element: <RedirectToAdminPage /> },
        { path: `${routePaths.admin}/*`, element: <RedirectToAdminPage /> },
        { path: `${routePaths.tenantBase}/*`, element: <RedirectToTenant /> },
        { path: ":username", element: <RedirectToProfile /> },
        { path: "*", element: <NotFoundPage /> },
      ],
    },
  ]);
}
