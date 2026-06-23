import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PermissionGuard } from "@/features/tenant/permissions/components/PermissionGuard";
import { InviteMemberDialog } from "../components/InviteMemberDialog";
import { useInviteMember } from "../hooks/use-invite-member";
import { useMembers } from "../hooks/use-members";
import { useRemoveMember } from "../hooks/use-remove-member";
import { useUpdateMemberRole } from "../hooks/use-update-member-role";
import { ROLE_OPTIONS, type TenantRole } from "../types";

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
      <Alert variant="destructive">
        <AlertTitle>{t("ui:queryError.title")}</AlertTitle>
        <AlertDescription>{t("ui:queryError.message")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("members.title")}</h1>
        <PermissionGuard tenantSlug={tenantSlug} permission="tenant.manage_members">
          <Button onClick={() => setIsInviteOpen(true)}>{t("members.inviteButton")}</Button>
        </PermissionGuard>
      </div>

      <PermissionGuard
        tenantSlug={tenantSlug}
        permission="tenant.manage_members"
        fallback={<p>{t("members.accessDenied")}</p>}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("members.emailLabel")}</TableHead>
              <TableHead>{t("members.nameLabel")}</TableHead>
              <TableHead>{t("members.roleLabel")}</TableHead>
              <TableHead>{t("members.joinedAtLabel")}</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>{t("members.noMembers")}</TableCell>
              </TableRow>
            )}
            {members?.map((member) => (
              <TableRow key={member.email} data-testid={`member-row-${member.email}`}>
                <TableCell className="font-medium">{member.email}</TableCell>
                <TableCell>{member.fullName ?? "—"}</TableCell>
                <TableCell>
                  <Select
                    value={member.role}
                    onValueChange={(value) =>
                      updateRoleMutation.mutate({
                        email: member.email,
                        role: value as TenantRole,
                      })
                    }
                    disabled={updateRoleMutation.isPending}
                  >
                    <SelectTrigger
                      className="w-32"
                      aria-label={t("members.roleLabel")}
                      data-testid={`role-select-${member.email}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role} value={role}>
                          {t(`members.roles.${role}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{formatJoinedDate(member.joinedAt, i18n.language)}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    data-testid={`remove-member-${member.email}`}
                    onClick={() => setRemovingEmail(member.email)}
                    disabled={removeMutation.isPending}
                  >
                    {t("members.removeButton")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </PermissionGuard>

      <InviteMemberDialog
        open={isInviteOpen}
        isPending={inviteMutation.isPending}
        onOpenChange={setIsInviteOpen}
        onInvite={async (input) => inviteMutation.mutateAsync(input)}
      />

      <Dialog
        open={removingEmail !== null}
        onOpenChange={(open) => !open && setRemovingEmail(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("members.removeConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {removingEmail ? t("members.removeConfirmMessage", { email: removingEmail }) : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingEmail(null)}>
              {t("members.cancelButton")}
            </Button>
            <Button
              variant="destructive"
              data-testid="confirm-remove-member"
              onClick={() => {
                if (removingEmail) {
                  removeMutation.mutate(removingEmail, {
                    onSuccess: () => setRemovingEmail(null),
                  });
                }
              }}
              disabled={removeMutation.isPending}
            >
              {t("members.removeButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
