import type { AppSummary, DesktopApp } from "../api/desktop-apps-api";
import { type AppTypeId, getAppType, isAppType } from "./app-type-registry";
import type { ContentMenuSchema } from "./menu-schema";

export type AppManifest = {
  appId: string;
  type: AppTypeId;
  title: string;
  icon: string;
  content: Record<string, unknown>;
  menuSchema: ContentMenuSchema;
  rendererId: string;
  locked: boolean;
  etag: string;
};

export type BuildManifestOptions = {
  app: DesktopApp;
  menuOverrides?: Partial<ContentMenuSchema>;
};

export function mergeContent(
  defaults: Record<string, unknown>,
  overrides: Record<string, unknown>
): Record<string, unknown> {
  return { ...structuredClone(defaults), ...overrides };
}

function resolveMenuSchema(
  typeDefault: ContentMenuSchema,
  overrides?: Partial<ContentMenuSchema>
): ContentMenuSchema {
  if (!overrides) {
    return typeDefault;
  }

  const root = overrides.root ?? typeDefault.root;
  const id = overrides.id ?? typeDefault.id;

  // NOTE: This replaces the entire menu schema; it does not deep-merge entries.
  return { id, root };
}

export function buildAppManifest(options: BuildManifestOptions): AppManifest {
  const { app, menuOverrides } = options;

  if (!isAppType(app.type)) {
    throw new Error(`Invalid app type: ${app.type}`);
  }

  const typeDefinition = getAppType(app.type);

  return {
    appId: app.id,
    type: typeDefinition.id,
    title: app.title,
    icon: typeDefinition.icon,
    content: mergeContent(typeDefinition.defaultContent, app.content),
    menuSchema: resolveMenuSchema(typeDefinition.defaultMenuSchema, menuOverrides),
    rendererId: typeDefinition.rendererId,
    locked: app.locked,
    etag: app.etag,
  };
}

export function buildAppManifestFromSummary(
  summary: AppSummary
): Pick<AppManifest, "appId" | "type" | "title" | "icon" | "rendererId" | "locked" | "etag"> {
  if (!isAppType(summary.type)) {
    throw new Error(`Invalid app type: ${summary.type}`);
  }

  const typeDefinition = getAppType(summary.type);

  return {
    appId: summary.id,
    type: typeDefinition.id,
    title: summary.title,
    icon: typeDefinition.icon,
    rendererId: typeDefinition.rendererId,
    locked: summary.locked,
    etag: summary.etag,
  };
}
