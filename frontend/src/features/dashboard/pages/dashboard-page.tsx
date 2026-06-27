import { Navigate } from "react-router-dom";
import { useAuthModule } from "@/core/auth/auth-module";
import { DesktopEnvironment } from "@/features/desktop/components/DesktopEnvironment";
import { buildAdminDesktop } from "@/features/desktop/factory/admin-desktop";

export function DashboardPage() {
  const { user } = useAuthModule();

  if (user?.role !== "admin") {
    return <Navigate to={user ? `/u/${user.id}` : "/"} replace />;
  }

  const config = buildAdminDesktop({ user });
  return <DesktopEnvironment config={config} />;
}

export default DashboardPage;
