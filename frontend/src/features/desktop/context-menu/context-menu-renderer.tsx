"use client";

import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
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

  /*
   * A menu row IS an Astryx Button.
   *
   * It used to be an `<HStack as="button">` carrying a `{type, disabled}` spread-cast: Astryx's
   * StackProps extends BaseProps, which is React.HTMLAttributes and therefore has no `type` or
   * `disabled`, so those button-only attributes were untyped even though rest props do reach the
   * element. Button declares both properly — `type` defaults to "button" and `isDisabled`
   * becomes the real `disabled` attribute — so the cast is gone, and with it the native-button
   * reset and the hand-written :hover / :focus-visible / disabled rules, which are the ghost
   * variant's job now.
   *
   * Astryx's own <Item> looks like the obvious fit and is NOT: passing it a `role` sets its
   * `hasParentRole` branch, which renders the row as a plain div with no tabIndex. That would
   * take a keyboard-reachable menu and make it unreachable. Button keeps the real <button>.
   *
   * The label/shortcut split rides on `endContent`. Button's content wrapper is `display:
   * contents`, so the label and the shortcut are direct flex children of the <button> itself —
   * which is why .item only has to say "fill the row and push them apart", with no values in it.
   */
  return (
    <Button
      variant="ghost"
      size="sm"
      role="menuitem"
      label={label ?? ""}
      endContent={
        item.shortcut ? (
          <Text type="supporting" size="sm" color="secondary">
            {item.shortcut}
          </Text>
        ) : undefined
      }
      isDisabled={item.disabled}
      onClick={handleClick}
      className={styles.item}
      data-testid={`context-menu-item-${item.id}`}
    />
  );
}

/* Astryx's horizontal Divider is width:100% and takes a className, so the wrapper div that used
   to carry its surrounding rhythm is gone — the margin rides on the Divider itself. */
function MenuSeparator() {
  return <Divider className={styles.separator} />;
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
      {/* The indent is a padding step, so it is a prop — the two groupChildren classes are gone. */}
      <VStack paddingInline={label ? 2 : 0}>
        <MenuEntries entries={group.children} actionContext={actionContext} onClose={onClose} />
      </VStack>
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
    <VStack
      data-testid="context-menu-renderer"
      className={styles.surface}
      role="menu"
      aria-label={schema.id}
      padding={1}
    >
      <MenuEntries entries={schema.root} actionContext={actionContext} onClose={onClose} />
    </VStack>
  );
}

function EmptyContextMenu({ schema }: { schema: ContextMenuSchema }): React.JSX.Element {
  const { t } = useTranslation("home");
  return (
    <VStack
      data-testid="context-menu-empty-state"
      className={styles.emptySurface}
      role="menu"
      aria-label={schema.id}
      padding={3}
    >
      <Text type="body">{t("desktop.contextMenu.empty")}</Text>
    </VStack>
  );
}
