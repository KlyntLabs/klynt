import { Button } from "@astryxdesign/core/Button";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack } from "@astryxdesign/core/HStack";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Permission, Role } from "../types";

interface RoleFormDialogProps {
  open: boolean;
  title: string;
  roleData: Role | null;
  permissions: Permission[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description: string; permissionIds: string[] }) => void;
}

export function RoleFormDialog({
  open,
  title,
  roleData,
  permissions,
  onOpenChange,
  onSubmit,
}: RoleFormDialogProps) {
  const { t } = useTranslation("ui");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setName(roleData?.name ?? "");
      setDescription(roleData?.description ?? "");
      setSelectedIds(new Set(roleData?.permissionIds ?? []));
    }
  }, [open, roleData]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const permission of permissions) {
      const list = groups.get(permission.category) ?? [];
      list.push(permission);
      groups.set(permission.category, list);
    }
    return groups;
  }, [permissions]);

  /**
   * CheckboxList reports the whole selected set for ITS group only, so a category's result
   * has to be merged back into the global set rather than replacing it — otherwise ticking a
   * box in one category would silently clear every other category's selections.
   */
  function handleCategoryChange(items: Permission[], values: string[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const permission of items) next.delete(permission.id);
      for (const value of values) next.add(value);
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      permissionIds: Array.from(selectedIds),
    });
    onOpenChange(false);
  }

  const isReadOnly = roleData?.isSystem ?? false;

  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange} purpose="form" width={560}>
      <DialogHeader title={title} onOpenChange={onOpenChange} />
      <form onSubmit={handleSubmit}>
        <VStack gap={4}>
          <TextInput
            label={t("roles.nameLabel")}
            value={name}
            onChange={setName}
            isDisabled={isReadOnly}
            isRequired
          />
          <TextInput
            label={t("roles.descriptionLabel")}
            value={description}
            onChange={setDescription}
            isDisabled={isReadOnly}
          />

          <VStack gap={3} height={256} isScrollable>
            {Array.from(groupedPermissions.entries()).map(([category, items]) => (
              <CheckboxList
                key={category}
                label={category}
                density="compact"
                value={items.filter((p) => selectedIds.has(p.id)).map((p) => p.id)}
                onChange={(values) => handleCategoryChange(items, values)}
              >
                {items.map((permission) => (
                  <CheckboxListItem
                    key={permission.id}
                    value={permission.id}
                    label={permission.name}
                    isDisabled={isReadOnly}
                  />
                ))}
              </CheckboxList>
            ))}
          </VStack>

          <HStack gap={2} justify="end">
            <Button
              type="button"
              variant="secondary"
              label={t("close")}
              onClick={() => onOpenChange(false)}
            />
            {!isReadOnly && (
              <Button
                type="submit"
                variant="primary"
                label={t("roles.saveButton")}
                isDisabled={name.trim().length === 0}
              />
            )}
          </HStack>
        </VStack>
      </form>
    </Dialog>
  );
}
