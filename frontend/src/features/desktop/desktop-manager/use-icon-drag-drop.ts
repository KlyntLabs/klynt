import type { DragEventHandler } from "react";
import { useCallback, useState } from "react";
import { useIconTreeStore } from "./icon-tree-module";

export type DropZone = "desktop" | { folderId: string };

export type UseIconDragDropResult = {
  draggingId: string | null;
  dropTargetId: string | null;
  bindDrag: (appId: string) => {
    draggable: true;
    onDragStart: DragEventHandler<HTMLElement>;
    onDragEnd: DragEventHandler<HTMLElement>;
  };
  bindDrop: (zone: DropZone) => {
    onDragOver: DragEventHandler<HTMLElement>;
    onDragLeave: DragEventHandler<HTMLElement>;
    onDrop: DragEventHandler<HTMLElement>;
  };
};

const DATA_TRANSFER_TYPE = "text/plain";

function getTargetId(zone: DropZone): string {
  return zone === "desktop" ? "desktop" : zone.folderId;
}

function getFolderId(zone: DropZone): string | null {
  return zone === "desktop" ? null : zone.folderId;
}

export function useIconDragDrop(options: {
  desktopId: string;
  onMove?: (appId: string, newParentId: string | null) => Promise<void> | void;
}): UseIconDragDropResult {
  const { desktopId, onMove } = options;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const bindDrag = useCallback(
    (appId: string) => ({
      draggable: true as const,
      onDragStart: (event: React.DragEvent<HTMLElement>) => {
        event.dataTransfer.setData(DATA_TRANSFER_TYPE, appId);
        setDraggingId(appId);
      },
      onDragEnd: () => {
        setDraggingId(null);
        setDropTargetId(null);
      },
    }),
    []
  );

  const bindDrop = useCallback(
    (zone: DropZone) => {
      const targetId = getTargetId(zone);

      return {
        onDragOver: (event: React.DragEvent<HTMLElement>) => {
          event.preventDefault();
          setDropTargetId(targetId);
        },
        onDragLeave: () => {
          setDropTargetId((current) => (current === targetId ? null : current));
        },
        onDrop: (event: React.DragEvent<HTMLElement>) => {
          event.preventDefault();
          event.stopPropagation();
          const appId = event.dataTransfer.getData(DATA_TRANSFER_TYPE);
          if (!appId) {
            setDropTargetId(null);
            return;
          }

          const folderId = getFolderId(zone);
          const clearState = () => {
            setDraggingId(null);
            setDropTargetId(null);
          };

          if (onMove) {
            const result = onMove(appId, folderId);
            if (result instanceof Promise) {
              result.then(clearState, clearState);
            } else {
              clearState();
            }
          } else {
            useIconTreeStore.getState().moveNode(desktopId, appId, folderId);
            clearState();
          }
        },
      };
    },
    [desktopId, onMove]
  );

  return {
    draggingId,
    dropTargetId,
    bindDrag,
    bindDrop,
  };
}
