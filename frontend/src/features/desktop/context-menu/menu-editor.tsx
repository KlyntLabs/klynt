import * as React from "react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="space-y-4">
      {schema.root.length === 0 ? (
        <div
          className="flex min-h-[8rem] items-center justify-center rounded-md border border-dashed p-4 text-sm text-muted-foreground"
          data-testid="menu-editor-empty-state"
        >
          {t("desktop.menuEditor.empty")}
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Menu entries">
          {schema.root.map((entry, index) => {
            if (isContextMenuItem(entry)) {
              const labelId = `item-label-${index}`;
              const disabledId = `item-disabled-${index}`;

              return (
                <li
                  key={entry.id}
                  className="flex items-start gap-3 rounded-md border p-3"
                  data-testid="menu-item"
                >
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label htmlFor={labelId}>Label</Label>
                      <Input
                        id={labelId}
                        value={entry.label}
                        disabled={readOnly}
                        onChange={(event) =>
                          updateRoot((entries) =>
                            updateItem(entries, entry.id, { label: event.target.value })
                          )
                        }
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">Action: {entry.action}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={disabledId}
                      className="flex items-center gap-2 text-sm font-normal"
                    >
                      <Checkbox
                        id={disabledId}
                        checked={entry.disabled ?? false}
                        disabled={readOnly}
                        onCheckedChange={(checked) =>
                          updateRoot((entries) =>
                            updateItem(entries, entry.id, { disabled: checked === true })
                          )
                        }
                      />
                      Disabled
                    </Label>
                    {!readOnly && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => updateRoot((entries) => removeEntry(entries, index))}
                        aria-label={`Delete ${entry.label}`}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </li>
              );
            }

            if (isContextMenuSeparator(entry)) {
              return (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: separators have no stable identifier in the MVP schema
                  key={`separator-${index}`}
                  className="flex items-center justify-between gap-2 rounded-md border p-3"
                  data-testid="menu-separator"
                >
                  <div className="h-px flex-1 bg-border" />
                  {!readOnly && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => updateRoot((entries) => removeEntry(entries, index))}
                      aria-label="Delete separator"
                    >
                      Delete
                    </Button>
                  )}
                </li>
              );
            }

            if (isContextMenuGroup(entry)) {
              return (
                <li key={entry.id} className="rounded-md border p-3" data-testid="menu-group">
                  <p className="font-medium">{entry.label ?? "Untitled group"}</p>
                  {/* Group children are not editable in this MVP view. */}
                  <p className="text-sm text-muted-foreground">
                    Group editing is not supported in this MVP view.
                  </p>
                </li>
              );
            }

            return null;
          })}
        </ul>
      )}
      {!readOnly && (
        <div className="flex gap-2">
          <Button
            onClick={() => updateRoot((entries) => [...entries, createDefaultItem()])}
            aria-label="Add item"
          >
            Add Item
          </Button>
          <Button
            variant="secondary"
            onClick={() => updateRoot((entries) => [...entries, { type: "separator" }])}
            aria-label="Add separator"
          >
            Add Separator
          </Button>
        </div>
      )}
    </div>
  );
}
