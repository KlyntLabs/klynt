import { useTenantPermissions } from "./use-tenant-permissions";

if (import.meta.env.DEV) {
  console.warn(
    "[DEPRECATED] usePermission is deprecated. Import from '../permissions-module.ts' instead."
  );
}

export function usePermission(
  tenantSlug: string | null,
  permissionName: string
): { allowed: boolean; isLoading: boolean } {
  const { hasPermission, isLoading } = useTenantPermissions(tenantSlug);
  return { allowed: hasPermission(permissionName), isLoading };
}
