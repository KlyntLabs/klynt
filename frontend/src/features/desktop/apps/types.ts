import type { ComponentType, LazyExoticComponent } from "react";

/**
 * Props accepted by an app icon component.
 * The shell decides the size; the icon just consumes the className.
 */
export interface AppIconProps {
  className?: string;
}

/**
 * Metadata describing a WindowApp.
 * This is the only part of the app the desktop chrome is allowed to know.
 */
export interface AppManifest {
  /** Stable identifier for the app. */
  id: string;
  /** Route the app responds to in both desktop and website modes. */
  route: string;
  /** Human-readable title shown in window chrome, menus, and icons. */
  title: string;
  /** Optional shorter title for constrained spaces (menubar, small icons). */
  shortTitle?: string;
  /** Icon component rendered by the desktop shell. */
  icon: ComponentType<AppIconProps>;
  /** Preferred window size when opened in desktop mode. */
  defaultSize?: { width: number; height: number };
  /** Optional grouping category for menus and desktop icon layouts. */
  category?: string;
  /** Optional menubar group. Apps with the same group are rendered together. */
  menuGroup?: string;
  /** Optional desktop dock placement. */
  dock?: {
    position: "left" | "right";
    /** Lower numbers appear first. */
    order: number;
  };
}

/**
 * A WindowApp is a unit of functionality that can be rendered inside a
 * desktop window or on its own as a website route.
 */
export interface WindowApp {
  manifest: AppManifest;
  component: LazyExoticComponent<ComponentType> | ComponentType;
}

/**
 * The single source of truth that maps routes/IDs to WindowApps.
 */
export interface AppRegistry {
  /** All registered apps, in registration order. */
  apps: WindowApp[];
  /** Returns the default app opened when the desktop starts with no windows. */
  defaultApp: WindowApp;
}

/**
 * Look up an app by its route.
 */
export function getAppByRoute(registry: AppRegistry, route: string): WindowApp | undefined {
  return registry.apps.find((app) => app.manifest.route === route);
}

/**
 * Look up an app by its stable ID.
 */
export function getAppById(registry: AppRegistry, id: string): WindowApp | undefined {
  return registry.apps.find((app) => app.manifest.id === id);
}

/**
 * Return all apps in a given category.
 */
export function getAppsByCategory(registry: AppRegistry, category: string): WindowApp[] {
  return registry.apps.filter((app) => app.manifest.category === category);
}

/**
 * Return all apps in a given menubar group.
 */
export function getAppsByMenuGroup(registry: AppRegistry, menuGroup: string): WindowApp[] {
  return registry.apps.filter((app) => app.manifest.menuGroup === menuGroup);
}

/**
 * Return the unique menubar group names across all apps, in registration order.
 */
export function getAppMenuGroups(registry: AppRegistry): string[] {
  const groups = registry.apps
    .map((app) => app.manifest.menuGroup)
    .filter((group): group is string => Boolean(group));
  return Array.from(new Set(groups));
}

/**
 * Return the unique category names across all apps, in registration order.
 */
export function getAppCategories(registry: AppRegistry): string[] {
  const categories = registry.apps
    .map((app) => app.manifest.category)
    .filter((category): category is string => Boolean(category));
  return Array.from(new Set(categories));
}

/**
 * Return apps placed on a given dock side, sorted by order.
 */
export function getDockApps(registry: AppRegistry, position: "left" | "right"): WindowApp[] {
  return registry.apps
    .filter((app) => app.manifest.dock?.position === position)
    .sort((a, b) => (a.manifest.dock?.order ?? 0) - (b.manifest.dock?.order ?? 0));
}
