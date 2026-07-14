import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack } from "@astryxdesign/core/HStack";
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
        <div className={styles.emptyState} data-testid="menu-editor-empty-state">
          <Text type="body" color="secondary">
            {t("desktop.menuEditor.empty")}
          </Text>
        </div>
      ) : (
        <ul className={styles.rows} aria-label="Menu entries">
          {schema.root.map((entry, index) => {
            if (isContextMenuItem(entry)) {
              const labelId = `item-label-${index}`;
              const disabledId = `item-disabled-${index}`;

              return (
                <li key={entry.id} className={styles.row} data-testid="menu-item">
                  <div className={styles.rowMain}>
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
                  </div>
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
                </li>
              );
            }

            if (isContextMenuSeparator(entry)) {
              return (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: separators have no stable identifier in the MVP schema
                  key={`separator-${index}`}
                  className={styles.separatorRow}
                  data-testid="menu-separator"
                >
                  {/* Astryx's horizontal Divider is width:100% and shrinks, so it holds its
                      width in this flex row instead of collapsing. */}
                  <div className={styles.separatorLine}>
                    <Divider />
                  </div>
                  {!readOnly && (
                    <Button
                      variant="destructive"
                      size="sm"
                      label="Delete"
                      aria-label="Delete separator"
                      onClick={() => updateRoot((entries) => removeEntry(entries, index))}
                    />
                  )}
                </li>
              );
            }

            if (isContextMenuGroup(entry)) {
              return (
                <li key={entry.id} className={styles.groupRow} data-testid="menu-group">
                  <Text type="body" weight="medium" display="block">
                    {entry.label ?? "Untitled group"}
                  </Text>
                  {/* Group children are not editable in this MVP view. */}
                  <Text type="supporting" display="block">
                    Group editing is not supported in this MVP view.
                  </Text>
                </li>
              );
            }

            return null;
          })}
        </ul>
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
