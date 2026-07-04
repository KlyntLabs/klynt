import * as React from "react";
import type { ActionContext } from "./action-registry";
import { ContextMenuRenderer } from "./context-menu-renderer";
import { desktopBackgroundMenu, desktopFolderMenu, desktopIconMenu } from "./default-menus";
import { mergeContextMenu } from "./menu-merger";
import type { ContextMenuTarget } from "./menu-schema";
import type { ContextMenuState } from "./use-desktop-context-menu";

type DesktopContextMenuProps = {
  state: ContextMenuState;
  actionContext: ActionContext;
  onClose: () => void;
};

function selectBaseSchema(target: ContextMenuTarget) {
  switch (target.kind) {
    case "desktop":
      return desktopBackgroundMenu;
    case "icon":
      return desktopIconMenu;
    case "folder":
      return desktopFolderMenu;
    default: {
      const _exhaustiveCheck: never = target;
      throw new Error(`Unhandled context menu target: ${_exhaustiveCheck}`);
    }
  }
}

export function DesktopContextMenu({
  state,
  actionContext,
  onClose,
}: DesktopContextMenuProps): React.JSX.Element | null {
  if (!state.open) {
    return null;
  }

  const baseSchema = selectBaseSchema(state.target);
  const schema = mergeContextMenu(baseSchema, undefined, state.appContentMenu);

  return (
    <div
      data-testid="desktop-context-menu"
      style={{
        position: "absolute",
        left: state.x,
        top: state.y,
      }}
    >
      <ContextMenuRenderer schema={schema} actionContext={actionContext} onClose={onClose} />
    </div>
  );
}
