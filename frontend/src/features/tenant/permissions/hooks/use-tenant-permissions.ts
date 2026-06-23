import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuthStore } from "@/core/auth/auth-store";
import { listMyTenants } from "../../api/tenant-api";
import { listPermissions, listRoles } from "../api";

export interface UseTenantPermissionsResult {
  hasPermission: (name: string) => boolean;
  isLoading: boolean;
}

export function useTenantPermissions(tenantSlug: string | null): UseTenantPermissionsResult {
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

  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: listMyTenants,
    staleTime: 1000 * 60 * 5,
    enabled: !!tenantSlug && (!activeTenant || activeTenant.slug !== tenantSlug),
  });

  const roleName = useMemo(() => {
    if (!tenantSlug) return undefined;
    if (activeTenant?.slug === tenantSlug) return activeTenant.role;
    return tenants?.find((t) => t.slug === tenantSlug)?.role;
  }, [activeTenant, tenantSlug, tenants]);

  const permissionNames = useMemo(() => {
    if (!catalog || !roles || !roleName) return new Set<string>();
    const role = roles.find((r) => r.name === roleName);
    if (!role) return new Set<string>();
    const allowedIds = new Set(role.permissionIds);
    return new Set(
      catalog
        .filter((permission) => allowedIds.has(permission.id))
        .map((permission) => permission.name)
    );
  }, [catalog, roles, roleName]);

  return {
    hasPermission: (name) => permissionNames.has(name),
    isLoading: isCatalogLoading || isRolesLoading,
  };
}
