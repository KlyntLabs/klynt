import { BookOpen, User } from "lucide-react";
import { lazy } from "react";
import type { AppRegistry } from "../types";

export const userApps: AppRegistry = [
  {
    id: "profile",
    title: "desktop.apps.profile",
    icon: User,
    category: "user",
    component: lazy(() => import("@/features/user/components/profile-app")),
    defaultSize: { width: 720, height: 540 },
    singleton: true,
    dock: { position: "left", order: 1 },
  },
  {
    id: "my-courses",
    title: "desktop.apps.myCourses",
    icon: BookOpen,
    category: "user",
    component: lazy(() => import("@/features/user/components/my-courses-app")),
    defaultSize: { width: 900, height: 640 },
    dock: { position: "left", order: 2 },
  },
];
