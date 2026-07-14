import { Text } from "@astryxdesign/core/Text";
import { FileText, Folder, Play, StickyNote } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { AppSummary, AppType } from "@/features/desktop/api/desktop-apps-api";
import { moveDesktopApp } from "@/features/desktop/desktop-manager/desktop-actions";
import {
  type IconTreeNode,
  useIconTreeStore,
} from "@/features/desktop/desktop-manager/icon-tree-module";
import { useCurrentFolderContents } from "@/features/desktop/desktop-manager/use-current-folder";
import { useIconDragDrop } from "@/features/desktop/desktop-manager/use-icon-drag-drop";
import { useWindowManager } from "@/features/desktop/window-manager/window-module";
import iconStyles from "./desktop-icon.module.css";
import styles from "./desktop-icon-grid.module.css";

const typeIconMap: Record<AppType, React.ComponentType> = {
  folder: Folder,
  markdown: FileText,
  notes: StickyNote,
  video: Play,
};

type DesktopIconGridProps = {
  desktopId: string;
  tenantSlug: string;
  apps: AppSummary[];
  onOpenContextMenu: (event: React.MouseEvent, appId: string, isFolder: boolean) => void;
  selectedAppId?: string | null;
  onSelectAppId?: (appId: string | null) => void;
};

function DraggableIcon({
  node,
  app,
  isSelected,
  onSelect,
  onOpenContextMenu,
  bindDrag,
  bindDrop,
  onOpen,
}: {
  node: IconTreeNode;
  app?: AppSummary;
  isSelected: boolean;
  onSelect: (appId: string) => void;
  onOpenContextMenu: (event: React.MouseEvent, appId: string, isFolder: boolean) => void;
  bindDrag: (appId: string) => {
    draggable: true;
    onDragStart: React.DragEventHandler<HTMLElement>;
    onDragEnd: React.DragEventHandler<HTMLElement>;
  };
  bindDrop: (zone: "desktop" | { folderId: string }) => {
    onDragOver: React.DragEventHandler<HTMLElement>;
    onDragLeave: React.DragEventHandler<HTMLElement>;
    onDrop: React.DragEventHandler<HTMLElement>;
  };
  onOpen: (appId: string, isFolder: boolean) => void;
}) {
  const { t } = useTranslation("home");
  const isFolder = app?.type === "folder" || node.children !== undefined;
  const title = node.title ?? app?.title ?? t("desktop.app.defaultTitle");
  const Icon = app?.type ? typeIconMap[app.type] : FileText;

  // Plain conditional class composition — the old class-joining helper went with Tailwind.
  const tileClass = isSelected ? `${iconStyles.tile} ${iconStyles.tileSelected}` : iconStyles.tile;

  return (
    <button
      key={node.appId}
      type="button"
      onClick={() => {
        onSelect(node.appId);
      }}
      onDoubleClick={() => {
        onOpen(node.appId, isFolder);
      }}
      onContextMenu={(event) => onOpenContextMenu(event, node.appId, isFolder)}
      {...bindDrag(node.appId)}
      {...(isFolder ? bindDrop({ folderId: node.appId }) : {})}
      className={iconStyles.icon}
      data-testid={`desktop-icon-${node.appId}`}
    >
      <div className={tileClass}>
        <Icon />
      </div>
      <Text
        type="supporting"
        size="xsm"
        weight="medium"
        color="primary"
        maxLines={2}
        justify="center"
        className={iconStyles.label}
      >
        {title}
      </Text>
    </button>
  );
}

export function DesktopIconGrid({
  desktopId,
  apps,
  onOpenContextMenu,
  selectedAppId,
  onSelectAppId,
}: DesktopIconGridProps): React.JSX.Element {
  const { t } = useTranslation("home");
  const { openApp } = useWindowManager();
  const { currentNodes } = useCurrentFolderContents(desktopId);

  const appMap = useMemo(() => {
    const map = new Map<string, AppSummary>();
    for (const app of apps) {
      map.set(app.id, app);
    }
    return map;
  }, [apps]);

  const handleSelect = (appId: string) => {
    onSelectAppId?.(appId);
  };

  const handleMove = (appId: string, newParentId: string | null) => {
    const app = appMap.get(appId);
    moveDesktopApp({ desktopId, appId, newParentId, isLocked: app?.locked }).catch((err) => {
      // TODO: surface error to user via toast/notification
      console.error("Failed to move app:", err);
    });
  };

  const { bindDrag, bindDrop } = useIconDragDrop({ desktopId, onMove: handleMove });

  const handleOpen = (appId: string, isFolder: boolean) => {
    if (isFolder) {
      useIconTreeStore.getState().openFolder(desktopId, appId);
    } else {
      openApp(desktopId, appId);
    }
  };

  if (currentNodes.length === 0) {
    return (
      <div
        className={styles.emptyDropZone}
        {...bindDrop("desktop")}
        data-testid="desktop-empty-grid"
      >
        <Text color="secondary">{t("desktop.empty.noIcons")}</Text>
      </div>
    );
  }

  return (
    <div className={styles.dropZone} {...bindDrop("desktop")} data-testid="desktop-icon-grid">
      <div className={styles.grid}>
        {currentNodes.map((node) => (
          <DraggableIcon
            key={node.appId}
            node={node}
            app={appMap.get(node.appId)}
            isSelected={selectedAppId === node.appId}
            onSelect={handleSelect}
            onOpenContextMenu={onOpenContextMenu}
            bindDrag={bindDrag}
            bindDrop={bindDrop}
            onOpen={handleOpen}
          />
        ))}
      </div>
    </div>
  );
}
