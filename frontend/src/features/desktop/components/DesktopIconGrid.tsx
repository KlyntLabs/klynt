import { Center } from "@astryxdesign/core/Center";
import { Grid } from "@astryxdesign/core/Grid";
import { Icon } from "@astryxdesign/core/Icon";
import { SelectableCard } from "@astryxdesign/core/SelectableCard";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { FileText, Folder, Play, StickyNote } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
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
import styles from "./desktop-icon-grid.module.css";

/**
 * The desktop icon's footprint: caption measure and hit target, 72px.
 *
 * Past Astryx's spacing scale (0–48px) and it is a *dimension*, not spacing, so per the sizing
 * contract — `SizeValue`: "numbers are treated as pixels" — it belongs on the component's
 * `width` prop, not in CSS. Shared with DesktopIcons.tsx, which renders the same icon on the
 * docks, so the two flavours cannot drift apart.
 */
export const DESKTOP_ICON_WIDTH = 88;

/** The icon card's inner gutter. A SpacingStep, so it rides on the card's `padding` prop. */
export const DESKTOP_ICON_PADDING = 2;

/**
 * The icon field's gutter — a single step ON Astryx's spacing scale (the top of `SpacingStep`),
 * so it is a real `padding` prop on the field's VStack rather than the calc() composite it
 * replaces.
 */
export const ICON_FIELD_PADDING = 10;

/**
 * The icon field's measure.
 *
 * The field used to be full-bleed and was held off the two docks by oversized inline gutters
 * (96px, built as calc(--spacing-12 * 2)). Astryx's `SpacingStep` stops at 40px, so no padding
 * prop could ever carry that — the composite was raw pixels in disguise.
 *
 * Redesigned: the field is a centred column of fixed measure instead of a full-bleed stretch.
 * The measure is a dimension, not spacing, so per `SizeValue` — "numbers are treated as pixels"
 * — it rides on the component's `maxWidth` prop. 720 comfortably seats the 6-up grid (6 icons
 * plus five gaps needs 552) and, centred in the narrowest desktop viewport Astryx renders at
 * (1024px), leaves 152px of clearance on each side — more than the 88px the docks occupy.
 */
const ICON_FIELD_MAX_WIDTH = 720;

/** The icon field: a fixed 6-up grid, as many columns as the desktop has always had. */
const GRID_COLUMNS = 6;

const typeIconMap: Record<AppType, ComponentType<SVGProps<SVGSVGElement>>> = {
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
  const typeIcon = app?.type ? typeIconMap[app.type] : FileText;

  /*
   * A grid icon IS an Astryx SelectableCard — "For toggle selection, use SelectableCard".
   *
   * It is the same opaque Card the docks use (see DesktopIcons.tsx), plus the one thing the
   * docks do not need: a selected state. That state was a hand-drawn 2px outset ring
   * (`box-shadow: 0 0 0 2px var(--color-border-blue)`), which is not something Astryx has a
   * token for — the system's selection affordance is an *inset* accent ring, and SelectableCard
   * draws it. The ring is now the component's, so the last hand-valued pixel on the icon is gone
   * along with the class that carried it.
   *
   * Everything the icon actually *does* rides on BaseProps, which "keeps event handlers, aria-*,
   * role, tabIndex, hidden, draggable ... and data-*" and is spread straight onto the card's
   * root: the double-click to open, the right-click menu, the HTML5 drag source, the folder drop
   * target and the data-testid all survive untouched. Selection is `isSelected`/`onChange`
   * rather than `onClick`, which is also why the `type="button"` spread-cast is gone: the card
   * brings its own real control.
   */
  return (
    <SelectableCard
      key={node.appId}
      label={title}
      isSelected={isSelected}
      onChange={() => {
        onSelect(node.appId);
      }}
      onDoubleClick={() => {
        onOpen(node.appId, isFolder);
      }}
      onContextMenu={(event: React.MouseEvent) => onOpenContextMenu(event, node.appId, isFolder)}
      {...bindDrag(node.appId)}
      {...(isFolder ? bindDrop({ folderId: node.appId }) : {})}
      width={DESKTOP_ICON_WIDTH}
      padding={DESKTOP_ICON_PADDING}
      data-testid={`desktop-icon-${node.appId}`}
    >
      <VStack gap={1} align="center">
        <Icon icon={typeIcon} size="lg" color="secondary" />
        <Text
          type="supporting"
          size="xsm"
          weight="medium"
          color="primary"
          maxLines={2}
          justify="center"
        >
          {title}
        </Text>
      </VStack>
    </SelectableCard>
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
      <Center
        className={styles.emptyDropZone}
        width="100%"
        maxWidth={ICON_FIELD_MAX_WIDTH}
        {...bindDrop("desktop")}
        data-testid="desktop-empty-grid"
      >
        <Text color="secondary">{t("desktop.empty.noIcons")}</Text>
      </Center>
    );
  }

  return (
    <VStack
      className={styles.dropZone}
      width="100%"
      maxWidth={ICON_FIELD_MAX_WIDTH}
      {...bindDrop("desktop")}
      data-testid="desktop-icon-grid"
    >
      {/* Astryx's Grid does the 6-up track list — `columns={6}` compiles to the same
          repeat(6, minmax(0, 1fr)) the hand-rolled grid had. Only the padding is left in CSS:
          Grid has gap/rowGap/columnGap props but no padding prop. */}
      <Grid className={styles.grid} columns={GRID_COLUMNS} gap={6}>
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
      </Grid>
    </VStack>
  );
}
