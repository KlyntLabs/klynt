import type { User } from "@/core/auth/types";
import { tenantApps } from "../apps/registry/tenant-apps";
import type { DesktopContext } from "../apps/types";
import { tenantMenubar } from "../menubar/tenant-menubar";
import { createTenantApiAdapter } from "../persistence/tenant-api-adapter";
import type { DesktopConfig } from "./types";

export function buildTenantDesktop(
  slug: string,
  tenantRole?: string,
  user?: User | null
): DesktopConfig {
  const canEditShared = tenantRole === "owner" || tenantRole === "admin";
  return {
    id: `tenant:${slug}`,
    title: "Tenant Desktop",
    apps: tenantApps,
    menubar: tenantMenubar,
    background: { presetId: "fabric" },
    persistence: createTenantApiAdapter({ slug, canEditShared }),
    context: {
      user: user ?? null,
      tenantRole: tenantRole as DesktopContext["tenantRole"],
      tenantSlug: slug,
    },
  };
}
