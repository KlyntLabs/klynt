import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/VStack";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormTextInput } from "@/components/form/form-text-input";
import { ApiError } from "@/core/api/api-error";
import { useRegister } from "@/core/auth/hooks/use-register";
import { useRegisterSchema } from "@/features/auth/schemas/register-schema";

export function RegisterForm() {
  const { t } = useTranslation(["auth", "validation"]);
  const registerSchema = useRegisterSchema();
  const register = useRegister();
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await register.mutateAsync(data);
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.code === "bad_request" || error.code === "conflict")
      ) {
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
          name="name"
          label={t("auth:register.name.label")}
          placeholder={t("auth:register.name.placeholder")}
        />
        <FormTextInput
          control={form.control}
          name="username"
          label={t("auth:register.username.label")}
          placeholder={t("auth:register.username.placeholder")}
        />
        <FormTextInput
          control={form.control}
          name="email"
          type="email"
          label={t("auth:register.email.label")}
          placeholder={t("auth:register.email.placeholder")}
        />
        <FormTextInput
          control={form.control}
          name="password"
          type="password"
          label={t("auth:register.password.label")}
        />
        {rootError && <Banner role="alert" status="error" title={rootError.message ?? ""} />}
        <Button
          type="submit"
          variant="primary"
          label={t("auth:register.submit")}
          isLoading={register.isPending}
        />
      </VStack>
    </form>
  );
}
