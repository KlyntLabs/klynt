import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("members.inviteTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} data-testid="invite-member-form">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="member-email">{t("members.emailLabel")}</Label>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isPending}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="member-role">{t("members.roleLabel")}</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as TenantRole)}
                disabled={isPending}
              >
                <SelectTrigger id="member-role" data-testid="invite-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((roleOption) => (
                    <SelectItem key={roleOption} value={roleOption}>
                      {t(`members.roles.${roleOption}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              {t("members.cancelButton")}
            </Button>
            <Button type="submit" disabled={email.trim().length === 0 || isPending}>
              {t("members.inviteButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
