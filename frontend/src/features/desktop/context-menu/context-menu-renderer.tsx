"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
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

function useMenuLabel(
  entry: { label?: string; labelKey?: string } | undefined
): string | undefined {
  const { t } = useTranslation("app");
  if (!entry) return undefined;
  if (entry.labelKey) {
    return t(entry.labelKey as never);
  }
  return entry.label;
}

function MenuItem({
  item,
  actionContext,
  onClose,
}: {
  item: ContextMenuItem;
  actionContext: ActionContext;
  onClose: () => void;
}) {
  const label = useMenuLabel(item);

  async function handleClick() {
    if (item.disabled) {
      return;
    }
    try {
      await executeContextMenuAction(item.action, actionContext);
    } catch (error) {
      console.error("Context menu action failed:", error);
    }
    onClose();
  }

  return (
    <button
      type="button"
      role="menuitem"
      data-testid={`context-menu-item-${item.id}`}
      disabled={item.disabled}
      onClick={handleClick}
      className={cn(
        "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm",
        "text-white/90 hover:bg-white/10 focus:bg-white/10 focus:outline-hidden",
        item.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
      )}
    >
      <span>{label}</span>
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
  const label = useMenuLabel(group);

  return (
    <fieldset
      data-testid={`context-menu-group-${group.id}`}
      aria-label={label}
      className="border-0 p-0 m-0"
    >
      {label ? (
        <legend className="block px-2 py-1 text-xs font-medium text-white/50">{label}</legend>
      ) : null}
      <div className={cn("flex flex-col", label ? "pl-2" : "")}>
        <MenuEntries entries={group.children} actionContext={actionContext} onClose={onClose} />
      </div>
    </fieldset>
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
      {entries.map((entry, index) => {
        if (isContextMenuItem(entry)) {
          return (
            <MenuItem key={entry.id} item={entry} actionContext={actionContext} onClose={onClose} />
          );
        }

        if (isContextMenuSeparator(entry)) {
          // biome-ignore lint/suspicious/noArrayIndexKey: separators are static dividers with no identity
          return <MenuSeparator key={`separator-${index}`} />;
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
  if (schema.root.length === 0) {
    return <EmptyContextMenu schema={schema} />;
  }

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

function EmptyContextMenu({ schema }: { schema: ContextMenuSchema }): React.JSX.Element {
  const { t } = useTranslation("home");
  return (
    <div
      data-testid="context-menu-empty-state"
      className={cn(
        "absolute min-w-[10rem] rounded-lg border border-white/10 bg-black/80 p-3 shadow-xl",
        "backdrop-blur-sm text-sm text-white/90"
      )}
      role="menu"
      aria-label={schema.id}
    >
      {t("desktop.contextMenu.empty")}
    </div>
  );
}
