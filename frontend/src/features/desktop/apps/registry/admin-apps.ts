import { BarChart3, Building2, Users } from "lucide-react";
import { lazy } from "react";
import type { AppRegistry } from "../types";

const UserManagementApp = lazy(() => import("@/features/admin/components/user-management-app"));
const TenantManagementApp = lazy(() => import("@/features/admin/components/tenant-management-app"));
const ReportsApp = lazy(() => import("@/features/admin/components/reports-app"));

export const adminApps: AppRegistry = [
  {
    id: "user-management",
    route: "/admin/users",
    title: "desktop.apps.userManagement",
    icon: Users,
    category: "admin",
    component: UserManagementApp,
    defaultSize: { width: 900, height: 640 },
    dock: { position: "left", order: 1 },
  },
  {
    id: "tenant-management",
    route: "/admin/tenants",
    title: "desktop.apps.tenantManagement",
    icon: Building2,
    category: "admin",
    component: TenantManagementApp,
    defaultSize: { width: 900, height: 640 },
    dock: { position: "left", order: 2 },
  },
  {
    id: "reports",
    route: "/admin/reports",
    title: "desktop.apps.reports",
    icon: BarChart3,
    category: "admin",
    component: ReportsApp,
    defaultSize: { width: 800, height: 560 },
    dock: { position: "left", order: 3 },
  },
];
