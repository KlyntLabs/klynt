import { useCallback, useState } from "react";
import type { ContentMenuSchema } from "../apps/menu-schema";
import type { ContextMenuTarget } from "./menu-schema";

export type ContextMenuState =
  | { open: false }
  | {
      open: true;
      x: number;
      y: number;
      target: ContextMenuTarget;
      appContentMenu?: ContentMenuSchema;
    };

export function useDesktopContextMenu(): {
  state: ContextMenuState;
  openMenu: (
    event: React.MouseEvent,
    target: ContextMenuTarget,
    appContentMenu?: ContentMenuSchema
  ) => void;
  closeMenu: () => void;
} {
  const [state, setState] = useState<ContextMenuState>({ open: false });

  const openMenu = useCallback(
    (event: React.MouseEvent, target: ContextMenuTarget, appContentMenu?: ContentMenuSchema) => {
      event.preventDefault();
      event.stopPropagation();

      setState({
        open: true,
        x: event.clientX,
        y: event.clientY,
        target,
        appContentMenu,
      });
    },
    []
  );

  const closeMenu = useCallback(() => {
    setState({ open: false });
  }, []);

  return { state, openMenu, closeMenu };
}
