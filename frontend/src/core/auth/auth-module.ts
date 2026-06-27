import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import type { Tenant } from "@/features/tenant";
import { logout as apiLogout, getMe } from "./api/auth-api";
import { useAuthStore } from "./auth-store";
import type { User, UserRole } from "./types";

export interface UseAuthModuleResult {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeTenant: Tenant | null;
  setSession: (user: User) => void;
  clearSession: () => void;
  setActiveTenant: (tenant: Tenant | null) => void;
  logout: () => Promise<void>;
}

export function useAuthModule(): UseAuthModuleResult {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const activeTenant = useAuthStore((state) => state.activeTenant);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setActiveTenant = useAuthStore((state) => state.setActiveTenant);

  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getMe,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.isSuccess) {
      setSession(query.data);
    }
  }, [query.isSuccess, query.data, setSession]);

  useEffect(() => {
    if (query.isError) {
      clearSession();
    }
  }, [query.isError, clearSession]);

  const logout = useMemo(
    () => async () => {
      clearSession();
      try {
        await apiLogout();
      } catch {
        // Best-effort logout: the server session cookie is cleared client-side
        // by the clearSession call above, so network failures are non-fatal.
      }
    },
    [clearSession]
  );

  return useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      activeTenant,
      setSession,
      clearSession,
      setActiveTenant,
      logout,
    }),
    [
      user,
      isAuthenticated,
      isLoading,
      activeTenant,
      setSession,
      clearSession,
      setActiveTenant,
      logout,
    ]
  );
}

export interface UseAuthRoleResult {
  role: UserRole | null;
  isAdmin: boolean;
  isInstructor: boolean;
  isStudent: boolean;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

export function useAuthRole(): UseAuthRoleResult {
  const user = useAuthStore((state) => state.user);
  const role = user?.role ?? null;

  return useMemo(
    () => ({
      role,
      isAdmin: role === "admin",
      isInstructor: role === "instructor" || role === "admin",
      isStudent: role === "student",
      hasRole: (allowedRoles: UserRole[]) => (role ? allowedRoles.includes(role) : false),
    }),
    [role]
  );
}
