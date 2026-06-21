import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/core/api/api-error";
import { useRegister } from "@/features/auth/commands/use-register";
import { requiresInstitution } from "@/features/auth/lib/role-rules";
import { useRegisterSchema } from "@/features/auth/schemas/register-schema";

const CURRENT_TERMS_VERSION = "2026-06-18";

const ROLE_OPTIONS = ["student", "teacher", "admin", "parent"] as const;

export function RegisterForm() {
  const { t } = useTranslation(["auth", "common"]);
  const registerSchema = useRegisterSchema();
  const register = useRegister();
  const form = useForm({
    resolver: zodResolver(registerSchema),
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
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth:register.name.label")}</FormLabel>
              <FormControl>
                <Input placeholder={t("auth:register.name.placeholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth:register.email.label")}</FormLabel>
              <FormControl>
                <Input type="email" placeholder={t("auth:register.email.placeholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth:register.password.label")}</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth:register.role.label")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("auth:register.role.placeholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {t(`auth:register.roles.${role}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {showInstitutionField && (
          <FormField
            control={form.control}
            name="institutionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("auth:register.institutionId.label")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("auth:register.institutionId.placeholder")}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="termsAccepted"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-2 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
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
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
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
    </Form>
  );
}
