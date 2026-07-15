import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { type InviteMemberInput, ROLE_OPTIONS, type TenantRole } from "../types";

interface InviteMemberDialogProps {
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (input: InviteMemberInput) => Promise<unknown>;
}

export function InviteMemberDialog({
  open,
  isPending,
  onOpenChange,
  onInvite,
}: InviteMemberDialogProps) {
  const { t } = useTranslation("tenant");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TenantRole>("member");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await onInvite({ email: email.trim(), role });
      handleOpenChange(false);
    } catch {
      // Keep the dialog open so the user can retry.
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setEmail("");
      setRole("member");
    }
    onOpenChange(nextOpen);
  }

  return (
    // purpose="form" stops a stray backdrop click from discarding a part-typed invite;
    // Escape still works. This form holds local state, not RHF, so there is nothing to
    // restore if it is dismissed by accident.
    <Dialog isOpen={open} onOpenChange={handleOpenChange} purpose="form">
      <DialogHeader title={t("members.inviteTitle")} onOpenChange={handleOpenChange} />
      <form onSubmit={handleSubmit} data-testid="invite-member-form">
        <VStack gap={4}>
          <TextInput
            label={t("members.emailLabel")}
            type="email"
            value={email}
            onChange={setEmail}
            isDisabled={isPending}
            isRequired
          />
          <Selector
            label={t("members.roleLabel")}
            value={role}
            onChange={(value) => setRole(value as TenantRole)}
            isDisabled={isPending}
            data-testid="invite-role-select"
            options={ROLE_OPTIONS.map((roleOption) => ({
              value: roleOption,
              label: t(`members.roles.${roleOption}`),
            }))}
          />
          <HStack gap={2} justify="end">
            <Button
              type="button"
              variant="secondary"
              label={t("members.cancelButton")}
              onClick={() => handleOpenChange(false)}
              isDisabled={isPending}
            />
            <Button
              type="submit"
              variant="primary"
              label={t("members.inviteButton")}
              isDisabled={email.trim().length === 0}
              isLoading={isPending}
            />
          </HStack>
        </VStack>
      </form>
    </Dialog>
  );
}
