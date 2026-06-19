import { FormProvider } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/core/api/api-error";
import { CheckboxField } from "@/core/forms/checkbox-field";
import { InputField } from "@/core/forms/input-field";
import { SelectField } from "@/core/forms/select-field";
import { useZodForm } from "@/core/forms/use-zod-form";
import { useRegister } from "@/features/auth/commands/use-register";
import { requiresInstitution } from "@/features/auth/lib/role-rules";
import { useRegisterSchema } from "@/features/auth/schemas/register-schema";

const CURRENT_TERMS_VERSION = "2026-06-18";

export function RegisterForm() {
  const { t } = useTranslation(["auth", "common"]);
  const registerSchema = useRegisterSchema();
  const register = useRegister();
  const form = useZodForm(registerSchema, {
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "student",
      termsAccepted: false,
      termsVersion: CURRENT_TERMS_VERSION,
    },
  });

  const selectedRole = form.watch("role");
  const showInstitutionField = requiresInstitution(selectedRole);

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

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <InputField
          name="name"
          label={t("auth:register.name.label")}
          placeholder={t("auth:register.name.placeholder")}
        />
        <InputField
          name="email"
          label={t("auth:register.email.label")}
          type="email"
          placeholder={t("auth:register.email.placeholder")}
        />
        <InputField name="password" label={t("auth:register.password.label")} type="password" />
        <SelectField
          name="role"
          label={t("auth:register.role.label")}
          options={[
            { value: "student", label: t("auth:register.roles.student") },
            { value: "teacher", label: t("auth:register.roles.teacher") },
            { value: "admin", label: t("auth:register.roles.admin") },
            { value: "parent", label: t("auth:register.roles.parent") },
          ]}
          placeholder={t("auth:register.role.placeholder")}
        />
        {showInstitutionField && (
          <InputField
            name="institutionId"
            label={t("auth:register.institutionId.label")}
            placeholder={t("auth:register.institutionId.placeholder")}
          />
        )}
        <CheckboxField
          name="termsAccepted"
          label={
            <Trans
              ns="auth"
              i18nKey="register.terms.label"
              components={{
                // biome-ignore lint/a11y/useAnchorContent: link text is injected by the Trans component from i18n
                privacy: <a href="/privacy" className="text-primary hover:underline" />,
                // biome-ignore lint/a11y/useAnchorContent: link text is injected by the Trans component from i18n
                terms: <a href="/terms" className="text-primary hover:underline" />,
              }}
            />
          }
        />
        {form.formState.errors.root && (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" disabled={register.isPending} className="w-full">
          {register.isPending && <Spinner className="mr-2 size-4" />}
          {t("auth:register.submit")}
        </Button>
      </form>
    </FormProvider>
  );
}
