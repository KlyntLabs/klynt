import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/VStack";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormTextInput } from "@/components/form/form-text-input";
import { ApiError } from "@/core/api/api-error";
import { useResetPassword } from "@/core/auth/hooks/use-reset-password";
import { useResetPasswordSchema } from "@/features/auth/schemas/reset-password-schema";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const { t } = useTranslation(["auth", "validation"]);
  const resetSchema = useResetPasswordSchema();
  const reset = useResetPassword();
  const form = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await reset.mutateAsync({ token, password: data.password });
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
          name="password"
          type="password"
          autoComplete="new-password"
          label={t("auth:resetPassword.password.label")}
        />
        <FormTextInput
          control={form.control}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          label={t("auth:resetPassword.confirmPassword.label")}
        />
        {rootError && <Banner role="alert" status="error" title={rootError.message ?? ""} />}
        <Button
          type="submit"
          variant="primary"
          label={t("auth:resetPassword.submit")}
          isLoading={reset.isPending}
        />
      </VStack>
    </form>
  );
}
