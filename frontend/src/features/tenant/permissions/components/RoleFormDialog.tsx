import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  function togglePermission(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role-name">{t("roles.nameLabel")}</Label>
              <Input
                id="role-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isReadOnly}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-description">{t("roles.descriptionLabel")}</Label>
              <Input
                id="role-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={isReadOnly}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("roles.permissionsLabel")}</Label>
              <div className="max-h-64 overflow-y-auto rounded border p-2">
                {Array.from(groupedPermissions.entries()).map(([category, items]) => (
                  <div key={category} className="mb-3">
                    <p className="mb-1 text-sm font-semibold capitalize">{category}</p>
                    <div className="grid gap-1">
                      {items.map((permission) => (
                        <label
                          key={permission.id}
                          htmlFor={permission.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            id={permission.id}
                            checked={selectedIds.has(permission.id)}
                            onCheckedChange={(checked) =>
                              togglePermission(permission.id, checked === true)
                            }
                            disabled={isReadOnly}
                          />
                          {permission.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("close")}
            </Button>
            {!isReadOnly && (
              <Button type="submit" disabled={name.trim().length === 0}>
                {t("roles.saveButton")}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
