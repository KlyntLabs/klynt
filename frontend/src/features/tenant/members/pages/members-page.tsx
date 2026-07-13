import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { Spinner } from "@astryxdesign/core/Spinner";
import { pixel, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { PermissionGuard } from "@/features/tenant/permissions/components/PermissionGuard";
import { InviteMemberDialog } from "../components/InviteMemberDialog";
import { useInviteMember } from "../hooks/use-invite-member";
import { useMembers } from "../hooks/use-members";
import { useRemoveMember } from "../hooks/use-remove-member";
import { useUpdateMemberRole } from "../hooks/use-update-member-role";
import { type Member, ROLE_OPTIONS, type TenantRole } from "../types";

/** See roles-page: Astryx's Table constrains its row type to Record<string, unknown>. */
type MemberRow = Member & Record<string, unknown>;

function formatJoinedDate(value: string, locale: string): string {
  return new Date(value).toLocaleDateString(locale);
}

export default function MembersPage() {
  const { t, i18n } = useTranslation(["tenant", "ui"]);
  const { slug } = useParams<{ slug: string }>();
  const tenantSlug = slug ?? "";

  const { data: members, isLoading, error } = useMembers(tenantSlug);
  const inviteMutation = useInviteMember(tenantSlug);
  const updateRoleMutation = useUpdateMemberRole(tenantSlug);
  const removeMutation = useRemoveMember(tenantSlug);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <Banner
        status="error"
        title={t("ui:queryError.title")}
        description={t("ui:queryError.message")}
      />
    );
  }

  const columns: TableColumn<MemberRow>[] = [
    {
      key: "email",
      header: t("members.emailLabel"),
      renderCell: (member: MemberRow) => <Text weight="medium">{member.email}</Text>,
    },
    {
      key: "fullName",
      header: t("members.nameLabel"),
      renderCell: (member: MemberRow) => <Text>{member.fullName ?? "—"}</Text>,
    },
    {
      key: "role",
      header: t("members.roleLabel"),
      width: pixel(160),
      renderCell: (member: MemberRow) => (
        <Selector
          label={t("members.roleLabel")}
          isLabelHidden
          size="sm"
          value={member.role}
          isDisabled={updateRoleMutation.isPending}
          data-testid={`role-select-${member.email}`}
          onChange={(value) =>
            updateRoleMutation.mutate({ email: member.email, role: value as TenantRole })
          }
          options={ROLE_OPTIONS.map((role) => ({
            value: role,
            label: t(`members.roles.${role}`),
          }))}
        />
      ),
    },
    {
      key: "joinedAt",
      header: t("members.joinedAtLabel"),
      renderCell: (member: MemberRow) => (
        <Text>{formatJoinedDate(member.joinedAt, i18n.language)}</Text>
      ),
    },
    {
      key: "actions",
      header: "",
      width: pixel(120),
      renderCell: (member: MemberRow) => (
        <Button
          variant="destructive"
          size="sm"
          label={t("members.removeButton")}
          data-testid={`remove-member-${member.email}`}
          onClick={() => setRemovingEmail(member.email)}
          isDisabled={removeMutation.isPending}
        />
      ),
    },
  ];

  return (
    <VStack gap={4}>
      <HStack justify="between" align="center">
        <Heading level={1}>{t("members.title")}</Heading>
        <PermissionGuard tenantSlug={tenantSlug} permission="tenant.manage_members">
          <Button
            variant="primary"
            label={t("members.inviteButton")}
            onClick={() => setIsInviteOpen(true)}
          />
        </PermissionGuard>
      </HStack>

      <PermissionGuard
        tenantSlug={tenantSlug}
        permission="tenant.manage_members"
        fallback={<Text>{t("members.accessDenied")}</Text>}
      >
        {members?.length === 0 ? (
          <EmptyState title={t("members.noMembers")} />
        ) : (
          <Table data={(members ?? []) as MemberRow[]} columns={columns} idKey="email" hasHover />
        )}
      </PermissionGuard>

      <InviteMemberDialog
        open={isInviteOpen}
        isPending={inviteMutation.isPending}
        onOpenChange={setIsInviteOpen}
        onInvite={async (input) => inviteMutation.mutateAsync(input)}
      />

      {/* A destructive confirmation, so AlertDialog rather than Dialog: it owns the
          action/cancel pair and defaults the action to the destructive variant. */}
      <AlertDialog
        isOpen={removingEmail !== null}
        onOpenChange={(open) => !open && setRemovingEmail(null)}
        title={t("members.removeConfirmTitle")}
        description={
          removingEmail ? t("members.removeConfirmMessage", { email: removingEmail }) : ""
        }
        cancelLabel={t("members.cancelButton")}
        actionLabel={t("members.removeButton")}
        isActionLoading={removeMutation.isPending}
        onAction={() => {
          if (removingEmail) {
            removeMutation.mutate(removingEmail, {
              onSuccess: () => setRemovingEmail(null),
            });
          }
        }}
      />
    </VStack>
  );
}
