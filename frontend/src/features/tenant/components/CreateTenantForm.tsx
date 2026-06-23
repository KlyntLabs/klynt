import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTenant } from "../api/tenant-api";
import type { CreateTenantInput } from "../types";

export function CreateTenantForm({ onSuccess }: { onSuccess?: () => void }) {
  const { t } = useTranslation("ui");
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState } = useForm<CreateTenantInput>();
  const mutation = useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      onSuccess?.();
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
      <div>
        <Label htmlFor="tenant-name">{t("tenant.nameLabel")}</Label>
        <Input id="tenant-name" {...register("name", { required: true })} />
      </div>
      <div>
        <Label htmlFor="tenant-slug">{t("tenant.slugLabel")}</Label>
        <Input id="tenant-slug" {...register("slug", { required: true })} />
      </div>
      {mutation.error && <p className="text-destructive text-sm">{t("tenant.createError")}</p>}
      <Button type="submit" disabled={formState.isSubmitting || mutation.isPending}>
        {t("tenant.createButton")}
      </Button>
    </form>
  );
}
