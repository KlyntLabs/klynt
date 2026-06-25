import { isAxiosError } from "axios";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/core/auth/auth-identity";
import { buildApexUrl } from "@/core/routing/subdomain-url";
import { DesktopEnvironment } from "@/features/desktop/components/DesktopEnvironment";
import { buildTenantDesktop } from "@/features/desktop/factory/tenant-desktop";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import { useTenant } from "../hooks/use-tenant";

const DEEP_LINK_APP_MAP: Record<string, string> = {
  members: "tenant-members",
  roles: "tenant-roles",
  settings: "tenant-settings",
};

interface TenantDesktopPageProps {
  slug?: string;
}

function isTenantNotFound(error: unknown): boolean {
  return isAxiosError(error) && [404, 403].includes(error.response?.status ?? 0);
}

export default function TenantDesktopPage({ slug: propSlug }: TenantDesktopPageProps = {}) {
  const { slug: paramSlug, "*": deepPath } = useParams<{ slug: string; "*": string }>();
  const { user } = useAuth();
  const openApp = useDesktopStore((s) => s.openApp);

  const tenantSlug = propSlug ?? paramSlug ?? "";
  const { data: tenant, isLoading, error } = useTenant(tenantSlug);
  const tenantRole = tenant?.role ?? "member";

  const config = buildTenantDesktop(tenantSlug, tenantRole, user);

  useEffect(() => {
    const appId = deepPath ? DEEP_LINK_APP_MAP[deepPath] : undefined;
    if (appId) {
      openApp(config.id, appId);
    }
  }, [config.id, deepPath, openApp]);

  useEffect(() => {
    if (isLoading) return;
    if (!tenant || isTenantNotFound(error)) {
      window.location.href = buildApexUrl("/");
    }
  }, [isLoading, tenant, error]);

  if (isLoading) {
    return <Spinner />;
  }

  if (!tenant || isTenantNotFound(error)) {
    return null;
  }

  return <DesktopEnvironment config={config} />;
}
