import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/VStack";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormTextInput } from "@/components/form/form-text-input";
import { ApiError } from "@/core/api/api-error";
import { useForgotPassword } from "@/core/auth/hooks/use-forgot-password";
import type { ForgotPasswordSchema } from "@/features/auth/schemas/use-forgot-password-schema";
import { useForgotPasswordSchema } from "@/features/auth/schemas/use-forgot-password-schema";

export function ForgotPasswordForm() {
  const { t } = useTranslation(["auth", "validation"]);
  const forgot = useForgotPassword();
  const forgotPasswordSchema = useForgotPasswordSchema();
  const form = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await forgot.mutateAsync(data);
    } catch (error) {
      if (error instanceof ApiError) {
        form.setError("root", { message: error.message });
      }
    }
  });

  const rootError = form.formState.errors.root;

  return (
    <form onSubmit={onSubmit}>
      <VStack gap={4}>
        <FormTextInput
          control={form.control}
          name="email"
          type="email"
          autoComplete="email"
          label={t("auth:forgotPassword.email.label")}
          placeholder={t("auth:forgotPassword.email.placeholder")}
        />
        {rootError && <Banner role="alert" status="error" title={rootError.message ?? ""} />}
        <Button
          type="submit"
          variant="primary"
          label={t("auth:forgotPassword.submit")}
          isLoading={forgot.isPending}
        />
      </VStack>
    </form>
  );
}
