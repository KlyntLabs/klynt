import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuthStore } from "@/core/auth/auth-store";
import { listMyTenants } from "../api/tenant-api";
import { listPermissions, listRoles } from "./api";

export interface UsePermissionsResult {
  hasPermission: (name: string) => boolean;
  hasAllPermissions: (names: string[]) => boolean;
  hasAnyPermission: (names: string[]) => boolean;
  isLoading: boolean;
  allowedPermissions: Set<string>;
  role: string | undefined;
}

export function usePermissions(tenantSlug: string | null): UsePermissionsResult {
  const activeTenant = useAuthStore((state) => state.activeTenant);

  const { data: catalog, isLoading: isCatalogLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: listPermissions,
    staleTime: 1000 * 60 * 5,
    enabled: !!tenantSlug,
  });

  const { data: roles, isLoading: isRolesLoading } = useQuery({
    queryKey: ["tenants", tenantSlug, "roles"],
    queryFn: () => listRoles(tenantSlug as string),
    staleTime: 1000 * 60 * 5,
    enabled: !!tenantSlug,
  });

  const tenantsEnabled = !!tenantSlug && (!activeTenant || activeTenant.slug !== tenantSlug);
  const { data: tenants, isLoading: isTenantsLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: listMyTenants,
    staleTime: 1000 * 60 * 5,
    enabled: tenantsEnabled,
  });

  const role = useMemo(() => {
    if (!tenantSlug) return undefined;
    if (activeTenant?.slug === tenantSlug) return activeTenant.role;
    return tenants?.find((t) => t.slug === tenantSlug)?.role;
  }, [activeTenant, tenantSlug, tenants]);

  const allowedPermissions = useMemo(() => {
    if (!catalog || !roles || !role) return new Set<string>();
    const resolvedRole = roles.find((r) => r.name === role);
    if (!resolvedRole) return new Set<string>();
    const allowedIds = new Set(resolvedRole.permissionIds);
    return new Set(
      catalog
        .filter((permission) => allowedIds.has(permission.id))
        .map((permission) => permission.name)
    );
  }, [catalog, roles, role]);

  const hasPermission = useMemo(
    () => (name: string) => allowedPermissions.has(name),
    [allowedPermissions]
  );

  const hasAllPermissions = useMemo(
    () => (names: string[]) => names.every((name) => allowedPermissions.has(name)),
    [allowedPermissions]
  );

  const hasAnyPermission = useMemo(
    () => (names: string[]) => names.some((name) => allowedPermissions.has(name)),
    [allowedPermissions]
  );

  return {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isLoading: isCatalogLoading || isRolesLoading || (tenantsEnabled && isTenantsLoading),
    allowedPermissions,
    role,
  };
}

export function usePermission(
  tenantSlug: string | null,
  permissionName: string
): { allowed: boolean; isLoading: boolean } {
  const { hasPermission, isLoading } = usePermissions(tenantSlug);
  return { allowed: hasPermission(permissionName), isLoading };
}
