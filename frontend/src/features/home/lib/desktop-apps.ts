import type { LucideIcon } from "lucide-react";
import { Home, LayoutDashboard, UserPlus } from "lucide-react";
import { routePaths } from "@/core/routing/route-paths";

export interface DesktopApp {
  id: string;
  labelKey:
    | "desktop.apps.home.label"
    | "desktop.apps.register.label"
    | "desktop.apps.dashboard.label";
  icon: LucideIcon;
  route: string;
}

export const desktopApps: DesktopApp[] = [
  {
    id: "home",
    labelKey: "desktop.apps.home.label",
    icon: Home,
    route: routePaths.home,
  },
  {
    id: "register",
    labelKey: "desktop.apps.register.label",
    icon: UserPlus,
    route: routePaths.register,
  },
  {
    id: "dashboard",
    labelKey: "desktop.apps.dashboard.label",
    icon: LayoutDashboard,
    route: routePaths.dashboard,
  },
];
