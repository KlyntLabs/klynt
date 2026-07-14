"use client";

import { Divider } from "@astryxdesign/core/Divider";
import { Text } from "@astryxdesign/core/Text";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { type ActionContext, executeContextMenuAction } from "./action-registry";
import styles from "./context-menu-renderer.module.css";
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
      className={item.disabled ? `${styles.item} ${styles.itemDisabled}` : styles.item}
    >
      <Text type="body">{label}</Text>
      {item.shortcut ? (
        <Text type="supporting" size="sm" color="secondary">
          {item.shortcut}
        </Text>
      ) : null}
    </button>
  );
}

function MenuSeparator() {
  return (
    <div className={styles.separator}>
      <Divider />
    </div>
  );
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
      className={styles.group}
    >
      {label ? (
        <legend className={styles.groupLabel}>
          <Text type="supporting" size="sm" color="secondary" weight="medium">
            {label}
          </Text>
        </legend>
      ) : null}
      <div className={label ? styles.groupChildrenIndented : styles.groupChildren}>
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
      className={styles.surface}
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
      className={styles.emptySurface}
      role="menu"
      aria-label={schema.id}
    >
      <Text type="body">{t("desktop.contextMenu.empty")}</Text>
    </div>
  );
}
