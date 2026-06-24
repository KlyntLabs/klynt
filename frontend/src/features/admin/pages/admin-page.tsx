import { useAuth } from "@/core/auth/auth-identity";
import { DesktopEnvironment } from "@/features/desktop/components/DesktopEnvironment";
import { buildAdminDesktop } from "@/features/desktop/factory/admin-desktop";

export default function AdminPage() {
  const { user } = useAuth();
  const config = buildAdminDesktop({ user });
  return <DesktopEnvironment config={config} />;
}
