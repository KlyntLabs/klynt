import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack } from "@astryxdesign/core/HStack";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import * as React from "react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import styles from "./menu-editor.module.css";
import {
  type ContextMenuEntry,
  type ContextMenuItem,
  type ContextMenuSchema,
  isContextMenuGroup,
  isContextMenuItem,
  isContextMenuSeparator,
} from "./menu-schema";

export type MenuEditorProps = {
  schema: ContextMenuSchema;
  onChange: (schema: ContextMenuSchema) => void;
  readOnly?: boolean;
};

function createUniqueId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const DEFAULT_CUSTOM_ACTION = "custom:new-action" as const;

/** The empty state's drop-target height. Center's minHeight takes a SizeValue string as-is. */
const EMPTY_STATE_MIN_HEIGHT = "8rem";

function createDefaultItem(): ContextMenuItem {
  return {
    type: "item",
    id: createUniqueId(),
    label: "New Item",
    action: DEFAULT_CUSTOM_ACTION,
  };
}

function updateItem(
  entries: ContextMenuEntry[],
  id: string,
  patch: Partial<ContextMenuItem>
): ContextMenuEntry[] {
  return entries.map((entry) => {
    if (isContextMenuItem(entry) && entry.id === id) {
      return { ...entry, ...patch };
    }
    return entry;
  });
}

function removeEntry(entries: ContextMenuEntry[], index: number): ContextMenuEntry[] {
  return entries.filter((_, i) => i !== index);
}

export function MenuEditor({
  schema,
  onChange,
  readOnly = false,
}: MenuEditorProps): React.JSX.Element {
  const { t } = useTranslation("home");
  const updateRoot = useCallback(
    (updater: (entries: ContextMenuEntry[]) => ContextMenuEntry[]) => {
      onChange({ ...schema, root: updater(schema.root) });
    },
    [onChange, schema]
  );

  return (
    <VStack gap={4}>
      {schema.root.length === 0 ? (
        <Center
          className={styles.emptyState}
          minHeight={EMPTY_STATE_MIN_HEIGHT}
          data-testid="menu-editor-empty-state"
        >
          <Text type="body" color="secondary">
            {t("desktop.menuEditor.empty")}
          </Text>
        </Center>
      ) : (
        <VStack as="ul" className={styles.rows} gap={2} aria-label="Menu entries">
          {schema.root.map((entry, index) => {
            if (isContextMenuItem(entry)) {
              const labelId = `item-label-${index}`;
              const disabledId = `item-disabled-${index}`;

              return (
                <HStack
                  as="li"
                  key={entry.id}
                  className={styles.row}
                  gap={3}
                  align="start"
                  padding={3}
                  data-testid="menu-item"
                >
                  {/* StackItem size="fill" is Astryx's own answer to flex:1 + min-width:0 —
                      "Use StackItem with size='fill' to make one item stretch and fill the
                      leftover space" — so the .rowMain div is gone. */}
                  <StackItem size="fill">
                    <VStack gap={2}>
                      {/* Astryx's TextInput owns its label, so the separate <Label> is gone. */}
                      <TextInput
                        id={labelId}
                        label="Label"
                        value={entry.label}
                        isDisabled={readOnly}
                        onChange={(value) =>
                          updateRoot((entries) => updateItem(entries, entry.id, { label: value }))
                        }
                      />
                      <Text type="supporting">Action: {entry.action}</Text>
                    </VStack>
                  </StackItem>
                  <HStack gap={2} align="center">
                    <CheckboxInput
                      id={disabledId}
                      label="Disabled"
                      value={entry.disabled ?? false}
                      isDisabled={readOnly}
                      onChange={(checked) =>
                        updateRoot((entries) =>
                          updateItem(entries, entry.id, { disabled: checked })
                        )
                      }
                    />
                    {!readOnly && (
                      <Button
                        variant="destructive"
                        size="sm"
                        label="Delete"
                        aria-label={`Delete ${entry.label}`}
                        onClick={() => updateRoot((entries) => removeEntry(entries, index))}
                      />
                    )}
                  </HStack>
                </HStack>
              );
            }

            if (isContextMenuSeparator(entry)) {
              return (
                <HStack
                  as="li"
                  // biome-ignore lint/suspicious/noArrayIndexKey: separators have no stable identifier in the MVP schema
                  key={`separator-${index}`}
                  className={styles.row}
                  gap={2}
                  align="center"
                  justify="between"
                  padding={3}
                  data-testid="menu-separator"
                >
                  {/* The Divider takes the slack via StackItem size="fill"; the delete button
                      keeps its intrinsic width. The old .separatorLine div is gone. */}
                  <StackItem size="fill">
                    <Divider />
                  </StackItem>
                  {!readOnly && (
                    <Button
                      variant="destructive"
                      size="sm"
                      label="Delete"
                      aria-label="Delete separator"
                      onClick={() => updateRoot((entries) => removeEntry(entries, index))}
                    />
                  )}
                </HStack>
              );
            }

            if (isContextMenuGroup(entry)) {
              return (
                <VStack
                  as="li"
                  key={entry.id}
                  className={styles.row}
                  gap={1}
                  align="stretch"
                  padding={3}
                  data-testid="menu-group"
                >
                  <Text type="body" weight="medium" display="block">
                    {entry.label ?? "Untitled group"}
                  </Text>
                  {/* Group children are not editable in this MVP view. */}
                  <Text type="supporting" display="block">
                    Group editing is not supported in this MVP view.
                  </Text>
                </VStack>
              );
            }

            return null;
          })}
        </VStack>
      )}
      {!readOnly && (
        <HStack gap={2}>
          <Button
            variant="primary"
            label="Add Item"
            aria-label="Add item"
            onClick={() => updateRoot((entries) => [...entries, createDefaultItem()])}
          />
          <Button
            variant="secondary"
            label="Add Separator"
            aria-label="Add separator"
            onClick={() => updateRoot((entries) => [...entries, { type: "separator" }])}
          />
        </HStack>
      )}
    </VStack>
  );
}
