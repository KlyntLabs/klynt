import type { User } from "@/core/auth/types";

export type DesktopCategory = "admin" | "user" | "tenant" | "marketing" | "system";

export type DesktopContext = {
  user: User | null;
  tenantRole?: "owner" | "admin" | "member" | "guest";
  tenantSlug?: string;
  profileId?: string;
};

export type AppManifest = {
  id: string;
  title: string;
  icon: string;
  category: DesktopCategory;
  component: React.LazyExoticComponent<React.ComponentType>;
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  retryLimit?: number;
  defaultSize: { width: number; height: number };
  defaultPosition?: { x: number; y: number };
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };
  permissions?: (ctx: DesktopContext) => boolean;
  singleton?: boolean;
  dock?: { position: "left" | "right"; order: number };
};

export type AppRegistry = AppManifest[];

export type DesktopAction =
  | { type: "open-app"; appId: string }
  | { type: "navigate"; to: string }
  | { type: "dispatch"; action: (ctx: DesktopContext) => void }
  | { type: "noop" };
