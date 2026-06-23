import { useTenantPermissions } from "./use-tenant-permissions";

export function usePermission(
  tenantSlug: string | null,
  permissionName: string
): { allowed: boolean; isLoading: boolean } {
  const { hasPermission, isLoading } = useTenantPermissions(tenantSlug);
  return { allowed: hasPermission(permissionName), isLoading };
}
