import { useAuthModule } from "@/core/auth/auth-module";
import { DesktopEnvironment } from "@/features/desktop/components/DesktopEnvironment";
import { buildAdminDesktop } from "@/features/desktop/factory/admin-desktop";

export default function AdminPage() {
  const { user } = useAuthModule();
  const config = buildAdminDesktop({ user });
  return <DesktopEnvironment config={config} />;
}
