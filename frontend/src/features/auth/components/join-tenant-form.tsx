import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/VStack";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { FormTextInput } from "@/components/form/form-text-input";
import { ApiError } from "@/core/api/api-error";
import { useAcceptTenantInvite } from "@/features/tenant";

interface JoinTenantFormProps {
  onSuccess?: () => void;
}

export function JoinTenantForm({ onSuccess }: JoinTenantFormProps) {
  const { t } = useTranslation(["auth", "validation"]);
  const mutation = useAcceptTenantInvite();

  const schema = z.object({
    token: z.string().min(1, t("validation:inviteCodeRequired")),
  });

  type JoinTenantSchema = z.infer<typeof schema>;

  const form = useForm<JoinTenantSchema>({
    resolver: zodResolver(schema),
    defaultValues: { token: "" },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await mutation.mutateAsync(data.token);
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t("auth:onboarding.inviteCode.error");
      form.setError("root", { message });
    }
  });

  const rootError = form.formState.errors.root;

  return (
    <form onSubmit={onSubmit}>
      <VStack gap={4}>
        <FormTextInput
          control={form.control}
          name="token"
          label={t("auth:onboarding.inviteCode.label")}
          placeholder={t("auth:onboarding.inviteCode.placeholder")}
        />
        {rootError && <Banner role="alert" status="error" title={rootError.message ?? ""} />}
        <Button
          type="submit"
          variant="primary"
          label={t("auth:onboarding.inviteCode.submit")}
          isLoading={mutation.isPending}
        />
      </VStack>
    </form>
  );
}
