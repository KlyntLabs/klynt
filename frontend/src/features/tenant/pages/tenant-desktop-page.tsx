import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/core/auth/auth-identity";
import { DesktopEnvironment } from "@/features/desktop/components/DesktopEnvironment";
import { buildTenantDesktop } from "@/features/desktop/factory/tenant-desktop";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";

const DEEP_LINK_APP_MAP: Record<string, string> = {
  members: "tenant-members",
  roles: "tenant-roles",
  settings: "tenant-settings",
};

export default function TenantDesktopPage() {
  const { slug, "*": deepPath } = useParams<{ slug: string; "*": string }>();
  const { user } = useAuth();
  const openApp = useDesktopStore((s) => s.openApp);

  const config = buildTenantDesktop(slug ?? "", "member", user);

  useEffect(() => {
    const appId = deepPath ? DEEP_LINK_APP_MAP[deepPath] : undefined;
    if (appId) {
      openApp(config.id, appId);
    }
  }, [config.id, deepPath, openApp]);

  return <DesktopEnvironment config={config} />;
}
