import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import type { UserRole } from "@/core/auth";
import { GuestRoute, ProtectedRoute, RoleGuard } from "@/core/auth";
import { buildApexUrl } from "@/core/routing/subdomain-router";

export function PublicLayout() {
  return (
    <Suspense fallback={<Spinner />}>
      <Outlet />
    </Suspense>
  );
}

export function GuestLayout() {
  return (
    <GuestRoute>
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
    </GuestRoute>
  );
}

export function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
    </ProtectedRoute>
  );
}

interface AdminLayoutProps {
  redirectTo?: string;
  children?: React.ReactNode;
}

export function AdminLayout({ redirectTo = buildApexUrl("/"), children }: AdminLayoutProps) {
  return (
    <ProtectedRoute>
      {/* Extend allowedRoles with the actual moderator role name if one exists in UserRole. */}
      <RoleGuard allowedRoles={["admin"] as UserRole[]} redirectTo={redirectTo}>
        <Suspense fallback={<Spinner />}>{children ?? <Outlet />}</Suspense>
      </RoleGuard>
    </ProtectedRoute>
  );
}
