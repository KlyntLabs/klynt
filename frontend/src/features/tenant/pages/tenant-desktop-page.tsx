import { isAxiosError } from "axios";
import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { useAuthModule } from "@/core/auth/auth-module";
import { navigateExternal } from "@/core/auth/external-redirect";
import { buildApexUrl } from "@/core/routing/subdomain-router";
import { DesktopEnvironment } from "@/features/desktop/components/DesktopEnvironment";
import { buildTenantDesktop } from "@/features/desktop/factory/tenant-desktop";
import { useWindowManager } from "@/features/desktop/window-manager/window-module";
import { useTenant } from "../hooks/use-tenant";
import { useTenantSlug } from "../hooks/use-tenant-slug";

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
  const { "*": deepPath } = useParams<{ "*": string }>();
  const hostSlug = useTenantSlug();
  const { user } = useAuthModule();
  const openApp = useWindowManager((s) => s.openApp);

  const tenantSlug = propSlug ?? hostSlug;
  const { data: tenant, isLoading, error } = useTenant(tenantSlug);
  const tenantRole = tenant?.role ?? "member";

  const config = useMemo(
    () => buildTenantDesktop(tenantSlug, tenantRole, user),
    [tenantSlug, tenantRole, user]
  );

  useEffect(() => {
    const appId = deepPath ? DEEP_LINK_APP_MAP[deepPath] : undefined;
    if (appId) {
      openApp(config.id, appId);
    }
  }, [config.id, deepPath, openApp]);

  useEffect(() => {
    if (isLoading) return;
    if (!tenant || isTenantNotFound(error)) {
      navigateExternal(buildApexUrl("/"));
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
