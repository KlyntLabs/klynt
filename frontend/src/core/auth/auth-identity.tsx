import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "./auth-store";
import { ExternalNavigate, isExternalUrl } from "./external-redirect";
import type { UserRole } from "./types";

export interface UseAuthResult {
  user: import("./types").User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (user: import("./types").User) => void;
  clearSession: () => void;
}

export function useAuth(): UseAuthResult {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      setSession,
      clearSession,
    }),
    [user, isAuthenticated, isLoading, setSession, clearSession]
  );
}

export function useRole() {
  const { user } = useAuth();
  const role = user?.role ?? null;

  return {
    role,
    isAdmin: role === "admin",
    isInstructor: role === "instructor" || role === "admin",
    isStudent: role === "student",
    hasRole: (allowedRoles: UserRole[]) => (role ? allowedRoles.includes(role) : false),
  };
}

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

interface GuestRouteProps {
  children: React.ReactNode;
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

interface RoleGuardProps {
  allowedRoles: UserRole[];
  redirectTo?: string;
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, redirectTo = "/dashboard", children }: RoleGuardProps) {
  const { hasRole } = useRole();

  if (!hasRole(allowedRoles)) {
    return isExternalUrl(redirectTo) ? (
      <ExternalNavigate to={redirectTo} />
    ) : (
      <Navigate to={redirectTo} replace />
    );
  }

  return <>{children}</>;
}
