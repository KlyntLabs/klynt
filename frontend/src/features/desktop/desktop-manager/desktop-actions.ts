import { nanoid } from "nanoid";
import { useEffect, useRef, useState } from "react";
import { type AppType, type DesktopApp, desktopAppsApi } from "../api/desktop-apps-api";
import type { PersistenceAdapter } from "../persistence/types";
import { type IconTreeNode, useIconTreeStore } from "./icon-tree-module";

export type CreateDesktopAppOptions = {
  desktopId: string;
  slug: string;
  type: AppType;
  title: string;
  content?: Record<string, unknown>;
  menuConfig?: Record<string, unknown>;
  parentId?: string | null;
  x?: number;
  y?: number;
};

export type MoveDesktopAppOptions = {
  desktopId: string;
  appId: string;
  newParentId?: string | null;
  isLocked?: boolean;
};

export type DeleteDesktopAppOptions = {
  desktopId: string;
  slug: string;
  appId: string;
  isLocked?: boolean;
};

function generateTempId(): string {
  return `temp-${nanoid()}`;
}

function buildTempNode(options: CreateDesktopAppOptions): IconTreeNode {
  return {
    appId: generateTempId(),
    x: options.x ?? 0,
    y: options.y ?? 0,
    title: options.title,
    parentIdSnapshot: options.parentId ?? null,
    children: options.type === "folder" ? [] : undefined,
  };
}

function buildRealNode(app: DesktopApp, snapshot: IconTreeNode): IconTreeNode {
  return {
    appId: app.id,
    x: snapshot.x,
    y: snapshot.y,
    title: app.title,
    parentIdSnapshot: snapshot.parentIdSnapshot,
    children: snapshot.children,
  };
}

export async function createDesktopApp(options: CreateDesktopAppOptions): Promise<DesktopApp> {
  const store = useIconTreeStore.getState();
  const tempNode = buildTempNode(options);

  store.addNode(options.desktopId, tempNode, options.parentId ?? null);

  try {
    const response = await desktopAppsApi.create(options.slug, {
      type: options.type,
      title: options.title,
      content: options.content,
      menuConfig: options.menuConfig,
    });

    const app = response.data.data;
    store.removeNode(options.desktopId, tempNode.appId);
    store.addNode(options.desktopId, buildRealNode(app, tempNode), options.parentId ?? null);

    return app;
  } catch (error) {
    store.removeNode(options.desktopId, tempNode.appId);
    throw error;
  }
}

export async function moveDesktopApp(options: MoveDesktopAppOptions): Promise<void> {
  if (options.isLocked) {
    throw new Error("Cannot move a locked app");
  }

  const store = useIconTreeStore.getState();
  const moved = store.moveNode(options.desktopId, options.appId, options.newParentId);

  if (!moved) {
    throw new Error("Cannot move app into its own descendant");
  }
}

export async function deleteDesktopApp(options: DeleteDesktopAppOptions): Promise<void> {
  if (options.isLocked) {
    throw new Error("Cannot delete a locked app");
  }

  const store = useIconTreeStore.getState();
  store.removeNode(options.desktopId, options.appId);

  await desktopAppsApi.delete(options.slug, options.appId);
}

const LAYOUT_VERSION = 1;
const DEFAULT_BACKGROUND_PRESET_ID = "fabric";

export function useDebouncedLayoutSave(
  desktopId: string,
  persistence: PersistenceAdapter,
  delay = 1000
): { save: () => void; isSaving: boolean } {
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      const tree = useIconTreeStore.getState().trees[desktopId] ?? [];
      const layout = {
        version: LAYOUT_VERSION,
        backgroundPresetId: DEFAULT_BACKGROUND_PRESET_ID,
        iconTree: tree,
        windows: [],
      };

      setIsSaving(true);
      await persistence.save(desktopId, layout);
      setIsSaving(false);
    }, delay);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { save, isSaving };
}
