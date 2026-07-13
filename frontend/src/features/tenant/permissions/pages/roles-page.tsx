import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Spinner } from "@astryxdesign/core/Spinner";
import { pixel, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTenantSlug } from "@/features/tenant/hooks";
import { createRole, deleteRole, listPermissions, listRoles, updateRole } from "../api";
import { PermissionGuard } from "../components/PermissionGuard";
import { RoleFormDialog } from "../components/RoleFormDialog";
import type { Role } from "../types";

/**
 * Astryx's Table constrains its row type to `Record<string, unknown>`, which a plain domain
 * type does not satisfy. Intersecting is the documented workaround. The cost is real: the
 * index signature means any string key type-checks against the row, so a typo in a column's
 * `key` will not be caught by the compiler.
 */
type RoleRow = Role & Record<string, unknown>;

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
    mutationFn: (data: { name: string; description: string; permissionIds: string[] }) =>
      createRole(tenantSlug, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantSlug, "roles"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      updateRole(tenantSlug, roleId, { permissionIds }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenants", tenantSlug, "roles"] });
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

  // Astryx's Table is data-driven (data + columns with renderCell), not compositional like
  // the shadcn Table it replaces — there is no TableRow/TableCell to hand-assemble.
  const columns: TableColumn<RoleRow>[] = [
    {
      key: "name",
      header: t("roles.nameLabel"),
      renderCell: (role: RoleRow) => (
        <HStack gap={2} align="center">
          <Text weight="medium">{role.name}</Text>
          {role.isSystem && <Badge label={t("roles.systemBadge")} />}
        </HStack>
      ),
    },
    { key: "description", header: t("roles.descriptionLabel") },
    {
      key: "permissionIds",
      header: t("roles.permissionsLabel"),
      renderCell: (role: RoleRow) => <Text>{role.permissionIds.length}</Text>,
    },
    {
      key: "actions",
      header: "",
      width: pixel(200),
      renderCell: (role: RoleRow) => (
        <HStack gap={2}>
          <Button
            variant="secondary"
            size="sm"
            label={t("roles.saveButton")}
            onClick={() => setEditingRole(role)}
          />
          {!role.isSystem && (
            <Button
              variant="destructive"
              size="sm"
              label={t("roles.deleteButton")}
              onClick={() => deleteMutation.mutate(role.id)}
              isDisabled={deleteMutation.isPending}
            />
          )}
        </HStack>
      ),
    },
  ];

  return (
    <VStack gap={4}>
      <HStack justify="between" align="center">
        <Heading level={1}>{t("roles.title")}</Heading>
        <PermissionGuard tenantSlug={tenantSlug} permission="tenant.manage_roles">
          <Button
            variant="primary"
            label={t("roles.createButton")}
            onClick={() => setIsCreateOpen(true)}
          />
        </PermissionGuard>
      </HStack>

      <PermissionGuard
        tenantSlug={tenantSlug}
        permission="tenant.manage_roles"
        fallback={<Text>{t("queryError.message")}</Text>}
      >
        {roles?.length === 0 ? (
          <EmptyState title={t("roles.noRoles")} />
        ) : (
          <Table data={(roles ?? []) as RoleRow[]} columns={columns} idKey="id" hasHover />
        )}
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
    </VStack>
  );
}
