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
import type { TenantRole } from "../types";

const ROLE_OPTIONS: TenantRole[] = ["owner", "admin", "member", "guest"];

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { email: string; role: TenantRole }) => void;
}

export function InviteMemberDialog({ open, onOpenChange, onSubmit }: InviteMemberDialogProps) {
  const { t } = useTranslation("tenant");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TenantRole>("member");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit({ email: email.trim(), role });
    setEmail("");
    setRole("member");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("members.inviteTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="member-email">{t("members.emailLabel")}</Label>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="member-role">{t("members.roleLabel")}</Label>
              <select
                id="member-role"
                value={role}
                onChange={(event) => setRole(event.target.value as TenantRole)}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                {ROLE_OPTIONS.map((roleOption) => (
                  <option key={roleOption} value={roleOption}>
                    {t(`members.roles.${roleOption}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("members.cancelButton")}
            </Button>
            <Button type="submit" disabled={email.trim().length === 0}>
              {t("members.inviteButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
