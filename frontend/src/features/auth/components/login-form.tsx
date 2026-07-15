import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/VStack";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormTextInput } from "@/components/form/form-text-input";
import { ApiError } from "@/core/api/api-error";
import { useLogin } from "@/core/auth/hooks/use-login";
import type { LoginSchema } from "@/features/auth/schemas/use-login-schema";
import { useLoginSchema } from "@/features/auth/schemas/use-login-schema";

export function LoginForm() {
  const { t } = useTranslation(["auth", "validation"]);
  const login = useLogin();
  const loginSchema = useLoginSchema();
  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = form.handleSubmit(async (data: LoginSchema) => {
    try {
      await login.mutateAsync(data);
    } catch (error) {
      if (error instanceof ApiError && error.code === "bad_request") {
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
          label={t("auth:login.email.label")}
          placeholder={t("auth:login.email.placeholder")}
        />
        <FormTextInput
          control={form.control}
          name="password"
          type="password"
          autoComplete="current-password"
          label={t("auth:login.password.label")}
        />
        {rootError && <Banner role="alert" status="error" title={rootError.message ?? ""} />}
        <Button
          type="submit"
          variant="primary"
          label={t("auth:login.submit")}
          isLoading={login.isPending}
        />
      </VStack>
    </form>
  );
}
