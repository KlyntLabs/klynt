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
import { cn } from "@/lib/utils";

const typeIconMap: Record<AppType, React.ComponentType<{ className?: string }>> = {
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
      className="flex flex-col items-center gap-1 w-[72px] group cursor-pointer"
      data-testid={`desktop-icon-${node.appId}`}
    >
      <div
        className={cn(
          "w-12 h-12 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm border border-white/40 shadow-sm group-hover:bg-white group-hover:scale-105 group-hover:shadow-md transition-all duration-150",
          isSelected && "ring-2 ring-[#3B82F6] border-[#3B82F6]"
        )}
      >
        <Icon className="w-6 h-6 text-[#6B6B6B]" />
      </div>
      <span className="text-[11px] font-medium text-center text-[#1A1A1A] leading-tight max-w-[72px] line-clamp-2 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
        {title}
      </span>
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
        className="flex-1 w-full flex items-center justify-center text-sm text-[#1A1A1A]/70"
        {...bindDrop("desktop")}
        data-testid="desktop-empty-grid"
      >
        {t("desktop.empty.noIcons")}
      </div>
    );
  }

  return (
    <div className="flex-1 w-full" {...bindDrop("desktop")} data-testid="desktop-icon-grid">
      <div className="grid grid-cols-6 gap-6 p-6">
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
