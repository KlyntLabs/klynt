import * as React from "react";
import { cn } from "@/lib/utils";
import { type ActionContext, executeContextMenuAction } from "./action-registry";
import {
  type ContextMenuEntry,
  type ContextMenuGroup,
  type ContextMenuItem,
  type ContextMenuSchema,
  isContextMenuGroup,
  isContextMenuItem,
  isContextMenuSeparator,
} from "./menu-schema";

export type ContextMenuRendererProps = {
  schema: ContextMenuSchema;
  actionContext: ActionContext;
  onClose: () => void;
};

function MenuItem({
  item,
  actionContext,
  onClose,
}: {
  item: ContextMenuItem;
  actionContext: ActionContext;
  onClose: () => void;
}) {
  async function handleClick() {
    if (item.disabled) {
      return;
    }
    await executeContextMenuAction(item.action, actionContext);
    onClose();
  }

  return (
    <button
      type="button"
      data-testid={`context-menu-item-${item.id}`}
      disabled={item.disabled}
      onClick={handleClick}
      className={cn(
        "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm",
        "text-white/90 hover:bg-white/10 focus:bg-white/10 focus:outline-hidden",
        item.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
      )}
    >
      <span>{item.label}</span>
      {item.shortcut ? <span className="ml-4 text-xs text-white/50">{item.shortcut}</span> : null}
    </button>
  );
}

function MenuSeparator() {
  return <hr className="my-1 border-white/10" />;
}

function MenuGroup({
  group,
  actionContext,
  onClose,
}: {
  group: ContextMenuGroup;
  actionContext: ActionContext;
  onClose: () => void;
}) {
  return (
    <div data-testid={`context-menu-group-${group.id}`}>
      {group.label ? (
        <span className="block px-2 py-1 text-xs font-medium text-white/50">{group.label}</span>
      ) : null}
      <div className={cn("flex flex-col", group.label ? "pl-2" : "")}>
        <MenuEntries entries={group.children} actionContext={actionContext} onClose={onClose} />
      </div>
    </div>
  );
}

function MenuEntries({
  entries,
  actionContext,
  onClose,
}: {
  entries: ContextMenuEntry[];
  actionContext: ActionContext;
  onClose: () => void;
}) {
  return (
    <>
      {entries.map((entry) => {
        if (isContextMenuItem(entry)) {
          return (
            <MenuItem key={entry.id} item={entry} actionContext={actionContext} onClose={onClose} />
          );
        }

        if (isContextMenuSeparator(entry)) {
          return <MenuSeparator key={`separator-${Math.random()}`} />;
        }

        if (isContextMenuGroup(entry)) {
          return (
            <MenuGroup
              key={entry.id}
              group={entry}
              actionContext={actionContext}
              onClose={onClose}
            />
          );
        }

        return null;
      })}
    </>
  );
}

export function ContextMenuRenderer({
  schema,
  actionContext,
  onClose,
}: ContextMenuRendererProps): React.JSX.Element {
  return (
    <div
      data-testid="context-menu-renderer"
      className={cn(
        "absolute min-w-[10rem] rounded-lg border border-white/10 bg-black/80 p-1 shadow-xl",
        "backdrop-blur-sm"
      )}
      role="menu"
      aria-label={schema.id}
    >
      <MenuEntries entries={schema.root} actionContext={actionContext} onClose={onClose} />
    </div>
  );
}
