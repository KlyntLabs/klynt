import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/VStack";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormTextInput } from "@/components/form/form-text-input";
import { createTenant } from "../api/tenant-api";
import type { CreateTenantInput } from "../types";

export function CreateTenantForm({ onSuccess }: { onSuccess?: () => void }) {
  const { t } = useTranslation("ui");
  const queryClient = useQueryClient();
  // control, not register: the bridge binds through Controller so Astryx's TextInput owns
  // its own label and validation status rather than a separate <Label> + <Input> pair.
  const { control, handleSubmit, formState } = useForm<CreateTenantInput>({
    defaultValues: { name: "", slug: "" },
  });
  const mutation = useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      onSuccess?.();
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
      <VStack gap={4}>
        <FormTextInput
          control={control}
          name="name"
          label={t("tenant.nameLabel")}
          rules={{ required: true }}
        />
        <FormTextInput
          control={control}
          name="slug"
          label={t("tenant.slugLabel")}
          rules={{ required: true }}
        />
        {mutation.error && <Banner status="error" title={t("tenant.createError")} />}
        <Button
          type="submit"
          variant="primary"
          label={t("tenant.createButton")}
          isLoading={formState.isSubmitting || mutation.isPending}
        />
      </VStack>
    </form>
  );
}
