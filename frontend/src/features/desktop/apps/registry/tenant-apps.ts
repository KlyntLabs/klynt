import { Settings, Shield, Users } from "lucide-react";
import { lazy } from "react";
import type { AppRegistry } from "../types";

export const tenantApps: AppRegistry = [
  {
    id: "tenant-members",
    title: "tenant.members.title",
    icon: Users,
    category: "tenant",
    component: lazy(() => import("@/features/tenant/members/pages/members-page")),
    defaultSize: { width: 960, height: 680 },
    dock: { position: "left", order: 1 },
  },
  {
    id: "tenant-roles",
    title: "tenant.roles.title",
    icon: Shield,
    category: "tenant",
    component: lazy(() => import("@/features/tenant/permissions/pages/roles-page")),
    defaultSize: { width: 900, height: 640 },
    dock: { position: "left", order: 2 },
  },
  {
    id: "tenant-settings",
    title: "tenant.settings.title",
    icon: Settings,
    category: "tenant",
    component: lazy(() => import("@/features/tenant/pages/tenant-settings-page")),
    defaultSize: { width: 720, height: 540 },
    dock: { position: "left", order: 3 },
  },
];
