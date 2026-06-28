import type { ReactNode } from "react";
import { usePermission } from "../permissions-module";

interface PermissionGuardProps {
  tenantSlug: string | null;
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({
  tenantSlug,
  permission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { allowed, isLoading } = usePermission(tenantSlug, permission);

  if (isLoading) {
    return fallback;
  }

  return allowed ? children : fallback;
}
