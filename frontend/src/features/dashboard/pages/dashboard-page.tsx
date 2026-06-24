import { useAuth } from "@/core/auth/auth-identity";
import { DesktopEnvironment } from "@/features/desktop/components/DesktopEnvironment";
import { buildAdminDesktop } from "@/features/desktop/factory/admin-desktop";

export function DashboardPage() {
  const { user } = useAuth();
  const config = buildAdminDesktop({ user });
  return <DesktopEnvironment config={config} />;
}

export default DashboardPage;
