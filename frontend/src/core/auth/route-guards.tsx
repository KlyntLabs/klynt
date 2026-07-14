import { Center } from "@astryxdesign/core/Center";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Navigate } from "react-router-dom";
import { buildAdminUrl, buildApexUrl, buildLoginUrl } from "@/core/routing/subdomain-router";
import { useAuthModule, useAuthRole } from "./auth-module";
import { ExternalNavigate, isExternalUrl } from "./external-redirect";
import type { UserRole } from "./types";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthModule();

  if (isLoading) {
    return (
      <Center height="100vh">
        <Spinner />
      </Center>
    );
  }

  if (!isAuthenticated) {
    const currentUrl = window.location.href;
    return <ExternalNavigate to={buildLoginUrl(currentUrl)} />;
  }

  return <>{children}</>;
}

interface GuestRouteProps {
  children: React.ReactNode;
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, isLoading } = useAuthModule();

  if (isLoading) {
    return (
      <Center height="100vh">
        <Spinner />
      </Center>
    );
  }

  if (isAuthenticated) {
    return <ExternalNavigate to={buildApexUrl("/dashboard")} />;
  }

  return <>{children}</>;
}

interface RoleGuardProps {
  allowedRoles: UserRole[];
  redirectTo?: string;
  children: React.ReactNode;
}

export function RoleGuard({
  allowedRoles,
  redirectTo = buildAdminUrl(),
  children,
}: RoleGuardProps) {
  const { hasRole } = useAuthRole();

  if (!hasRole(allowedRoles)) {
    return isExternalUrl(redirectTo) ? (
      <ExternalNavigate to={redirectTo} />
    ) : (
      <Navigate to={redirectTo} replace />
    );
  }

  return <>{children}</>;
}
