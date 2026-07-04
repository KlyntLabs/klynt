import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTenantSlug } from "@/features/tenant/hooks";
import { createRole, deleteRole, listPermissions, listRoles, updateRole } from "../api";
import { PermissionGuard } from "../components/PermissionGuard";
import { RoleFormDialog } from "../components/RoleFormDialog";
import type { Role } from "../types";

export default function RolesPage() {
  const { t } = useTranslation("ui");
  const tenantSlug = useTenantSlug();
  const queryClient = useQueryClient();

  const { data: roles, isLoading: isRolesLoading } = useQuery({
    queryKey: ["tenants", tenantSlug, "roles"],
    queryFn: () => listRoles(tenantSlug),
    enabled: tenantSlug.length > 0,
  });

  const { data: permissions, isLoading: isPermissionsLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: listPermissions,
  });

  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: (input: { name: string; description: string; permissionIds: string[] }) =>
      createRole(tenantSlug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantSlug, "roles"] });
      setIsCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { roleId: string; permissionIds: string[] }) =>
      updateRole(tenantSlug, input.roleId, { permissionIds: input.permissionIds }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantSlug, "roles"] });
      setEditingRole(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (roleId: string) => deleteRole(tenantSlug, roleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantSlug, "roles"] });
    },
  });

  if (isRolesLoading || isPermissionsLoading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("roles.title")}</h1>
        <PermissionGuard tenantSlug={tenantSlug} permission="tenant.manage_roles">
          <Button onClick={() => setIsCreateOpen(true)}>{t("roles.createButton")}</Button>
        </PermissionGuard>
      </div>

      <PermissionGuard
        tenantSlug={tenantSlug}
        permission="tenant.manage_roles"
        fallback={<p>{t("queryError.message")}</p>}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("roles.nameLabel")}</TableHead>
              <TableHead>{t("roles.descriptionLabel")}</TableHead>
              <TableHead>{t("roles.permissionsLabel")}</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>{t("roles.noRoles")}</TableCell>
              </TableRow>
            )}
            {roles?.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">
                  {role.name}
                  {role.isSystem && (
                    <Badge variant="secondary" className="ml-2">
                      {t("roles.systemBadge")}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{role.description}</TableCell>
                <TableCell>{role.permissionIds.length}</TableCell>
                <TableCell className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingRole(role)}>
                    {t("roles.saveButton")}
                  </Button>
                  {!role.isSystem && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(role.id)}
                      disabled={deleteMutation.isPending}
                    >
                      {t("roles.deleteButton")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </PermissionGuard>

      <RoleFormDialog
        open={isCreateOpen}
        title={t("roles.createTitle")}
        roleData={null}
        permissions={permissions ?? []}
        onOpenChange={setIsCreateOpen}
        onSubmit={(data) => createMutation.mutate(data)}
      />

      <RoleFormDialog
        open={editingRole !== null}
        title={t("roles.editTitle")}
        roleData={editingRole}
        permissions={permissions ?? []}
        onOpenChange={(open) => {
          if (!open) setEditingRole(null);
        }}
        onSubmit={(data) => {
          if (editingRole) {
            updateMutation.mutate({ roleId: editingRole.id, permissionIds: data.permissionIds });
          }
        }}
      />
    </div>
  );
}
